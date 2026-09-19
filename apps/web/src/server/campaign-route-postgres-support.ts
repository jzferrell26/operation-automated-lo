import { createHash, randomBytes } from "node:crypto";

import { FIRST_PARTY_SESSION_COOKIE, createSessionBoundCsrfToken } from "@oalo/auth";
import { formatLocationRef, formatSessionRef, parseSessionRef } from "@oalo/contracts";
import { createPostgresPool, type PostgresDatabasePool } from "@oalo/db";

import {
  countLocationRows,
  grantReviewBinding,
  issueReviewSession,
  revokeReviewBinding,
  revokeReviewSession,
  seedReviewActor,
  seedReviewLocation,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * Shared support for the route-level real-Postgres proofs in
 * `campaign-approval-handler.postgres.test.ts` and `campaign-preflight-handler.postgres.test.ts`
 * (PRD-005a 005A-AC-013 and 005A-AC-014).
 *
 * These files are authored in Wave 1 and run in Wave 2, after PRD-005b's migration adds
 * `platform.first_party_sessions` and its `security definer` functions, and after
 * `vitest.config.ts` gains the `web-postgres` project.
 *
 * Every statement that needs owner privileges is delegated to
 * `packages/db/test/campaign-integration-support.mjs`, which
 * `tests/security/database-privilege-escalation-boundary.test.ts` names as the only sanctioned
 * holder of that capability. Nothing here elevates, and nothing under `apps/` does either.
 *
 * The import goes through `packages/db/test/route-seeding-bridge.js`, a one-line re-export that
 * exists because `pnpm audit:boundaries` requires every relative ESM import inside `apps/` and
 * `packages/` to end in `.js` while the harness is a `.mjs` module.
 */

export const REVIEW_HOST = "review.operation-automated-lo.test";
export const REVIEW_ORIGIN = `https://${REVIEW_HOST}`;
const SESSION_LIFETIME_SECONDS = 43_200;

export interface RoutePostgresEnvironment extends Record<string, string> {
  readonly OALO_ENVIRONMENT: string;
  readonly OALO_PROVIDER_MODE: string;
  readonly OALO_SYNTHETIC_DATA_ONLY: string;
  readonly OALO_REVIEW_SURFACE: string;
  readonly OALO_DATABASE_URL: string;
  readonly OALO_DATABASE_SSL_MODE: string;
  readonly OALO_APP_URL: string;
  readonly OALO_ALLOWED_ORIGINS: string;
  readonly OALO_CSRF_SERVER_SECRET: string;
}

/**
 * The same guard the integration harness applies: the suite refuses any database whose name does
 * not identify a disposable `oalo_test_` database, so a stray environment variable cannot point it
 * at a review or production instance.
 */
export function requiredRouteTestDatabaseUrl(): string {
  const databaseUrl = process.env.OALO_TEST_DATABASE_URL;
  if (databaseUrl === undefined) {
    throw new Error("OALO_TEST_DATABASE_URL is required for route-level PostgreSQL tests");
  }
  if (!new URL(databaseUrl).pathname.startsWith("/oalo_test_")) {
    throw new Error("OALO_TEST_DATABASE_URL must identify an oalo_test_ database");
  }
  return databaseUrl;
}

export function routeEnvironment(): RoutePostgresEnvironment {
  return Object.freeze({
    OALO_ENVIRONMENT: "preview",
    OALO_PROVIDER_MODE: "stub",
    OALO_SYNTHETIC_DATA_ONLY: "true",
    OALO_REVIEW_SURFACE: "authorized",
    OALO_DATABASE_URL: requiredRouteTestDatabaseUrl(),
    OALO_DATABASE_SSL_MODE: "disable",
    OALO_APP_URL: REVIEW_ORIGIN,
    OALO_ALLOWED_ORIGINS: REVIEW_ORIGIN,
    OALO_CSRF_SERVER_SECRET: randomBytes(32).toString("base64url"),
  });
}

export function createRouteTestPool(): PostgresDatabasePool {
  return createPostgresPool({
    connectionString: requiredRouteTestDatabaseUrl(),
    deploymentEnvironment: "local",
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
    applicationName: "oalo-route-postgres-tests",
  });
}

/** The real composition, built from an explicit environment object rather than `process.env`. */
export function csrfSecretFor(environment: RoutePostgresEnvironment): Uint8Array {
  const gate = resolveRuntimeCampaignCommandPorts(environment).mutation;
  if (gate === undefined) {
    throw new Error("The route composition must supply a browser mutation gate");
  }
  return gate.csrfServerSecret;
}

export interface SeededLocation {
  readonly locationId: string;
  readonly locationRef: string;
  readonly installationId: string;
}

export interface SeededActor {
  readonly actorId: string;
  readonly bindingRole: string;
  readonly sessionRole: string;
}

export async function seedLocation(
  pool: PostgresDatabasePool,
  displayName: string,
): Promise<SeededLocation> {
  const seeded = await seedReviewLocation(pool, displayName);
  return Object.freeze({
    locationId: seeded.locationId,
    locationRef: formatLocationRef(seeded.locationId),
    installationId: seeded.installationId,
  });
}

export async function seedActor(
  pool: PostgresDatabasePool,
  location: SeededLocation,
  input: Readonly<{ displayName: string; bindingRole: string; sessionRole: string }>,
): Promise<SeededActor> {
  const actorId = await seedReviewActor(
    pool,
    location.locationId,
    input.displayName,
    input.bindingRole,
  );
  return Object.freeze({ actorId, bindingRole: input.bindingRole, sessionRole: input.sessionRole });
}

export async function revokeBinding(
  pool: PostgresDatabasePool,
  location: SeededLocation,
  actor: SeededActor,
): Promise<void> {
  await revokeReviewBinding(pool, location.locationId, actor.actorId, actor.bindingRole);
}

export async function grantBinding(
  pool: PostgresDatabasePool,
  location: SeededLocation,
  actor: SeededActor,
): Promise<void> {
  await grantReviewBinding(pool, location.locationId, actor.actorId, actor.bindingRole);
}

export interface IssuedSession {
  readonly secret: string;
  readonly sessionRef: string;
  readonly cookieHeader: string;
}

/**
 * Issues through PRD-005b's `platform.issue_first_party_session`. `lifetimeSeconds` is a parameter
 * so a test can issue a short-lived session and let it lapse rather than editing the row.
 */
export async function issueSession(
  pool: PostgresDatabasePool,
  location: SeededLocation,
  actor: SeededActor,
  lifetimeSeconds: number = SESSION_LIFETIME_SECONDS,
): Promise<IssuedSession> {
  const secret = randomBytes(32).toString("base64url");
  const secretHash = createHash("sha256").update(secret).digest("hex");
  const sessionId = await issueReviewSession(pool, {
    locationId: location.locationId,
    actorId: actor.actorId,
    bindingRole: actor.bindingRole,
    sessionRole: actor.sessionRole,
    secretHash,
    lifetimeSeconds,
    correlationId: `correlation_route_${secretHash.slice(0, 16)}`,
  });
  return Object.freeze({
    secret,
    sessionRef: formatSessionRef(sessionId),
    cookieHeader: `${FIRST_PARTY_SESSION_COOKIE}=${secret}`,
  });
}

export async function revokeSession(
  pool: PostgresDatabasePool,
  session: IssuedSession,
): Promise<void> {
  await revokeReviewSession(
    pool,
    parseSessionRef(session.sessionRef),
    "operator",
    `correlation_route_${session.sessionRef.slice(-16)}`,
  );
}

export async function countRows(
  pool: PostgresDatabasePool,
  table: string,
  locationId: string,
): Promise<number> {
  return countLocationRows(pool, table, locationId);
}

export interface BrowserRequestOverrides {
  readonly origin?: string;
  readonly host?: string;
  readonly cookie?: string;
  readonly csrfToken?: string | null;
}

/**
 * Builds the request a browser actually sends: the `__Host-oalo_session` cookie, the page origin,
 * the deployment host, and the session-bound CSRF token the layout rendered. Each override exists
 * so a negative case can change exactly one of them.
 */
export function browserRequest(input: {
  readonly path: string;
  readonly body: unknown;
  readonly session: IssuedSession;
  readonly csrfServerSecret: Uint8Array;
  readonly overrides?: BrowserRequestOverrides;
}): Request {
  const overrides = input.overrides ?? {};
  const csrfToken =
    overrides.csrfToken === undefined
      ? createSessionBoundCsrfToken({
          serverSecret: input.csrfServerSecret,
          sessionId: input.session.sessionRef,
        })
      : overrides.csrfToken;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    cookie: overrides.cookie ?? input.session.cookieHeader,
    origin: overrides.origin ?? REVIEW_ORIGIN,
    host: overrides.host ?? REVIEW_HOST,
  };
  if (csrfToken !== null) headers["x-csrf-token"] = csrfToken;
  return new Request(`${REVIEW_ORIGIN}${input.path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input.body),
  });
}
