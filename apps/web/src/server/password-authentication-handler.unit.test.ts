import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createStaticIdentityDirectory,
  createStaticRoleBindingPort,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import type { CredentialPort, PasswordCredential } from "./credential-ports.js";
import type { TransactionalEmailMessage } from "./email/transactional-email.js";
import {
  clientAddressFor,
  handleForgotPassword,
  resetAuthHandlerProcessStateForTests,
  scheduleThroughNextAfter,
} from "./password-authentication-handler.js";

/**
 * PRD-008a, the parts of the password handler a test can hold without a database: the address
 * the per-address limits key on (008A-AC-016), the level the missing-address line is logged at
 * (008A-AC-017), and the work forgot-password does before it answers (008A-AC-013 and 024).
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

/**
 * A credential port that records every call it is given and answers each one only after a real
 * macrotask, the way a database round trip does. `before` is what the handler awaited before it
 * answered; anything recorded after that happened in work it scheduled.
 */
function recordingCredentialPort(options: Readonly<{ issueToken?: () => Promise<string> }> = {}): {
  port: CredentialPort;
  calls: string[];
} {
  const calls: string[] = [];
  const roundTrip = async <T>(name: string, value: T): Promise<T> => {
    calls.push(name);
    await new Promise((resolve) => setTimeout(resolve, 1));
    return value;
  };
  const known: PasswordCredential = Object.freeze({
    userId: "00000000-0000-4000-8000-000000000a11",
    passwordHash: "not-read-by-forgot-password",
    lockedUntilEpochSeconds: undefined,
    failedAttemptCount: 0,
    emailVerified: true,
  });
  const refuse = (): never => {
    throw new Error("forgot-password must not reach this port method");
  };
  const port: CredentialPort = {
    consumeRateLimit: (input) => roundTrip(`consumeRateLimit:${input.scope}`, true),
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
    lookupCredentialForUser: refuse,
    unverifiedEmailDisplayForUser: refuse,
    listSignInBindings: refuse,
    recordSignInFailure: refuse,
    recordSignInSuccess: refuse,
    consumeToken: refuse,
    passwordPolicyIdentityForUser: refuse,
    passwordPolicyIdentityForResetToken: refuse,
    setPassword: refuse,
    revokeAllSessions: refuse,
    registerAccount: refuse,
    markEmailVerified: refuse,
  };
  return { port, calls };
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
      csrfServerSecret: Buffer.alloc(32, 7),
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
 * Both branches carry the same tracing id. Without one each request mints a random correlation
 * reference, so the header comparison below would be comparing two random values rather than the
 * two answers.
 */
function forgotRequest(email: string): Request {
  return new Request(`${ORIGIN}/api/auth/forgot-password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      host: HOST,
      "x-vercel-forwarded-for": "203.0.113.50",
      "x-correlation-id": "forgot-password-unit-proof",
    },
    body: JSON.stringify({ email }),
  });
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
