import { createHash, randomBytes } from "node:crypto";

import {
  formatActorRef,
  formatInstallationRef,
  formatLocationRef,
  formatSessionRef,
} from "@oalo/contracts";
import type { DatabaseConnection, DatabasePool, SqlRequest } from "@oalo/db";
import { describe, expect, it } from "vitest";

import {
  createPostgresFirstPartySessionLookup,
  createPostgresIdentityDirectory,
  createPostgresRoleBindingPort,
} from "./postgres-authentication-ports.js";

/**
 * These are the pure halves of the Postgres ports: reference parsing, the statement each port
 * sends, the parameters it binds, and how it decodes what PRD-005b's `security definer` functions
 * are specified to return. The functions themselves do not exist in this worktree, so the pool
 * below answers exactly what their contracts promise. Proving the functions behave that way is
 * PRD-005b's pgTAP suite and the Wave 2 `pnpm test:db` run, not this file.
 */

const LOCATION_ID = "00000000-0000-4000-8000-0000000007a1";
const ACTOR_ID = "00000000-0000-4000-8000-0000000007a2";
const SESSION_ID = "00000000-0000-4000-8000-0000000007a3";
const INSTALLATION_ID = "00000000-0000-4000-8000-0000000007a4";

interface RecordedPool extends DatabasePool {
  readonly requests: readonly SqlRequest[];
}

function createRecordingPool(rowsByStatement: Readonly<Record<string, readonly unknown[]>>) {
  const requests: SqlRequest[] = [];
  const connection: DatabaseConnection = {
    async execute(request) {
      requests.push(request);
      const rows = rowsByStatement[request.statementName] ?? [];
      return { rows, rowCount: rows.length };
    },
    async release() {
      return undefined;
    },
  };
  const pool: RecordedPool = {
    requests,
    async connect() {
      return connection;
    },
  };
  return pool;
}

function contractRequests(pool: RecordedPool): readonly SqlRequest[] {
  return pool.requests.filter((request) => request.statementName.startsWith("runtime."));
}

describe("Postgres identity directory", () => {
  it("resolves a canonical reference to its UUID when the row is active", async () => {
    const pool = createRecordingPool({
      "runtime.location-is-active.v1": [{ active: true }],
      "runtime.actor-is-active.v1": [{ active: true }],
    });
    const directory = createPostgresIdentityDirectory(pool);

    expect(await directory.resolveLocationId(formatLocationRef(LOCATION_ID))).toBe(LOCATION_ID);
    expect(await directory.resolveActorId(formatActorRef(ACTOR_ID))).toBe(ACTOR_ID);

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.location_is_active");
    expect(sent[0]?.values).toEqual([LOCATION_ID]);
    expect(sent[1]?.text).toContain("platform.actor_is_active");
    expect(sent[1]?.values).toEqual([ACTOR_ID]);
  });

  it("resolves nothing when the predicate answers false or returns no row", async () => {
    const pool = createRecordingPool({
      "runtime.location-is-active.v1": [{ active: false }],
      "runtime.actor-is-active.v1": [],
    });
    const directory = createPostgresIdentityDirectory(pool);

    expect(await directory.resolveLocationId(formatLocationRef(LOCATION_ID))).toBeUndefined();
    expect(await directory.resolveActorId(formatActorRef(ACTOR_ID))).toBeUndefined();
  });

  /** A non-canonical reference never reaches the database at all. */
  it.each([
    "location-0000000040008000000000000007a1",
    "location_short",
    "location_0000000040008000000000000007A1",
    "location_0000000040008000000000000007a",
    "actor_0000000040008000000000000007a1",
    "",
  ])("refuses the non-canonical location reference %s before any statement runs", async (value) => {
    const pool = createRecordingPool({ "runtime.location-is-active.v1": [{ active: true }] });

    expect(await createPostgresIdentityDirectory(pool).resolveLocationId(value)).toBeUndefined();
    expect(contractRequests(pool)).toHaveLength(0);
  });
});

describe("Postgres role binding port", () => {
  it("maps the application role through the shared map and decodes the derived version", async () => {
    const pool = createRecordingPool({
      "runtime.current-role-version.v1": [{ role_version: "1789459200000000" }],
    });

    const version = await createPostgresRoleBindingPort(pool).currentRoleVersion({
      actorRef: formatActorRef(ACTOR_ID),
      locationRef: formatLocationRef(LOCATION_ID),
      role: "campaign_approver",
    });

    expect(version).toBe(1_789_459_200_000_000);
    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.current_role_version");
    expect(sent[0]?.values).toEqual([LOCATION_ID, ACTOR_ID, "approver"]);
  });

  it.each([
    ["a null version, which is the no-active-binding answer", [{ role_version: null }]],
    ["no row at all", []],
    ["a version beyond the safe integer range", [{ role_version: "9007199254740993" }]],
    ["a non-positive version", [{ role_version: "0" }]],
  ])("returns undefined for %s", async (_label, rows) => {
    const pool = createRecordingPool({ "runtime.current-role-version.v1": rows });

    expect(
      await createPostgresRoleBindingPort(pool).currentRoleVersion({
        actorRef: formatActorRef(ACTOR_ID),
        locationRef: formatLocationRef(LOCATION_ID),
        role: "campaign_creator",
      }),
    ).toBeUndefined();
  });

  /** `platform_support` has no binding, so it can never produce a version or a session. */
  it("refuses an application role that no database binding backs", async () => {
    const pool = createRecordingPool({
      "runtime.current-role-version.v1": [{ role_version: "1789459200000000" }],
    });

    expect(
      await createPostgresRoleBindingPort(pool).currentRoleVersion({
        actorRef: formatActorRef(ACTOR_ID),
        locationRef: formatLocationRef(LOCATION_ID),
        role: "platform_support",
      }),
    ).toBeUndefined();
    expect(contractRequests(pool)).toHaveLength(0);
  });
});

describe("Postgres first-party session lookup", () => {
  const secret = randomBytes(32).toString("base64url");
  const secretHash = createHash("sha256").update(secret).digest("hex");
  const nowEpochSeconds = 1_760_000_000;

  function sessionRows(expiresAt: string) {
    return [
      {
        id: SESSION_ID,
        location_id: LOCATION_ID,
        user_id: ACTOR_ID,
        installation_id: INSTALLATION_ID,
        session_role: "campaign_creator",
        role_version: "1789459200000000",
        expires_at: expiresAt,
      },
    ];
  }

  it("hashes the secret, binds only the hash, and returns canonical references", async () => {
    const pool = createRecordingPool({
      "runtime.lookup-first-party-session.v1": sessionRows("2027-01-01T00:00:00.000Z"),
    });

    const session = await createPostgresFirstPartySessionLookup(pool).getActive(
      secret,
      nowEpochSeconds,
    );

    expect(session).toEqual({
      sessionId: formatSessionRef(SESSION_ID),
      userId: formatActorRef(ACTOR_ID),
      locationId: formatLocationRef(LOCATION_ID),
      installationId: formatInstallationRef(INSTALLATION_ID),
      role: "campaign_creator",
      roleVersion: 1_789_459_200_000_000,
      expiresAtEpochSeconds: Math.floor(Date.parse("2027-01-01T00:00:00.000Z") / 1000),
    });

    const sent = contractRequests(pool);
    expect(sent[0]?.values).toEqual([secretHash]);
    expect(JSON.stringify(pool.requests)).not.toContain(secret);
  });

  it("returns nothing when the store reports no active row", async () => {
    const pool = createRecordingPool({ "runtime.lookup-first-party-session.v1": [] });

    expect(
      await createPostgresFirstPartySessionLookup(pool).getActive(secret, nowEpochSeconds),
    ).toBeUndefined();
  });

  it("re-checks expiry against the caller's clock", async () => {
    const pool = createRecordingPool({
      "runtime.lookup-first-party-session.v1": sessionRows("2020-01-01T00:00:00.000Z"),
    });

    expect(
      await createPostgresFirstPartySessionLookup(pool).getActive(secret, nowEpochSeconds),
    ).toBeUndefined();
  });

  it("refuses a session role outside the six application roles", async () => {
    const rows = sessionRows("2027-01-01T00:00:00.000Z").map((row) => ({
      ...row,
      session_role: "realtor_collaborator",
    }));
    const pool = createRecordingPool({ "runtime.lookup-first-party-session.v1": rows });

    expect(
      await createPostgresFirstPartySessionLookup(pool).getActive(secret, nowEpochSeconds),
    ).toBeUndefined();
  });
});
