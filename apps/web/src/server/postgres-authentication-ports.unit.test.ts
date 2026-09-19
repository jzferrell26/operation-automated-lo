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
  createPostgresFirstPartySessionIssuancePort,
  createPostgresRoleBindingPort,
  createPostgresSessionActivityPort,
  createPostgresSessionDisplayPort,
  firstPartySessionIsActive,
} from "./postgres-authentication-ports.js";

/**
 * These are the pure halves of the Postgres ports: reference parsing, the statement each port
 * sends, the parameters it binds, and how it decodes what PRD-005b's `security definer` functions
 * are specified to return. The pool below answers exactly what their contracts promise. Proving
 * the functions themselves behave that way is PRD-005b's pgTAP suite and the `pnpm test:db` run,
 * not this file.
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

describe("first-party session activity predicate (005A-AC-003)", () => {
  it("asks platform.first_party_session_is_active for a canonical session reference", async () => {
    const pool = createRecordingPool({
      "runtime.first-party-session-is-active.v1": [{ active: true }],
    });

    expect(await firstPartySessionIsActive(pool, formatSessionRef(SESSION_ID))).toBe(true);

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.first_party_session_is_active");
    expect(sent[0]?.values).toEqual([SESSION_ID]);
  });

  it("is false when the predicate refuses the session", async () => {
    const pool = createRecordingPool({
      "runtime.first-party-session-is-active.v1": [{ active: false }],
    });

    expect(await firstPartySessionIsActive(pool, formatSessionRef(SESSION_ID))).toBe(false);
  });

  it("is false, and sends nothing, for a reference that is not canonical", async () => {
    const pool = createRecordingPool({});

    expect(await firstPartySessionIsActive(pool, "session-not-canonical")).toBe(false);
    expect(contractRequests(pool)).toHaveLength(0);
  });
});

describe("session display port (005A-AC-011)", () => {
  it("returns both names for an active location and user", async () => {
    const pool = createRecordingPool({
      "runtime.resolve-session-display.v1": [
        {
          location_display_name: "Review location (not connected)",
          user_safe_display_name: "Review creator",
        },
      ],
    });

    expect(
      await createPostgresSessionDisplayPort(pool).resolve({
        locationRef: formatLocationRef(LOCATION_ID),
        actorRef: formatActorRef(ACTOR_ID),
      }),
    ).toEqual({
      locationDisplayName: "Review location (not connected)",
      userDisplayName: "Review creator",
    });

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.resolve_session_display");
    expect(sent[0]?.values).toEqual([LOCATION_ID, ACTOR_ID]);
  });

  it("returns nothing when the definer read yields no row", async () => {
    const pool = createRecordingPool({ "runtime.resolve-session-display.v1": [] });

    expect(
      await createPostgresSessionDisplayPort(pool).resolve({
        locationRef: formatLocationRef(LOCATION_ID),
        actorRef: formatActorRef(ACTOR_ID),
      }),
    ).toBeUndefined();
  });

  it("sends nothing for a reference that is not canonical", async () => {
    const pool = createRecordingPool({});

    expect(
      await createPostgresSessionDisplayPort(pool).resolve({
        locationRef: "location-not-canonical",
        actorRef: formatActorRef(ACTOR_ID),
      }),
    ).toBeUndefined();
    expect(contractRequests(pool)).toHaveLength(0);
  });
});

describe("first-party session issuance port (PRD-005b D4, as PRD-006a D9 leaves it)", () => {
  const secretHash = createHash("sha256").update("review-session-secret").digest("hex");

  it("issues with the hash only and returns a canonical session reference", async () => {
    const pool = createRecordingPool({
      "runtime.issue-first-party-session.v1": [{ id: SESSION_ID }],
    });

    expect(
      await createPostgresFirstPartySessionIssuancePort(pool).issue({
        locationId: LOCATION_ID,
        userId: ACTOR_ID,
        bindingRole: "creator",
        sessionRole: "campaign_creator",
        sessionSecretHash: secretHash,
        lifetimeSeconds: 43_200,
        issuedBy: "password_sign_in",
        correlationRef: "correlation_session_0123456789abcdef01234567",
      }),
    ).toBe(formatSessionRef(SESSION_ID));

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.issue_first_party_session");
    expect(sent[0]?.values).toEqual([
      LOCATION_ID,
      ACTOR_ID,
      "creator",
      "campaign_creator",
      secretHash,
      43_200,
      "password_sign_in",
      "correlation_session_0123456789abcdef01234567",
    ]);
    expect(JSON.stringify(pool.requests)).not.toContain("review-session-secret");
  });

  it("revokes and reports whether a row moved", async () => {
    const pool = createRecordingPool({
      "runtime.revoke-first-party-session.v1": [{ revoked: true }],
    });

    expect(
      await createPostgresFirstPartySessionIssuancePort(pool).revoke({
        sessionRef: formatSessionRef(SESSION_ID),
        reason: "sign_out",
        correlationRef: "correlation_signOut_0123456789abcdef01234",
      }),
    ).toBe(true);

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.revoke_first_party_session");
    expect(sent[0]?.values).toEqual([
      SESSION_ID,
      "sign_out",
      "correlation_signOut_0123456789abcdef01234",
    ]);
  });

  it("revokes nothing for a reference that is not canonical", async () => {
    const pool = createRecordingPool({});

    expect(
      await createPostgresFirstPartySessionIssuancePort(pool).revoke({
        sessionRef: "session-not-canonical",
        reason: "sign_out",
        correlationRef: "correlation_signOut_0123456789abcdef01234",
      }),
    ).toBe(false);
    expect(contractRequests(pool)).toHaveLength(0);
  });
});

describe("session activity port (PRD-005b D4)", () => {
  it("touches an active session by its canonical reference", async () => {
    const pool = createRecordingPool({ "runtime.touch-first-party-session.v1": [] });

    await createPostgresSessionActivityPort(pool).touch(formatSessionRef(SESSION_ID));

    const sent = contractRequests(pool);
    expect(sent[0]?.text).toContain("platform.touch_first_party_session");
    expect(sent[0]?.values).toEqual([SESSION_ID]);
  });

  it("sends nothing for a reference that is not canonical", async () => {
    const pool = createRecordingPool({});

    await createPostgresSessionActivityPort(pool).touch("session-not-canonical");

    expect(contractRequests(pool)).toHaveLength(0);
  });
});
