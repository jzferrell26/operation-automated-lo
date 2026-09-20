import { createHash } from "node:crypto";

import { createSessionBoundCsrfToken } from "@oalo/auth";
import { formatSessionRef } from "@oalo/contracts";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  expireReviewCredentialLock,
  grantReviewBinding,
  countAuditEventsForActor,
  readAuditEventsForCorrelation,
  readAuthRateLimitRows,
  readFirstPartySessionsForUser,
  readReviewCredential,
  revokeReviewBinding,
  suspendReviewActor,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import { POST as signInRoutePost } from "../app/api/auth/sign-in/route.js";
import { POST as preflightPost } from "../app/api/campaigns/preflight/route.js";
import type { CampaignCommandPorts } from "./authenticated-principal.js";
import { OPEN_HOUSE_DRAFT_INPUT } from "./campaign-command-test-support.js";
import {
  REVIEW_HOST,
  REVIEW_ORIGIN,
  applyRouteEnvironment,
  createRouteTestPool,
  csrfSecretFor,
  seedActor,
  seedLocation,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import {
  UNKNOWN_CLIENT_ADDRESS_BUCKET,
  flushAuthBackgroundWork,
  handleChangePassword,
  handleChooseWorkspace,
  handleForgotPassword,
  handlePasswordSignIn,
  handlePasswordSignUp,
  handleResendVerificationEmail,
  handleResetPassword,
  handleSignOut,
  handleVerifyEmail,
  rateLimitKeyHash,
} from "./password-authentication-handler.js";
import {
  authEnvironment,
  authRequest,
  createFetchRecorder,
  resetLinkTokenFrom,
  resetRateLimitKey,
  seedCredential,
  sessionCookieFrom,
} from "./password-authentication-support.js";
import {
  resolveRuntimeCampaignCommandPorts,
  resolveRuntimeShellSession,
} from "./runtime-authentication.js";

/**
 * PRD-006a 006A-AC-012 through 016, 022, 023, 026, 028, and 031, driven through the exported
 * handlers against a disposable PostgreSQL with the real composition.
 *
 * Nothing here inserts a session row. Every session in this file is minted the way a browser
 * mints one: an email address and a password go in, and the server does the rest, so what is
 * proven is the exchange itself and not a fixture that resembles it.
 */

const PASSWORD = "a settled harbour lantern";
const WRONG_PASSWORD_SAME_LENGTH = "a settled harbour lantErn";
const CREATOR_EMAIL = "route-creator@oalo.invalid";
const SUSPENDED_EMAIL = "route-suspended@oalo.invalid";
const UNBOUND_EMAIL = "route-unbound@oalo.invalid";
const MULTI_EMAIL = "route-multi@oalo.invalid";
const LOCKOUT_EMAIL = "route-lockout@oalo.invalid";
const CHANGE_EMAIL = "route-change@oalo.invalid";
const DENIED_EMAIL = "route-denied@oalo.invalid";
const LOCK_EXTENSION_EMAIL = "route-lock-extension@oalo.invalid";
const RESET_CLEARS_LOCK_EMAIL = "route-reset-clears-lock@oalo.invalid";
const NEW_PASSWORD = "a brighter harbour lantern";
const RESEND_KEY = "re_a_throwaway_key_for_the_proofs";

let pool: PostgresDatabasePool;
let environment: RoutePostgresEnvironment;
let restoreEnvironment: () => void;
let location: SeededLocation;
let secondLocation: SeededLocation;
let csrfServerSecret: Uint8Array;
let creatorId: string;
let suspendedId: string;
let unboundId: string;
let multiId: string;
let lockoutId: string;
let changeId: string;
let deniedId: string;
let lockExtensionId: string;
let resetClearsLockId: string;

/** A different client address per proof, so a rate-limit window is never shared by accident. */
let addressCounter = 0;
function nextClientAddress(): string {
  addressCounter += 1;
  return `203.0.113.${String(addressCounter)}`;
}

beforeAll(async () => {
  environment = authEnvironment();
  restoreEnvironment = applyRouteEnvironment(environment);
  csrfServerSecret = csrfSecretFor(environment);
  pool = createRouteTestPool();

  location = await seedLocation(pool, "Password sign-in workspace");
  secondLocation = await seedLocation(pool, "Password second workspace");

  creatorId = (
    await seedActor(pool, location, {
      displayName: "Priya Raman",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    })
  ).actorId;
  suspendedId = (
    await seedActor(pool, location, {
      displayName: "Suspended person",
      bindingRole: "approver",
      sessionRole: "campaign_approver",
    })
  ).actorId;
  unboundId = (
    await seedActor(pool, location, {
      displayName: "Unbound person",
      bindingRole: "publisher",
      sessionRole: "campaign_publisher",
    })
  ).actorId;
  lockoutId = (
    await seedActor(pool, location, {
      displayName: "Lockout person",
      bindingRole: "analyst",
      sessionRole: "viewer",
    })
  ).actorId;
  changeId = (
    await seedActor(pool, location, {
      displayName: "Change person",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    })
  ).actorId;
  multiId = (
    await seedActor(pool, location, {
      displayName: "Multi workspace person",
      bindingRole: "realtor_collaborator",
      sessionRole: "viewer",
    })
  ).actorId;
  // 006A-AC-031 counts the denied rows a refusal writes. That count has to be taken on an account
  // no other proof in this file touches, because a failed attempt here and a successful one there
  // share a counter, and a shared counter turns "exactly one" into an accident of ordering.
  deniedId = (
    await seedActor(pool, location, {
      displayName: "Denied attempt person",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    })
  ).actorId;

  await seedCredential(pool, { userId: creatorId, email: CREATOR_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: suspendedId, email: SUSPENDED_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: unboundId, email: UNBOUND_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: multiId, email: MULTI_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: lockoutId, email: LOCKOUT_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: changeId, email: CHANGE_EMAIL, password: PASSWORD });
  // Two accounts of their own for the two lock proofs. A lock is per account, so a proof that
  // reads `locked_until` on an account another case also fails against is reading a number two
  // cases wrote.
  lockExtensionId = (
    await seedActor(pool, location, {
      displayName: "Lock extension person",
      bindingRole: "analyst",
      sessionRole: "viewer",
    })
  ).actorId;
  resetClearsLockId = (
    await seedActor(pool, location, {
      displayName: "Reset clears lock person",
      bindingRole: "analyst",
      sessionRole: "viewer",
    })
  ).actorId;

  await seedCredential(pool, { userId: deniedId, email: DENIED_EMAIL, password: PASSWORD });
  await seedCredential(pool, {
    userId: lockExtensionId,
    email: LOCK_EXTENSION_EMAIL,
    password: PASSWORD,
  });
  await seedCredential(pool, {
    userId: resetClearsLockId,
    email: RESET_CLEARS_LOCK_EMAIL,
    password: PASSWORD,
  });
});

afterAll(async () => {
  await pool.close();
  restoreEnvironment();
});

/*
 * No rate-limit reset runs between these proofs. Each one takes its own client address from
 * `nextClientAddress`, so no two of them share a counter, and clearing the table would delete the
 * counters the recovery suite is using in parallel.
 */

async function signIn(
  body: unknown,
  overrides: Readonly<{
    origin?: string;
    host?: string;
    clientAddress?: string;
    withoutClientAddress?: boolean;
    /** A pinned clock, for the proofs that have to stand at a named instant inside a lock. */
    nowEpochSeconds?: number;
  }> = {},
): Promise<Response> {
  const request = authRequest("/api/auth/sign-in", body, overrides);
  if (overrides.nowEpochSeconds === undefined) return handlePasswordSignIn(request);
  const pinned = overrides.nowEpochSeconds;
  return handlePasswordSignIn(
    request,
    process.env,
    resolveRuntimeCampaignCommandPorts(process.env),
    {
      nowEpochSeconds: () => pinned,
    },
  );
}

/**
 * Signs `email` in and proves it works, applies `change` to the account, then proves the next
 * sign-in is refused with the same answer a wrong password gets. The suspended-user and
 * revoked-binding proofs of 006A-AC-013 differ only in the change.
 */
async function expectSignInRefusedAfter(
  email: string,
  change: () => Promise<unknown>,
): Promise<void> {
  const before = await signIn(
    { email, password: PASSWORD },
    { clientAddress: nextClientAddress() },
  );
  expect(before.status).toBe(200);

  await change();

  const after = await signIn({ email, password: PASSWORD }, { clientAddress: nextClientAddress() });
  expect(after.status).toBe(401);
  expect(await after.text()).toBe('{"error":"AUTH_CREDENTIALS_REJECTED"}');
  expect(after.headers.get("set-cookie")).toBeNull();
}

/**
 * The `action:result` pairs each of a run of attempts wrote, one sorted list per attempt.
 *
 * Reading every correlation reference rather than the last one is what lets a case say "exactly
 * one": a row written early, or written twice, shows up as a mismatch on one of the others. The
 * rows of a single attempt are written inside one transaction, so they share a `created_at` and
 * the read's tie-break is a random uuid; what is pinned is therefore the set of rows, sorted, and
 * not an order the database never promised.
 */
async function auditActionsPerAttempt(
  correlationRefs: readonly string[],
): Promise<readonly (readonly string[])[]> {
  return Promise.all(
    correlationRefs.map(async (reference) => {
      const events = await readAuditEventsForCorrelation(pool, reference);
      return events.map((event) => `${event.action}:${event.result}`).sort();
    }),
  );
}

/** Runs one case under a different deployment and puts this suite's own back afterwards. */
async function underDeployment(
  overrides: Readonly<Record<string, string>>,
  work: () => Promise<void>,
): Promise<void> {
  restoreEnvironment();
  const restoreOverridden = applyRouteEnvironment({ ...authEnvironment(), ...overrides });
  try {
    await work();
  } finally {
    restoreOverridden();
    restoreEnvironment = applyRouteEnvironment(environment);
  }
}

async function newestSessionRefFor(userId: string): Promise<string> {
  const sessions = await readFirstPartySessionsForUser(pool, userId);
  const newest = sessions[0];
  if (newest === undefined) throw new Error("No session row was written for this person");
  return formatSessionRef(newest.id);
}

describe("POST /api/auth/sign-in", () => {
  it("issues a session whose cookie the campaign routes accept (006A-AC-012)", async () => {
    const response = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );

    expect(response.status).toBe(200);
    expect(await response.clone().json()).toEqual({ next: "/overview" });
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-oalo_session=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=43200");

    const sessions = await readFirstPartySessionsForUser(pool, creatorId);
    expect(sessions[0]?.issuedBy).toBe("password_sign_in");
    expect(sessions[0]?.lifetimeSeconds).toBe(43_200);

    const cookie = sessionCookieFrom(response);
    expect(cookie).toBeDefined();
    const sessionRef = await newestSessionRefFor(creatorId);
    const preflight = await preflightPost(
      new Request(`${REVIEW_ORIGIN}/api/campaigns/preflight`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookie ?? "",
          origin: REVIEW_ORIGIN,
          host: REVIEW_HOST,
          "x-csrf-token": createSessionBoundCsrfToken({
            serverSecret: csrfServerSecret,
            sessionId: sessionRef,
          }),
        },
        body: JSON.stringify(OPEN_HOUSE_DRAFT_INPUT),
      }),
    );

    expect(preflight.status).toBe(200);
  });

  it("writes one sign-in row and one issuance row, and leaks nothing (006A-AC-031)", async () => {
    const response = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";

    const events = await readAuditEventsForCorrelation(pool, correlationRef);
    expect(events.map((event) => `${event.action}:${event.result}`)).toEqual([
      "auth.sign-in:success",
      "session.issued:success",
    ]);

    const rendered = `${JSON.stringify(events)}\n${await response.clone().text()}`;
    expect(rendered).not.toContain(PASSWORD);
    const credential = await readReviewCredential(pool, creatorId);
    expect(rendered).not.toContain(credential?.passwordHash ?? "no hash");

    // 006A-AC-031 names the session secret and its hash alongside the password and the password
    // hash. The secret has exactly one legitimate home, the `Set-Cookie` header, so it is read
    // back from there and then looked for everywhere else: a leak of the cookie value or of the
    // hash the session row is keyed by is a session takeover, not a formatting mistake.
    const sessionSecret = sessionCookieFrom(response)?.split("=")[1] ?? "";
    expect(sessionSecret.length).toBeGreaterThan(0);
    expect(rendered).not.toContain(sessionSecret);
    expect(rendered).not.toContain(createHash("sha256").update(sessionSecret).digest("hex"));
  });

  /**
   * 006A-AC-031 and 005B-AC-016, the denied half. The success path is counted above; a refusal is
   * the case where an over-eager handler double-writes, because the failure is recorded once by
   * the credential function and once again by whatever catches the error. One correlation
   * reference, one row.
   */
  it("writes exactly one denied sign-in row for a refused attempt (006A-AC-031)", async () => {
    const response = await signIn(
      { email: DENIED_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
      { clientAddress: nextClientAddress() },
    );
    expect(response.status).toBe(401);

    const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";
    expect(correlationRef.length).toBeGreaterThan(0);
    const events = await readAuditEventsForCorrelation(pool, correlationRef);

    expect(events.map((event) => `${event.action}:${event.result}`)).toEqual([
      "auth.sign-in:denied",
    ]);
  });

  it("honours keep me signed in with the thirty-day lifetime (006A-AC-012)", async () => {
    const response = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD, keepSignedIn: true },
      { clientAddress: nextClientAddress() },
    );

    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");
    const sessions = await readFirstPartySessionsForUser(pool, creatorId);
    expect(sessions[0]?.lifetimeSeconds).toBe(2_592_000);
  });

  /**
   * 006A-AC-013. Seven refusals, one body. The bodies are compared byte for byte rather than by
   * status alone, because a caller who can tell "no such address" from "wrong password" has an
   * account-existence oracle whatever the status says.
   */
  it("answers every credential refusal with one byte-identical body and no cookie", async () => {
    const address = nextClientAddress();
    const attempts: readonly Readonly<{ name: string; response: Response }>[] = [
      {
        name: "wrong password",
        response: await signIn(
          { email: CREATOR_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
          { clientAddress: address },
        ),
      },
      {
        name: "unknown address",
        response: await signIn(
          { email: "nobody@oalo.invalid", password: PASSWORD },
          { clientAddress: address },
        ),
      },
      {
        name: "person with no active binding",
        response: await signIn(
          { email: UNBOUND_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
          { clientAddress: address },
        ),
      },
      {
        name: "unlisted origin",
        response: await signIn(
          { email: CREATOR_EMAIL, password: PASSWORD },
          { origin: "https://attacker.example", clientAddress: address },
        ),
      },
      {
        name: "wrong host",
        response: await signIn(
          { email: CREATOR_EMAIL, password: PASSWORD },
          { host: "elsewhere.example", clientAddress: address },
        ),
      },
    ];

    const bodies = new Set<string>();
    for (const attempt of attempts) {
      expect(attempt.response.status, attempt.name).toBe(401);
      expect(attempt.response.headers.get("set-cookie"), attempt.name).toBeNull();
      bodies.add(await attempt.response.text());
    }
    expect([...bodies]).toEqual(['{"error":"AUTH_CREDENTIALS_REJECTED"}']);
  });

  it("refuses a person whose last binding was revoked (006A-AC-013)", async () => {
    // The password is right and the account is active. What is missing is a binding that grants a
    // session, and the answer is the same one a wrong password gets.
    await expectSignInRefusedAfter(UNBOUND_EMAIL, () =>
      revokeReviewBinding(pool, location.locationId, unboundId, "publisher"),
    );
  });

  /**
   * 006A-AC-013. The origin and host checks run before anything reads or writes, so a cross-site
   * post costs the deployment nothing. The rate limiter is the first thing that touches the
   * database on this route, so the absence of its counter row for this address is the proof: a
   * refused origin never got that far.
   */
  it("touches no database on a refused origin or host (006A-AC-013)", async () => {
    const gate = resolveRuntimeCampaignCommandPorts(environment).mutation;
    expect(gate).toBeDefined();
    const address = nextClientAddress();
    const keyHash = rateLimitKeyHash(
      gate?.csrfServerSecret ?? new Uint8Array(32),
      "sign_in_ip",
      address,
    );

    const wrongOrigin = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { origin: "https://attacker.example", clientAddress: address },
    );
    const wrongHost = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { host: "elsewhere.example", clientAddress: address },
    );

    expect(wrongOrigin.status).toBe(401);
    expect(wrongHost.status).toBe(401);
    expect(
      (await readAuthRateLimitRows(pool, "sign_in_ip")).filter((row) => row.keyHash === keyHash),
    ).toEqual([]);
  });

  /**
   * 006A-AC-029. The credentials the gate's own seeding run created, signed in with through the
   * real route. This is what makes the seeding runbook a tested procedure rather than a described
   * one: if `--password-stdin` ever stops writing a usable credential, this fails.
   */
  it("signs in with the credentials the gate seeded (006A-AC-029)", async () => {
    const seededEmail = process.env["OALO_TEST_SEEDED_SIGN_IN_EMAIL"];
    const seededPassword = process.env["OALO_TEST_SEEDED_SIGN_IN_PASSWORD"];
    if (seededEmail === undefined || seededPassword === undefined) {
      throw new Error(
        "OALO_TEST_SEEDED_SIGN_IN_EMAIL and OALO_TEST_SEEDED_SIGN_IN_PASSWORD are set by the gate before this suite runs",
      );
    }

    const response = await signIn(
      { email: seededEmail, password: seededPassword },
      { clientAddress: nextClientAddress() },
    );

    expect(response.status).toBe(200);
    expect(await response.clone().json()).toEqual({ next: "/overview" });
    expect(sessionCookieFrom(response)).toBeDefined();

    // And the wrong password for the same seeded person is refused the same way as any other.
    const refused = await signIn(
      { email: seededEmail, password: `${seededPassword} not` },
      { clientAddress: nextClientAddress() },
    );
    expect(refused.status).toBe(401);
  });

  it("refuses a suspended person the same way (006A-AC-013)", async () => {
    // The suspended person is suspended here rather than in the shared fixture, so every other
    // proof in this file still has a person it can sign in as.
    await expectSignInRefusedAfter(SUSPENDED_EMAIL, () => suspendReviewActor(pool, suspendedId));
  });

  it("rejects an identity field in the body with 400 (006A-AC-016)", async () => {
    const response = await signIn(
      {
        email: CREATOR_EMAIL,
        password: PASSWORD,
        locationId: location.locationId,
        role: "location_admin",
      },
      { clientAddress: nextClientAddress() },
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe("INVALID_AUTH_REQUEST");
  });

  it("is reachable through the exported route, not only the handler (006A-AC-012)", async () => {
    const response = await signInRoutePost(
      authRequest(
        "/api/auth/sign-in",
        { email: CREATOR_EMAIL, password: PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );

    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response)).toBeDefined();
  });
});

describe("lockout (006A-AC-014)", () => {
  it("locks after ten consecutive failures and clears when the lock lapses", async () => {
    const address = nextClientAddress();
    const correlationRefs: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const refused = await signIn(
        { email: LOCKOUT_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
        { clientAddress: address },
      );
      expect(refused.status).toBe(401);
      correlationRefs.push(refused.headers.get("x-oalo-correlation-ref") ?? "");
    }

    const locked = await readReviewCredential(pool, lockoutId);
    expect(locked?.locked).toBe(true);
    expect(locked?.failedAttemptCount).toBe(10);

    // 006A-AC-031. Every one of the ten failures writes its own denied row, and exactly one of
    // them, the tenth, also writes the lockout row.
    const eventsPerAttempt = await auditActionsPerAttempt(correlationRefs);
    expect(eventsPerAttempt).toEqual([
      ...Array.from({ length: 9 }, () => ["auth.sign-in:denied"]),
      ["auth.lockout:success", "auth.sign-in:denied"],
    ]);

    // The correct password is still refused while the lock holds.
    const duringLock = await signIn(
      { email: LOCKOUT_EMAIL, password: PASSWORD },
      { clientAddress: address },
    );
    expect(duringLock.status).toBe(401);
    expect(duringLock.headers.get("set-cookie")).toBeNull();

    await expireReviewCredentialLock(pool, lockoutId);
    const afterLock = await signIn(
      { email: LOCKOUT_EMAIL, password: PASSWORD },
      { clientAddress: address },
    );
    expect(afterLock.status).toBe(200);
    expect((await readReviewCredential(pool, lockoutId))?.failedAttemptCount).toBe(0);
  });
});

describe("the rate limiter through the composed port (006A-AC-009)", () => {
  /**
   * The handler's limits are only as good as the counter under them, and the counter runs one
   * call per transaction on a pooled connection rather than all calls in one transaction the way
   * the pgTAP suite exercises it. This pins the exact sequence on that path.
   */
  it("allows exactly the window's limit and refuses the next attempt", async () => {
    const credentials = resolveRuntimeCampaignCommandPorts(environment).credentials;
    expect(credentials).toBeDefined();
    const keyHash = createHash("sha256")
      .update(`limiter-sequence-${String(addressCounter)}`)
      .digest("hex");

    const answers: boolean[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      answers.push(
        (await credentials?.consumeRateLimit({
          scope: "sign_in_ip",
          keyHash,
          attemptLimit: 3,
          windowSeconds: 900,
        })) === true,
      );
    }

    expect(answers).toEqual([true, true, true, false, false]);
    // One counter row carries the whole window, so the key is stable across transactions.
    const stored = (await readAuthRateLimitRows(pool, "sign_in_ip")).filter(
      (row) => row.keyHash === keyHash,
    );
    expect(stored.map((row) => row.attemptCount)).toEqual([5]);
  });
});

describe("rate limits (006A-AC-015)", () => {
  it("refuses the twenty-first sign-in from one client address inside the window", async () => {
    const address = nextClientAddress();
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 22; attempt += 1) {
      const response = await signIn(
        { email: "rate-limit-probe@oalo.invalid", password: PASSWORD },
        { clientAddress: address },
      );
      statuses.push(response.status);
    }

    // The first twenty attempts are answered on their merits; the twenty-first is refused before
    // the deployment derives another hash.
    expect(statuses.indexOf(429)).toBe(20);
    expect(statuses.slice(0, 20).every((status) => status === 401)).toBe(true);

    const refused = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: address },
    );
    expect(refused.status).toBe(429);
    expect(await refused.text()).toBe('{"error":"AUTH_RATE_LIMITED"}');
    expect(refused.headers.get("set-cookie")).toBeNull();
  });

  it("keeps a separate window per client address", async () => {
    const address = nextClientAddress();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await signIn(
        { email: "rate-limit-probe@oalo.invalid", password: PASSWORD },
        { clientAddress: address },
      );
    }

    const elsewhere = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    expect(elsewhere.status).toBe(200);
  });
});

describe("choosing a workspace (006A-AC-016)", () => {
  beforeAll(async () => {
    // The multi-workspace person holds one binding that grants a session and one that does not,
    // plus a binding at a second workspace, so the choice list is exactly the bindings that can
    // actually become a session.
    await grantReviewBinding(pool, location.locationId, multiId, "creator");
    await grantReviewBinding(pool, secondLocation.locationId, multiId, "location_admin");
  });

  it("offers the server's list, issues for the chosen one, and refuses a forged field", async () => {
    const address = nextClientAddress();
    const response = await signIn(
      { email: MULTI_EMAIL, password: PASSWORD },
      { clientAddress: address },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    const payload = (await response.json()) as {
      next: string;
      choiceToken: string;
      workspaces: readonly { index: number; workspaceName: string; bindingRole: string }[];
    };
    expect(payload.next).toBe("/sign-in/choose");
    expect(payload.workspaces.map((workspace) => workspace.workspaceName)).toEqual([
      "Password sign-in workspace",
      "Password second workspace",
    ]);

    const forged = await handleChooseWorkspace(
      authRequest(
        "/api/auth/choose",
        {
          choiceToken: payload.choiceToken,
          workspaceIndex: 1,
          locationId: location.locationId,
        },
        { clientAddress: address },
      ),
    );
    expect(forged.status).toBe(400);

    const chosen = await handleChooseWorkspace(
      authRequest(
        "/api/auth/choose",
        { choiceToken: payload.choiceToken, workspaceIndex: 1 },
        { clientAddress: address },
      ),
    );
    expect(chosen.status).toBe(200);
    expect(sessionCookieFrom(chosen)).toBeDefined();

    // The token is single use, so replaying the same choice is refused.
    const replayed = await handleChooseWorkspace(
      authRequest(
        "/api/auth/choose",
        { choiceToken: payload.choiceToken, workspaceIndex: 0 },
        { clientAddress: address },
      ),
    );
    expect(replayed.status).toBe(401);
  });

  /**
   * PRD-006b D10 and Wave 7g's recorded follow-up. A completed reset says "Your password is
   * saved. You're signed in." in the workspace, and a person with bindings at more than one
   * workspace answers a question before they reach one. Without this the confirmation is lost for
   * exactly the people who have the most workspaces to lose it in.
   *
   * Both values are asserted in one case, against the same choice step, so the flag can only pass
   * by being carried and can never pass by being always on.
   */
  it("carries the reset flag to the workspace, and only when the request brought it", async () => {
    async function chooseWith(
      extra: Readonly<Record<string, string>>,
    ): Promise<Readonly<{ next: string }>> {
      const address = nextClientAddress();
      const signedIn = await signIn(
        { email: MULTI_EMAIL, password: PASSWORD },
        { clientAddress: address },
      );
      const offered = (await signedIn.json()) as { choiceToken: string };
      const chosen = await handleChooseWorkspace(
        authRequest(
          "/api/auth/choose",
          { choiceToken: offered.choiceToken, workspaceIndex: 0, ...extra },
          { clientAddress: address },
        ),
      );
      expect(chosen.status).toBe(200);
      return (await chosen.json()) as { next: string };
    }

    expect(await chooseWith({})).toEqual({ next: "/overview" });
    expect(await chooseWith({ passwordReset: "1" })).toEqual({ next: "/overview?passwordReset=1" });

    // The schema accepts one literal, so no other value can reach the composition at all.
    const address = nextClientAddress();
    const signedIn = await signIn(
      { email: MULTI_EMAIL, password: PASSWORD },
      { clientAddress: address },
    );
    const offered = (await signedIn.json()) as { choiceToken: string };
    const forged = await handleChooseWorkspace(
      authRequest(
        "/api/auth/choose",
        { choiceToken: offered.choiceToken, workspaceIndex: 0, passwordReset: "yes" },
        { clientAddress: address },
      ),
    );
    expect(forged.status).toBe(400);
    expect(((await forged.json()) as { error: string }).error).toBe("INVALID_AUTH_REQUEST");
  });

  /**
   * 006A-AC-016 names three fields the choice request must not be able to carry, and only one of
   * them was ever forged. The workspace is picked by index from the closed list the database
   * returned for the person the token names, so a request that could name a location, a role, or
   * a binding would be naming one the server never offered; `.strict()` is what makes that
   * impossible, and a schema loses `.strict()` in one careless edit.
   */
  const FORGED_CHOICE_FIELDS = Object.freeze([
    Object.freeze({ name: "locationId", field: () => ({ locationId: secondLocation.locationId }) }),
    Object.freeze({ name: "role", field: () => ({ role: "location_admin" }) }),
    Object.freeze({
      name: "bindingId",
      field: () => ({ bindingId: "00000000-0000-4000-8000-00000000c0de" }),
    }),
  ]);

  it.each(FORGED_CHOICE_FIELDS.map((forged) => [forged.name, forged] as const))(
    "refuses a choice carrying a forged %s with 400 and issues nothing",
    async (_name, forged) => {
      const address = nextClientAddress();
      const offered = await signIn(
        { email: MULTI_EMAIL, password: PASSWORD },
        { clientAddress: address },
      );
      const payload = (await offered.json()) as { choiceToken: string };

      const refused = await handleChooseWorkspace(
        authRequest(
          "/api/auth/choose",
          { choiceToken: payload.choiceToken, workspaceIndex: 0, ...forged.field() },
          { clientAddress: address },
        ),
      );

      expect(refused.status).toBe(400);
      expect(((await refused.json()) as { error: string }).error).toBe("INVALID_AUTH_REQUEST");
      expect(refused.headers.get("set-cookie")).toBeNull();
    },
  );

  it("never shows the choice step to a person with one workspace", async () => {
    const response = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );

    expect(await response.json()).toEqual({ next: "/overview" });
  });
});

describe("POST /api/auth/sign-out (006A-AC-022)", () => {
  it("revokes, clears the cookie, and redirects to the sign-in page", async () => {
    const signedIn = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const cookie = sessionCookieFrom(signedIn);
    const sessionRef = await newestSessionRefFor(creatorId);

    const response = await handleSignOut(
      authRequest(
        "/api/auth/sign-out",
        {},
        {
          cookie,
          csrfToken: createSessionBoundCsrfToken({
            serverSecret: csrfServerSecret,
            sessionId: sessionRef,
          }),
        },
      ),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/sign-in");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    const sessions = await readFirstPartySessionsForUser(pool, creatorId);
    const revoked = sessions.find((session) => formatSessionRef(session.id) === sessionRef);
    expect(revoked?.revoked).toBe(true);
    expect(revoked?.revocationReason).toBe("sign_out");

    // 006A-AC-031. A revocation is an account event, so it is counted the same way an issuance
    // is: one correlation reference, exactly one row, and that row says the revocation succeeded.
    const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";
    expect(correlationRef.length).toBeGreaterThan(0);
    const events = await readAuditEventsForCorrelation(pool, correlationRef);
    expect(events.map((event) => `${event.action}:${event.result}`)).toEqual([
      "session.revoked:success",
    ]);
  });

  it("revokes nothing without the cross-site token", async () => {
    const signedIn = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const cookie = sessionCookieFrom(signedIn);

    const response = await handleSignOut(authRequest("/api/auth/sign-out", {}, { cookie }));

    expect(response.status).toBe(401);
    const sessions = await readFirstPartySessionsForUser(pool, creatorId);
    expect(sessions[0]?.revoked).toBe(false);
  });
});

describe("POST /api/auth/change-password (006A-AC-023)", () => {
  it("keeps the session making the change and revokes every other one", async () => {
    const first = await signIn(
      { email: CHANGE_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const firstSessionRef = await newestSessionRefFor(changeId);
    const second = await signIn(
      { email: CHANGE_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const secondCookie = sessionCookieFrom(second);
    const secondSessionRef = await newestSessionRefFor(changeId);
    expect(first.status).toBe(200);
    expect(secondSessionRef).not.toBe(firstSessionRef);

    const wrongCurrent = await handleChangePassword(
      authRequest(
        "/api/auth/change-password",
        {
          currentPassword: WRONG_PASSWORD_SAME_LENGTH,
          newPassword: "a second settled harbour",
          confirmPassword: "a second settled harbour",
        },
        {
          cookie: secondCookie,
          csrfToken: createSessionBoundCsrfToken({
            serverSecret: csrfServerSecret,
            sessionId: secondSessionRef,
          }),
        },
      ),
    );
    expect(wrongCurrent.status).toBe(401);
    expect(((await wrongCurrent.json()) as { error: string }).error).toBe(
      "AUTH_CURRENT_PASSWORD_REJECTED",
    );

    const changed = await handleChangePassword(
      authRequest(
        "/api/auth/change-password",
        {
          currentPassword: PASSWORD,
          newPassword: "a second settled harbour",
          confirmPassword: "a second settled harbour",
        },
        {
          cookie: secondCookie,
          csrfToken: createSessionBoundCsrfToken({
            serverSecret: csrfServerSecret,
            sessionId: secondSessionRef,
          }),
        },
      ),
    );
    expect(changed.status).toBe(200);

    const sessions = await readFirstPartySessionsForUser(pool, changeId);
    const kept = sessions.find((session) => formatSessionRef(session.id) === secondSessionRef);
    const revoked = sessions.find((session) => formatSessionRef(session.id) === firstSessionRef);
    expect(kept?.revoked).toBe(false);
    expect(revoked?.revoked).toBe(true);
    expect(revoked?.revocationReason).toBe("password_changed");

    const correlationRef = changed.headers.get("x-oalo-correlation-ref") ?? "";
    const events = await readAuditEventsForCorrelation(pool, correlationRef);
    expect(events.map((event) => event.action)).toContain("auth.password-changed");
    expect(events.map((event) => event.action)).toContain("auth.sessions-revoked");

    // The new password works and the old one does not.
    expect(
      (
        await signIn(
          { email: CHANGE_EMAIL, password: "a second settled harbour" },
          { clientAddress: nextClientAddress() },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await signIn(
          { email: CHANGE_EMAIL, password: PASSWORD },
          { clientAddress: nextClientAddress() },
        )
      ).status,
    ).toBe(401);
  });

  it("refuses without a session (006A-AC-023)", async () => {
    const response = await handleChangePassword(
      authRequest("/api/auth/change-password", {
        currentPassword: PASSWORD,
        newPassword: "another settled harbour",
        confirmPassword: "another settled harbour",
      }),
    );

    expect(response.status).toBe(401);
  });
});

describe("the shell after a password sign-in (006A-AC-028)", () => {
  it("renders the seeded names and never a canonical reference", async () => {
    const signedIn = await signIn(
      { email: CREATOR_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    const cookie = sessionCookieFrom(signedIn);

    const shell = await resolveRuntimeShellSession(
      new Request(`${REVIEW_ORIGIN}/overview`, { headers: { cookie: cookie ?? "" } }),
      environment,
    );

    expect(shell.authenticated).toBe(true);
    expect(shell.session?.user.displayName).toBe("Priya Raman");
    expect(shell.session?.location.displayName).toBe("Password sign-in workspace");
    expect(shell.session?.user.roleLabel).toBe("Campaign creator");
    const rendered = JSON.stringify(shell.session);
    expect(rendered).not.toMatch(/location_[A-Za-z0-9]/u);
    expect(rendered).not.toMatch(/actor_[A-Za-z0-9]/u);
    expect(rendered).not.toMatch(/principal_[A-Za-z0-9]/u);
  });
});

describe("the modes that do not serve a sign-in (006A-AC-026)", () => {
  /**
   * 005B-AC-020 and 006A-AC-026 say the 404 comes *before* the database, not merely instead of a
   * session row. An unchanged session count cannot tell the two apart: a route that read the
   * credential, found the mode wrong, and answered 404 would pass it.
   *
   * So the handler is handed a ports object that cannot be used at all. Every property access on
   * it throws, and the rate limiter is the route's first touch of any port
   * (`password-authentication-handler.ts` `consumeAddressLimit`), so reaching the database at all
   * turns this into a thrown error rather than a 404. The handler's own default argument is what
   * would otherwise build the real ports, and passing this in its place means it is never built.
   */
  function unusablePorts(): CampaignCommandPorts {
    return new Proxy(
      {},
      {
        get(_target, property) {
          throw new Error(
            `The route reached ports.${String(property)} before answering 404, so it did not refuse before the database`,
          );
        },
      },
    ) as CampaignCommandPorts;
  }

  /**
   * Every route D5 lists, not the one this file happened to start with. `auth-page-gate` covers
   * the seven pages this way; a route that forgot the mode check while its neighbours kept it
   * would have been the one thing neither suite looked at.
   */
  const AUTH_ROUTES = Object.freeze([
    Object.freeze({
      name: "/api/auth/sign-in",
      call: (ports: CampaignCommandPorts) =>
        handlePasswordSignIn(
          authRequest("/api/auth/sign-in", { email: CREATOR_EMAIL, password: PASSWORD }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/choose",
      call: (ports: CampaignCommandPorts) =>
        handleChooseWorkspace(
          authRequest("/api/auth/choose", { choiceToken: "a".repeat(43), workspaceIndex: 0 }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/sign-up",
      call: (ports: CampaignCommandPorts) =>
        handlePasswordSignUp(
          authRequest("/api/auth/sign-up", {
            name: "Gate Probe",
            email: "gate-probe@oalo.invalid",
            password: PASSWORD,
          }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/forgot-password",
      call: (ports: CampaignCommandPorts) =>
        handleForgotPassword(
          authRequest("/api/auth/forgot-password", { email: CREATOR_EMAIL }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/reset-password",
      call: (ports: CampaignCommandPorts) =>
        handleResetPassword(
          authRequest("/api/auth/reset-password", {
            token: "b".repeat(43),
            password: PASSWORD,
            confirmPassword: PASSWORD,
          }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/verify-email",
      call: (ports: CampaignCommandPorts) =>
        handleVerifyEmail(
          authRequest("/api/auth/verify-email", { token: "c".repeat(43) }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/sign-out",
      call: (ports: CampaignCommandPorts) =>
        handleSignOut(authRequest("/api/auth/sign-out", {}), process.env, ports),
    }),
    Object.freeze({
      name: "/api/auth/change-password",
      call: (ports: CampaignCommandPorts) =>
        handleChangePassword(
          authRequest("/api/auth/change-password", {
            currentPassword: PASSWORD,
            password: NEW_PASSWORD,
            confirmPassword: NEW_PASSWORD,
          }),
          process.env,
          ports,
        ),
    }),
    Object.freeze({
      name: "/api/auth/resend-verification",
      call: (ports: CampaignCommandPorts) =>
        handleResendVerificationEmail(
          authRequest("/api/auth/resend-verification", {}),
          process.env,
          ports,
        ),
    }),
  ]);

  const ROUTE_CASES = AUTH_ROUTES.map((route) => [route.name, route] as const);

  it.each(ROUTE_CASES)(
    "answers 404 for %s in synthetic mode, before any database access",
    async (_name, route) => {
      await underDeployment({ OALO_REVIEW_SURFACE: "" }, async () => {
        const before = (await readFirstPartySessionsForUser(pool, creatorId)).length;

        const response = await route.call(unusablePorts());

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "NOT_FOUND" });
        expect((await readFirstPartySessionsForUser(pool, creatorId)).length).toBe(before);
      });
    },
  );

  it.each(ROUTE_CASES)(
    "answers 404 for %s in production without the review flag, before any database access",
    async (_name, route) => {
      await underDeployment(
        { OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "" },
        async () => {
          const before = (await readFirstPartySessionsForUser(pool, creatorId)).length;

          const response = await route.call(unusablePorts());

          expect(response.status).toBe(404);
          expect(await response.json()).toEqual({ error: "NOT_FOUND" });
          expect((await readFirstPartySessionsForUser(pool, creatorId)).length).toBe(before);
        },
      );
    },
  );
});

describe("a lock nobody can extend (006A-AC-014)", () => {
  /**
   * D4 gives the lockout fifteen minutes from the tenth failure. If a refused attempt made while
   * the lock is open pushed `locked_until` out again, anybody who knew an address could hold its
   * owner out of the product for as long as they kept posting, at one request every fifteen
   * minutes and with no password at all. So the lock has to be the same instant afterwards.
   *
   * Half the extra attempts carry the correct password, because the earlier shape recorded a
   * failure for a correct password during a lock: the account's real owner, typing the right
   * password and waiting, was extending their own lockout.
   */
  it("keeps locked_until at the instant the tenth failure set it", async () => {
    const lockingAddress = nextClientAddress();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const refused = await signIn(
        { email: LOCK_EXTENSION_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
        { clientAddress: lockingAddress },
      );
      expect(refused.status).toBe(401);
    }

    const locked = await readReviewCredential(pool, lockExtensionId);
    expect(locked?.locked).toBe(true);
    expect(locked?.failedAttemptCount).toBe(10);
    const lockedUntil = locked?.lockedUntil;
    expect(lockedUntil).toBeDefined();

    // A second address, because twenty attempts from one would spend the whole sign-in window and
    // the last of them would be refused by the rate limiter rather than by the lock.
    const duringLockAddress = nextClientAddress();
    const correlationRefs: string[] = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const refused = await signIn(
        {
          email: LOCK_EXTENSION_EMAIL,
          password: attempt % 2 === 0 ? PASSWORD : WRONG_PASSWORD_SAME_LENGTH,
        },
        { clientAddress: duringLockAddress },
      );
      expect(refused.status).toBe(401);
      expect(await refused.text()).toBe('{"error":"AUTH_CREDENTIALS_REJECTED"}');
      expect(refused.headers.get("set-cookie")).toBeNull();
      correlationRefs.push(refused.headers.get("x-oalo-correlation-ref") ?? "");
    }

    const after = await readReviewCredential(pool, lockExtensionId);
    expect(after?.lockedUntil).toBe(lockedUntil);
    expect(after?.failedAttemptCount).toBe(10);

    // 006A-AC-031. The attempts are still on the record, one denied row each, and not one of them
    // writes a second lockout row: the lockout happened once, when the account locked.
    const eventsPerAttempt = await auditActionsPerAttempt(correlationRefs);
    expect(eventsPerAttempt).toEqual(Array.from({ length: 10 }, () => ["auth.sign-in:denied"]));

    // The account comes back at the instant it always would have. The wall clock cannot be moved
    // forward from here, so the expiry it kept is brought back to now, which is the same state
    // the clock reaches on its own fifteen minutes after the tenth failure.
    await expireReviewCredentialLock(pool, lockExtensionId);
    const afterLock = await signIn(
      { email: LOCK_EXTENSION_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    );
    expect(afterLock.status).toBe(200);
    expect((await readReviewCredential(pool, lockExtensionId))?.failedAttemptCount).toBe(0);
  });
});

describe("a completed reset clears the lock (006A-AC-014)", () => {
  /**
   * The clause reads "a successful sign-in or a completed reset clears the counter and the lock",
   * and the only proof of the reset half moved the lock into the past with a direct write first,
   * which is the clock lapsing rather than the reset clearing anything. Here the lock is never
   * touched: the sign-ins stand at a pinned instant a minute before it was due to expire, so a
   * reset that did not clear it would leave the last one refused.
   */
  it("signs the person in with their new password while the original lock is still open", async () => {
    const lockingAddress = nextClientAddress();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const refused = await signIn(
        { email: RESET_CLEARS_LOCK_EMAIL, password: WRONG_PASSWORD_SAME_LENGTH },
        { clientAddress: lockingAddress },
      );
      expect(refused.status).toBe(401);
    }
    const locked = await readReviewCredential(pool, resetClearsLockId);
    expect(locked?.locked).toBe(true);
    const lockedUntil = locked?.lockedUntil ?? "";
    expect(lockedUntil).not.toBe("");

    const insideTheLock = Math.floor(Date.parse(lockedUntil) / 1000) - 60;
    const duringLock = await signIn(
      { email: RESET_CLEARS_LOCK_EMAIL, password: PASSWORD },
      { clientAddress: nextClientAddress(), nowEpochSeconds: insideTheLock },
    );
    expect(duringLock.status).toBe(401);

    // The link, minted the way a person gets one: asked for on a deployment that can send, and
    // read out of the message the fake provider was handed. No token is inserted by hand.
    const recorder = createFetchRecorder();
    let token = "";
    await underDeployment(
      { OALO_RESEND_API_KEY: RESEND_KEY, OALO_EMAIL_FROM: "no-reply@oalo.invalid" },
      async () => {
        const restoreFetch = recorder.install();
        try {
          const asked = await handleForgotPassword(
            authRequest(
              "/api/auth/forgot-password",
              { email: RESET_CLEARS_LOCK_EMAIL },
              { clientAddress: nextClientAddress() },
            ),
          );
          expect(asked.status).toBe(200);
          await flushAuthBackgroundWork();
          token = resetLinkTokenFrom(String(recorder.calls.at(-1)?.init.body));
        } finally {
          restoreFetch();
        }
      },
    );
    expect(token).not.toBe("");

    const reset = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(reset.status).toBe(200);

    const cleared = await readReviewCredential(pool, resetClearsLockId);
    expect(cleared?.locked).toBe(false);
    expect(cleared?.lockedUntil).toBeUndefined();
    expect(cleared?.failedAttemptCount).toBe(0);

    // The same pinned instant as the refusal above, so the only thing that changed is the reset.
    const afterReset = await signIn(
      { email: RESET_CLEARS_LOCK_EMAIL, password: NEW_PASSWORD },
      { clientAddress: nextClientAddress(), nowEpochSeconds: insideTheLock },
    );
    expect(afterReset.status).toBe(200);
    expect(sessionCookieFrom(afterReset)).toBeDefined();

    // 006A-AC-018 and 031. The completed reset names itself in the trail, and says nothing a
    // password change would say, so the two are told apart by an operator reading it.
    expect(
      await countAuditEventsForActor(pool, {
        userId: resetClearsLockId,
        action: "auth.reset-completed",
      }),
    ).toBe(1);
    expect(
      await countAuditEventsForActor(pool, {
        userId: resetClearsLockId,
        action: "auth.password-changed",
      }),
    ).toBe(0);
  });
});

describe("the per-address limit when no address is presented (D4)", () => {
  /**
   * `clientAddressFor` answers undefined when neither forwarded header is present, which used to
   * mean the per-address limits were skipped. That made the limit optional, and optional at the
   * caller's choice, because the caller decides which headers the request carries: whoever could
   * reach the origin without a proxy in front of it had an unmetered channel, and the per-account
   * lockout does not close it, since one password tried against a thousand addresses never
   * reaches ten failures on any of them.
   *
   * The window now binds under one fixed bucket instead, which this proves the only way it can be
   * proven: by spending it.
   */
  it("counts requests with no forwarded address in one bucket and refuses the twenty-first", async () => {
    const gate = resolveRuntimeCampaignCommandPorts(environment).mutation;
    if (gate === undefined) throw new Error("The composition must supply a browser mutation gate");
    const keyHash = rateLimitKeyHash(
      gate.csrfServerSecret,
      "sign_in_ip",
      UNKNOWN_CLIENT_ADDRESS_BUCKET,
    );
    // The bucket is one key for the whole deployment, so unlike every address in this file it is
    // not fresh by construction. It is cleared here, and by nothing else.
    await resetRateLimitKey(pool, keyHash);

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const response = await signIn(
        { email: "no-address-probe@oalo.invalid", password: PASSWORD },
        { withoutClientAddress: true },
      );
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 20).every((status) => status === 401)).toBe(true);
    expect(statuses.indexOf(429)).toBe(20);

    const stored = (await readAuthRateLimitRows(pool, "sign_in_ip")).filter(
      (row) => row.keyHash === keyHash,
    );
    expect(stored.map((row) => row.attemptCount)).toEqual([21]);
  });
});
