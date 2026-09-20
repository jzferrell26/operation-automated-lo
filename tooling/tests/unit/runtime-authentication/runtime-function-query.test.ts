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
  it("recognises exactly the twenty-four allowlisted contract names (006A-AC-003)", () => {
    expect([...RUNTIME_FUNCTION_CONTRACT_NAMES]).toEqual([
      "runtime.location-is-active.v1",
      "runtime.actor-is-active.v1",
      "runtime.current-role-version.v1",
      "runtime.lookup-first-party-session.v1",
      "runtime.touch-first-party-session.v1",
      "runtime.first-party-session-is-active.v1",
      "runtime.resolve-session-display.v1",
      "runtime.issue-first-party-session.v1",
      "runtime.revoke-first-party-session.v1",
      "runtime.record-denied-session-issuance.v1",
      "runtime.lookup-password-credential.v1",
      "runtime.lookup-password-credential-for-user.v1",
      "runtime.list-sign-in-bindings.v1",
      "runtime.record-password-sign-in-failure.v1",
      "runtime.record-password-sign-in-success.v1",
      "runtime.issue-credential-token.v1",
      "runtime.consume-credential-token.v1",
      "runtime.revoke-all-first-party-sessions-for-user.v1",
      "runtime.set-password.v1",
      "runtime.register-password-account.v1",
      "runtime.mark-email-verified.v1",
      "runtime.record-email-delivery.v1",
      "runtime.consume-auth-rate-limit.v1",
      "runtime.unverified-email-display-for-user.v1",
    ]);
    // PRD-006a D9 drops the persona resolver with the route that called it.
    expect(isRuntimeFunctionContractName("runtime.resolve-review-persona.v1")).toBe(false);
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
