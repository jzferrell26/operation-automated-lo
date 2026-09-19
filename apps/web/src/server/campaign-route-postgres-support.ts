import { createHash, randomBytes } from "node:crypto";

import { FIRST_PARTY_SESSION_COOKIE, createSessionBoundCsrfToken } from "@oalo/auth";
import { formatLocationRef, formatSessionRef, parseSessionRef } from "@oalo/contracts";
import type { AuthenticatedPrincipal } from "@oalo/application";
import { createPostgresPool, type PostgresDatabasePool } from "@oalo/db";

import {
  countLocationRows,
  grantReviewBinding,
  issueReviewSession,
  readLocationCorrelationIds,
  revokeReviewBinding,
  revokeReviewSession,
  seedReviewActor,
  seedReviewLocation,
  seedReviewLocationWithoutInstallation,
} from "../../../../packages/db/test/route-seeding-bridge.js";
import { resolveAuthenticatedReadPrincipal } from "./authenticated-principal.js";
import { loadWorkspaceCampaign } from "./campaign-workspace-reads.js";
import {
  resetRuntimeAuthenticationForTests,
  resolveRuntimeCampaignCommandPorts,
} from "./runtime-authentication.js";

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

/**
 * The four tables every negative case asserts are unchanged. The names are the real ones: campaigns
 * and their approval decisions live in `campaign`, command executions in `integration`, and the
 * audit trail in `audit`. There is no `campaign.campaign_commands` or `campaign.campaign_approvals`.
 */
export const CAMPAIGN_TABLE = "campaign.campaigns";
export const COMMAND_TABLE = "integration.command_executions";
export const APPROVAL_TABLE = "campaign.approval_decisions";
export const AUDIT_TABLE = "audit.events";

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

export function routeEnvironment(
  overrides: Readonly<Record<string, string>> = {},
): RoutePostgresEnvironment {
  return Object.freeze({
    // The disposable database speaks plain TCP, and the pool refuses a TLS-disabled connection on
    // any deployment environment other than local or test. Review mode is selected by
    // OALO_REVIEW_SURFACE, not by the environment name, so a local deployment with the flag set is
    // the same review composition a preview deployment builds, minus the TLS requirement the local
    // stack cannot satisfy.
    OALO_ENVIRONMENT: "local",
    OALO_PROVIDER_MODE: "stub",
    OALO_SYNTHETIC_DATA_ONLY: "true",
    OALO_REVIEW_SURFACE: "authorized",
    OALO_DATABASE_URL: requiredRouteTestDatabaseUrl(),
    OALO_DATABASE_SSL_MODE: "disable",
    OALO_APP_URL: REVIEW_ORIGIN,
    OALO_ALLOWED_ORIGINS: REVIEW_ORIGIN,
    OALO_CSRF_SERVER_SECRET: randomBytes(32).toString("base64url"),
    ...overrides,
  });
}

/**
 * The exported route handlers read `process.env`, because that is what they read in production.
 * A route-level proof that passed an environment object into the handler would be proving the
 * handler, not the route, so the environment is installed on the process instead and removed
 * afterwards. The composition cache is cleared on both edges so no test inherits another's ports.
 *
 * Vitest isolates each test file, so this never reaches another suite.
 */
export function applyRouteEnvironment(environment: RoutePostgresEnvironment): () => void {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(environment)) {
    previous.set(name, process.env[name]);
    process.env[name] = value;
  }
  resetRuntimeAuthenticationForTests();
  return () => {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    resetRuntimeAuthenticationForTests();
  };
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

export async function seedActorAt(
  pool: PostgresDatabasePool,
  locationId: string,
  input: Readonly<{ displayName: string; bindingRole: string; sessionRole: string }>,
): Promise<SeededActor> {
  const actorId = await seedReviewActor(pool, locationId, input.displayName, input.bindingRole);
  return Object.freeze({ actorId, bindingRole: input.bindingRole, sessionRole: input.sessionRole });
}

export async function seedActor(
  pool: PostgresDatabasePool,
  location: SeededLocation,
  input: Readonly<{ displayName: string; bindingRole: string; sessionRole: string }>,
): Promise<SeededActor> {
  return seedActorAt(pool, location.locationId, input);
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

export interface CampaignTableCounts {
  readonly campaigns: number;
  readonly commands: number;
  readonly approvals: number;
  readonly audit: number;
}

/** The four counts every negative case pins, in one call so a case cannot forget one of them. */
export async function tableCountsFor(
  pool: PostgresDatabasePool,
  locationId: string,
): Promise<Readonly<CampaignTableCounts>> {
  const [campaigns, commands, approvals, audit] = await Promise.all([
    countRows(pool, CAMPAIGN_TABLE, locationId),
    countRows(pool, COMMAND_TABLE, locationId),
    countRows(pool, APPROVAL_TABLE, locationId),
    countRows(pool, AUDIT_TABLE, locationId),
  ]);
  return Object.freeze({ campaigns, commands, approvals, audit });
}

/** PRD-005c. The correlation references the route actually stored, in insertion order. */
export async function storedCorrelationIds(
  pool: PostgresDatabasePool,
  table: string,
  locationId: string,
): Promise<readonly string[]> {
  return readLocationCorrelationIds(pool, table, locationId);
}

/**
 * PRD-005b 005B-AC-016. A location whose persona resolves but whose issuance is refused, because
 * it carries no installation row. Used to prove a denied issuance writes exactly one audit row.
 */
export async function seedLocationWithoutInstallation(
  pool: PostgresDatabasePool,
  displayName: string,
): Promise<string> {
  return seedReviewLocationWithoutInstallation(pool, displayName);
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
  readonly correlationId?: string;
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
  if (input.correlationId !== undefined) headers["x-correlation-id"] = input.correlationId;
  return new Request(`${REVIEW_ORIGIN}${input.path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(input.body),
  });
}

/**
 * The request the review sign-in form sends: no session cookie, because there is none yet, and no
 * CSRF token, because there is no session to bind one to. Origin and host are the whole gate.
 */
export function signInRequest(input: {
  readonly body: unknown;
  readonly overrides?: Readonly<{ origin?: string; host?: string }>;
}): Request {
  const overrides = input.overrides ?? {};
  return new Request(`${REVIEW_ORIGIN}/api/review/session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: overrides.origin ?? REVIEW_ORIGIN,
      host: overrides.host ?? REVIEW_HOST,
    },
    body: JSON.stringify(input.body),
  });
}

/** Resolves a principal the way a page render does: through the production read resolver. */
export async function principalForSession(
  session: IssuedSession,
  environment: RoutePostgresEnvironment,
): Promise<Readonly<AuthenticatedPrincipal>> {
  return resolveAuthenticatedReadPrincipal(
    new Request(`${environment.OALO_APP_URL}/marketing/campaigns`, {
      headers: { cookie: session.cookieHeader },
    }),
    environment,
    resolveRuntimeCampaignCommandPorts(environment),
  );
}

/**
 * The campaign's current optimistic row version, read through the production workspace projection.
 *
 * The approve payload carries `expectedRowVersion`, and the browser gets it from the detail page it
 * is looking at. A test that hardcoded 1 would be asserting an accident of ordering rather than the
 * browser's behaviour, and would break the moment a draft is revised before it is approved.
 */
export async function currentRowVersion(
  session: IssuedSession,
  campaignRef: string,
  environment: RoutePostgresEnvironment,
): Promise<number> {
  const campaign = await loadWorkspaceCampaign(
    await principalForSession(session, environment),
    campaignRef,
    environment,
  );
  if (campaign === undefined) {
    throw new Error(`No campaign ${campaignRef} is readable for this session`);
  }
  return campaign.rowVersion;
}

export interface PersistedDraft {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly manifestHash: string;
  readonly preflightResultHash: string;
  readonly rowVersion: number;
}

/**
 * The approval suites' shared fixture: one location, a creator and an approver on it, a session
 * each, and the composition's CSRF secret. Both suites need exactly this, and a second copy of it
 * would be a second thing to keep in step with the seeding harness.
 */
export interface ApprovalSuiteFixture {
  readonly pool: PostgresDatabasePool;
  readonly location: SeededLocation;
  readonly creator: SeededActor;
  readonly approver: SeededActor;
  readonly creatorSession: IssuedSession;
  readonly approverSession: IssuedSession;
  readonly csrfServerSecret: Uint8Array;
  readonly restoreEnvironment: () => void;
}

export async function openApprovalSuite(
  environment: RoutePostgresEnvironment,
  label: string,
): Promise<ApprovalSuiteFixture> {
  const restoreEnvironment = applyRouteEnvironment(environment);
  const pool = createRouteTestPool();
  const csrfServerSecret = csrfSecretFor(environment);
  const location = await seedLocation(pool, `${label} location`);
  const creator = await seedActor(pool, location, {
    displayName: `${label} creator`,
    bindingRole: "creator",
    sessionRole: "campaign_creator",
  });
  const approver = await seedActor(pool, location, {
    displayName: `${label} approver`,
    bindingRole: "approver",
    sessionRole: "campaign_approver",
  });
  return Object.freeze({
    pool,
    location,
    creator,
    approver,
    creatorSession: await issueSession(pool, location, creator),
    approverSession: await issueSession(pool, location, approver),
    csrfServerSecret,
    restoreEnvironment,
  });
}

export async function closeApprovalSuite(fixture: ApprovalSuiteFixture): Promise<void> {
  await fixture.pool.close();
  fixture.restoreEnvironment();
}

/**
 * Creates a draft through the exported preflight route and reads its current row version back, so
 * the approval payload a test sends is the payload the browser would send.
 */
export async function createDraftThroughPreflight(input: {
  readonly preflight: (request: Request) => Promise<Response>;
  readonly session: IssuedSession;
  readonly csrfServerSecret: Uint8Array;
  readonly environment: RoutePostgresEnvironment;
  readonly body: unknown;
}): Promise<PersistedDraft> {
  const response = await input.preflight(
    browserRequest({
      path: "/api/campaigns/preflight",
      body: input.body,
      session: input.session,
      csrfServerSecret: input.csrfServerSecret,
    }),
  );
  if (response.status !== 200) {
    throw new Error(`Preflight answered ${String(response.status)} instead of creating a draft`);
  }
  const persisted = (await response.json()) as Omit<PersistedDraft, "rowVersion">;
  return Object.freeze({
    ...persisted,
    rowVersion: await currentRowVersion(input.session, persisted.campaignRef, input.environment),
  });
}

/** The browser's approval payload, field for field. */
export function approvalPayload(
  draft: PersistedDraft,
  decision: "approved" | "rejected" = "approved",
) {
  return {
    campaignRef: draft.campaignRef,
    decision,
    expectedCampaignVersionRef: draft.campaignVersionRef,
    expectedManifestHash: draft.manifestHash,
    expectedPreflightResultHash: draft.preflightResultHash,
    expectedRowVersion: draft.rowVersion,
  };
}
