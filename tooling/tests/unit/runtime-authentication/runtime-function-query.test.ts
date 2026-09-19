import {
  DatabaseContextError,
  RUNTIME_FUNCTION_CONTRACT_NAMES,
  defineSqlContract,
  isRuntimeFunctionContractName,
  queryRuntimeFunction,
  type DatabaseConnection,
  type DatabasePool,
  type SqlRequest,
} from "@oalo/db";
import { describe, expect, it } from "vitest";

/**
 * PRD-005a D6. This helper is the one database path with no tenant or support context, so the
 * allowlist is the whole security boundary. These cases pin what it runs, what it refuses, and
 * that it never leaves a transaction open.
 */

const ALLOWLISTED_NAME = "runtime.location-is-active.v1";

function contractNamed(name: string, access: "read" | "write" = "read") {
  return defineSqlContract<{ active: boolean }>({
    name,
    access,
    text: "select platform.location_is_active($1::uuid) as active",
    decode(row: unknown) {
      return { active: (row as { active: boolean }).active };
    },
  });
}

function createPool(behaviour: { failOn?: string } = {}) {
  const requests: SqlRequest[] = [];
  let releases = 0;
  const connection: DatabaseConnection = {
    async execute(request) {
      requests.push(request);
      if (behaviour.failOn === request.statementName) {
        throw new Error(`statement ${request.statementName} failed`);
      }
      return { rows: [{ active: true }], rowCount: 1 };
    },
    async release() {
      releases += 1;
    },
  };
  const pool: DatabasePool = {
    async connect() {
      return connection;
    },
  };
  return {
    pool,
    requests,
    releaseCount: () => releases,
  };
}

describe("context-free runtime function helper", () => {
  it("recognises exactly the five PRD-005b contract names", () => {
    expect([...RUNTIME_FUNCTION_CONTRACT_NAMES]).toEqual([
      "runtime.location-is-active.v1",
      "runtime.actor-is-active.v1",
      "runtime.current-role-version.v1",
      "runtime.lookup-first-party-session.v1",
      "runtime.touch-first-party-session.v1",
    ]);
    for (const name of RUNTIME_FUNCTION_CONTRACT_NAMES) {
      expect(isRuntimeFunctionContractName(name)).toBe(true);
    }
    expect(isRuntimeFunctionContractName("campaign.read-aggregate.v1")).toBe(false);
    expect(isRuntimeFunctionContractName(undefined)).toBe(false);
  });

  it("assumes app_runtime, runs the contract, and commits", async () => {
    const harness = createPool();

    const rows = await queryRuntimeFunction(harness.pool, contractNamed(ALLOWLISTED_NAME), [
      "00000000-0000-4000-8000-0000000007a1",
    ]);

    expect(rows).toEqual([{ active: true }]);
    expect(harness.requests.map((request) => request.text)).toEqual([
      "begin",
      "set local role app_runtime",
      "select platform.location_is_active($1::uuid) as active",
      "commit",
    ]);
    expect(harness.requests[2]?.values).toEqual(["00000000-0000-4000-8000-0000000007a1"]);
    expect(harness.releaseCount()).toBe(1);
  });

  it("refuses a contract outside the allowlist before taking a connection", async () => {
    const harness = createPool();

    await expect(
      queryRuntimeFunction(harness.pool, contractNamed("campaign.read-aggregate.v1")),
    ).rejects.toMatchObject({
      name: "DatabaseContextError",
      code: "DB_CONTRACT_ACCESS_MISMATCH",
    });
    expect(harness.requests).toHaveLength(0);
  });

  it("refuses a write contract even when its name is allowlisted", async () => {
    const harness = createPool();

    await expect(
      queryRuntimeFunction(harness.pool, contractNamed(ALLOWLISTED_NAME, "write")),
    ).rejects.toBeInstanceOf(DatabaseContextError);
    expect(harness.requests).toHaveLength(0);
  });

  it("rolls back and releases when the contract fails", async () => {
    const harness = createPool({ failOn: ALLOWLISTED_NAME });

    await expect(
      queryRuntimeFunction(harness.pool, contractNamed(ALLOWLISTED_NAME)),
    ).rejects.toThrow(/failed/u);
    expect(harness.requests.map((request) => request.text)).toEqual([
      "begin",
      "set local role app_runtime",
      "select platform.location_is_active($1::uuid) as active",
      "rollback",
    ]);
    expect(harness.releaseCount()).toBe(1);
  });
});
