import { type AuthenticatedPrincipal } from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { ZodError, z } from "zod";

import {
  SETUP_PROFILE_PREFERENCE_KEY,
  SetupProfileSchema,
  parseStoredProfile,
  type SetupProfile,
} from "../features/guided-setup/model/profile.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-006c D4, as PRD-009b D4 left it. The small saved profile, on the server.
 *
 * PRD-009b retired the guided setup's progress half: there is no `POST /api/setup/progress`, no
 * progress read, and nothing that asks for a campaign waiting for a decision (Home's own read does
 * that, `home-reads.ts`). What stays is `setup_profile.v1`, which the Brand form reads to prefill,
 * and `POST /api/setup/profile`. A stored `guided_setup.v1` row is left where it is and is never
 * read again (D4, non-goals).
 *
 * Two rules govern every function here.
 *
 * 1. **The browser never supplies a location or a person.** `location_id` and `user_id` come from
 *    the verified principal, and the request schema is `.strict()`, so a body that carries either
 *    name is refused with a 400 rather than quietly ignored. A silently dropped field is how a
 *    tenant boundary turns into a suggestion.
 * 2. **Every read and every write runs inside `withTenantTransaction`.** That sets the app runtime
 *    role and `platform.set_app_context`, so the row-level policy on `platform.user_preferences`
 *    is what decides which rows exist, not a `where` clause this module could forget.
 *
 * The route is the thin edge: it reads `process.env`, which is what it reads in production, and
 * hands the request to the handler below.
 */

export type SetupPreferences = Readonly<{
  profile: SetupProfile | undefined;
}>;

function emptySetupPreferences(): SetupPreferences {
  return { profile: undefined };
}

/** A short word from an error, or nothing: used to log what kind of failure it was and no more. */
function safeErrorToken(value: unknown, maxLength: number): string | undefined {
  return typeof value === "string" && value.length <= maxLength && /^[A-Za-z0-9_.-]+$/u.test(value)
    ? value
    : undefined;
}

/**
 * The kind of a failure, as a log line may carry it: the error's class and, when the driver gave
 * one, its short code. It never carries the error's message, because a driver's message can quote a
 * value from the query, and it never names the person, their session, or their workspace.
 */
function failureKind(error: unknown): string {
  return error instanceof Error
    ? [
        safeErrorToken(error.name, 80) ?? "Error",
        safeErrorToken((error as { code?: unknown }).code, 40),
      ]
        .filter((part) => part !== undefined)
        .join(" ")
    : typeof error;
}

/**
 * The server's record that the saved profile could not be read. The person loses a prefill and
 * nothing else, which is why the read does not fail the page; this line is for whoever watches the
 * deployment's log.
 */
function logSetupReadFailure(error: unknown): void {
  console.error(
    `setup-preferences: the saved setup profile could not be read (${failureKind(error)}); the Brand form starts without a prefill.`,
  );
}

type PreferenceRow = Readonly<{ key: string; value: unknown }>;

/**
 * The profile for the signed-in person. There is no `location_id` predicate because the policy
 * already supplies one, and a second copy of it here would be a second thing to keep correct.
 */
const readSetupProfileContract = defineSqlContract<PreferenceRow>({
  name: "setup-preferences.read",
  access: "read",
  text: `
    select key, value
    from platform.user_preferences
    where user_id = $1
      and key = '${SETUP_PROFILE_PREFERENCE_KEY}'
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
 * The brand form's server-side read. It answers the empty value rather than raising when the
 * workspace has no database behind it, because a synthetic-mode render has no preferences to read.
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
    async (transaction) => transaction.read(readSetupProfileContract, [principal.actorId]),
  );
  const profileRow = rows.find((row) => row.key === SETUP_PROFILE_PREFERENCE_KEY);
  return Object.freeze({
    profile: profileRow === undefined ? undefined : parseStoredProfile(profileRow.value),
  });
}

/**
 * 009B-AC-012. What is stored from a profile write: everything but the two Realtor fields.
 *
 * The route still accepts `realtorName` and `realtorBrokerage`, so a client written for the
 * walkthrough does not start failing, and the write drops them, so no new Realtor value is kept.
 * Nothing reads them: an ad never carries a Realtor (compliance control 9), and the retention and
 * export documents still name them for the rows saved before PRD-009 (006C-AC-021).
 */
export function profileForStorage(profile: SetupProfile): SetupProfile {
  const { realtorName: _realtorName, realtorBrokerage: _realtorBrokerage, ...stored } = profile;
  return stored;
}

export async function writeSetupProfile(
  principal: Readonly<AuthenticatedPrincipal>,
  profile: SetupProfile,
  environment: unknown = process.env,
  pool: DatabasePool = campaignDatabasePool(environment),
): Promise<void> {
  const correlationRef = correlationFor(principal, "profile");
  await withTenantTransaction(
    pool,
    authorityFor(principal, correlationRef),
    async (transaction) => {
      await transaction.write(writeSetupPreferenceContract, [
        principal.locationId,
        principal.actorId,
        SETUP_PROFILE_PREFERENCE_KEY,
        JSON.stringify(profileForStorage(profile)),
      ]);
    },
  );
}

/**
 * The request body is the stored value and nothing else. `.strict()` is what turns a body carrying
 * `locationId` or `userId` into a 400: those two names are the tenant boundary, and a caller that
 * sends one is either confused or probing.
 */
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
 * Review mode is the only mode with a database behind this route. A synthetic deployment answers
 * 404 rather than pretending to save, because a form that silently discards what it was given is
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
      Response.json({ profile: profileForStorage(parsed.profile) }, { status: 200 }),
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
 * The Brand form's read, from a request rather than a principal. It answers the empty value for an
 * unauthenticated or synthetic render, so the caller has one shape to handle: nobody signed in is
 * nobody to look for, and is not a failure to look.
 *
 * It also answers the empty value when the read fails, because the read cannot fail the page: a
 * Brand form without a prefill is a form the person fills in, and the failure is logged by kind.
 */
export async function readSetupPreferencesForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<SetupPreferences> {
  if (!isReviewWorkspace(environment)) {
    return emptySetupPreferences();
  }
  const ports = resolveRuntimeCampaignCommandPorts(environment);
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return await readSetupPreferences(principal, environment);
  } catch (error: unknown) {
    if (error instanceof UnauthenticatedPrincipalError) return emptySetupPreferences();
    logSetupReadFailure(error);
    return emptySetupPreferences();
  }
}
