import type { AuthenticatedPrincipal } from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { ZodError, z } from "zod";

import {
  GUIDED_SETUP_PREFERENCE_KEY,
  GuidedSetupProgressSchema,
  initialGuidedSetupProgress,
  parseStoredProgress,
  type GuidedSetupProgress,
} from "../features/guided-setup/model/progress.js";
import {
  SETUP_PROFILE_PREFERENCE_KEY,
  SetupProfileSchema,
  parseStoredProfile,
  type SetupProfile,
} from "../features/guided-setup/model/profile.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-006c D4. The guided setup's progress and the small profile it collects, on the server.
 *
 * Two rules govern every function here.
 *
 * 1. **The browser never supplies a location or a person.** `location_id` and `user_id` come from
 *    the verified principal, and the request schemas are `.strict()`, so a body that carries
 *    either name is refused with a 400 rather than quietly ignored. A silently dropped field is
 *    how a tenant boundary turns into a suggestion.
 * 2. **Every read and every write runs inside `withTenantTransaction`.** That sets the app runtime
 *    role and `platform.set_app_context`, so the row-level policy on `platform.user_preferences`
 *    is what decides which rows exist, not a `where` clause this module could forget.
 *
 * The routes are the thin edge: they read `process.env`, which is what they read in production,
 * and hand the request to the handlers below.
 */

export type SetupPreferences = Readonly<{
  progress: GuidedSetupProgress;
  profile: SetupProfile | undefined;
}>;

type PreferenceRow = Readonly<{ key: string; value: unknown }>;

/**
 * Both keys for the signed-in person, in one round trip. There is no `location_id` predicate
 * because the policy already supplies one, and a second copy of it here would be a second thing to
 * keep correct.
 */
const readSetupPreferencesContract = defineSqlContract<PreferenceRow>({
  name: "setup-preferences.read",
  access: "read",
  text: `
    select key, value
    from platform.user_preferences
    where user_id = $1
      and key in ('${GUIDED_SETUP_PREFERENCE_KEY}', '${SETUP_PROFILE_PREFERENCE_KEY}')
  `,
  decode(row) {
    const record = row as { key: string; value: unknown };
    return Object.freeze({ key: record.key, value: record.value });
  },
});

/**
 * The value goes through `::text::jsonb`, the way every other jsonb column in this codebase is
 * written. The driver types a bare string parameter as json, so casting it straight to `jsonb`
 * encodes the document a second time and stores a jsonb string rather than an object, which the
 * table's own type check then refuses.
 */
const writeSetupPreferenceContract = defineSqlContract<Readonly<{ key: string }>>({
  name: "setup-preferences.write",
  access: "write",
  text: `
    insert into platform.user_preferences (location_id, user_id, key, value)
    values ($1, $2, $3, $4::text::jsonb)
    on conflict (location_id, user_id, key)
    do update set value = excluded.value, updated_at = pg_catalog.now()
    returning key
  `,
  decode(row) {
    return Object.freeze({ key: (row as { key: string }).key });
  },
});

function correlationFor(principal: Readonly<AuthenticatedPrincipal>, suffix: string): string {
  return `correlation_setup_${suffix}_${principal.sessionId}`;
}

function authorityFor(principal: Readonly<AuthenticatedPrincipal>, correlationRef: string) {
  return createPrincipalBoundTenantContextAuthority(principal, correlationRef);
}

/**
 * The authenticated layout's server-side read. It answers the empty value rather than raising when
 * the workspace has no database behind it, because a synthetic-mode render has no preferences to
 * read and must still paint the shell.
 */
export async function readSetupPreferences(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
  pool: DatabasePool = campaignDatabasePool(environment),
): Promise<SetupPreferences> {
  const correlationRef = correlationFor(principal, "read");
  const rows = await withTenantTransaction(
    pool,
    authorityFor(principal, correlationRef),
    async (transaction) => transaction.read(readSetupPreferencesContract, [principal.actorId]),
  );
  const progressRow = rows.find((row) => row.key === GUIDED_SETUP_PREFERENCE_KEY);
  const profileRow = rows.find((row) => row.key === SETUP_PROFILE_PREFERENCE_KEY);
  return Object.freeze({
    progress:
      progressRow === undefined
        ? initialGuidedSetupProgress()
        : parseStoredProgress(progressRow.value),
    profile: profileRow === undefined ? undefined : parseStoredProfile(profileRow.value),
  });
}

async function writePreference(
  principal: Readonly<AuthenticatedPrincipal>,
  key: string,
  value: unknown,
  pool: DatabasePool,
  suffix: string,
): Promise<void> {
  const correlationRef = correlationFor(principal, suffix);
  await withTenantTransaction(
    pool,
    authorityFor(principal, correlationRef),
    async (transaction) => {
      await transaction.write(writeSetupPreferenceContract, [
        principal.locationId,
        principal.actorId,
        key,
        JSON.stringify(value),
      ]);
    },
  );
}

export async function writeSetupProgress(
  principal: Readonly<AuthenticatedPrincipal>,
  progress: GuidedSetupProgress,
  environment: unknown = process.env,
  pool: DatabasePool = campaignDatabasePool(environment),
): Promise<void> {
  await writePreference(principal, GUIDED_SETUP_PREFERENCE_KEY, progress, pool, "progress");
}

export async function writeSetupProfile(
  principal: Readonly<AuthenticatedPrincipal>,
  profile: SetupProfile,
  environment: unknown = process.env,
  pool: DatabasePool = campaignDatabasePool(environment),
): Promise<void> {
  await writePreference(principal, SETUP_PROFILE_PREFERENCE_KEY, profile, pool, "profile");
}

/**
 * Both request bodies are the stored value and nothing else. `.strict()` is what turns a body
 * carrying `locationId` or `userId` into a 400: those two names are the tenant boundary, and a
 * caller that sends one is either confused or probing.
 */
const ProgressRequestSchema = z.object({ progress: GuidedSetupProgressSchema }).strict();
const ProfileRequestSchema = z.object({ profile: SetupProfileSchema }).strict();

function setupErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return jsonCommandError(400, "SETUP_PREFERENCE_INVALID");
  }
  return (
    campaignCommandAuthErrorResponse(error) ?? jsonCommandError(400, "SETUP_PREFERENCE_FAILED")
  );
}

/**
 * Review mode is the only mode with a database behind these routes. A synthetic deployment answers
 * 404 rather than pretending to save, because a walkthrough that silently discards progress is
 * worse than one that says it cannot run.
 */
function isReviewWorkspace(environment: unknown): boolean {
  try {
    return authenticatedWorkspaceMode(environment) === "review";
  } catch {
    return false;
  }
}

function requireReviewMode(environment: unknown): void {
  if (!isReviewWorkspace(environment)) {
    throw new SetupPreferencesUnavailableError();
  }
}

export class SetupPreferencesUnavailableError extends Error {
  public constructor() {
    super("Setup preferences are not available in this workspace.");
    this.name = "SetupPreferencesUnavailableError";
  }
}

export async function handleSetupProgress(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "setupProgress");
  try {
    // The full mutation gate, including origin, host, and the session-bound CSRF token, runs here.
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    requireReviewMode(environment);
    const parsed = ProgressRequestSchema.parse(await request.json());
    await writeSetupProgress(principal, parsed.progress, environment);
    return withCorrelationHeaders(
      Response.json({ progress: parsed.progress }, { status: 200 }),
      correlation,
    );
  } catch (error) {
    if (error instanceof SetupPreferencesUnavailableError) {
      return withCorrelationHeaders(
        jsonCommandError(404, "SETUP_PREFERENCE_UNAVAILABLE"),
        correlation,
      );
    }
    return withCorrelationHeaders(setupErrorResponse(error), correlation);
  }
}

export async function handleSetupProfile(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "setupProfile");
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    requireReviewMode(environment);
    const parsed = ProfileRequestSchema.parse(await request.json());
    await writeSetupProfile(principal, parsed.profile, environment);
    return withCorrelationHeaders(
      Response.json({ profile: parsed.profile }, { status: 200 }),
      correlation,
    );
  } catch (error) {
    if (error instanceof SetupPreferencesUnavailableError) {
      return withCorrelationHeaders(
        jsonCommandError(404, "SETUP_PREFERENCE_UNAVAILABLE"),
        correlation,
      );
    }
    return withCorrelationHeaders(setupErrorResponse(error), correlation);
  }
}

/**
 * The layout's read, from a request rather than a principal. It answers the empty value for an
 * unauthenticated or synthetic render, so the caller has one shape to handle.
 */
export async function readSetupPreferencesForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<SetupPreferences> {
  if (!isReviewWorkspace(environment)) {
    return { progress: initialGuidedSetupProgress(), profile: undefined };
  }
  const ports = resolveRuntimeCampaignCommandPorts(environment);
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return await readSetupPreferences(principal, environment);
  } catch {
    return { progress: initialGuidedSetupProgress(), profile: undefined };
  }
}
