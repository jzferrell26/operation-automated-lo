import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { RESET_PASSWORD_EMAIL, VERIFY_EMAIL_EMAIL } from "../../apps/web/src/copy/auth-messages.js";
import type {
  CampaignCommandPorts,
  FirstPartySessionIssuance,
} from "../../apps/web/src/server/authenticated-principal.js";
import type {
  AuthRateLimitScope,
  CredentialPort,
  CredentialTokenPurpose,
  EmailDeliveryAction,
  RegisterAccountOutcome,
  SignInBinding,
} from "../../apps/web/src/server/credential-ports.js";
import { createNotConfiguredEmailAdapter } from "../../apps/web/src/server/email/not-configured-email-adapter.js";
import {
  RESEND_SEND_ENDPOINT,
  createResendEmailAdapter,
} from "../../apps/web/src/server/email/resend-email-adapter.js";
import {
  emailDeliveryResult,
  emailDeliverySubject,
  type TransactionalEmailMessage,
  type TransactionalEmailPort,
} from "../../apps/web/src/server/email/transactional-email.js";
import {
  flushAuthBackgroundWork,
  handleForgotPassword,
  handlePasswordSignUp,
  handleResendVerificationEmail,
  handleResetPassword,
} from "../../apps/web/src/server/password-authentication-handler.js";
import { resolveRuntimeAuthenticationComposition } from "../../apps/web/src/server/runtime-authentication.js";

/**
 * PRD-006a 006A-AC-024 and 006A-AC-025. Transactional email is off unless an operator turns it
 * on, by name, on the deployment.
 *
 * `tests/security/provider-side-effect-default-off.test.ts` proves the same thing for the four
 * G-gated provider surfaces. Email is not one of those four: it carries the product's own account
 * messages and nothing else, it sends no marketing, and it publishes nothing. It still gets its
 * own default-off proof, because a deployment that quietly acquired the ability to send mail
 * would be a surprise however narrow the messages are.
 *
 * Whether the port should also be registered in `ProviderOperationSchema`, so the
 * provider-side-effect suite covers it structurally, is the open question PRD-006a leaves for
 * `security-guardian`. These assertions are what that decision replaces or keeps.
 */

const MESSAGE: TransactionalEmailMessage = Object.freeze({
  to: "somebody@oalo.invalid",
  subject: "Reset your Automated LO password",
  text: "a link",
  html: "<p>a link</p>",
  idempotencyKey: "00000000-0000-4000-8000-000000000001",
});

const BASE_ENVIRONMENT = Object.freeze({
  OALO_ENVIRONMENT: "local",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  OALO_REVIEW_SURFACE: "authorized",
  OALO_DATABASE_URL: "postgresql://oalo@127.0.0.1:5432/oalo_test_email",
  OALO_DATABASE_SSL_MODE: "disable",
  OALO_APP_URL: "https://review.operation-automated-lo.test",
  OALO_ALLOWED_ORIGINS: "https://review.operation-automated-lo.test",
  OALO_CSRF_SERVER_SECRET: "Zm9yLXRoZS1lbWFpbC1kZWZhdWx0LW9mZi1wcm9vZi0wMDAwMDAw",
});

const RESEND_KEY = "re_a_throwaway_key_for_the_proofs";

/** The origin and host `BASE_ENVIRONMENT` declares, so a request under it passes the origin gate. */
const REVIEW_ORIGIN = BASE_ENVIRONMENT.OALO_APP_URL;
const REVIEW_HOST = new URL(REVIEW_ORIGIN).host;

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([".next", ".turbo", "coverage", "dist", "node_modules"]);

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) files.push(...(await sourceFiles(target)));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(target);
  }
  return files;
}

function repositoryPath(absolutePath: string): string {
  return relative(resolve("."), absolutePath).replaceAll("\\", "/");
}

describe("the not-configured adapter", () => {
  it("never calls fetch and always reports the honest reason", async () => {
    const original = globalThis.fetch;
    let called = 0;
    globalThis.fetch = (async () => {
      called += 1;
      throw new Error("The not-configured adapter must never reach the network");
    }) as typeof globalThis.fetch;
    try {
      const result = await createNotConfiguredEmailAdapter().send(MESSAGE);

      expect(result).toEqual({ delivered: false, reason: "not_configured" });
      expect(emailDeliveryResult(result)).toBe("failed");
      expect(emailDeliverySubject(result)).toBe("not_configured");
      expect(called).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe("the Resend adapter (006A-AC-024)", () => {
  it("posts the documented request and returns the provider message id", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const adapter = createResendEmailAdapter({
      apiKey: RESEND_KEY,
      from: "no-reply@oalo.invalid",
      async fetch(url, init) {
        calls.push({ url, init });
        return new Response(JSON.stringify({ id: "resend-message-id-0002" }), { status: 200 });
      },
    });

    const result = await adapter.send(MESSAGE);

    expect(result).toEqual({ delivered: true, providerMessageId: "resend-message-id-0002" });
    expect(calls[0]?.url).toBe(RESEND_SEND_ENDPOINT);
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers["authorization"]).toBe(`Bearer ${RESEND_KEY}`);
    expect(headers["idempotency-key"]).toBe(MESSAGE.idempotencyKey);
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      from: "no-reply@oalo.invalid",
      to: MESSAGE.to,
      subject: MESSAGE.subject,
      text: MESSAGE.text,
      html: MESSAGE.html,
    });
  });

  it("maps a non-2xx answer, a missing id, and a thrown fetch to one provider error", async () => {
    const refused = createResendEmailAdapter({
      apiKey: RESEND_KEY,
      from: "no-reply@oalo.invalid",
      async fetch() {
        return new Response(JSON.stringify({ message: "refused" }), { status: 422 });
      },
    });
    const idless = createResendEmailAdapter({
      apiKey: RESEND_KEY,
      from: "no-reply@oalo.invalid",
      async fetch() {
        return new Response(JSON.stringify({}), { status: 200 });
      },
    });
    const thrown = createResendEmailAdapter({
      apiKey: RESEND_KEY,
      from: "no-reply@oalo.invalid",
      async fetch() {
        throw new Error(`network refused while sending with ${RESEND_KEY}`);
      },
    });

    for (const adapter of [refused, idless, thrown]) {
      const result = await adapter.send(MESSAGE);
      expect(result).toEqual({ delivered: false, reason: "provider_error" });
    }
  });

  it("never puts the key in a returned value, whatever the provider did", async () => {
    const adapter = createResendEmailAdapter({
      apiKey: RESEND_KEY,
      from: "no-reply@oalo.invalid",
      async fetch() {
        // A real network failure can carry the request headers, and those carry the key.
        throw new Error(`connect ECONNREFUSED with authorization Bearer ${RESEND_KEY}`);
      },
    });

    const result = await adapter.send(MESSAGE);

    expect(JSON.stringify(result)).not.toContain(RESEND_KEY);
  });
});

describe("email composition (006A-AC-024 and 025)", () => {
  it("composes the not-configured adapter when neither variable is set", () => {
    const composition = resolveRuntimeAuthenticationComposition(BASE_ENVIRONMENT);

    expect(composition.failedVariable).toBeUndefined();
    expect(composition.ports.transactionalEmail).toBeDefined();
  });

  it("refuses to compose with exactly one of the two variables, and names it", () => {
    expect(
      resolveRuntimeAuthenticationComposition({
        ...BASE_ENVIRONMENT,
        OALO_RESEND_API_KEY: RESEND_KEY,
      }).failedVariable,
    ).toBe("OALO_EMAIL_FROM");
    expect(
      resolveRuntimeAuthenticationComposition({
        ...BASE_ENVIRONMENT,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }).failedVariable,
    ).toBe("OALO_RESEND_API_KEY");
  });

  it("never composes an email port at all in synthetic mode", () => {
    const composition = resolveRuntimeAuthenticationComposition({
      ...BASE_ENVIRONMENT,
      OALO_REVIEW_SURFACE: "",
      // Even with both variables present, synthetic mode returns the static synthetic ports
      // before the email composition runs, so no adapter that could send exists on that path.
      OALO_RESEND_API_KEY: RESEND_KEY,
      OALO_EMAIL_FROM: "no-reply@oalo.invalid",
    });

    expect(composition.mode).toBe("synthetic");
    expect(composition.ports.transactionalEmail).toBeUndefined();
    expect(composition.ports.credentials).toBeUndefined();
  });
});

/**
 * PRD-006b D10's resend control, held to the same rule as the three flows above.
 *
 * It is the one auth route a person can press over and over, so a deployment with no sending
 * domain that quietly acquired a way to post to a provider would acquire it here first. This is
 * the structural half of the proof: the route exists, the composition it runs under has no
 * configured adapter, and a request that reaches it makes no network call on any path it can take
 * without a database. The branch where a message would actually be sent needs a real session, so
 * it is proved with one, against a disposable PostgreSQL, in
 * `apps/web/src/server/verification-resend-handler.postgres.test.ts`.
 */
describe("the resend control with no email variables set (006A-AC-025)", () => {
  it("issues no network request and runs under an adapter that cannot send", async () => {
    const original = globalThis.fetch;
    let called = 0;
    globalThis.fetch = (async () => {
      called += 1;
      throw new Error("The resend route must not reach the network with no email variables set");
    }) as typeof globalThis.fetch;
    try {
      const response = await handleResendVerificationEmail(
        new Request(`${REVIEW_ORIGIN}/api/auth/resend-verification`, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            origin: REVIEW_ORIGIN,
            host: REVIEW_HOST,
          },
          body: new URLSearchParams({ csrfToken: "not-a-real-token" }).toString(),
        }),
        BASE_ENVIRONMENT,
      );
      await flushAuthBackgroundWork();

      // No session cookie, so the route refuses before it reads a row. What this case is about is
      // that nothing went out on the way to refusing.
      expect(response.status).toBe(401);
      expect(called).toBe(0);
      expect(
        resolveRuntimeAuthenticationComposition(BASE_ENVIRONMENT).ports.transactionalEmail
          ?.configured,
      ).toBe(false);
    } finally {
      globalThis.fetch = original;
    }
  });
});

// ---------------------------------------------------------------------------
// The three flows 006A-AC-025 names, driven
// ---------------------------------------------------------------------------

/**
 * 006A-AC-025 names sign-up, forgot-password and reset, and the cases above drive none of them.
 * The resend case refuses on a missing session cookie before any send could be reached, so its
 * zero is a zero the route never had the chance to spend, and a criterion answered that way is
 * answered by the refusal rather than by the default.
 *
 * These cases walk the three flows in the order one person walks them, against in-memory ports.
 * The database is the only thing replaced. The email port is not: it is read out of the product's
 * own `resolveRuntimeAuthenticationComposition` under each environment, so what decides whether a
 * message is handed to a provider is the D6 composition and never a stand-in this file wrote.
 *
 * Both halves are needed. With neither variable set the fake `fetch` must be untouched; with both
 * set the same drive must reach the provider twice, once for the confirmation message sign-up
 * sends and once for the reset link. Without the second half the first proves nothing, because a
 * drive that never reaches a send point also makes no network request.
 */

const OFFLINE_PASSWORD = "a settled harbour lantern";
const OFFLINE_NEW_PASSWORD = "a brighter harbour lantern";
const OFFLINE_EMAIL = "offline-newcomer@oalo.invalid";
const OFFLINE_USER_ID = "00000000-0000-4000-8000-0000000000a1";
const OFFLINE_LOCATION_ID = "00000000-0000-4000-8000-0000000000b1";

const SIGN_UP_ENABLED_ENVIRONMENT = Object.freeze({
  ...BASE_ENVIRONMENT,
  OALO_SELF_SERVE_SIGNUP: "enabled",
});

const OFFLINE_BINDING: SignInBinding = Object.freeze({
  locationId: OFFLINE_LOCATION_ID,
  locationDisplayName: "Offline workspace",
  bindingRole: "location_admin",
});

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** A method the three flows never take. Reaching one means the drive took a path it should not. */
function unreachable(method: string): never {
  throw new Error(`The 006A-AC-025 drive must not reach ${method}`);
}

interface IssuedTokenRecord {
  readonly purpose: CredentialTokenPurpose;
  readonly tokenHash: string;
}

interface DeliveryRecord {
  readonly action: EmailDeliveryAction;
  readonly result: "success" | "failed";
  readonly subjectId: string;
}

interface OfflineStore {
  readonly registered: string[];
  readonly limits: AuthRateLimitScope[];
  readonly issuedTokens: IssuedTokenRecord[];
  readonly liveTokens: Map<string, CredentialTokenPurpose>;
  readonly deliveries: DeliveryRecord[];
  readonly issuedBy: FirstPartySessionIssuance["issuedBy"][];
  readonly passwordReasons: string[];
  passwordHash: string;
}

function createOfflineStore(): OfflineStore {
  return {
    registered: [],
    limits: [],
    issuedTokens: [],
    liveTokens: new Map<string, CredentialTokenPurpose>(),
    deliveries: [],
    issuedBy: [],
    passwordReasons: [],
    passwordHash: "",
  };
}

/** A uuid-shaped token id, because the Resend adapter sends it as the idempotency key. */
function offlineTokenId(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`;
}

function createOfflineCredentialPort(store: OfflineStore): CredentialPort {
  return {
    async lookupCredential(emailNormalized: string) {
      if (!store.registered.includes(emailNormalized)) return undefined;
      return Object.freeze({
        userId: OFFLINE_USER_ID,
        passwordHash: store.passwordHash,
        lockedUntilEpochSeconds: undefined,
        failedAttemptCount: 0,
        emailVerified: false,
      });
    },
    lookupCredentialForUser: () => unreachable("lookupCredentialForUser"),
    unverifiedEmailDisplayForUser: () => unreachable("unverifiedEmailDisplayForUser"),
    passwordPolicyIdentityForUser: () => unreachable("passwordPolicyIdentityForUser"),
    // PRD-006a D3 and D5. The reset flow reads the policy identity before it consumes the token;
    // this offline store holds no display name or address, and `undefined` is the port's own
    // answer for no context, which the handler treats as nothing to compare against.
    async passwordPolicyIdentityForResetToken() {
      return undefined;
    },
    async listSignInBindings() {
      return Object.freeze([OFFLINE_BINDING]);
    },
    recordSignInFailure: () => unreachable("recordSignInFailure"),
    recordSignInSuccess: () => unreachable("recordSignInSuccess"),
    async issueToken(input) {
      store.issuedTokens.push({ purpose: input.purpose, tokenHash: input.tokenHash });
      store.liveTokens.set(input.tokenHash, input.purpose);
      return offlineTokenId(store.issuedTokens.length);
    },
    async consumeToken(input) {
      if (store.liveTokens.get(input.tokenHash) !== input.purpose) return undefined;
      store.liveTokens.delete(input.tokenHash);
      return Object.freeze({ userId: OFFLINE_USER_ID, tokenId: offlineTokenId(0) });
    },
    async setPassword(input) {
      store.passwordReasons.push(input.reason);
      store.passwordHash = input.passwordHash;
      return 0;
    },
    revokeAllSessions: () => unreachable("revokeAllSessions"),
    async registerAccount(input): Promise<RegisterAccountOutcome> {
      if (store.registered.includes(input.emailNormalized)) {
        return Object.freeze({ registered: false as const, reason: "duplicate_email" as const });
      }
      store.registered.push(input.emailNormalized);
      store.passwordHash = input.passwordHash;
      return Object.freeze({
        registered: true as const,
        account: Object.freeze({
          userId: OFFLINE_USER_ID,
          locationId: OFFLINE_LOCATION_ID,
          installationId: offlineTokenId(1),
          bindingId: offlineTokenId(2),
        }),
      });
    },
    markEmailVerified: () => unreachable("markEmailVerified"),
    async recordEmailDelivery(input) {
      store.deliveries.push({
        action: input.action,
        result: input.result,
        subjectId: input.subjectId,
      });
      return true;
    },
    async consumeRateLimit(input) {
      store.limits.push(input.scope);
      return true;
    },
  };
}

function createOfflinePorts(
  store: OfflineStore,
  transactionalEmail: TransactionalEmailPort | undefined,
): CampaignCommandPorts {
  return Object.freeze({
    identityDirectory: {
      resolveLocationId: () => unreachable("resolveLocationId"),
      resolveActorId: () => unreachable("resolveActorId"),
    },
    roleBindings: { currentRoleVersion: () => unreachable("currentRoleVersion") },
    mutation: Object.freeze({
      expectedHost: REVIEW_HOST,
      allowedBrowserOrigins: Object.freeze([REVIEW_ORIGIN]),
      csrfServerSecret: new Uint8Array(32).fill(7),
    }),
    sessionIssuance: {
      async issue(input: Readonly<FirstPartySessionIssuance>) {
        store.issuedBy.push(input.issuedBy);
        return offlineTokenId(3);
      },
      revoke: () => unreachable("revoke"),
      recordDeniedAttempt: () => unreachable("recordDeniedAttempt"),
    },
    credentials: createOfflineCredentialPort(store),
    ...(transactionalEmail === undefined ? {} : { transactionalEmail }),
  });
}

interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit;
}

/**
 * The fake `fetch`. It records every attempt before it decides what to do, so a case asserts the
 * count rather than leaning on a throw reaching an assertion: the Resend adapter deliberately
 * swallows a thrown `fetch` into `provider_error`, and a proof built on the throw would pass for
 * the wrong reason.
 */
async function underFakeFetch<T>(
  answer: "refuse" | "accept",
  work: () => Promise<T>,
): Promise<Readonly<{ value: T; calls: readonly RecordedCall[] }>> {
  const calls: RecordedCall[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string, init: RequestInit) => {
    calls.push({ url: String(input), init });
    if (answer === "refuse") {
      throw new Error("No auth flow may reach the network with no email variables set");
    }
    return new Response(JSON.stringify({ id: `resend-message-id-000${String(calls.length)}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof globalThis.fetch;
  try {
    return Object.freeze({ value: await work(), calls });
  } finally {
    globalThis.fetch = original;
  }
}

function offlineRequest(path: string, body: unknown, clientAddress: string): Request {
  return new Request(`${REVIEW_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: REVIEW_ORIGIN,
      host: REVIEW_HOST,
      "x-forwarded-for": clientAddress,
    },
    body: JSON.stringify(body),
  });
}

/** The live reset token, matched to the hash the handler handed `issueToken`. */
function resetTokenFrom(store: OfflineStore, minted: readonly string[]): string {
  const issued = store.issuedTokens.find((record) => record.purpose === "password_reset");
  const token = minted.find((candidate) => sha256Hex(candidate) === issued?.tokenHash);
  if (token === undefined) throw new Error("forgot-password minted no password_reset token");
  return token;
}

interface FlowRun {
  readonly store: OfflineStore;
  readonly signUp: Response;
  readonly forgot: Response;
  readonly reset: Response;
  readonly emailConfigured: boolean;
}

/**
 * Sign-up, then forgot-password, then reset, under the composition `environment` selects.
 *
 * The URL tokens are injected through the handlers' own `randomUrlToken` dependency rather than
 * read back out of a message, because with no sending domain there is no message to read one out
 * of, and reset has to hold the very token forgot-password minted or it refuses before it reaches
 * any work of its own.
 */
async function driveTheThreeFlows(environment: Readonly<Record<string, string>>): Promise<FlowRun> {
  const transactionalEmail =
    resolveRuntimeAuthenticationComposition(environment).ports.transactionalEmail;
  const store = createOfflineStore();
  const ports = createOfflinePorts(store, transactionalEmail);
  const minted: string[] = [];
  const dependencies = {
    randomUrlToken: () => {
      const token = `offline-url-token-${String(minted.length)}`;
      minted.push(token);
      return token;
    },
  };

  const signUp = await handlePasswordSignUp(
    offlineRequest(
      "/api/auth/sign-up",
      { name: "Offline Newcomer", email: OFFLINE_EMAIL, password: OFFLINE_PASSWORD },
      "203.0.113.1",
    ),
    environment,
    ports,
    dependencies,
  );
  await flushAuthBackgroundWork();

  const forgot = await handleForgotPassword(
    offlineRequest("/api/auth/forgot-password", { email: OFFLINE_EMAIL }, "203.0.113.2"),
    environment,
    ports,
    dependencies,
  );
  await flushAuthBackgroundWork();

  const reset = await handleResetPassword(
    offlineRequest(
      "/api/auth/reset-password",
      {
        token: resetTokenFrom(store, minted),
        password: OFFLINE_NEW_PASSWORD,
        confirmPassword: OFFLINE_NEW_PASSWORD,
      },
      "203.0.113.3",
    ),
    environment,
    ports,
    dependencies,
  );
  await flushAuthBackgroundWork();

  return Object.freeze({
    store,
    signUp,
    forgot,
    reset,
    emailConfigured: transactionalEmail?.configured === true,
  });
}

describe("sign-up, forgot-password and reset with no email variables set (006A-AC-025)", () => {
  it("drives all three flows to their send points and never calls fetch", async () => {
    const { value: run, calls } = await underFakeFetch("refuse", () =>
      driveTheThreeFlows(SIGN_UP_ENABLED_ENVIRONMENT),
    );

    expect(calls).toEqual([]);
    expect(run.emailConfigured).toBe(false);

    // Each flow got as far as it can get, so the zero above is the deployment's answer rather
    // than a drive that stopped short of the place a message would have gone out.
    expect(run.signUp.status).toBe(200);
    expect(await run.signUp.clone().json()).toEqual({ next: "/overview" });
    expect(run.store.registered).toEqual([OFFLINE_EMAIL]);
    expect(run.forgot.status).toBe(200);
    expect(await run.forgot.clone().text()).toBe('{"state":"sent"}');
    expect(run.reset.status).toBe(200);
    expect(await run.reset.clone().json()).toEqual({ next: "/overview?passwordReset=1" });
    expect(run.store.passwordReasons).toEqual(["reset"]);
    expect(run.store.issuedBy).toEqual(["password_sign_in", "password_reset"]);
    expect(run.store.limits).toEqual(["sign_up_ip", "forgot_ip", "forgot_email", "reset_ip"]);

    // 006A-AC-021. No sending domain means no confirmation token was minted at all, and the one
    // audit row a reset request leaves behind says why nothing went out.
    expect(run.store.issuedTokens.map((record) => record.purpose)).toEqual(["password_reset"]);
    expect(run.store.deliveries).toEqual([
      { action: "auth.reset-email", result: "failed", subjectId: "not_configured" },
    ]);
  });

  it("reaches the provider twice under the same drive once both variables are set", async () => {
    const { value: run, calls } = await underFakeFetch("accept", () =>
      driveTheThreeFlows({
        ...SIGN_UP_ENABLED_ENVIRONMENT,
        OALO_RESEND_API_KEY: RESEND_KEY,
        OALO_EMAIL_FROM: "no-reply@oalo.invalid",
      }),
    );

    expect(run.emailConfigured).toBe(true);
    expect(calls.map((call) => call.url)).toEqual([RESEND_SEND_ENDPOINT, RESEND_SEND_ENDPOINT]);
    expect(
      calls.map((call) => (call.init.headers as Record<string, string>)["authorization"]),
    ).toEqual([`Bearer ${RESEND_KEY}`, `Bearer ${RESEND_KEY}`]);
    expect(
      calls.map((call) => (JSON.parse(String(call.init.body)) as { subject: string }).subject),
    ).toEqual([VERIFY_EMAIL_EMAIL.subject, RESET_PASSWORD_EMAIL.subject]);

    // The same three responses, and two audited sends where the case above had one unsent row.
    expect(run.signUp.status).toBe(200);
    expect(run.forgot.status).toBe(200);
    expect(run.reset.status).toBe(200);
    expect(run.store.issuedTokens.map((record) => record.purpose)).toEqual([
      "email_verification",
      "password_reset",
    ]);
    expect(run.store.deliveries.map((delivery) => `${delivery.action}:${delivery.result}`)).toEqual(
      ["auth.verification-email:success", "auth.reset-email:success"],
    );
  });
});

describe("the send endpoint has exactly one caller", () => {
  it("is named in the adapter and nowhere else that ships", async () => {
    const roots = [resolve("apps"), resolve("packages")];
    const holders: string[] = [];
    for (const root of roots) {
      for (const file of await sourceFiles(root)) {
        // A test may name the endpoint to assert what was sent to it; shipped code may not.
        if (/\.(?:test|spec)\.tsx?$/u.test(file)) continue;
        const source = await readFile(file, "utf8");
        if (source.includes("api.resend.com")) holders.push(repositoryPath(file));
      }
    }

    expect(holders.toSorted()).toEqual(["apps/web/src/server/email/resend-email-adapter.ts"]);
  });

  it("adds no email dependency to any manifest", async () => {
    const manifests = ["package.json", "apps/web/package.json", "packages/auth/package.json"];
    for (const manifest of manifests) {
      const source = await readFile(resolve(manifest), "utf8");
      const parsed = JSON.parse(source) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const names = [
        ...Object.keys(parsed.dependencies ?? {}),
        ...Object.keys(parsed.devDependencies ?? {}),
      ];
      expect(
        names.filter((name) => /resend|nodemailer|postmark|sendgrid|mailgun/iu.test(name)),
      ).toEqual([]);
      // PRD-006a D2. The derivation is `node:crypto` Argon2id, so no hashing package either.
      expect(names.filter((name) => /^(argon2|bcrypt|scrypt)/iu.test(name))).toEqual([]);
    }
  });
});
