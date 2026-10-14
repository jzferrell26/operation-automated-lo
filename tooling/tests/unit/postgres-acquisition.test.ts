import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const driver = vi.hoisted(() => ({ reserve: vi.fn(), end: vi.fn() }));
vi.mock("../../../packages/db/node_modules/postgres/src/index.js", () => ({
  default: vi.fn(() => driver),
}));

import { createPostgresPool } from "../../../packages/db/src/postgres-adapter.js";
import { FIRST_PARTY_SESSION_COOKIE } from "@oalo/auth";
import { resolveAuthenticatedReadPrincipal } from "../../../apps/web/src/server/authenticated-principal.js";

const configuration = {
  connectionString: "postgresql://postgres:postgres@127.0.0.1:5432/oalo_test_adapter",
  deploymentEnvironment: "test",
  poolingMode: "transaction",
  preparedStatements: false,
  sslMode: "disable",
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("DatabasePool acquisition lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    driver.reserve.mockReset();
    driver.end.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => vi.useRealTimers());

  it("rejects a reservation still queued after the existing default ten-second budget", async () => {
    driver.reserve.mockReturnValue(new Promise(() => undefined));
    const pool = createPostgresPool(configuration);
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(vi.getTimerCount()).toBe(0);
    await pool.close();
  });

  it("releases a late reservation once after a configured acquisition timeout", async () => {
    const reservation = deferred<{ release: ReturnType<typeof vi.fn> }>();
    const release = vi.fn();
    driver.reserve.mockReturnValue(reservation.promise);
    const pool = createPostgresPool({ ...configuration, connectTimeoutSeconds: 1 });
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(1_000);
    await result;
    reservation.resolve({ release });
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toHaveBeenCalledTimes(1);
    await pool.close();
  });

  it("rejects pending callers on close and releases reservations that arrive after close", async () => {
    const reservation = deferred<{ release: ReturnType<typeof vi.fn> }>();
    const release = vi.fn();
    driver.reserve.mockReturnValue(reservation.promise);
    const pool = createPostgresPool(configuration);
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_POOL_CLOSED" });
    await Promise.resolve();
    await pool.close();
    await result;
    expect(vi.getTimerCount()).toBe(0);
    reservation.resolve({ release });
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toHaveBeenCalledTimes(1);
    await expect(pool.connect()).rejects.toMatchObject({ code: "DB_POOL_CLOSED" });
    await pool.close();
    expect(driver.end).toHaveBeenCalledTimes(1);
    expect(driver.end).toHaveBeenCalledWith({ timeout: 5 });
  });

  it("handles a driver rejection after timeout without an unhandled rejection", async () => {
    const reservation = deferred<never>();
    driver.reserve.mockReturnValue(reservation.promise);
    const pool = createPostgresPool(configuration);
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    reservation.reject(new Error("sensitive driver error"));
    await vi.advanceTimersByTimeAsync(0);
    await pool.close();
  });

  it("preserves healthy execution and idempotent release, with no remaining deadline", async () => {
    const release = vi.fn();
    const unsafe = vi.fn().mockResolvedValue(Object.assign([{ value: 1 }], { count: 1 }));
    driver.reserve.mockResolvedValue({ release, unsafe });
    const pool = createPostgresPool(configuration);
    const connection = await pool.connect();
    expect(
      await connection.execute({
        statementName: "test",
        text: "select $1",
        values: [1],
        preparedStatementMode: "unnamed",
      }),
    ).toEqual({ rows: [{ value: 1 }], rowCount: 1 });
    await connection.release();
    await connection.release();
    expect(release).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    await pool.close();
  });

  it("refuses authentication on acquisition timeout before any binding or identity read", async () => {
    driver.reserve.mockReturnValue(new Promise(() => undefined));
    const pool = createPostgresPool(configuration);
    const binding = vi.fn();
    const identity = vi.fn();
    const request = new Request(
      "https://app.operation-automated-lo.test/marketing/campaigns/library",
      { headers: { cookie: `${FIRST_PARTY_SESSION_COOKIE}=${"a".repeat(43)}` } },
    );
    const result = expect(
      resolveAuthenticatedReadPrincipal(
        request,
        {
          OALO_ENVIRONMENT: "production",
          OALO_PROVIDER_MODE: "stub",
          OALO_SYNTHETIC_DATA_ONLY: "true",
          OALO_REVIEW_SURFACE: "authorized",
        },
        {
          firstPartySessions: {
            async getActive() {
              await pool.connect();
              return undefined;
            },
          },
          roleBindings: { currentRoleVersion: binding },
          identityDirectory: { resolveActorId: identity, resolveLocationId: identity },
        },
      ),
    ).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    expect(binding).not.toHaveBeenCalled();
    expect(identity).not.toHaveBeenCalled();
    await pool.close();
  });

  it("rejects every pending acquisition before driver shutdown finishes", async () => {
    driver.reserve.mockReturnValue(new Promise(() => undefined));
    const shutdown = deferred<void>();
    driver.end.mockReturnValue(shutdown.promise);
    const pool = createPostgresPool(configuration);
    const first = expect(pool.connect()).rejects.toMatchObject({ code: "DB_POOL_CLOSED" });
    const second = expect(pool.connect()).rejects.toMatchObject({ code: "DB_POOL_CLOSED" });
    const close = pool.close();
    await Promise.all([first, second]);
    expect(vi.getTimerCount()).toBe(0);
    shutdown.resolve();
    await close;
  });

  it("preserves immediate driver errors and clears their deadline", async () => {
    const error = new Error("private driver error");
    driver.reserve.mockRejectedValue(error);
    const pool = createPostgresPool(configuration);
    await expect(pool.connect()).rejects.toBe(error);
    expect(vi.getTimerCount()).toBe(0);
    await pool.close();
  });

  it("cannot let a throwing diagnostic observer change acquisition or late release", async () => {
    const reservation = deferred<{ release: ReturnType<typeof vi.fn> }>();
    const release = vi.fn();
    driver.reserve.mockReturnValue(reservation.promise);
    const observer = vi.fn(() => {
      throw new Error("broken sink");
    });
    const pool = createPostgresPool(configuration, observer);
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    reservation.resolve({ release });
    await vi.advanceTimersByTimeAsync(0);
    expect(release).toHaveBeenCalledTimes(1);
    expect(observer.mock.calls).toHaveLength(3);
    await pool.close();
  });

  it("reports only a fixed cleanup failure when release of a late reservation throws", async () => {
    const reservation = deferred<{ release: ReturnType<typeof vi.fn> }>();
    driver.reserve.mockReturnValue(reservation.promise);
    const observer = vi.fn();
    const pool = createPostgresPool(configuration, observer);
    const result = expect(pool.connect()).rejects.toMatchObject({ code: "DB_ACQUISITION_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(10_000);
    await result;
    reservation.resolve({
      release: vi.fn(() => {
        throw new Error("private release detail");
      }),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.mock.calls.at(-1)?.[0]).toEqual({
      outcome: "cleanup_failed",
      elapsedMilliseconds: expect.any(Number),
    });
    expect(JSON.stringify(observer.mock.calls)).not.toContain("private");
    await pool.close();
  });

  it.each([0, 31, 1.5, "10", Infinity])(
    "keeps existing strict timeout bounds: %j",
    (connectTimeoutSeconds) => {
      expect(() => createPostgresPool({ ...configuration, connectTimeoutSeconds })).toThrow(
        /connectTimeoutSeconds/,
      );
    },
  );
});
