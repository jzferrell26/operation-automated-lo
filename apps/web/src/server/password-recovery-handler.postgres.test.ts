import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  countCredentialTokens,
  newestCredentialTokenLifetimeSeconds,
  readAuditEventsForCorrelation,
  readFirstPartySessionsForUser,
  readReviewCredential,
  readUserIdForEmail,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import {
  applyRouteEnvironment,
  createRouteTestPool,
  seedActor,
  seedLocation,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import {
  flushAuthBackgroundWork,
  handleForgotPassword,
  handlePasswordSignIn,
  handlePasswordSignUp,
  handleResetPassword,
  handleVerifyEmail,
  rateLimitKeyHash,
} from "./password-authentication-handler.js";
import {
  authEnvironment,
  authRequest,
  createFetchRecorder,
  resetRateLimitKey,
  seedCredential,
  sessionCookieFrom,
  signUpEnabledEnvironment,
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
let restoreEnvironment: () => void;
let location: SeededLocation;
let resetUserId: string;
let verifyUserId: string;
let limitUserId: string;

let addressCounter = 0;
function nextClientAddress(): string {
  addressCounter += 1;
  return `192.0.2.${String(addressCounter)}`;
}

/** Runs one case under a different composition and puts the suite's own back afterwards. */
async function withEnvironment(
  next: RoutePostgresEnvironment,
  work: () => Promise<void>,
): Promise<void> {
  restoreEnvironment();
  const restoreSwapped = applyRouteEnvironment(next);
  try {
    await work();
  } finally {
    restoreSwapped();
    restoreEnvironment = applyRouteEnvironment(environment);
  }
}

beforeAll(async () => {
  environment = authEnvironment();
  restoreEnvironment = applyRouteEnvironment(environment);
  pool = createRouteTestPool();

  location = await seedLocation(pool, "Recovery workspace");
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
  restoreEnvironment();
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

/** The reset link the fake provider was handed, and the token inside it. */
function tokenFromSentMessage(body: string): string {
  const parsed = JSON.parse(body) as { text: string };
  const match = /reset-password\?token=([A-Za-z0-9_%-]+)/u.exec(parsed.text);
  if (match?.[1] === undefined) throw new Error("No reset link was in the message");
  return decodeURIComponent(match[1]);
}

function verificationTokenFromSentMessage(body: string): string {
  const parsed = JSON.parse(body) as { text: string };
  const match = /verify-email\?token=([A-Za-z0-9_%-]+)/u.exec(parsed.text);
  if (match?.[1] === undefined) throw new Error("No confirmation link was in the message");
  return decodeURIComponent(match[1]);
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
    await withEnvironment(
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
    await withEnvironment(
      authEnvironment({
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
      async () => {
        const restoreFetch = recorder.install();
        try {
          const response = await forgot(RESET_EMAIL, nextClientAddress());
          await flushAuthBackgroundWork();
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

          // 006A-AC-019 and 031. The URL token is in the message and nowhere else.
          const token = tokenFromSentMessage(String(recorder.calls[0]?.init.body));
          expect(JSON.stringify(events)).not.toContain(token);
          expect(await response.clone().text()).not.toContain(token);
          expect(response.headers.get("set-cookie") ?? "").not.toContain(token);
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
    const recorder = createFetchRecorder();
    let token = "";
    await withEnvironment(
      authEnvironment({
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
      async () => {
        const restoreFetch = recorder.install();
        try {
          await forgot(RESET_EMAIL, nextClientAddress());
          await flushAuthBackgroundWork();
          token = tokenFromSentMessage(String(recorder.calls.at(-1)?.init.body));
        } finally {
          restoreFetch();
        }
      },
    );

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

    const response = await handleResetPassword(
      authRequest(
        "/api/auth/reset-password",
        { token, password: NEW_PASSWORD, confirmPassword: NEW_PASSWORD },
        { clientAddress: nextClientAddress() },
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
    expect(events.map((event) => event.action)).toContain("auth.password-changed");

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
    await withEnvironment(signUpEnabledEnvironment(), async () => {
      const response = await handlePasswordSignUp(
        authRequest(
          "/api/auth/sign-up",
          { name: "Dana Newcomer", email: SIGN_UP_EMAIL, password: PASSWORD },
          { clientAddress: nextClientAddress() },
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
    await withEnvironment(signUpEnabledEnvironment(), async () => {
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

  it("refuses the eleventh sign-up from one client address in an hour (006A-AC-015)", async () => {
    await withEnvironment(signUpEnabledEnvironment(), async () => {
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
    await withEnvironment(signUpEnabledEnvironment(), async () => {
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
    await withEnvironment(
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
          const token = verificationTokenFromSentMessage(String(sent?.init.body));

          const confirmed = await handleVerifyEmail(
            authRequest(
              "/api/auth/verify-email",
              { token },
              { clientAddress: nextClientAddress() },
            ),
          );
          expect(confirmed.status).toBe(200);
          expect(await confirmed.clone().json()).toEqual({ state: "confirmed" });
          expect((await readReviewCredential(pool, loudUserId))?.emailVerified).toBe(true);

          const correlationRef = confirmed.headers.get("x-oalo-correlation-ref") ?? "";
          const events = await readAuditEventsForCorrelation(pool, correlationRef);
          expect(events.map((event) => event.action)).toContain("auth.email-verified");

          const replayed = await handleVerifyEmail(
            authRequest(
              "/api/auth/verify-email",
              { token },
              { clientAddress: nextClientAddress() },
            ),
          );
          expect(replayed.status).toBe(400);
          expect(((await replayed.json()) as { error: string }).error).toBe(
            "AUTH_VERIFICATION_LINK_EXPIRED",
          );
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
    const original = globalThis.fetch;
    let called = 0;
    globalThis.fetch = (async () => {
      called += 1;
      throw new Error("No auth path may reach the network with no email variables set");
    }) as typeof globalThis.fetch;
    try {
      await withEnvironment(signUpEnabledEnvironment(), async () => {
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

      expect(called).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
  });
});
