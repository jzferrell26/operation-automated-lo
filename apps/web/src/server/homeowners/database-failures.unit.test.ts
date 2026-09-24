import { describe, expect, it } from "vitest";
import {
  PostgresHomeownerRepository,
  readSharedHomeReport,
  recordSharedHomeEvent,
  claimDueHomeProperties,
  type DatabasePool,
  type SqlRequest,
} from "@oalo/db";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { homeownerInput, homeownerValuation } from "./homeowner-fixtures.js";

const context = {
  locationId: "00000000-0000-4000-8000-000000000121",
  actorId: "00000000-0000-4000-8000-000000000122",
  correlationId: "correlation_home_failure_fixture",
};
const input = homeownerInput();
const propertyId = `home_${"a".repeat(32)}`;
const report = buildHomeReport(
  input,
  homeownerValuation(),
  `hreport_${"b".repeat(32)}`,
  propertyId,
  new Date(),
);
const reservation = {
  input,
  propertyId,
  requestHash: "c".repeat(64),
  addressHash: "d".repeat(64),
  monthlyLimit: 10,
  refresh: false,
};

/** Failure injection at the SQL driver boundary; actual RLS is tested against Postgres separately. */
function driver(responses: Record<string, readonly unknown[] | Error>) {
  const calls: SqlRequest[] = [];
  let releases = 0;
  const pool: DatabasePool = {
    async connect() {
      return {
        async execute(request) {
          calls.push(request);
          if (request.statementName === "transaction.read-context")
            return {
              rows: [
                {
                  location_id: context.locationId,
                  actor_id: context.actorId,
                  correlation_id: context.correlationId,
                },
              ],
              rowCount: 1,
            };
          if (
            request.statementName.startsWith("transaction.") ||
            request.statementName.startsWith("homeowner.capability-")
          )
            return { rows: [], rowCount: 0 };
          const response = responses[request.statementName];
          if (response instanceof Error) throw response;
          if (response === undefined)
            throw new Error(`Unplanned database request: ${request.statementName}`);
          return { rows: response, rowCount: response.length };
        },
        async release() {
          releases += 1;
        },
      };
    },
  };
  return {
    pool,
    calls,
    releaseCount: () => releases,
    repository: new PostgresHomeownerRepository(pool, {
      async resolveTenantDatabaseContext() {
        return context;
      },
    }),
  };
}
const reserveResponses = () => ({
  "homeowner.lock-location": [],
  "homeowner.read-request": [],
  "homeowner.prior-usage": [{ count: 0 }],
  "homeowner.property-binding": [],
  "homeowner.pending-lookup": [{ count: 0 }],
  "homeowner.cached-valuation": [],
  "homeowner.usage": [{ count: 0 }],
  "homeowner.property-count": [{ count: 0 }],
  "homeowner.insert-property": [{ id: propertyId }],
  "homeowner.reserve-lookup": [{ id: propertyId }],
  "homeowner.reserve-usage": [{ id: input.requestId }],
});

describe("homeowner database failure boundaries", () => {
  it("reserves usage atomically and rolls everything back when the usage write fails", async () => {
    const success = driver(reserveResponses());
    expect((await success.repository.reserve(reservation)).kind).toBe("reserved");
    expect(
      success.calls.find((call) => call.statementName === "homeowner.insert-property")?.text,
    ).toContain("$6::text::jsonb");
    expect(
      success.calls.find((call) => call.statementName === "homeowner.insert-property")?.values,
    ).toContain(context.locationId);
    expect(success.calls.at(-1)?.statementName).toBe("transaction.commit");
    expect(success.releaseCount()).toBe(1);
    const failure = driver({
      ...reserveResponses(),
      "homeowner.reserve-usage": new Error("Simulated database write failure"),
    });
    await expect(failure.repository.reserve(reservation)).rejects.toThrow(
      "Simulated database write failure",
    );
    expect(failure.calls.at(-1)?.statementName).toBe("transaction.rollback");
    expect(failure.releaseCount()).toBe(1);
  });
  it("rejects conflicting replay and malformed persisted records before mutating anything", async () => {
    const replay = driver({
      "homeowner.lock-location": [],
      "homeowner.read-request": [
        {
          status: "ready",
          request_hash: reservation.requestHash,
          report_id: report.id,
          error_code: null,
        },
      ],
      "homeowner.read-report": [{ snapshot: report }],
    });
    expect((await replay.repository.reserve(reservation)).report).toEqual(report);
    await expect(
      replay.repository.reserve({ ...reservation, requestHash: "e".repeat(64) }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(replay.calls.some((call) => call.statementName === "homeowner.reserve-usage")).toBe(
      false,
    );
    const corrupt = driver({ "homeowner.read-report": [{ snapshot: { id: report.id } }] });
    await expect(corrupt.repository.getReport(report.id)).rejects.toThrow();
    expect(corrupt.calls.at(-1)?.statementName).toBe("transaction.rollback");
  });
  it("returns saved property history with normalized database dates and no provider operation", async () => {
    const stored = driver({
      "homeowner.list-properties": [
        {
          id: propertyId,
          contact_id: input.contactId,
          contact_name: input.contactName,
          address: input.address,
          created_at: new Date(report.createdAt),
          updated_at: report.createdAt,
          cadence: "off",
          paused: false,
          deliver_updates: false,
          next_refresh_at: null,
          review_requested_at: null,
          last_error: null,
          reports: [report],
        },
      ],
      "homeowner.ghl-location": [{ ghl_location_id: "fixture-location" }],
      "homeowner.usage": [{ count: 3 }],
      "homeowner.read-report": [],
      "homeowner.list-shares": [
        { id: "share", expires_at: new Date(report.createdAt), revoked: true },
      ],
      "homeowner.read-delivery": [{ status: "uncertain", detail_code: "NETWORK" }],
    });
    expect((await stored.repository.list())[0]).toMatchObject({
      id: propertyId,
      createdAt: report.createdAt,
      reports: [report],
    });
    expect(await stored.repository.ghlLocation()).toBe("fixture-location");
    expect(await stored.repository.usage()).toBe(3);
    expect(await stored.repository.getReport(report.id)).toBeNull();
    expect((await stored.repository.shares(report.id))[0]?.revoked).toBe(true);
    expect(await stored.repository.delivery(report.id)).toEqual({
      status: "uncertain",
      detailCode: "NETWORK",
    });
    expect(stored.releaseCount()).toBe(6);
  });
  it("holds snapshot insertion, completion and property update in one transaction", async () => {
    const responses = {
      "homeowner.lock-lookup": [
        {
          status: "pending",
          request_hash: reservation.requestHash,
          report_id: null,
          error_code: null,
        },
      ],
      "homeowner.insert-report": [{ id: report.id }],
      "homeowner.complete-lookup": [{ id: propertyId }],
      "homeowner.touch-property": [{ id: propertyId }],
    };
    const success = driver(responses);
    await success.repository.complete(report);
    expect(
      success.calls.find((call) => call.statementName === "homeowner.insert-report")?.values[3],
    ).toBe(JSON.stringify(report));
    expect(success.calls.at(-1)?.statementName).toBe("transaction.commit");
    const failure = driver({
      ...responses,
      "homeowner.touch-property": new Error("Connection interrupted"),
    });
    await expect(failure.repository.complete(report)).rejects.toThrow("Connection interrupted");
    expect(failure.calls.at(-1)?.statementName).toBe("transaction.rollback");
    const completed = driver({
      "homeowner.lock-lookup": [
        {
          status: "ready",
          request_hash: reservation.requestHash,
          report_id: report.id,
          error_code: null,
        },
      ],
    });
    await completed.repository.complete(report);
    expect(completed.calls.some((call) => call.statementName === "homeowner.insert-report")).toBe(
      false,
    );
  });
  it("surfaces missing enrollment writes and persists explicit failed or uncertain outcomes", async () => {
    const missing = driver({ "homeowner.enrollment": [] });
    await expect(
      missing.repository.enrollment(propertyId, {
        cadence: "off",
        paused: true,
        deliverUpdates: false,
        nextRefreshAt: null,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const saved = driver({
      "homeowner.fail-lookup": [{ id: propertyId }],
      "homeowner.flag-property": [{ id: propertyId }],
      "homeowner.enrollment": [{ id: propertyId }],
      "homeowner.reserve-delivery": [],
      "homeowner.finish-delivery": [{ id: report.id }],
      "homeowner.advance-schedule": [{ id: propertyId }],
    });
    await saved.repository.fail(input.requestId, propertyId, "TIMEOUT", true);
    expect(
      saved.calls.find((call) => call.statementName === "homeowner.fail-lookup")?.values[2],
    ).toBe("uncertain");
    await saved.repository.enrollment(propertyId, {
      cadence: "off",
      paused: true,
      deliverUpdates: false,
      nextRefreshAt: null,
    });
    expect(await saved.repository.reserveDelivery(report.id)).toBe(false);
    await saved.repository.finishDelivery(report.id, "blocked", "HUMAN_REVIEWED", null);
    await saved.repository.advanceSchedule(propertyId, report.createdAt, null, "LOOKUP_LIMIT");
    expect(saved.calls.filter((call) => call.statementName === "transaction.commit")).toHaveLength(
      5,
    );
  });
  it("executes only fixed share/worker capability functions and rolls back failures", async () => {
    const limited = driver({
      "homeowner.read-share": [{ snapshot: report }],
      "homeowner.record-event": [{ accepted: true }],
      "homeowner.claim-due": [
        { location_id: context.locationId, property_id: propertyId, actor_id: context.actorId },
      ],
    });
    expect(await readSharedHomeReport(limited.pool, "a".repeat(64))).toEqual(report);
    expect(
      await recordSharedHomeEvent(
        limited.pool,
        "a".repeat(64),
        "review_requested",
        input.requestId,
      ),
    ).toBe(true);
    expect((await claimDueHomeProperties(limited.pool))[0]?.propertyId).toBe(propertyId);
    expect(
      limited.calls
        .filter((call) => call.statementName === "homeowner.capability-role")
        .map((call) => call.text),
    ).toEqual([
      "set local role app_runtime",
      "set local role app_runtime",
      "set local role scheduler_runtime",
    ]);
    const failure = driver({ "homeowner.read-share": new Error("Database unavailable") });
    await expect(readSharedHomeReport(failure.pool, "a".repeat(64))).rejects.toThrow(
      "Database unavailable",
    );
    expect(failure.calls.at(-1)?.statementName).toBe("homeowner.capability-rollback");
    expect(failure.releaseCount()).toBe(1);
  });
});
