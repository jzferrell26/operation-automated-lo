import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createNotConfiguredEmailAdapter } from "../../apps/web/src/server/email/not-configured-email-adapter.js";
import {
  RESEND_SEND_ENDPOINT,
  createResendEmailAdapter,
} from "../../apps/web/src/server/email/resend-email-adapter.js";
import {
  emailDeliveryResult,
  emailDeliverySubject,
  type TransactionalEmailMessage,
} from "../../apps/web/src/server/email/transactional-email.js";
import {
  flushAuthBackgroundWork,
  handleResendVerificationEmail,
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
