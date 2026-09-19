import { FIRST_PARTY_SESSION_COOKIE, hashPassword } from "@oalo/auth";
import type { PostgresDatabasePool } from "@oalo/db";

import {
  clearAuthRateLimitsForKey,
  seedReviewCredential,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import {
  REVIEW_HOST,
  REVIEW_ORIGIN,
  routeEnvironment,
  type RoutePostgresEnvironment,
} from "./campaign-route-postgres-support.js";

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

export interface AuthRequestOverrides {
  readonly origin?: string | undefined;
  readonly host?: string | undefined;
  readonly clientAddress?: string | undefined;
  readonly cookie?: string | undefined;
  readonly csrfToken?: string | undefined;
}

/**
 * The request a browser sends to an auth route before it holds a session: the page origin, the
 * deployment host, and the forwarded client address the rate limiter keys on. No cookie and no
 * session-bound token, because there is no session yet.
 */
export function authRequest(
  path: string,
  body: unknown,
  overrides: AuthRequestOverrides = {},
): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: overrides.origin ?? REVIEW_ORIGIN,
    host: overrides.host ?? REVIEW_HOST,
    "x-forwarded-for": overrides.clientAddress ?? DEFAULT_CLIENT_ADDRESS,
  };
  if (overrides.cookie !== undefined) headers["cookie"] = overrides.cookie;
  if (overrides.csrfToken !== undefined) headers["x-csrf-token"] = overrides.csrfToken;
  return new Request(`${REVIEW_ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
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
