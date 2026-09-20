import { createSessionBoundCsrfToken } from "@oalo/auth";
import { formatSessionRef } from "@oalo/contracts";
import type { PostgresDatabasePool } from "@oalo/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  countCredentialTokens,
  newestCredentialTokenLifetimeSeconds,
  readAuditEventsForCorrelation,
  readFirstPartySessionsForUser,
  readReviewCredential,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import {
  createRouteTestPool,
  csrfSecretFor,
  seedActor,
  seedLocation,
  type RoutePostgresEnvironment,
  type SeededLocation,
} from "./campaign-route-postgres-support.js";
import {
  ALREADY_VERIFIED_DELIVERY_SUBJECT,
  AUTH_RATE_LIMITS,
  OVERVIEW_PATH,
  flushAuthBackgroundWork,
  handlePasswordSignIn,
  handleResendVerificationEmail,
  handleVerifyEmail,
  rateLimitKeyHash,
} from "./password-authentication-handler.js";
import {
  authEnvironment,
  authFormRequest,
  authRequest,
  countFetchAttemptsDuring,
  createClientAddressAllocator,
  createFetchRecorder,
  installRouteEnvironment,
  refusalForSpentVerificationToken,
  resetRateLimitKey,
  seedCredential,
  sessionCookieFrom,
  verificationLinkTokenFrom,
  type RouteEnvironmentSwapper,
} from "./password-authentication-support.js";

/**
 * PRD-006a D5 and 006A-AC-021, and PRD-006b D10's unverified notice.
 * `POST /api/auth/resend-verification`, driven through the exported handler against a disposable
 * PostgreSQL with the real composition.
 *
 * Every session in this file is minted the way a browser mints one: an address and a password go
 * in and the server does the rest. The only things faked are `globalThis.fetch`, for the cases
 * that need a configured sending domain, so no message leaves the machine, and the deployment
 * environment, which is swapped to prove what each composition does.
 */

const PASSWORD = "a settled harbour lantern";
const RESEND_EMAIL = "resend-person@oalo.invalid";
const QUIET_EMAIL = "resend-quiet@oalo.invalid";
const RESEND_KEY = "re_a_throwaway_key_for_the_proofs";

let pool: PostgresDatabasePool;
let environment: RoutePostgresEnvironment;
let deployment: RouteEnvironmentSwapper;
let csrfServerSecret: Uint8Array;
let location: SeededLocation;
let resendUserId: string;
let quietUserId: string;

const nextClientAddress = createClientAddressAllocator("198.51.100");

/**
 * A deployment that can send. It is spread from the suite's own environment rather than built
 * fresh, because a fresh one would mint a new `OALO_CSRF_SERVER_SECRET` and every session-bound
 * token this file holds would stop verifying for a reason that has nothing to do with email.
 */
function sendingEnvironment(): RoutePostgresEnvironment {
  return Object.freeze({
    ...environment,
    OALO_RESEND_API_KEY: RESEND_KEY,
    OALO_EMAIL_FROM: "no-reply@oalo.invalid",
  });
}

/** Signs the person in and returns the cookie and the token the shell's form would carry. */
async function signedInBrowser(
  email: string,
  userId: string,
): Promise<Readonly<{ cookie: string; csrfToken: string }>> {
  const response = await handlePasswordSignIn(
    authRequest(
      "/api/auth/sign-in",
      { email, password: PASSWORD },
      { clientAddress: nextClientAddress() },
    ),
  );
  const cookie = sessionCookieFrom(response);
  if (cookie === undefined) throw new Error("The sign-in did not set a session cookie");
  const sessions = await readFirstPartySessionsForUser(pool, userId);
  const newest = sessions[0];
  if (newest === undefined) throw new Error("The sign-in issued no session row");
  return Object.freeze({
    cookie,
    csrfToken: createSessionBoundCsrfToken({
      serverSecret: csrfServerSecret,
      sessionId: formatSessionRef(newest.id),
    }),
  });
}

/**
 * The request the shell's form sends, with a tracing id of the caller's choosing.
 *
 * Every case passes its own, because a correlation reference is the route name plus a digest of
 * the tracing id: without one, every resend in this file would share one reference and a proof
 * that reads audit rows by correlation would be reading every earlier case's rows as well.
 */
function resendRequest(
  browser: Readonly<{ cookie: string; csrfToken?: string }>,
  tracingId: string,
): Request {
  return authFormRequest(
    "/api/auth/resend-verification",
    browser.csrfToken === undefined ? {} : { csrfToken: browser.csrfToken },
    { cookie: browser.cookie, clientAddress: nextClientAddress(), tracingId },
  );
}

async function deliveryRowsFor(response: Response) {
  return readAuditEventsForCorrelation(pool, response.headers.get("x-oalo-correlation-ref") ?? "");
}

beforeAll(async () => {
  environment = authEnvironment();
  deployment = installRouteEnvironment(environment);
  csrfServerSecret = csrfSecretFor(environment);
  pool = createRouteTestPool();

  location = await seedLocation(pool, "Resend workspace");
  resendUserId = (
    await seedActor(pool, location, {
      displayName: "Resend person",
      bindingRole: "location_admin",
      sessionRole: "location_admin",
    })
  ).actorId;
  quietUserId = (
    await seedActor(pool, location, {
      displayName: "Quiet person",
      bindingRole: "creator",
      sessionRole: "campaign_creator",
    })
  ).actorId;

  await seedCredential(pool, { userId: resendUserId, email: RESEND_EMAIL, password: PASSWORD });
  await seedCredential(pool, { userId: quietUserId, email: QUIET_EMAIL, password: PASSWORD });
});

afterAll(async () => {
  await pool.close();
  deployment.restore();
});

/**
 * Only the two person-keyed counters this file owns are cleared, and only between its own proofs.
 * Clearing the whole table would delete the counters the sign-in and recovery suites are using in
 * parallel against the same database.
 */
beforeEach(async () => {
  for (const userId of [resendUserId, quietUserId]) {
    await resetRateLimitKey(
      pool,
      rateLimitKeyHash(csrfServerSecret, "resend_verification_user", userId),
    );
  }
});

describe("POST /api/auth/resend-verification (006A-AC-021, PRD-006b D10)", () => {
  it("issues one fresh twenty-four-hour token, sends one message, and audits the send", async () => {
    const recorder = createFetchRecorder();
    const browser = await signedInBrowser(RESEND_EMAIL, resendUserId);

    await deployment.swap(sendingEnvironment(), async () => {
      const restoreFetch = recorder.install();
      try {
        const response = await handleResendVerificationEmail(resendRequest(browser, "resend.sent"));
        await flushAuthBackgroundWork();

        // One fixed answer, with nothing in it to read: the person is back in the workspace.
        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe(OVERVIEW_PATH);
        expect(await response.clone().text()).toBe("");

        expect(recorder.calls).toHaveLength(1);
        const sent = JSON.parse(String(recorder.calls[0]?.init.body)) as Record<string, string>;
        expect(sent["to"]).toBe(RESEND_EMAIL);
        expect(sent["subject"]).toBe("Confirm your email for Automated LO");
        expect(sent["text"]).toContain("/verify-email?token=");

        expect(
          await countCredentialTokens(pool, {
            userId: resendUserId,
            purpose: "email_verification",
            liveOnly: true,
          }),
        ).toBe(1);
        expect(
          await newestCredentialTokenLifetimeSeconds(pool, {
            userId: resendUserId,
            purpose: "email_verification",
          }),
        ).toBe(86_400);

        const events = await deliveryRowsFor(response);
        const delivery = events.find((event) => event.action === "auth.verification-resent");
        expect(delivery?.result).toBe("success");
        expect(delivery?.subjectId).toBe("resend-message-id-0001");

        // 006A-AC-019 and 031. The URL token is in the message and nowhere else.
        const token = verificationLinkTokenFrom(String(recorder.calls[0]?.init.body));
        expect(JSON.stringify(events)).not.toContain(token);
        expect(response.headers.get("set-cookie") ?? "").not.toContain(token);
      } finally {
        restoreFetch();
      }
    });
  });

  it("supersedes the previous link, so only one confirmation ever works", async () => {
    const recorder = createFetchRecorder();
    const browser = await signedInBrowser(RESEND_EMAIL, resendUserId);

    await deployment.swap(sendingEnvironment(), async () => {
      const restoreFetch = recorder.install();
      try {
        await handleResendVerificationEmail(resendRequest(browser, "resend.supersede.first"));
        await flushAuthBackgroundWork();
        const stale = verificationLinkTokenFrom(String(recorder.calls.at(-1)?.init.body));

        await handleResendVerificationEmail(resendRequest(browser, "resend.supersede.second"));
        await flushAuthBackgroundWork();
        const fresh = verificationLinkTokenFrom(String(recorder.calls.at(-1)?.init.body));
        expect(fresh).not.toBe(stale);

        expect(
          await countCredentialTokens(pool, {
            userId: resendUserId,
            purpose: "email_verification",
            liveOnly: true,
          }),
        ).toBe(1);

        expect(
          await refusalForSpentVerificationToken(handleVerifyEmail, stale, nextClientAddress()),
        ).toEqual({ status: 400, error: "AUTH_VERIFICATION_LINK_EXPIRED" });
      } finally {
        restoreFetch();
      }
    });
  });

  it("issues nothing, sends nothing, and records not_configured with no sending domain", async () => {
    const browser = await signedInBrowser(QUIET_EMAIL, quietUserId);
    const before = await countCredentialTokens(pool, {
      userId: quietUserId,
      purpose: "email_verification",
    });

    let response: Response | undefined;
    const attempts = await countFetchAttemptsDuring(async () => {
      response = await handleResendVerificationEmail(resendRequest(browser, "resend.quiet"));
      await flushAuthBackgroundWork();
    });

    // 006A-AC-025. Nothing went out, and the answer is byte for byte the one a send gets.
    expect(attempts).toBe(0);
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(OVERVIEW_PATH);
    expect(
      await countCredentialTokens(pool, { userId: quietUserId, purpose: "email_verification" }),
    ).toBe(before);

    if (response === undefined) throw new Error("The resend route answered nothing");
    const delivery = (await deliveryRowsFor(response)).find(
      (event) => event.action === "auth.verification-resent",
    );
    expect(delivery?.result).toBe("failed");
    expect(delivery?.subjectId).toBe("not_configured");
  });

  it("issues nothing and records already_verified once the address is confirmed", async () => {
    const recorder = createFetchRecorder();
    const browser = await signedInBrowser(RESEND_EMAIL, resendUserId);

    await deployment.swap(sendingEnvironment(), async () => {
      const restoreFetch = recorder.install();
      try {
        await handleResendVerificationEmail(resendRequest(browser, "resend.confirm.first"));
        await flushAuthBackgroundWork();
        const token = verificationLinkTokenFrom(String(recorder.calls.at(-1)?.init.body));
        const confirmed = await handleVerifyEmail(
          authRequest("/api/auth/verify-email", { token }, { clientAddress: nextClientAddress() }),
        );
        expect(confirmed.status).toBe(200);
        expect((await readReviewCredential(pool, resendUserId))?.emailVerified).toBe(true);

        const sendsBefore = recorder.calls.length;
        const response = await handleResendVerificationEmail(
          resendRequest(browser, "resend.verified"),
        );
        await flushAuthBackgroundWork();

        expect(response.status).toBe(303);
        expect(response.headers.get("location")).toBe(OVERVIEW_PATH);
        expect(recorder.calls).toHaveLength(sendsBefore);
        expect(
          await countCredentialTokens(pool, {
            userId: resendUserId,
            purpose: "email_verification",
            liveOnly: true,
          }),
        ).toBe(0);

        const delivery = (await deliveryRowsFor(response)).find(
          (event) => event.action === "auth.verification-resent",
        );
        expect(delivery?.result).toBe("failed");
        expect(delivery?.subjectId).toBe(ALREADY_VERIFIED_DELIVERY_SUBJECT);
      } finally {
        restoreFetch();
      }
    });
  });

  it("refuses without the session-bound token, and refuses without a session at all", async () => {
    const browser = await signedInBrowser(QUIET_EMAIL, quietUserId);
    const before = await countCredentialTokens(pool, {
      userId: quietUserId,
      purpose: "email_verification",
    });

    const untokened = await handleResendVerificationEmail(
      resendRequest({ cookie: browser.cookie }, "resend.untokened"),
    );
    expect(untokened.status).toBe(401);

    const anonymous = await handleResendVerificationEmail(
      authFormRequest(
        "/api/auth/resend-verification",
        { csrfToken: browser.csrfToken },
        { clientAddress: nextClientAddress() },
      ),
    );
    expect(anonymous.status).toBe(401);

    await flushAuthBackgroundWork();
    expect(
      await countCredentialTokens(pool, { userId: quietUserId, purpose: "email_verification" }),
    ).toBe(before);
  });

  it("answers 404 wherever the workspace mode refuses to serve the sign-in path", async () => {
    const browser = await signedInBrowser(QUIET_EMAIL, quietUserId);

    // Synthetic mode: the route does not advertise itself, and takes no connection to say so.
    await deployment.swap(Object.freeze({ ...environment, OALO_REVIEW_SURFACE: "" }), async () => {
      const response = await handleResendVerificationEmail(
        resendRequest(browser, "resend.untokened"),
      );
      expect(response.status).toBe(404);
      expect(await response.clone().json()).toEqual({ error: "NOT_FOUND" });
    });

    // Production without the review flag: the mode function throws, which is also 404.
    await deployment.swap(
      Object.freeze({ ...environment, OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "" }),
      async () => {
        const response = await handleResendVerificationEmail(resendRequest(browser, "resend.mode"));
        expect(response.status).toBe(404);
      },
    );
  });

  it("refuses the sixth attempt by one person inside an hour (006A-AC-015 in kind)", async () => {
    const browser = await signedInBrowser(QUIET_EMAIL, quietUserId);
    const limit = AUTH_RATE_LIMITS.resend_verification_user;
    expect(limit).toEqual({ attemptLimit: 5, windowSeconds: 3_600 });

    const answers: number[] = [];
    for (let attempt = 0; attempt < limit.attemptLimit + 1; attempt += 1) {
      const response = await handleResendVerificationEmail(resendRequest(browser, "resend.limit"));
      answers.push(response.status);
    }
    await flushAuthBackgroundWork();

    expect(answers).toEqual([303, 303, 303, 303, 303, 429]);
  });
});
