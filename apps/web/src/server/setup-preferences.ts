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
  UnauthenticatedPrincipalError,
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
  /**
   * PRD-008b 008B-AC-009 to 008B-AC-011, writing review R6. True when the list of this workspace's
   * campaigns was asked for and could not be read.
   *
   * `awaitingDecision` is `undefined` in that case too, and it cannot carry the difference: the
   * walkthrough tells an approver that nothing is waiting for them when it is `undefined`, which is
   * true of a list that was read and empty and not known of one that could not be read. This is what
   * says which it was. It is `false` whenever the list was not asked for, because there is then no
   * failure to report.
   */
  awaitingDecisionFailed: boolean;
}>;

function emptySetupPreferences(): SetupPreferences {
  return {
    progress: initialGuidedSetupProgress(),
    profile: undefined,
    campaign: undefined,
    awaitingDecision: undefined,
    awaitingDecisionFailed: false,
  };
}

/**
 * The walkthrough's view of one campaign.
 *
 * Five facts cross the boundary: which campaign, where it lives, whether the checks let it
 * through, what they found in the words a person reads, and, once somebody has decided, which way.
 * The decision is there because step 6 asks a person to approve the version or hand it to an
 * approver, and neither is a step on a version that already has a decision (008B-AC-010). Nothing
 * else about the decision crosses: not who made it, and not when. The rule codes the workspace
 * projection carries stay on the server, because PRD-006b D5 puts a code inside the campaign
 * page's collapsed support region and the walkthrough panel is not that region.
 */
export function campaignResultFrom(campaign: CampaignWorkspaceProjection): SetupCampaignResult {
  return Object.freeze({
    campaignRef: campaign.campaignRef,
    detailHref: campaign.detailHref,
    ready: !campaign.preflight.blocking,
    findings: Object.freeze(
      campaign.preflight.findings.map((finding) =>
        Object.freeze({ description: finding.description, remediation: finding.remediation }),
      ),
    ),
    ...(campaign.approval === undefined ? {} : { decision: campaign.approval.decision }),
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
 * PRD-006c D5 and PRD-008b 008B-AC-010. The newest campaign in a list that is waiting for somebody
 * to decide it.
 *
 * `canApprove` on the projection is the application layer's own answer to whether the approval
 * command would accept a decision right now: the person holds an approving role, the campaign is
 * awaiting approval, and the checks found nothing blocking. Asking it here rather than restating the
 * rule is what keeps the walkthrough and the approval command from ever disagreeing about who may
 * approve what. It is not enough on its own. A send-back leaves the campaign in the awaiting state,
 * so `canApprove` stays true for a version that was just sent back, and handing that to an approver
 * as the campaign waiting for them walks them to a control that is blocked. So the pick also asks
 * that nobody has decided. `canApprove` keeps its meaning, because the approval card is drawn from
 * it, and this is the second condition beside it.
 */
export function selectCampaignAwaitingDecision<
  Candidate extends Pick<CampaignWorkspaceProjection, "approval" | "canApprove" | "updatedAt">,
>(campaigns: readonly Candidate[]): Candidate | undefined {
  return [...campaigns]
    .filter((campaign) => campaign.canApprove && campaign.approval === undefined)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

/**
 * What asking for the campaign waiting for a decision came back with. The two empty answers are
 * different facts: `{ campaign: undefined, failed: false }` is a list that was read and had nothing
 * waiting on it, and `failed: true` is a list that could not be read, about which nothing is known.
 */
type AwaitingDecisionRead = Readonly<{
  campaign: SetupCampaignResult | undefined;
  failed: boolean;
}>;

const NOTHING_WAITING: AwaitingDecisionRead = Object.freeze({ campaign: undefined, failed: false });
const READ_FAILED: AwaitingDecisionRead = Object.freeze({ campaign: undefined, failed: true });

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
 * The server's record that the list could not be read.
 *
 * The message a person reads is the walkthrough's own sentence; this line is for whoever watches the
 * deployment's log and needs to tell a workspace whose list read keeps failing from one with nothing
 * in it. It is written on every failure rather than once a process, because a failure of this read
 * is an event on a request and not a standing fact about the deployment's configuration.
 */
function logAwaitingDecisionFailure(error: unknown): void {
  console.error(
    `setup-preferences: the campaign waiting for a decision could not be read (${failureKind(error)}); the guided setup says it could not look, and not that nothing is waiting.`,
  );
}

/** The same record, for the layout's whole read of the setup failing before it got to the list. */
function logSetupReadFailure(error: unknown): void {
  console.error(
    `setup-preferences: the guided setup's saved state could not be read (${failureKind(error)}); the guided setup starts again and says it could not look for a campaign waiting for a decision, and not that nothing is waiting.`,
  );
}

/**
 * PRD-006c D5. The newest campaign in this workspace that this person could approve right now and
 * that nobody has decided. The role is checked first so that a creator, who is most people, never
 * pays for the list.
 *
 * Writing review R6. A read that fails is reported as a failure, in the result and in the log, and
 * is not folded into "nothing is waiting". The read still cannot fail the page, because the layout
 * performs it before the shell renders: what the person loses is the walkthrough's answer, and the
 * walkthrough says so.
 */
async function readCampaignAwaitingDecision(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<AwaitingDecisionRead> {
  if (!principalHasCampaignApprovalRole(principal)) return NOTHING_WAITING;
  try {
    const newest = selectCampaignAwaitingDecision(
      await listWorkspaceCampaigns(principal, environment),
    );
    return newest === undefined
      ? NOTHING_WAITING
      : Object.freeze({ campaign: campaignResultFrom(newest), failed: false });
  } catch (error: unknown) {
    logAwaitingDecisionFailure(error);
    return READ_FAILED;
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
  // Only for somebody with nothing of their own to read, and only once the walkthrough is far
  // enough along to use it. A person who created a campaign in this walkthrough is looking at
  // that one, and a second candidate would be a second answer to a question they have already
  // settled; a person on the welcome step, or one who has finished, is not being handed anything
  // and should not pay for the list on every page they open.
  const awaiting =
    campaign === undefined && wantsCampaignAwaitingDecision(progress)
      ? await readCampaignAwaitingDecision(principal, environment)
      : NOTHING_WAITING;
  return Object.freeze({
    progress,
    profile: profileRow === undefined ? undefined : parseStoredProfile(profileRow.value),
    campaign,
    awaitingDecision: awaiting.campaign,
    awaitingDecisionFailed: awaiting.failed,
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
 * unauthenticated or synthetic render, so the caller has one shape to handle: nobody signed in is
 * nobody to look for, and is not a failure to look.
 *
 * It also answers an empty value when the read fails, because the read cannot fail the page: the
 * walkthrough starts again at its first step. Writing review R6, second half. That empty value says
 * no campaign is waiting for anybody, and an approver who cannot create a campaign can still press
 * Continue through the steps, because their saves are separate requests, and be told at step 6 that
 * "nothing is waiting" about a workspace nobody looked at. So for somebody who is, or may be, an
 * approver, the failure is the same failed state the campaign list read reports, and it is logged
 * the same way. The person is not known when it was resolving them that failed, so that case counts
 * as an approver: the provider only says anything different to somebody who can approve and cannot
 * create. For somebody who is known not to be able to approve the empty value is what it always was,
 * with no new state and no new log line, because nothing the walkthrough says to them depends on it.
 */
export async function readSetupPreferencesForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<SetupPreferences> {
  if (!isReviewWorkspace(environment)) {
    return emptySetupPreferences();
  }
  const ports = resolveRuntimeCampaignCommandPorts(environment);
  let principal: Readonly<AuthenticatedPrincipal> | undefined;
  try {
    principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return await readSetupPreferences(principal, environment);
  } catch (error: unknown) {
    if (error instanceof UnauthenticatedPrincipalError) return emptySetupPreferences();
    if (principal !== undefined && !principalHasCampaignApprovalRole(principal)) {
      return emptySetupPreferences();
    }
    logSetupReadFailure(error);
    return { ...emptySetupPreferences(), awaitingDecisionFailed: true };
  }
}
