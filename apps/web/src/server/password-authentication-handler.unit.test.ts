import { createHash } from "node:crypto";

import {
  CSRF_REQUEST_HEADER,
  FIRST_PARTY_SESSION_COOKIE,
  createSessionBoundCsrfToken,
  hashPassword,
  type EstablishedFirstPartySession,
  type FirstPartySessionLookup,
} from "@oalo/auth";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  type CampaignCommandPorts,
  type FirstPartySessionIssuancePort,
} from "./authenticated-principal.js";
import { CORRELATION_REFERENCE_HEADER } from "./correlation-boundary.js";
import type { CredentialPort, PasswordCredential } from "./credential-ports.js";
import type { TransactionalEmailMessage } from "./email/transactional-email.js";
import {
  AUTH_RATE_LIMITS,
  clientAddressFor,
  handleChangePassword,
  handleForgotPassword,
  handlePasswordSignIn,
  rateLimitKeyHash,
  resetAuthHandlerProcessStateForTests,
  scheduleThroughNextAfter,
} from "./password-authentication-handler.js";

/**
 * PRD-008a, the parts of the password handler a test can hold without a database: the address
 * the per-address limits key on (008A-AC-016), the level the missing-address line is logged at
 * (008A-AC-017), the work forgot-password does before it answers (008A-AC-013 and 024), and the
 * point at which change-password spends its per-person slot (008A-AC-012). The close-out security
 * audit's M-1 adds the same work-before-the-answer proof for sign-in.
 *
 * The Postgres half of the same handler lives in `password-authentication-handler.postgres.test.ts`
 * and `password-recovery-handler.postgres.test.ts`; nothing here replaces either.
 */

const HOST = "review.operation-automated-lo.test";
const ORIGIN = `https://${HOST}`;
const ENVIRONMENT = Object.freeze({ OALO_REVIEW_SURFACE: "authorized", OALO_APP_URL: ORIGIN });
const KNOWN_ADDRESS = "known-person@oalo.invalid";
const UNKNOWN_ADDRESS = "nobody-here@oalo.invalid";
const URL_TOKEN = "fixed-url-token-for-the-unit-proof-0000000000";
const TOKEN_HASH = createHash("sha256").update(URL_TOKEN).digest("hex");
const CLIENT_ADDRESS = "203.0.113.50";
const CSRF_SERVER_SECRET = Buffer.alloc(32, 7);
const KNOWN_PASSWORD = "a settled harbour lantern";
const WRONG_PASSWORD = "a settled harbour lantErn";
/** A real Argon2id string, so the known account's derivation is the one production runs. */
const KNOWN_PASSWORD_HASH = hashPassword(KNOWN_PASSWORD);

afterEach(() => {
  resetAuthHandlerProcessStateForTests();
});

function addressRequest(headers: Readonly<Record<string, string>>): Request {
  return new Request(`${ORIGIN}/api/auth/sign-in?marker=request-only-value`, {
    method: "POST",
    headers,
  });
}

describe("clientAddressFor (008A-AC-016)", () => {
  it("reads x-vercel-forwarded-for before either other header", () => {
    expect(
      clientAddressFor(
        addressRequest({
          "x-vercel-forwarded-for": "203.0.113.7",
          "x-forwarded-for": "198.51.100.8, 10.0.0.1",
          "x-real-ip": "192.0.2.9",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry when the Vercel header is absent", () => {
    expect(
      clientAddressFor(
        addressRequest({ "x-forwarded-for": "198.51.100.8, 10.0.0.1", "x-real-ip": "192.0.2.9" }),
      ),
    ).toBe("198.51.100.8");
  });

  it("falls back to x-real-ip when neither forwarded header is present", () => {
    expect(clientAddressFor(addressRequest({ "x-real-ip": "192.0.2.9" }))).toBe("192.0.2.9");
  });

  it("skips an empty or oversized Vercel header rather than keying on it", () => {
    expect(
      clientAddressFor(
        addressRequest({ "x-vercel-forwarded-for": " ", "x-forwarded-for": "198.51.100.8" }),
      ),
    ).toBe("198.51.100.8");
    expect(
      clientAddressFor(
        addressRequest({ "x-vercel-forwarded-for": "9".repeat(101), "x-real-ip": "192.0.2.9" }),
      ),
    ).toBe("192.0.2.9");
  });
});

describe("the missing-address line (008A-AC-017)", () => {
  it("is an error, carries no request value, and fires once per process", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const request = addressRequest({ "x-client-note": "request-only-value" });

    expect(clientAddressFor(request)).toBeUndefined();
    expect(clientAddressFor(request)).toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    const line = error.mock.calls[0]?.map(String).join(" ") ?? "";
    expect(error.mock.calls[0]).toHaveLength(1);
    expect(line).toContain("x-vercel-forwarded-for");
    expect(line).not.toContain("request-only-value");
    expect(line).not.toContain(ORIGIN);

    // Once per process, not once ever: a fresh process logs it again.
    resetAuthHandlerProcessStateForTests();
    clientAddressFor(request);
    expect(error).toHaveBeenCalledTimes(2);
  });
});

interface RecordingPortOptions {
  readonly issueToken?: () => Promise<string>;
  /** Sign-in: the instant the known account's lock is open until, when it has one. */
  readonly lockedUntilEpochSeconds?: number;
  /** Sign-in: what the no-account write does instead of answering, for the deploy-order proof. */
  readonly recordSignInWithoutAccount?: () => Promise<void>;
}

/**
 * A credential port that records every call it is given and answers each one only after a real
 * macrotask, the way a database round trip does. `before` is what the handler awaited before it
 * answered; anything recorded after that happened in work it scheduled. The limiter counts per
 * scope and key the way `platform.consume_auth_rate_limit` does within one window, and `counters`
 * exposes those counts. `noAccountWrites` holds exactly what the sign-in handler handed the
 * no-account write, so a proof can say what that row is keyed on.
 */
function recordingCredentialPort(options: RecordingPortOptions = {}): {
  port: CredentialPort;
  calls: string[];
  counters: Map<string, number>;
  noAccountWrites: unknown[];
} {
  const calls: string[] = [];
  const counters = new Map<string, number>();
  const noAccountWrites: unknown[] = [];
  const roundTrip = async <T>(name: string, value: T): Promise<T> => {
    calls.push(name);
    await new Promise((resolve) => setTimeout(resolve, 1));
    return value;
  };
  const known: PasswordCredential = Object.freeze({
    userId: "00000000-0000-4000-8000-000000000a11",
    passwordHash: KNOWN_PASSWORD_HASH,
    lockedUntilEpochSeconds: options.lockedUntilEpochSeconds,
    failedAttemptCount: 0,
    emailVerified: true,
  });
  const refuse = (): never => {
    throw new Error("this proof must not reach this port method");
  };
  const port: CredentialPort = {
    consumeRateLimit: (input) => {
      const key = `${input.scope}:${input.keyHash}`;
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      return roundTrip(`consumeRateLimit:${input.scope}`, count <= input.attemptLimit);
    },
    lookupCredential: (email) =>
      roundTrip("lookupCredential", email === KNOWN_ADDRESS ? known : undefined),
    issueToken: async (input) => {
      calls.push(`issueToken:${input.purpose}:${String(input.lifetimeSeconds)}`);
      if (options.issueToken !== undefined) return options.issueToken();
      expect(input.tokenHash).toBe(TOKEN_HASH);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return "00000000-0000-4000-8000-000000000b22";
    },
    recordEmailDelivery: (input) =>
      roundTrip(`recordEmailDelivery:${input.action}:${input.result}:${input.subjectId}`, true),
    recordSignInFailure: () => roundTrip("recordSignInFailure", undefined),
    recordSignInWithoutAccount: (input) => {
      noAccountWrites.push(input);
      if (options.recordSignInWithoutAccount === undefined) {
        return roundTrip("recordSignInWithoutAccount", undefined);
      }
      calls.push("recordSignInWithoutAccount");
      return options.recordSignInWithoutAccount();
    },
    recordSignInSuccess: () => roundTrip("recordSignInSuccess", undefined),
    listSignInBindings: () =>
      roundTrip("listSignInBindings", [
        Object.freeze({
          locationId: "00000000-0000-4000-8000-000000000a01",
          locationDisplayName: "Unit proof workspace",
          bindingRole: "location_admin" as const,
        }),
      ]),
    lookupCredentialForUser: refuse,
    unverifiedEmailDisplayForUser: refuse,
    consumeToken: refuse,
    passwordPolicyIdentityForUser: refuse,
    passwordPolicyIdentityForResetToken: refuse,
    setPassword: refuse,
    revokeAllSessions: refuse,
    registerAccount: refuse,
    markEmailVerified: refuse,
  };
  return { port, calls, counters, noAccountWrites };
}

function forgotPorts(
  credentials: CredentialPort,
  sent: TransactionalEmailMessage[] | undefined,
): CampaignCommandPorts {
  return {
    identityDirectory: createStaticIdentityDirectory([]),
    roleBindings: createStaticRoleBindingPort([]),
    mutation: {
      expectedHost: HOST,
      allowedBrowserOrigins: [ORIGIN],
      csrfServerSecret: CSRF_SERVER_SECRET,
    },
    credentials,
    ...(sent === undefined
      ? {}
      : {
          transactionalEmail: {
            configured: true,
            async send(message) {
              sent.push(message);
              return { delivered: true, providerMessageId: "message-id-0001" };
            },
          },
        }),
  };
}

/**
 * Every branch of one proof carries the same tracing id. Without one each request mints a random
 * correlation reference, so the header comparisons below would be comparing two random values
 * rather than the two answers.
 */
function browserJsonRequest(path: string, body: unknown, correlationId: string): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      host: HOST,
      "x-vercel-forwarded-for": CLIENT_ADDRESS,
      "x-correlation-id": correlationId,
    },
    body: JSON.stringify(body),
  });
}

function forgotRequest(email: string): Request {
  return browserJsonRequest("/api/auth/forgot-password", { email }, "forgot-password-unit-proof");
}

interface ForgotRun {
  readonly response: Response;
  readonly body: string;
  readonly awaitedBeforeAnswer: readonly string[];
  readonly calls: string[];
  readonly scheduled: (() => Promise<void>)[];
}

async function runForgot(
  email: string,
  options: Readonly<{
    issueToken?: () => Promise<string>;
    sent?: TransactionalEmailMessage[];
    after?: (task: () => Promise<void>) => void;
  }> = {},
): Promise<ForgotRun> {
  const { port, calls } = recordingCredentialPort(options);
  const scheduled: (() => Promise<void>)[] = [];
  const response = await handleForgotPassword(
    forgotRequest(email),
    ENVIRONMENT,
    forgotPorts(port, options.sent),
    {
      randomUrlToken: () => URL_TOKEN,
      afterResponse:
        options.after === undefined ? (task) => void scheduled.push(task) : options.after,
    },
  );
  const awaitedBeforeAnswer = Object.freeze([...calls]);
  return { response, body: await response.clone().text(), awaitedBeforeAnswer, calls, scheduled };
}

describe("forgot-password does the same awaited work for every address (008A-AC-013)", () => {
  it("awaits the same three round trips on the known and unknown branches before answering", async () => {
    const known = await runForgot(KNOWN_ADDRESS);
    const unknown = await runForgot(UNKNOWN_ADDRESS);

    const sharedWork = [
      "consumeRateLimit:forgot_ip",
      "consumeRateLimit:forgot_email",
      "lookupCredential",
    ];
    expect(known.awaitedBeforeAnswer).toEqual(sharedWork);
    expect(unknown.awaitedBeforeAnswer).toEqual(sharedWork);
  });

  it("answers with byte-identical status, body, and headers on both branches", async () => {
    const known = await runForgot(KNOWN_ADDRESS);
    const unknown = await runForgot(UNKNOWN_ADDRESS);

    expect(known.response.status).toBe(200);
    expect(unknown.response.status).toBe(known.response.status);
    expect(known.body).toBe('{"state":"sent"}');
    expect(unknown.body).toBe(known.body);
    expect([...unknown.response.headers.entries()]).toEqual([...known.response.headers.entries()]);
  });

  it("issues the token in the scheduled work for a known address and never for an unknown one", async () => {
    const known = await runForgot(KNOWN_ADDRESS);
    const unknown = await runForgot(UNKNOWN_ADDRESS);

    for (const task of [...known.scheduled, ...unknown.scheduled]) await task();

    expect(known.calls.slice(known.awaitedBeforeAnswer.length)).toEqual([
      "issueToken:password_reset:1800",
      "recordEmailDelivery:auth.reset-email:failed:not_configured",
    ]);
    expect(unknown.calls).toEqual(unknown.awaitedBeforeAnswer);
  });

  it("sends the link for the token it persisted when a sending domain is configured", async () => {
    const sent: TransactionalEmailMessage[] = [];
    const known = await runForgot(KNOWN_ADDRESS, { sent });
    for (const task of known.scheduled) await task();

    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain(`/reset-password?token=${URL_TOKEN}`);
    expect(sent[0]?.idempotencyKey).toBe("00000000-0000-4000-8000-000000000b22");
    expect(known.calls.at(-1)).toBe("recordEmailDelivery:auth.reset-email:success:message-id-0001");
  });
});

/**
 * 008A-AC-024. Issuance now runs after the response, inside Next's `after`, and Next prints
 * whatever an `after` task throws (`next/dist/server/after/after-context.js`, `reportTaskError`).
 * The stand-in below does exactly that, so a failure that escaped the task would land in the
 * captured console the same way it would land in the deployment's log.
 *
 * The thrown error carries the token hash on purpose: a unique violation on the token column is a
 * real database error whose detail names the value, and it is the realistic way a hash would leak.
 */
describe("a failed issuance leaks nothing (008A-AC-024)", () => {
  it("logs, throws, and returns nothing containing the token, its hash, or the reset URL", async () => {
    const lines: string[] = [];
    for (const level of ["debug", "error", "info", "log", "warn"] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        lines.push(
          args
            .map((value) =>
              value instanceof Error ? `${value.message} ${String(value.stack)}` : String(value),
            )
            .join(" "),
        );
      });
    }
    const pending: Promise<void>[] = [];
    const nextStyleAfter = (task: () => Promise<void>): void => {
      pending.push(
        (async () => {
          try {
            await task();
          } catch (error) {
            console.error("An error occurred in a function passed to `after()`:", error);
          }
        })(),
      );
    };
    const sent: TransactionalEmailMessage[] = [];

    const run = await runForgot(KNOWN_ADDRESS, {
      sent,
      after: scheduleThroughNextAfter(nextStyleAfter),
      issueToken: async () => {
        throw new Error(
          `duplicate key value violates unique constraint; Key (token_hash)=(${TOKEN_HASH}) already exists.`,
        );
      },
    });
    await Promise.all(pending);

    const surfaces = {
      log: lines.join("\n"),
      body: run.body,
      headers: JSON.stringify([...run.response.headers.entries()]),
    };
    for (const [surface, text] of Object.entries(surfaces)) {
      expect(text, surface).not.toContain(URL_TOKEN);
      expect(text, surface).not.toContain(TOKEN_HASH);
      expect(text, surface).not.toContain("/reset-password");
    }
    expect(run.response.status).toBe(200);
    expect(run.body).toBe('{"state":"sent"}');
    expect(run.calls).toContain("issueToken:password_reset:1800");
    // No live token, so no link was sent and no delivery was recorded for one.
    expect(sent).toHaveLength(0);
    expect(run.calls.some((call) => call.startsWith("recordEmailDelivery"))).toBe(false);
  });
});

/**
 * M-1 of the PRD-008 close-out security audit, the sign-in counterpart of 008A-AC-013.
 *
 * A known address with a wrong password, and a known address whose lock is open, both await the
 * failure write before the 401, because the ten-failure lock has to land before the next attempt
 * is read. An address with no account used to await nothing after the lookup, so the response
 * time said whether the account existed. These proofs hold every refusal branch to one shape of
 * work before the answer: the same number of awaited round trips, in the same order, each one a
 * single definer call, and the last one a write.
 *
 * The classification below is this proof's statement of what each port call costs. Each name maps
 * to exactly one `security definer` call through `postgres-credential-ports.ts`, and pgTAP proves
 * that each of the two final calls writes a row: `platform.record_password_sign_in_failure`
 * (`supabase/tests/password_credentials.pgtap.sql`) and `platform.record_sign_in_without_account`
 * (`supabase/tests/sign_in_without_account.pgtap.sql`).
 */
const SIGN_IN_ROUND_TRIP_KIND: Readonly<Record<string, "read" | "write">> = Object.freeze({
  "consumeRateLimit:sign_in_ip": "write",
  lookupCredential: "read",
  recordSignInFailure: "write",
  recordSignInWithoutAccount: "write",
});

const SHARED_SIGN_IN_WORK = ["consumeRateLimit:sign_in_ip", "lookupCredential"] as const;

interface SignInRun {
  readonly response: Response;
  readonly body: string;
  readonly awaitedBeforeAnswer: readonly string[];
  readonly calls: string[];
  readonly scheduled: (() => Promise<void>)[];
  readonly noAccountWrites: unknown[];
}

async function runSignIn(
  email: string,
  password: string,
  options: RecordingPortOptions = {},
): Promise<SignInRun> {
  const recording = recordingCredentialPort(options);
  const issuance: FirstPartySessionIssuancePort = {
    issue: async () => "session_unit_proof",
    revoke: async () => false,
    recordDeniedAttempt: async () => true,
  };
  const scheduled: (() => Promise<void>)[] = [];
  const response = await handlePasswordSignIn(
    browserJsonRequest("/api/auth/sign-in", { email, password }, "sign-in-unit-proof"),
    ENVIRONMENT,
    { ...forgotPorts(recording.port, undefined), sessionIssuance: issuance },
    { afterResponse: (task) => void scheduled.push(task) },
  );
  return {
    response,
    body: await response.clone().text(),
    awaitedBeforeAnswer: Object.freeze([...recording.calls]),
    calls: recording.calls,
    scheduled,
    noAccountWrites: recording.noAccountWrites,
  };
}

function roundTripKinds(run: SignInRun): readonly string[] {
  return run.awaitedBeforeAnswer.map((call) => SIGN_IN_ROUND_TRIP_KIND[call] ?? `unknown ${call}`);
}

/** Ten minutes from now, so the known account's lock is open for the whole proof. */
function openLock(): number {
  return Math.floor(Date.now() / 1000) + 600;
}

describe("sign-in does the same awaited work for every address (M-1)", () => {
  it("awaits three round trips of the same kind, in the same order, on every refusal branch", async () => {
    const unknown = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD);
    const wrong = await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD);
    // D4: a correct password during an open lock is refused exactly like a wrong one.
    const locked = await runSignIn(KNOWN_ADDRESS, KNOWN_PASSWORD, {
      lockedUntilEpochSeconds: openLock(),
    });

    expect(wrong.awaitedBeforeAnswer).toEqual([...SHARED_SIGN_IN_WORK, "recordSignInFailure"]);
    expect(locked.awaitedBeforeAnswer).toEqual([...SHARED_SIGN_IN_WORK, "recordSignInFailure"]);
    expect(unknown.awaitedBeforeAnswer).toEqual([
      ...SHARED_SIGN_IN_WORK,
      "recordSignInWithoutAccount",
    ]);
    expect(roundTripKinds(unknown)).toEqual(["write", "read", "write"]);
    expect(roundTripKinds(wrong)).toEqual(roundTripKinds(unknown));
    expect(roundTripKinds(locked)).toEqual(roundTripKinds(unknown));
  });

  it("answers with byte-identical status, body, and headers on every refusal branch", async () => {
    const unknown = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD);
    const wrong = await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD);
    const locked = await runSignIn(KNOWN_ADDRESS, KNOWN_PASSWORD, {
      lockedUntilEpochSeconds: openLock(),
    });

    expect(wrong.response.status).toBe(401);
    expect(wrong.body).toBe('{"error":"AUTH_CREDENTIALS_REJECTED"}');
    expect(wrong.response.headers.get("set-cookie")).toBeNull();
    for (const run of [unknown, locked]) {
      expect(run.response.status).toBe(wrong.response.status);
      expect(run.body).toBe(wrong.body);
      expect([...run.response.headers.entries()]).toEqual([...wrong.response.headers.entries()]);
    }
  });

  it("writes before answering, keyed on the client address and on nothing from the email", async () => {
    const unknown = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD);
    const wrong = await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD);

    // Nothing is left for after the response on either branch: the failure count and the
    // no-account count have both landed before the 401 leaves.
    expect(unknown.scheduled).toEqual([]);
    expect(wrong.scheduled).toEqual([]);
    expect(unknown.calls).toEqual(unknown.awaitedBeforeAnswer);
    expect(wrong.calls).toEqual(wrong.awaitedBeforeAnswer);

    // The row is keyed on the address the per-address limit already keys on, under a scope of its
    // own, and the email that was tried reaches it in no form.
    expect(unknown.noAccountWrites).toEqual([
      { keyHash: rateLimitKeyHash(CSRF_SERVER_SECRET, "sign_in_no_account", CLIENT_ADDRESS) },
    ]);
    const written = JSON.stringify(unknown.noAccountWrites);
    expect(written).not.toContain(UNKNOWN_ADDRESS);
    expect(written).not.toContain(UNKNOWN_ADDRESS.split("@")[0]);
    expect(written).not.toContain(
      rateLimitKeyHash(CSRF_SERVER_SECRET, "sign_in_no_account", UNKNOWN_ADDRESS),
    );
    // A known account's refusal is counted against the account, never as a no-account attempt.
    expect(wrong.noAccountWrites).toEqual([]);
  });

  /**
   * Deploy order. If this code reaches the hosted app before the migration that creates
   * `platform.record_sign_in_without_account`, the no-account write fails with PostgreSQL's
   * undefined-function error. The answer must still be the one 401, the failure must leave exactly
   * the one fixed line of L-15 and nothing else, and a known account must be untouched: it never
   * calls the new function, so its failure count still lands before the answer and its correct
   * password still signs it in.
   */
  it("still answers the one 401 before the migration lands, and a known account still signs in", async () => {
    const logged = captureConsoleLines();
    const missingFunction = async (): Promise<void> => {
      throw Object.assign(
        new Error("function platform.record_sign_in_without_account(text) does not exist"),
        { code: "42883" },
      );
    };

    const unknown = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: missingFunction,
    });
    const wrong = await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: missingFunction,
    });
    const signedIn = await runSignIn(KNOWN_ADDRESS, KNOWN_PASSWORD, {
      recordSignInWithoutAccount: missingFunction,
    });

    expect(unknown.awaitedBeforeAnswer).toEqual([
      ...SHARED_SIGN_IN_WORK,
      "recordSignInWithoutAccount",
    ]);
    expect(unknown.response.status).toBe(401);
    expect(unknown.body).toBe(wrong.body);
    expect([...unknown.response.headers.entries()]).toEqual([...wrong.response.headers.entries()]);
    expect(wrong.awaitedBeforeAnswer).toEqual([...SHARED_SIGN_IN_WORK, "recordSignInFailure"]);

    expect(signedIn.response.status).toBe(200);
    expect(signedIn.body).toBe('{"next":"/overview"}');
    const cookie = signedIn.response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${FIRST_PARTY_SESSION_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(signedIn.calls).not.toContain("recordSignInWithoutAccount");

    // Only the unknown branch failed a write, and it left the one line L-15 asks for.
    expect(logged.all).toHaveLength(1);
    expect(logged.error).toEqual([noAccountFailureLine("42883")]);
  });
});

/**
 * L-15 of the PRD-008 close-out security audit. The no-account write's failure is swallowed, so
 * the 401 never changes, but a persistent failure (step 0 skipped, a lost grant, a key the
 * definer refuses) would otherwise leave no signal while the sign-in timing protection degrades.
 * The catch leaves one fixed line per process, at error level, carrying a short SQLSTATE token and
 * nothing else. The thrown error below carries every value the line must not: the client address,
 * the key hash, the email that was tried, the correlation reference, and a driver message.
 */
const NO_ACCOUNT_KEY_HASH = rateLimitKeyHash(
  CSRF_SERVER_SECRET,
  "sign_in_no_account",
  CLIENT_ADDRESS,
);
const DRIVER_DETAIL = "driver-detail-that-must-stay-out-of-the-log";
const DRIVER_MESSAGE = `permission denied for function record_sign_in_without_account, key ${NO_ACCOUNT_KEY_HASH}, address ${CLIENT_ADDRESS}, email ${UNKNOWN_ADDRESS}, ${DRIVER_DETAIL}`;

function noAccountFailureLine(token: string): string {
  return `password-authentication: the sign-in no-account write (platform.record_sign_in_without_account) failed with SQLSTATE ${token}; sign-in timing protection is degraded until the database function works.`;
}

interface CapturedConsole {
  /** Every line any level received, in order. */
  readonly all: string[];
  /** The lines written at error level. */
  readonly error: string[];
  /** The raw arguments of each error-level call. */
  readonly errorArguments: unknown[][];
}

/**
 * Captures into arrays of its own rather than reading `mock.calls`, so a spy left over from an
 * earlier test in this file can never add calls to what a proof counts.
 */
function captureConsoleLines(): CapturedConsole {
  const captured: CapturedConsole = { all: [], error: [], errorArguments: [] };
  for (const level of ["debug", "error", "info", "log", "warn"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      const line = args.map(String).join(" ");
      captured.all.push(line);
      if (level === "error") {
        captured.error.push(line);
        captured.errorArguments.push(args);
      }
    });
  }
  return captured;
}

function failingNoAccountWrite(failure: unknown): () => Promise<void> {
  return async () => {
    throw failure;
  };
}

function driverError(code?: unknown): Error {
  return Object.assign(new Error(DRIVER_MESSAGE), code === undefined ? {} : { code });
}

describe("a failed no-account write leaves one fixed line per process (L-15)", () => {
  it("logs once for the first failure and not again for the second in the same process", async () => {
    const logged = captureConsoleLines();
    const write = failingNoAccountWrite(driverError("42501"));

    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, { recordSignInWithoutAccount: write });
    expect(logged.all).toHaveLength(1);
    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, { recordSignInWithoutAccount: write });
    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, { recordSignInWithoutAccount: write });

    expect(logged.all).toHaveLength(1);
    expect(logged.error).toHaveLength(1);
  });

  it("is one error-level argument naming the operation, the token, and the degraded protection", async () => {
    const logged = captureConsoleLines();

    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: failingNoAccountWrite(driverError("42501")),
    });

    expect(logged.errorArguments).toEqual([[noAccountFailureLine("42501")]]);
    expect(logged.all).toEqual(logged.error);
    const line = logged.error[0] ?? "";
    expect(line).toContain("record_sign_in_without_account");
    expect(line).toContain("SQLSTATE 42501");
    expect(line).toContain(
      "sign-in timing protection is degraded until the database function works",
    );
  });

  it("carries none of the address, the key hash, the email, the correlation reference, or the driver message", async () => {
    const logged = captureConsoleLines();

    const run = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: failingNoAccountWrite(driverError("42883")),
    });

    const correlationRef = run.response.headers.get(CORRELATION_REFERENCE_HEADER);
    expect(correlationRef).toMatch(/^correlation_signIn_[0-9a-f]{24}$/u);
    expect(logged.all).toHaveLength(1);
    const line = logged.all[0] ?? "";
    for (const forbidden of [
      CLIENT_ADDRESS,
      NO_ACCOUNT_KEY_HASH,
      rateLimitKeyHash(CSRF_SERVER_SECRET, "sign_in_ip", CLIENT_ADDRESS),
      UNKNOWN_ADDRESS,
      UNKNOWN_ADDRESS.split("@")[0] ?? UNKNOWN_ADDRESS,
      WRONG_PASSWORD,
      correlationRef ?? "unreachable",
      "sign-in-unit-proof",
      DRIVER_MESSAGE,
      DRIVER_DETAIL,
      "permission denied",
    ]) {
      expect(line).not.toContain(forbidden);
    }
    expect(line).toBe(noAccountFailureLine("42883"));
  });

  it("falls back to the fixed word unknown unless the code is a five-character alphanumeric string", async () => {
    const tokens: string[] = [];
    const cases: readonly unknown[] = [
      driverError(),
      driverError("ECONNRESET"),
      driverError("42 83"),
      driverError("4288"),
      driverError(42883),
      driverError("42883\nforged log line"),
      new Error(DRIVER_MESSAGE),
      DRIVER_MESSAGE,
      null,
      undefined,
    ];
    for (const failure of cases) {
      const logged = captureConsoleLines();
      await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, {
        recordSignInWithoutAccount: failingNoAccountWrite(failure),
      });
      tokens.push(logged.error.join("|"));
      resetAuthHandlerProcessStateForTests();
      vi.restoreAllMocks();
    }

    expect(tokens).toEqual(cases.map(() => noAccountFailureLine("unknown")));
  });

  it("logs again in a fresh process", async () => {
    const logged = captureConsoleLines();
    const write = failingNoAccountWrite(driverError("42883"));

    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, { recordSignInWithoutAccount: write });
    resetAuthHandlerProcessStateForTests();
    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, { recordSignInWithoutAccount: write });

    expect(logged.error).toEqual([noAccountFailureLine("42883"), noAccountFailureLine("42883")]);
  });

  it("logs nothing when the write succeeds, and nothing for a known account's refusal", async () => {
    const logged = captureConsoleLines();

    await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD);
    await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: failingNoAccountWrite(driverError("42883")),
    });

    expect(logged.all).toEqual([]);
  });

  it("answers the same 401 as a known account's wrong password, and still awaits the same work", async () => {
    captureConsoleLines();
    const failing = failingNoAccountWrite(driverError("42883"));

    const unknown = await runSignIn(UNKNOWN_ADDRESS, WRONG_PASSWORD, {
      recordSignInWithoutAccount: failing,
    });
    const wrong = await runSignIn(KNOWN_ADDRESS, WRONG_PASSWORD);

    expect(unknown.response.status).toBe(401);
    expect(unknown.body).toBe('{"error":"AUTH_CREDENTIALS_REJECTED"}');
    expect(unknown.body).toBe(wrong.body);
    expect(unknown.response.headers.get("set-cookie")).toBeNull();
    expect([...unknown.response.headers.entries()]).toEqual([...wrong.response.headers.entries()]);
    expect(unknown.awaitedBeforeAnswer).toEqual([
      ...SHARED_SIGN_IN_WORK,
      "recordSignInWithoutAccount",
    ]);
    expect(unknown.scheduled).toEqual([]);
  });
});

/**
 * PRD-008a D2 (008A-AC-012). The change-password slot is consumed as soon as the session names the
 * person, before the body is read, so a request the route refuses for its body still spends one.
 * Otherwise a stolen session could probe freely with malformed requests and the limit would count
 * only the requests that reach a derivation. The Postgres proof of the eleventh attempt lives in
 * `password-authentication-handler.postgres.test.ts`; this one holds the ordering without a
 * database, through a counting limiter and an instrumented hasher.
 */
describe("change-password spends a slot on a refused body (008A-AC-012)", () => {
  const limitedActorId = "00000000-0000-4000-8000-000000000c31";
  const sessionSecret = "c".repeat(43);
  const csrfServerSecret = Buffer.alloc(32, 5);

  function changePasswordPorts(credentials: CredentialPort): CampaignCommandPorts {
    const established: EstablishedFirstPartySession = {
      sessionId: "session_limited",
      userId: "user_limited",
      locationId: "location_limited",
      installationId: "installation_limited",
      role: "location_admin",
      roleVersion: 1,
      expiresAtEpochSeconds: Math.floor(Date.now() / 1000) + 600,
    };
    const firstPartySessions: FirstPartySessionLookup = {
      async getActive(secret) {
        return secret === sessionSecret ? established : undefined;
      },
    };
    return {
      identityDirectory: createStaticIdentityDirectory([
        {
          locationRef: "location_limited",
          locationId: "00000000-0000-4000-8000-000000000c01",
          actorRef: "user_limited",
          actorId: limitedActorId,
        },
      ]),
      roleBindings: createStaticRoleBindingPort([
        {
          actorRef: "user_limited",
          locationRef: "location_limited",
          role: "location_admin",
          roleVersion: 1,
        },
      ]),
      mutation: { expectedHost: HOST, allowedBrowserOrigins: [ORIGIN], csrfServerSecret },
      firstPartySessions,
      credentials,
    };
  }

  async function attempt(
    body: string,
    run: Readonly<{ ports: CampaignCommandPorts; derivations: string[] }>,
  ): Promise<string> {
    const response = await handleChangePassword(
      new Request(`${ORIGIN}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: ORIGIN,
          host: HOST,
          cookie: `${FIRST_PARTY_SESSION_COOKIE}=${sessionSecret}`,
          [CSRF_REQUEST_HEADER]: createSessionBoundCsrfToken({
            serverSecret: csrfServerSecret,
            sessionId: "session_limited",
          }),
        },
        body,
      }),
      ENVIRONMENT,
      run.ports,
      {
        passwordHasher: {
          verify: () => {
            run.derivations.push("verify");
            return false;
          },
          hash: () => {
            run.derivations.push("hash");
            return "never-written";
          },
        },
      },
    );
    const parsed = JSON.parse(await response.text()) as { error: string };
    return `${String(response.status)} ${parsed.error}`;
  }

  function freshRun() {
    const { port, counters } = recordingCredentialPort();
    const counterKey = `change_password_user:${rateLimitKeyHash(
      csrfServerSecret,
      "change_password_user",
      limitedActorId,
    )}`;
    return { ports: changePasswordPorts(port), derivations: [] as string[], counters, counterKey };
  }

  it("counts a malformed body, a schema failure, and a mismatched confirmation", async () => {
    const run = freshRun();

    const answers = [
      await attempt("{not json", run),
      await attempt(
        JSON.stringify({
          currentPassword: "a settled harbour lantern",
          newPassword: "a brighter harbour lantern",
          confirmPassword: "a brighter harbour lantern",
          locationId: "00000000-0000-4000-8000-000000000c01",
        }),
        run,
      ),
      await attempt(
        JSON.stringify({
          currentPassword: "a settled harbour lantern",
          newPassword: "a brighter harbour lantern",
          confirmPassword: "a different harbour lantern",
        }),
        run,
      ),
    ];

    expect(answers).toEqual([
      "400 INVALID_AUTH_REQUEST",
      "400 INVALID_AUTH_REQUEST",
      "400 AUTH_PASSWORDS_DO_NOT_MATCH",
    ]);
    expect(run.counters.get(run.counterKey)).toBe(3);
    expect(run.derivations).toEqual([]);
  });

  it("refuses the eleventh attempt after ten refused bodies, before reading it", async () => {
    const run = freshRun();
    const limit = AUTH_RATE_LIMITS.change_password_user;
    expect(limit).toEqual({ attemptLimit: 10, windowSeconds: 900 });

    const refusedBodies: string[] = [];
    for (let index = 0; index < limit.attemptLimit; index += 1) {
      refusedBodies.push(await attempt("{not json", run));
    }
    const eleventh = await attempt(
      JSON.stringify({
        currentPassword: "a settled harbour lantern",
        newPassword: "a brighter harbour lantern",
        confirmPassword: "a brighter harbour lantern",
      }),
      run,
    );

    expect(refusedBodies).toEqual(Array.from({ length: 10 }, () => "400 INVALID_AUTH_REQUEST"));
    // A well-formed eleventh request is still refused, in the module's 429 shape, and nothing is
    // derived for it: the credential lookup that precedes the derivation would throw here.
    expect(eleventh).toBe("429 AUTH_RATE_LIMITED");
    expect(run.counters.get(run.counterKey)).toBe(11);
    expect(run.derivations).toEqual([]);
  });
});
