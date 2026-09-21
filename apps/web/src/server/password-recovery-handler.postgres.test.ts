import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  countAuditEventsForActor,
  countCredentialTokens,
  grantReviewBinding,
  newestCredentialTokenLifetimeSeconds,
  readAuditEventsForCorrelation,
  readFirstPartySessionsForUser,
  readReviewCredential,
  readUserIdForEmail,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import {
  createRouteTestPool,
  seedActor,
  seedLocation,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import {
  SIGN_IN_CHOICE_AFTER_PASSWORD_RESET_PATH,
  flushAuthBackgroundWork,
  handleForgotPassword,
  handlePasswordSignIn,
  handlePasswordSignUp,
  handleResetPassword,
  handleVerifyEmail,
  rateLimitKeyHash,
} from "./password-authentication-handler.js";
import {
  assertNoSecretOnAnySurface,
  authEnvironment,
  authRequest,
  countFetchAttemptsDuring,
  createClientAddressAllocator,
  createFetchRecorder,
  installRouteEnvironment,
  resetLinkTokenFrom,
  refusalForSpentVerificationToken,
  resetRateLimitKey,
  seedCredential,
  sessionCookieFrom,
  signUpEnabledEnvironment,
  tokenHashOf,
  verificationLinkTokenFrom,
  withCapturedLogLines,
  type RouteEnvironmentSwapper,
} from "./password-authentication-support.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-006a 006A-AC-017 through 021, 024, 025, and 031, driven through the exported handlers
 * against a disposable PostgreSQL with the real composition.
 *
 * Two things are faked and nothing else: the clock is never moved, and `globalThis.fetch` is
 * replaced for the cases that need a configured sending domain, so no message leaves the machine.
 * Every token in this file is a token the server minted and emailed; none is inserted by hand.
 */

const PASSWORD = "a settled harbour lantern";
const NEW_PASSWORD = "a brighter harbour lantern";
const RESET_EMAIL = "recovery-reset@oalo.invalid";
const VERIFY_EMAIL_ADDRESS = "recovery-verify@oalo.invalid";
const SIGN_UP_EMAIL = "recovery-newcomer@oalo.invalid";
const LIMIT_EMAIL = "recovery-limit@oalo.invalid";
const RESEND_KEY = "re_a_throwaway_key_for_the_proofs";

let pool: PostgresDatabasePool;
let environment: RoutePostgresEnvironment;
let deployment: RouteEnvironmentSwapper;
let location: SeededLocation;
/** PRD-006b D10. The second workspace the multi-binding reset case needs. */
let secondLocation: SeededLocation;
let resetUserId: string;
let verifyUserId: string;
let limitUserId: string;

const nextClientAddress = createClientAddressAllocator("192.0.2");

beforeAll(async () => {
  environment = authEnvironment();
  deployment = installRouteEnvironment(environment);
  pool = createRouteTestPool();

  location = await seedLocation(pool, "Recovery workspace");
  secondLocation = await seedLocation(pool, "Recovery second workspace");
  resetUserId = (
    await seedActor(pool, location, {
      displayName: "Reset person",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    })
  ).actorId;
  verifyUserId = (
    await seedActor(pool, location, {
      displayName: "Verify person",
      bindingRole: "approver",
      sessionRole: "campaign_approver",
    })
  ).actorId;

  limitUserId = (
    await seedActor(pool, location, {
      displayName: "Limit person",
      bindingRole: "publisher",
      sessionRole: "campaign_publisher",
    })
  ).actorId;

  await seedCredential(pool, { userId: resetUserId, email: RESET_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: limitUserId, email: LIMIT_EMAIL, password: PASSWORD });
  await seedCredential(pool, {
    userId: verifyUserId,
    email: VERIFY_EMAIL_ADDRESS,
    password: PASSWORD,
  });
});

afterAll(async () => {
  await pool.close();
  deployment.restore();
});

/**
 * Only the two email-keyed counters this file owns are cleared, and only between its own proofs.
 * The address-keyed counters need no clearing because every proof takes a fresh address, and
 * clearing the whole table would delete the counters the sign-in suite is using in parallel.
 */
beforeEach(async () => {
  const gate = resolveRuntimeCampaignCommandPorts(environment).mutation;
  if (gate === undefined) throw new Error("The composition must supply a browser mutation gate");
  for (const address of [RESET_EMAIL, LIMIT_EMAIL]) {
    await resetRateLimitKey(pool, rateLimitKeyHash(gate.csrfServerSecret, "forgot_email", address));
  }
});

function forgot(email: string, clientAddress: string): Promise<Response> {
  return handleForgotPassword(
    authRequest("/api/auth/forgot-password", { email }, { clientAddress }),
  );
}

/**
 * A live reset link for the suite's own address, minted the way a person gets one: ask for it on a
 * deployment that can send, and read the token out of the message the fake provider was handed.
 */
async function freshResetToken(): Promise<string> {
  const recorder = createFetchRecorder();
  let token = "";
  await deployment.swap(
    authEnvironment({
      OALO_RESEND_API_KEY: RESEND_KEY,
      OALO_EMAIL_FROM: "no-reply@oalo.invalid",
    }),
    async () => {
      const restoreFetch = recorder.install();
      try {
        await forgot(RESET_EMAIL, nextClientAddress());
        await flushAuthBackgroundWork();
        token = resetLinkTokenFrom(String(recorder.calls.at(-1)?.init.body));
      } finally {
        restoreFetch();
      }
    },
  );
  return token;
}

describe("POST /api/auth/forgot-password (006A-AC-017)", () => {
  it("answers the same body for a known address, an unknown one, and a refused provider", async () => {
    const known = await forgot(RESET_EMAIL, nextClientAddress());
    const unknown = await forgot("nobody@oalo.invalid", nextClientAddress());
    await flushAuthBackgroundWork();

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownBody = await known.text();
    expect(knownBody).toBe(await unknown.text());
    expect(knownBody).toBe('{"state":"sent"}');

    const recorder = createFetchRecorder();
    await deployment.swap(
      authEnvironment({
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
      async () => {
        const restoreFetch = recorder.install({ ok: false, body: { message: "refused" } });
        try {
          const refused = await forgot(RESET_EMAIL, nextClientAddress());
          await flushAuthBackgroundWork();
          expect(refused.status).toBe(200);
          expect(await refused.text()).toBe(knownBody);
        } finally {
          restoreFetch();
        }
      },
    );
  });

  it("issues exactly one live thirty-minute token for a known address and none for an unknown one", async () => {
    const before = await countCredentialTokens(pool, {
      userId: resetUserId,
      purpose: "password_reset",
      liveOnly: true,
    });

    await forgot(RESET_EMAIL, nextClientAddress());
    await flushAuthBackgroundWork();

    expect(
      await countCredentialTokens(pool, {
        userId: resetUserId,
        purpose: "password_reset",
        liveOnly: true,
      }),
    ).toBe(1);
    expect(before).toBeLessThanOrEqual(1);
    expect(
      await newestCredentialTokenLifetimeSeconds(pool, {
        userId: resetUserId,
        purpose: "password_reset",
      }),
    ).toBe(1_800);

    // A second request supersedes the first, so only one link ever works at a time.
    await forgot(RESET_EMAIL, nextClientAddress());
    await flushAuthBackgroundWork();
    expect(
      await countCredentialTokens(pool, {
        userId: resetUserId,
        purpose: "password_reset",
        liveOnly: true,
      }),
    ).toBe(1);
  });

  it("records a not-configured delivery when no sending domain is set (006A-AC-017)", async () => {
    const response = await forgot(RESET_EMAIL, nextClientAddress());
    await flushAuthBackgroundWork();
    const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";

    const events = await readAuditEventsForCorrelation(pool, correlationRef);
    const delivery = events.find((event) => event.action === "auth.reset-email");
    expect(delivery?.result).toBe("failed");
    expect(delivery?.subjectId).toBe("not_configured");
    expect(delivery?.subjectType).toBe("email_delivery");
    expect(events.map((event) => event.action)).toContain("auth.reset-requested");
  });

  it("sends one message and records the provider id when the domain is configured", async () => {
    const recorder = createFetchRecorder();
    await deployment.swap(
      authEnvironment({
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
      async () => {
        const restoreFetch = recorder.install();
        try {
          const captured = await withCapturedLogLines(async () => {
            const answer = await forgot(RESET_EMAIL, nextClientAddress());
            await flushAuthBackgroundWork();
            return answer;
          });
          const response = captured.value;
          const logLines = captured.logLines;
          const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";

          expect(recorder.calls).toHaveLength(1);
          expect(recorder.calls[0]?.url).toBe("https://api.resend.com/emails");
          const headers = recorder.calls[0]?.init.headers as Record<string, string>;
          expect(headers["authorization"]).toBe(`Bearer ${RESEND_KEY}`);
          expect(headers["idempotency-key"]).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u,
          );
          const body = JSON.parse(String(recorder.calls[0]?.init.body)) as Record<string, string>;
          expect(body["from"]).toBe("no-reply@oalo.invalid");
          expect(body["to"]).toBe(RESET_EMAIL);
          expect(body["subject"]).toBe("Reset your Automated LO password");
          expect(body["text"]).toContain("/reset-password?token=");
          expect(body["html"]).toContain("/reset-password?token=");

          const events = await readAuditEventsForCorrelation(pool, correlationRef);
          const delivery = events.find((event) => event.action === "auth.reset-email");
          expect(delivery?.result).toBe("success");
          expect(delivery?.subjectId).toBe("resend-message-id-0001");

          // 006A-AC-019 and 031. The URL token is in the message and nowhere else, and neither is
          // the digest the token row is keyed by: a leaked hash is a reset link an attacker can
          // recognise, which is why the criterion names the hash separately from the token.
          //
          // The Resend key is scanned here rather than only where the adapter returns a value,
          // because this is the one place in the product that holds a configured key, an audit
          // row, a log line, and a response body at the same instant.
          const token = resetLinkTokenFrom(String(recorder.calls[0]?.init.body));
          const credential = await readReviewCredential(pool, resetUserId);
          assertNoSecretOnAnySurface(
            {
              auditRows: JSON.stringify(events),
              logLines,
              responseBody: await response.clone().text(),
            },
            {
              "URL token": token,
              "token hash": tokenHashOf(token),
              "Resend key": RESEND_KEY,
              password: PASSWORD,
              "password hash": credential?.passwordHash ?? "",
            },
          );
          expect(response.headers.get("set-cookie") ?? "").not.toContain(token);
          expect(response.headers.get("set-cookie") ?? "").not.toContain(tokenHashOf(token));
        } finally {
          restoreFetch();
        }
      },
    );
  });

  /**
   * This case has an address of its own, because it counts tokens from zero and any earlier case
   * that asked this address for a reset would make the arithmetic mean something else.
   */
  it("issues nothing past the fifth request for one address in an hour (006A-AC-015)", async () => {
    const tokens = async () =>
      countCredentialTokens(pool, { userId: limitUserId, purpose: "password_reset" });
    expect(await tokens()).toBe(0);

    const issued: number[] = [];
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const response = await forgot(LIMIT_EMAIL, nextClientAddress());
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('{"state":"sent"}');
      await flushAuthBackgroundWork();
      issued.push(await tokens());
    }

    // Five links in an hour, then nothing more, and the body never changes.
    expect(issued).toEqual([1, 2, 3, 4, 5, 5, 5]);
  });
});

describe("POST /api/auth/reset-password (006A-AC-018)", () => {
  it("consumes the token once, revokes every session, and signs the person in", async () => {
    const token = await freshResetToken();
    const resetCompletedBefore = await countAuditEventsForActor(pool, {
      userId: resetUserId,
      action: "auth.reset-completed",
    });
    const passwordChangedBefore = await countAuditEventsForActor(pool, {
      userId: resetUserId,
      action: "auth.password-changed",
    });

    // A session that exists before the reset must not survive it.
    const before = await handlePasswordSignIn(
      authRequest(
        "/api/auth/sign-in",
        { email: RESET_EMAIL, password: PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(before.status).toBe(200);

    const mismatch = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: NEW_PASSWORD, confirmPassword: "something else entirely" },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(mismatch.status).toBe(400);
    expect(((await mismatch.json()) as { error: string }).error).toBe(
      "AUTH_PASSWORDS_DO_NOT_MATCH",
    );

    const tooShort = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: "short", confirmPassword: "short" },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(tooShort.status).toBe(400);
    expect(((await tooShort.json()) as { error: string }).error).toBe("PASSWORD_TOO_SHORT");

    const { value: response, logLines } = await withCapturedLogLines(async () =>
      handleResetPassword(
        authRequest(
          "/api/auth/reset-password",
          { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
          { clientAddress: nextClientAddress() },
        ),
      ),
    );

    expect(response.status).toBe(200);
    /**
     * PRD-006b D10. The workspace, carrying the one flag the landing page reads to say "Your
     * password is saved. You're signed in." The exact value is asserted, not a prefix, because a
     * route that quietly dropped the flag would still land the person in the workspace and would
     * still pass a looser check, leaving the person with no confirmation their password changed.
     */
    expect(await response.clone().json()).toEqual({ next: "/overview?passwordReset=1" });
    expect(sessionCookieFrom(response)).toBeDefined();

    const sessions = await readFirstPartySessionsForUser(pool, resetUserId);
    expect(sessions[0]?.issuedBy).toBe("password_reset");
    expect(sessions.slice(1).every((session) => session.revoked)).toBe(true);
    expect(sessions[1]?.revocationReason).toBe("password_changed");
    expect((await readReviewCredential(pool, resetUserId))?.rotated).toBe(true);

    const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";
    const events = await readAuditEventsForCorrelation(pool, correlationRef);
    /**
     * 006A-AC-018 and 031. D1's inventory gives a completed reset its own action, and until
     * `supabase/migrations/20260919200000_reset_completed_audit.sql` nothing wrote it: a reset
     * and an in-product password change left byte-identical trails, so an operator could not
     * tell somebody who had proved control of an inbox from somebody who had typed their current
     * password. Both actions are counted, and counted on both sides of the flow, because "one
     * row" is a claim about what this request wrote and not about what the row count happened to
     * be.
     */
    expect(events.filter((event) => event.action === "auth.reset-completed")).toHaveLength(1);
    expect(events.filter((event) => event.action === "auth.password-changed")).toHaveLength(0);
    expect(
      await countAuditEventsForActor(pool, {
        userId: resetUserId,
        action: "auth.reset-completed",
      }),
    ).toBe(resetCompletedBefore + 1);
    expect(
      await countAuditEventsForActor(pool, {
        userId: resetUserId,
        action: "auth.password-changed",
      }),
    ).toBe(passwordChangedBefore);

    /**
     * 006A-AC-031's scan, on the one flow that holds every value at once: the link that proved
     * control of the inbox, the digest its row is keyed by, the password that was just chosen, the
     * hash it was stored as, and the secret of the session the reset issued. The Resend key is the
     * sixth value the criterion names and is not in play here, because reset touches no email
     * port; it is scanned on the two flows that do hold a configured one, in the send case above
     * and in `password-authentication-handler.postgres.test.ts`.
     *
     * The session secret's one legitimate home is `Set-Cookie`, so it is read back from there and
     * then looked for on the three surfaces, which is why the body is passed without the header.
     */
    const resetSessionSecret = sessionCookieFrom(response)?.split("=")[1] ?? "";
    expect(resetSessionSecret.length).toBeGreaterThan(0);
    assertNoSecretOnAnySurface(
      {
        auditRows: JSON.stringify(events),
        logLines,
        responseBody: await response.clone().text(),
      },
      {
        "URL token": token,
        "token hash": tokenHashOf(token),
        password: NEW_PASSWORD,
        "previous password": PASSWORD,
        "password hash": (await readReviewCredential(pool, resetUserId))?.passwordHash ?? "",
        "session secret": resetSessionSecret,
        "session secret hash": tokenHashOf(resetSessionSecret),
      },
    );

    // The token is spent, so the same link cannot be used again.
    const replayed = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(replayed.status).toBe(400);
    expect(((await replayed.json()) as { error: string }).error).toBe("AUTH_RESET_LINK_EXPIRED");
  });

  /**
   * PRD-006b D10 and Wave 7g's recorded follow-up. A person with bindings at more than one
   * workspace picks one before landing anywhere, so the reset names the choose path with the same
   * fixed flag on it; `password-authentication-handler.postgres.test.ts` proves the other half,
   * that a choice carrying the flag lands in the workspace that says the password is saved.
   *
   * The address is parsed rather than matched as a string, so the path and the flag are each
   * asserted for what they are.
   */
  it("sends a person with several workspaces to the choice step, flagged (PRD-006b D10)", async () => {
    await grantReviewBinding(pool, secondLocation.locationId, resetUserId, "location_admin");
    const token = await freshResetToken();

    const response = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );

    expect(response.status).toBe(200);
    // No session yet: the workspace is not decided, so nothing may be issued for one.
    expect(sessionCookieFrom(response)).toBeUndefined();
    const payload = (await response.json()) as {
      next: string;
      choiceToken: string;
      workspaces: readonly { workspaceName: string }[];
    };
    expect(payload.next).toBe(SIGN_IN_CHOICE_AFTER_PASSWORD_RESET_PATH);
    const choice = new URL(payload.next, "https://oalo.local");
    expect(choice.pathname).toBe("/sign-in/choose");
    expect(choice.searchParams.get("passwordReset")).toBe("1");
    expect(payload.workspaces).toHaveLength(2);
    expect(payload.choiceToken).toBeDefined();
  });

  it("refuses a malformed token with the same generic failure (006A-AC-018)", async () => {
    const response = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token: "not-a-real-token", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe("AUTH_RESET_LINK_EXPIRED");
  });
});

describe("POST /api/auth/sign-up (006A-AC-020 and 021)", () => {
  it("answers 404 and touches no row while self-serve sign-up is unset", async () => {
    const before = await readUserIdForEmail(pool, SIGN_UP_EMAIL);

    const response = await handlePasswordSignUp(
      authRequest(
        "/api/auth/sign-up",
        { name: "Dana Newcomer", email: SIGN_UP_EMAIL, password: PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );

    expect(response.status).toBe(404);
    expect(await readUserIdForEmail(pool, SIGN_UP_EMAIL)).toBe(before);
  });

  it("creates the account, signs the person in, and discloses a duplicate on purpose", async () => {
    await deployment.swap(signUpEnabledEnvironment(), async () => {
      const { value: response, logLines } = await withCapturedLogLines(async () =>
        handlePasswordSignUp(
          authRequest(
            "/api/auth/sign-up",
            { name: "Dana Newcomer", email: SIGN_UP_EMAIL, password: PASSWORD },
            { clientAddress: nextClientAddress() },
          ),
        ),
      );

      expect(response.status).toBe(200);
      expect(await response.clone().json()).toEqual({ next: "/overview" });
      expect(sessionCookieFrom(response)).toBeDefined();

      const newUserId = await readUserIdForEmail(pool, SIGN_UP_EMAIL);
      expect(newUserId).toBeDefined();
      const sessions = await readFirstPartySessionsForUser(pool, newUserId ?? "");
      expect(sessions[0]?.issuedBy).toBe("password_sign_in");

      const correlationRef = response.headers.get("x-oalo-correlation-ref") ?? "";
      const events = await readAuditEventsForCorrelation(pool, correlationRef);
      expect(events.map((event) => event.action)).toContain("auth.sign-up");

      // 006A-AC-031 on the flow that creates the credential. Sign-up is the one request that
      // carries a password the server has never seen before and writes the hash it will be
      // checked against for the life of the account, and it issues a session in the same breath.
      const signUpSecret = sessionCookieFrom(response)?.split("=")[1] ?? "";
      expect(signUpSecret.length).toBeGreaterThan(0);
      assertNoSecretOnAnySurface(
        {
          auditRows: JSON.stringify(events),
          logLines,
          responseBody: await response.clone().text(),
        },
        {
          password: PASSWORD,
          "password hash": (await readReviewCredential(pool, newUserId ?? ""))?.passwordHash ?? "",
          "session secret": signUpSecret,
          "session secret hash": tokenHashOf(signUpSecret),
        },
      );

      const duplicate = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          { name: "Dana Twice", email: SIGN_UP_EMAIL, password: PASSWORD },
          { clientAddress: nextClientAddress() },
        ),
      );
      expect(duplicate.status).toBe(200);
      expect(await duplicate.json()).toEqual({ state: "existing" });
      expect(await readUserIdForEmail(pool, SIGN_UP_EMAIL)).toBe(newUserId);
    });
  });

  it("refuses a weak password with its reason and an identity field with 400", async () => {
    await deployment.swap(signUpEnabledEnvironment(), async () => {
      const weak = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          { name: "Dana Weak", email: "dana-weak@oalo.invalid", password: "short" },
          { clientAddress: nextClientAddress() },
        ),
      );
      expect(weak.status).toBe(400);
      expect(((await weak.json()) as { error: string }).error).toBe("PASSWORD_TOO_SHORT");

      const forged = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          {
            name: "Dana Forged",
            email: "dana-forged@oalo.invalid",
            password: PASSWORD,
            locationId: location.locationId,
          },
          { clientAddress: nextClientAddress() },
        ),
      );
      expect(forged.status).toBe(400);
      expect(((await forged.json()) as { error: string }).error).toBe("INVALID_AUTH_REQUEST");
      expect(await readUserIdForEmail(pool, "dana-forged@oalo.invalid")).toBeUndefined();
    });
  });

  /**
   * 006A-AC-020 names four fields the sign-up request must not be able to carry, and only
   * `locationId` was ever forged. Sign-up creates all five rows itself, so a request that could
   * name a location, a person, a role, or an installation would be choosing what it joins or what
   * it is worth on the way in. `.strict()` is what makes that impossible, one field at a time.
   */
  const FORGED_SIGN_UP_FIELDS = Object.freeze([
    Object.freeze({
      name: "locationId",
      email: "forged-location@oalo.invalid",
      field: () => ({ locationId: location.locationId }),
    }),
    Object.freeze({
      name: "userId",
      email: "forged-user@oalo.invalid",
      field: () => ({ userId: resetUserId }),
    }),
    Object.freeze({
      name: "role",
      email: "forged-role@oalo.invalid",
      field: () => ({ role: "location_admin" }),
    }),
    Object.freeze({
      name: "installationId",
      email: "forged-installation@oalo.invalid",
      field: () => ({ installationId: location.installationId }),
    }),
  ]);

  it.each(FORGED_SIGN_UP_FIELDS.map((forged) => [forged.name, forged] as const))(
    "refuses a sign-up carrying a forged %s with 400 and creates nothing",
    async (_name, forged) => {
      await deployment.swap(signUpEnabledEnvironment(), async () => {
        const response = await handlePasswordSignUp(
          authRequest(
            "/api/auth/sign-up",
            {
              name: "Dana Forged",
              email: forged.email,
              password: PASSWORD,
              ...forged.field(),
            },
            { clientAddress: nextClientAddress() },
          ),
        );

        expect(response.status).toBe(400);
        expect(((await response.json()) as { error: string }).error).toBe("INVALID_AUTH_REQUEST");
        expect(response.headers.get("set-cookie")).toBeNull();
        expect(await readUserIdForEmail(pool, forged.email)).toBeUndefined();
      });
    },
  );

  it("refuses the eleventh sign-up from one client address in an hour (006A-AC-015)", async () => {
    await deployment.swap(signUpEnabledEnvironment(), async () => {
      const address = nextClientAddress();
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const allowed = await handlePasswordSignUp(
          authRequest(
            "/api/auth/sign-up",
            {
              name: "Rate Probe",
              email: `rate-probe-${String(attempt)}@oalo.invalid`,
              password: "short",
            },
            { clientAddress: address },
          ),
        );
        expect(allowed.status).toBe(400);
      }

      const refused = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          { name: "Rate Probe", email: "rate-probe-10@oalo.invalid", password: PASSWORD },
          { clientAddress: address },
        ),
      );
      expect(refused.status).toBe(429);
    });
  });

  it("sends and confirms an email only when a sending domain is configured (006A-AC-021)", async () => {
    const recorder = createFetchRecorder();
    const address = "verify-signup@oalo.invalid";

    // With no sending domain, no verification token exists at all.
    await deployment.swap(signUpEnabledEnvironment(), async () => {
      const response = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          { name: "Quiet Newcomer", email: address, password: PASSWORD },
          { clientAddress: nextClientAddress() },
        ),
      );
      await flushAuthBackgroundWork();
      expect(response.status).toBe(200);
      const quietUserId = (await readUserIdForEmail(pool, address)) ?? "";
      expect(
        await countCredentialTokens(pool, { userId: quietUserId, purpose: "email_verification" }),
      ).toBe(0);
    });

    // With one configured, sign-up issues one twenty-four-hour token and sends one message.
    await deployment.swap(
      signUpEnabledEnvironment({
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
      async () => {
        const restoreFetch = recorder.install();
        try {
          const response = await handlePasswordSignUp(
            authRequest(
              "/api/auth/sign-up",
              { name: "Loud Newcomer", email: "verify-loud@oalo.invalid", password: PASSWORD },
              { clientAddress: nextClientAddress() },
            ),
          );
          await flushAuthBackgroundWork();
          expect(response.status).toBe(200);

          const loudUserId = (await readUserIdForEmail(pool, "verify-loud@oalo.invalid")) ?? "";
          expect(
            await countCredentialTokens(pool, {
              userId: loudUserId,
              purpose: "email_verification",
            }),
          ).toBe(1);
          expect(
            await newestCredentialTokenLifetimeSeconds(pool, {
              userId: loudUserId,
              purpose: "email_verification",
            }),
          ).toBe(86_400);

          const sent = recorder.calls.at(-1);
          const body = JSON.parse(String(sent?.init.body)) as Record<string, string>;
          expect(body["subject"]).toBe("Confirm your email for Automated LO");
          const token = verificationLinkTokenFrom(String(sent?.init.body));

          const captured = await withCapturedLogLines(async () =>
            handleVerifyEmail(
              authRequest(
                "/api/auth/verify-email",
                { token },
                { clientAddress: nextClientAddress() },
              ),
            ),
          );
          const confirmed = captured.value;
          expect(confirmed.status).toBe(200);
          expect(await confirmed.clone().json()).toEqual({ state: "confirmed" });
          expect((await readReviewCredential(pool, loudUserId))?.emailVerified).toBe(true);

          const correlationRef = confirmed.headers.get("x-oalo-correlation-ref") ?? "";
          const events = await readAuditEventsForCorrelation(pool, correlationRef);
          expect(events.map((event) => event.action)).toContain("auth.email-verified");

          // 006A-AC-031 on the confirmation flow: the deployment holds a configured key, the
          // request carries the link's own token, and the row the token is spent from is keyed by
          // its digest. None of the three may reach the trail, the log, or the answer.
          assertNoSecretOnAnySurface(
            {
              auditRows: JSON.stringify(events),
              logLines: captured.logLines,
              responseBody: await confirmed.clone().text(),
            },
            {
              "URL token": token,
              "token hash": tokenHashOf(token),
              "Resend key": RESEND_KEY,
            },
          );

          expect(
            await refusalForSpentVerificationToken(handleVerifyEmail, token, nextClientAddress()),
          ).toEqual({ status: 400, error: "AUTH_VERIFICATION_LINK_EXPIRED" });
        } finally {
          restoreFetch();
        }
      },
    );
  });

  it("lets an unconfirmed account sign in and use the workspace (006A-AC-021)", async () => {
    expect((await readReviewCredential(pool, verifyUserId))?.emailVerified).toBe(false);

    const response = await handlePasswordSignIn(
      authRequest(
        "/api/auth/sign-in",
        { email: VERIFY_EMAIL_ADDRESS, password: PASSWORD },
        { clientAddress: nextClientAddress() },
      ),
    );

    expect(response.status).toBe(200);
    expect(sessionCookieFrom(response)).toBeDefined();
  });
});

describe("no sending domain means no network request (006A-AC-025)", () => {
  it("makes no fetch during sign-up, forgot-password, or reset", async () => {
    const attempts = await countFetchAttemptsDuring(async () => {
      await deployment.swap(signUpEnabledEnvironment(), async () => {
        await handlePasswordSignUp(
          authRequest(
            "/api/auth/sign-up",
            { name: "Offline Newcomer", email: "offline@oalo.invalid", password: PASSWORD },
            { clientAddress: nextClientAddress() },
          ),
        );
        await forgot(RESET_EMAIL, nextClientAddress());
        await handleResetPassword(
          authRequest(
            "/api/auth/reset-password",
            { token: "unknown", password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
            { clientAddress: nextClientAddress() },
          ),
        );
        await flushAuthBackgroundWork();
      });
    });

    expect(attempts).toBe(0);
  });
});
