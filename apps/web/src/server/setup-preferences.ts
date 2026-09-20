import {
  principalHasCampaignApprovalRole,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { ZodError, z } from "zod";

import type { SetupCampaignResult } from "../features/guided-setup/model/campaign-result.js";
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
import { listWorkspaceCampaigns, loadWorkspaceCampaign } from "./campaign-workspace-reads.js";
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
  /**
   * PRD-006c D3 step 5. The stored campaign's own check result, read from the database rather than
   * remembered from the browser session that created it.
   *
   * `undefined` means the campaign named by `progress.campaignRef` could not be read: there is no
   * such reference, the row is gone, or this person may no longer see it. Step 5 then says it does
   * not know, which is the only honest third answer.
   */
  campaign: SetupCampaignResult | undefined;
  /**
   * PRD-006c D5. For somebody who can approve and has no campaign of their own: the newest
   * campaign in their workspace that is waiting for a decision.
   *
   * D5 says the approver's journey at step 6 approves the creator's campaign if one exists. This
   * is that campaign, chosen by the same rule the approve control itself is drawn by, so the
   * walkthrough can never point at something the approval command would refuse.
   */
  awaitingDecision: SetupCampaignResult | undefined;
}>;

function emptySetupPreferences(): SetupPreferences {
  return {
    progress: initialGuidedSetupProgress(),
    profile: undefined,
    campaign: undefined,
    awaitingDecision: undefined,
  };
}

/**
 * The walkthrough's view of one campaign.
 *
 * Four facts cross the boundary: which campaign, where it lives, whether the checks let it
 * through, and what they found in the words a person reads. The rule codes the workspace
 * projection carries stay on the server, because PRD-006b D5 puts a code inside the campaign
 * page's collapsed support region and the walkthrough panel is not that region.
 */
function campaignResultFrom(campaign: CampaignWorkspaceProjection): SetupCampaignResult {
  return Object.freeze({
    campaignRef: campaign.campaignRef,
    detailHref: campaign.detailHref,
    ready: !campaign.preflight.blocking,
    findings: Object.freeze(
      campaign.preflight.findings.map((finding) =>
        Object.freeze({ description: finding.description, remediation: finding.remediation }),
      ),
    ),
  });
}

/**
 * A campaign read that cannot fail the page.
 *
 * The layout performs these before it renders the workspace shell, so a campaign that has been
 * removed, or a reference that no longer resolves, must cost the user their step-5 sentence and
 * nothing more. The step that receives `undefined` says it does not know.
 */
async function readCampaignResult(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  environment: unknown,
): Promise<SetupCampaignResult | undefined> {
  try {
    const campaign = await loadWorkspaceCampaign(principal, campaignRef, environment);
    return campaign === undefined ? undefined : campaignResultFrom(campaign);
  } catch {
    return undefined;
  }
}

/**
 * PRD-006c D5. Whether this render could use a campaign waiting for a decision.
 *
 * The question is asked once, on the server, for the whole visit: the walkthrough moves from step
 * to step in the browser without the layout rendering again, so a gate on the step the person is
 * on now would answer for a step they have already left. Measured on 2026-09-20: gating on
 * `currentStep >= 3` left the seeded approver's step 3 leading to the create screen, because the
 * page had been rendered while they were still on step 1.
 *
 * What is gated is the one case that can never use the answer: a walkthrough that is finished.
 * That keeps the extra read off every page a settled workspace opens, which is most of them.
 */
function wantsCampaignAwaitingDecision(progress: GuidedSetupProgress): boolean {
  return progress.status !== "completed";
}

/**
 * PRD-006c D5. The newest campaign in this workspace that this person could approve right now.
 *
 * `canApprove` on the projection is the application layer's own answer to that question: the
 * person holds an approving role, the campaign is awaiting approval, and the checks found nothing
 * blocking. Asking it here rather than restating the rule is what keeps the walkthrough and the
 * approval command from ever disagreeing about who may approve what. The role is checked first so
 * that a creator, who is most people, never pays for the list.
 */
async function readCampaignAwaitingDecision(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<SetupCampaignResult | undefined> {
  if (!principalHasCampaignApprovalRole(principal)) return undefined;
  try {
    const campaigns = await listWorkspaceCampaigns(principal, environment);
    const newest = [...campaigns]
      .filter((campaign) => campaign.canApprove)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    return newest === undefined ? undefined : campaignResultFrom(newest);
  } catch {
    return undefined;
  }
}

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
  const progress =
    progressRow === undefined
      ? initialGuidedSetupProgress()
      : parseStoredProgress(progressRow.value);
  // A finished walkthrough never opens itself again, so its campaign's result is nobody's
  // question and the read is not worth making on every page that person opens.
  const campaign =
    progress.campaignRef === undefined || progress.status === "completed"
      ? undefined
      : await readCampaignResult(principal, progress.campaignRef, environment);
  return Object.freeze({
    progress,
    profile: profileRow === undefined ? undefined : parseStoredProfile(profileRow.value),
    campaign,
    // Only for somebody with nothing of their own to read, and only once the walkthrough is far
    // enough along to use it. A person who created a campaign in this walkthrough is looking at
    // that one, and a second candidate would be a second answer to a question they have already
    // settled; a person on the welcome step, or one who has finished, is not being handed anything
    // and should not pay for the list on every page they open.
    awaitingDecision:
      campaign === undefined && wantsCampaignAwaitingDecision(progress)
        ? await readCampaignAwaitingDecision(principal, environment)
        : undefined,
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
    return emptySetupPreferences();
  }
  const ports = resolveRuntimeCampaignCommandPorts(environment);
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return await readSetupPreferences(principal, environment);
  } catch {
    return emptySetupPreferences();
  }
}
