import { FIRST_PARTY_SESSION_COOKIE, hashPassword } from "@oalo/auth";
import type { PostgresDatabasePool } from "@oalo/db";

import {
  clearAuthRateLimitsForKey,
  seedReviewCredential,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import {
  REVIEW_HOST,
  REVIEW_ORIGIN,
  applyRouteEnvironment,
  routeEnvironment,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";
import { TRACING_ID_HEADER } from "./correlation-boundary.js";

/**
 * PRD-006a. Shared support for the route-level proofs of the email and password exchange.
 *
 * It adds three things to `campaign-route-postgres-support.ts`: an environment that turns the
 * sign-in surface on, browser-shaped requests for a caller who has no session yet, and the
 * credential seeding those proofs need. Everything owner-privileged is delegated to
 * `packages/db/test/campaign-integration-support.mjs`, which
 * `tests/security/database-privilege-escalation-boundary.test.ts` names as the only sanctioned
 * holder of that capability. Nothing here elevates.
 */

/** A distinct client address per proof, so one proof's attempts never spend another's budget. */
export const DEFAULT_CLIENT_ADDRESS = "198.51.100.10";

export function authEnvironment(
  overrides: Readonly<Record<string, string>> = {},
): RoutePostgresEnvironment {
  return routeEnvironment(overrides);
}

export function signUpEnabledEnvironment(
  overrides: Readonly<Record<string, string>> = {},
): RoutePostgresEnvironment {
  return routeEnvironment({ OALO_SELF_SERVE_SIGNUP: "enabled", ...overrides });
}

export interface RouteEnvironmentSwapper {
  /** Runs one case under a different composition and puts the suite's own back afterwards. */
  swap(next: RoutePostgresEnvironment, work: () => Promise<void>): Promise<void>;
  /** Puts the suite's own environment back for good. Called from `afterAll`. */
  restore(): void;
}

/**
 * Installs a suite's environment and hands back the one safe way to leave it for a case.
 *
 * Every route-level proof that needs a configured sending domain, a self-serve sign-up, or a
 * different workspace mode has to swap the process environment and put it back, and getting the
 * restore order wrong leaks one case's deployment into the next file. It is written once here so
 * the three suites cannot drift into three different notions of what "afterwards" means.
 */
export function installRouteEnvironment(
  environment: RoutePostgresEnvironment,
): RouteEnvironmentSwapper {
  let restoreEnvironment = applyRouteEnvironment(environment);
  return {
    async swap(next, work) {
      restoreEnvironment();
      const restoreSwapped = applyRouteEnvironment(next);
      try {
        await work();
      } finally {
        restoreSwapped();
        restoreEnvironment = applyRouteEnvironment(environment);
      }
    },
    restore() {
      restoreEnvironment();
    },
  };
}

/** A distinct client address per proof, so one proof's attempts never spend another's budget. */
export function createClientAddressAllocator(prefix: string): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    return `${prefix}.${String(counter)}`;
  };
}

function linkTokenFrom(body: string, path: string): string {
  const parsed = JSON.parse(body) as { text: string };
  const match = new RegExp(`${path}\\?token=([A-Za-z0-9_%-]+)`, "u").exec(parsed.text);
  if (match?.[1] === undefined) throw new Error(`No ${path} link was in the message`);
  return decodeURIComponent(match[1]);
}

/** The reset link the fake provider was handed, and the token inside it. */
export function resetLinkTokenFrom(body: string): string {
  return linkTokenFrom(body, "reset-password");
}

/** The confirmation link the fake provider was handed, and the token inside it. */
export function verificationLinkTokenFrom(body: string): string {
  return linkTokenFrom(body, "verify-email");
}

/**
 * Spends a confirmation link and answers the refusal code. A consumed, superseded, or expired
 * token is one generic failure, and two suites need to say so about a token they hold.
 */
export async function refusalForSpentVerificationToken(
  verify: (request: Request) => Promise<Response>,
  token: string,
  clientAddress: string,
): Promise<Readonly<{ status: number; error: string }>> {
  const response = await verify(
    authRequest("/api/auth/verify-email", { token }, { clientAddress }),
  );
  return Object.freeze({
    status: response.status,
    error: ((await response.json()) as { error: string }).error,
  });
}

/**
 * Runs the work with a `fetch` that throws and counts, and answers how many times it was reached.
 * 006A-AC-025's shape: a caller asserts zero, and the thrown error names why it must be zero.
 */
export async function countFetchAttemptsDuring(work: () => Promise<void>): Promise<number> {
  const original = globalThis.fetch;
  let called = 0;
  globalThis.fetch = (async () => {
    called += 1;
    throw new Error("No auth path may reach the network with no email variables set");
  }) as typeof globalThis.fetch;
  try {
    await work();
  } finally {
    globalThis.fetch = original;
  }
  return called;
}

export interface AuthRequestOverrides {
  readonly origin?: string | undefined;
  readonly host?: string | undefined;
  readonly clientAddress?: string | undefined;
  /**
   * Sends no forwarded-address header at all, which is what a caller that reaches the origin
   * without a proxy in front of it presents. `clientAddress` cannot express this, because an
   * omitted one means "the suite's default address" and not "no address".
   */
  readonly withoutClientAddress?: boolean | undefined;
  readonly cookie?: string | undefined;
  readonly csrfToken?: string | undefined;
  /**
   * The caller's own tracing id. A correlation reference is the route name plus a digest of this,
   * so without one every request to a route shares one reference and a proof that counts audit
   * rows by correlation counts every earlier case's rows too. A distinct id per case gives that
   * case its own reference, through the product's own mechanism rather than around it.
   */
  readonly tracingId?: string | undefined;
}

/**
 * The request a browser sends to an auth route before it holds a session: the page origin, the
 * deployment host, and the forwarded client address the rate limiter keys on. No cookie and no
 * session-bound token, because there is no session yet.
 */
function authHeaders(contentType: string, overrides: AuthRequestOverrides): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": contentType,
    origin: overrides.origin ?? REVIEW_ORIGIN,
    host: overrides.host ?? REVIEW_HOST,
  };
  if (overrides.withoutClientAddress !== true) {
    headers["x-forwarded-for"] = overrides.clientAddress ?? DEFAULT_CLIENT_ADDRESS;
  }
  if (overrides.cookie !== undefined) headers["cookie"] = overrides.cookie;
  if (overrides.csrfToken !== undefined) headers["x-csrf-token"] = overrides.csrfToken;
  if (overrides.tracingId !== undefined) headers[TRACING_ID_HEADER] = overrides.tracingId;
  return headers;
}

export function authRequest(
  path: string,
  body: unknown,
  overrides: AuthRequestOverrides = {},
): Request {
  return new Request(`${REVIEW_ORIGIN}${path}`, {
    method: "POST",
    headers: authHeaders("application/json", overrides),
    body: JSON.stringify(body),
  });
}

/**
 * The request a browser sends when the control is a plain form rather than a script: the fields
 * are urlencoded in the body and the session-bound token is one of them, which is what
 * `withPromotedCsrfHeader` exists to lift into the header before the 005a mutation gate sees it.
 */
export function authFormRequest(
  path: string,
  fields: Readonly<Record<string, string>>,
  overrides: AuthRequestOverrides = {},
): Request {
  return new Request(`${REVIEW_ORIGIN}${path}`, {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded", overrides),
    body: new URLSearchParams(fields).toString(),
  });
}

/** The `__Host-oalo_session` value a response set, or undefined when it set none. */
export function sessionCookieFrom(response: Response): string | undefined {
  const header = response.headers.get("set-cookie") ?? "";
  const value = /__Host-oalo_session=([A-Za-z0-9_-]+);/u.exec(header)?.[1];
  return value === undefined ? undefined : `${FIRST_PARTY_SESSION_COOKIE}=${value}`;
}

export async function seedCredential(
  pool: PostgresDatabasePool,
  input: Readonly<{ userId: string; email: string; password: string }>,
): Promise<void> {
  await seedReviewCredential(pool, {
    userId: input.userId,
    emailNormalized: input.email,
    passwordHash: hashPassword(input.password),
  });
}

/**
 * Clears one counter key. Never the whole table: the route-level suites are separate vitest
 * files run in parallel against one database, so emptying it would delete a counter another file
 * is in the middle of counting.
 */
export async function resetRateLimitKey(
  pool: PostgresDatabasePool,
  keyHash: string,
): Promise<void> {
  await clearAuthRateLimitsForKey(pool, keyHash);
}

/**
 * A `fetch` that records what it was asked to send and answers as Resend does. Installed over
 * `globalThis.fetch` for the cases that need the configured email path, and asserted uncalled for
 * the cases that must make no network request at all.
 */
export interface FetchRecorder {
  readonly calls: { url: string; init: RequestInit }[];
  install(response?: Readonly<{ ok: boolean; body: unknown }>): () => void;
}

export function createFetchRecorder(): FetchRecorder {
  const calls: { url: string; init: RequestInit }[] = [];
  return {
    calls,
    install(response = { ok: true, body: { id: "resend-message-id-0001" } }) {
      const original = globalThis.fetch;
      globalThis.fetch = (async (input: string, init: RequestInit) => {
        calls.push({ url: String(input), init });
        return new Response(JSON.stringify(response.body), {
          status: response.ok ? 200 : 422,
          headers: { "content-type": "application/json" },
        });
      }) as typeof globalThis.fetch;
      return () => {
        globalThis.fetch = original;
      };
    },
  };
}

/**
 * Everything a proof must never find in a response, a cookie, or an audit row. The session secret
 * is the one exception a caller adds per case, because it legitimately appears in `Set-Cookie`.
 */
export function assertNoSecretsIn(haystack: string, secrets: readonly string[]): void {
  for (const secret of secrets) {
    if (secret.length > 0 && haystack.includes(secret)) {
      throw new Error("A secret reached a response, a log line, or an audit row");
    }
  }
}
