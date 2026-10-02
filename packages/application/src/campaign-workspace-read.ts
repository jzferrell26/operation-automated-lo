import {
  type ApprovalDecision,
  type CampaignState,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";

import {
  CAMPAIGN_APPROVAL_ROLES,
  assertCampaignAccessible,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
} from "./campaign-command-context.js";

export type CampaignPersistenceKind = "filesystem" | "postgres";

/**
 * The steps a campaign can offer, as keys rather than sentences.
 *
 * PRD-006b D1 and D5. Each of these used to travel with its own English label, written here, in a
 * package the user-language guard does not read and the writing review never reached. The words
 * now live in `apps/web/src/copy/user-language.ts` (`CAMPAIGN_NEXT_ACTION_LABELS`), keyed by these
 * identifiers, so the application layer holds no English and the sentence a person reads is
 * reviewed in the one place every other sentence is.
 *
 * `already_decided` exists because one key carried two different sentences before: the step is a
 * different step when a decision has been recorded than when one is being asked for, and a key
 * that means two things cannot be mapped to one phrase.
 */
export type CampaignNextActionId =
  | "review_evidence"
  | "approve_version"
  | "already_decided"
  | "wait_for_approver"
  | "remediate_preflight"
  | "provider_publish";

export interface CampaignWorkspaceNextAction {
  readonly id: CampaignNextActionId;
  readonly available: boolean;
}

export interface CampaignWorkspacePreflightProjection {
  readonly blocking: boolean;
  readonly resultHash: string;
  readonly evaluatedAt: string;
  readonly findings: readonly Readonly<{
    ruleCode: string;
    severity: "blocking" | "warning";
    description: string;
    remediation: string;
  }>[];
}

export interface CampaignWorkspaceApprovalProjection {
  readonly decision: ApprovalDecision["decision"];
  readonly decidedAt: string;
  readonly actorRole: ApprovalDecision["actorRole"];
  /**
   * PRD-009e D2, 009E-AC-004. The decider's own session display name, recorded in the decision's
   * evidence when they decided. It is absent for every decision made before PRD-009 and whenever
   * the session read yielded nothing but the fallback, and then a screen says the role instead. It
   * is whatever the person typed at sign-up, so a screen shows it as text and always beside the
   * role; `actorRole` is the authoritative record.
   */
  readonly approverDisplayName?: string;
}

export interface CampaignWorkspaceReadRecord {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly updatedAt: string;
  readonly approval?: ApprovalDecision;
}

/**
 * PRD-009e D3, 009E-AC-005. One version of a campaign as the versions list and an older version's
 * own page read it: the version, the latest check run on it, and the latest decision recorded on
 * it. A version nobody has checked yet has no check. The campaign's stored state belongs to the
 * newest version alone, so it is not part of this record.
 */
export interface CampaignWorkspaceVersionRecord {
  readonly version: CampaignVersion;
  readonly preflight?: PreflightResult;
  readonly approval?: ApprovalDecision;
}

export interface CampaignWorkspaceReadRepository {
  listForLocation(): Promise<readonly CampaignWorkspaceReadRecord[]>;
  getByCampaignRef(campaignRef: string): Promise<CampaignWorkspaceReadRecord | undefined>;
  /**
   * Every version of one campaign, newest first, under the session's own location. A campaign in
   * another location answers `[]`, exactly as an unknown reference does (009E-AC-005).
   */
  listVersionsOf(campaignRef: string): Promise<readonly CampaignWorkspaceVersionRecord[]>;
}

export interface CampaignWorkspaceProjection {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
  readonly locationRef: string;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly updatedAt: string;
  /**
   * PRD-009e D4. Which flow made this version. A campaign saved before PRD-009 is an open house
   * version: it opens read-only, and none of its property fields is projected here at all.
   */
  readonly blueprint: CampaignVersion["manifest"]["blueprintId"];
  readonly headline: string;
  readonly disclosureText: string;
  readonly dailyBudgetMinor: number;
  readonly totalBudgetMinor: number;
  readonly specialAdCategory: string;
  readonly targetingCountry: string;
  readonly targetingRegions: readonly string[];
  readonly manifestHash: string;
  readonly preflight: CampaignWorkspacePreflightProjection;
  readonly approval?: CampaignWorkspaceApprovalProjection;
  readonly nextActions: readonly CampaignWorkspaceNextAction[];
  readonly canApprove: boolean;
  readonly persistenceKind: CampaignPersistenceKind;
  readonly detailHref: string;
  readonly providerPublicationAuthorized: false;
}

const PROVIDER_PUBLISH_ACTION: CampaignWorkspaceNextAction = Object.freeze({
  id: "provider_publish",
  available: false,
});

const REVIEW_EVIDENCE_ACTION: CampaignWorkspaceNextAction = Object.freeze({
  id: "review_evidence",
  available: true,
});

const ALREADY_DECIDED_ACTION: CampaignWorkspaceNextAction = Object.freeze({
  id: "already_decided",
  available: false,
});

export function principalHasCampaignApprovalRole(
  principal: Readonly<AuthenticatedPrincipal>,
): boolean {
  const frozen = freezeAuthenticatedPrincipal(principal);
  return (CAMPAIGN_APPROVAL_ROLES as readonly string[]).includes(frozen.role);
}

export function campaignMayBeApprovedBy(
  principal: Readonly<AuthenticatedPrincipal>,
  record: Readonly<{ state: CampaignState; preflight: Pick<PreflightResult, "blocking"> }>,
): boolean {
  return (
    principalHasCampaignApprovalRole(principal) &&
    record.state === "awaiting_approval" &&
    record.preflight.blocking === false
  );
}

/**
 * What a campaign can do next, from where it stands and what has been decided on it.
 *
 * `decision` is the recorded approval decision, when there is one. It is needed because a send-back
 * does not change the state: `executeHumanCampaignApproval` records the rejection and sets the state
 * to `awaiting_approval` again. The state alone cannot tell a version nobody has looked at from one
 * that was just sent back, and offering the second for approval, or waiting for an approver on it,
 * says something that is no longer true. A decided version is not offered for approval.
 */
export function deriveCampaignNextActions(
  state: CampaignState,
  canApprove: boolean,
  decision?: ApprovalDecision["decision"],
): readonly CampaignWorkspaceNextAction[] {
  switch (state) {
    case "preflight_failed":
      return Object.freeze([
        REVIEW_EVIDENCE_ACTION,
        Object.freeze({
          id: "remediate_preflight",
          available: true,
        }),
        PROVIDER_PUBLISH_ACTION,
      ]);
    case "awaiting_approval":
      if (decision !== undefined) {
        return Object.freeze([
          REVIEW_EVIDENCE_ACTION,
          ALREADY_DECIDED_ACTION,
          PROVIDER_PUBLISH_ACTION,
        ]);
      }
      return Object.freeze([
        REVIEW_EVIDENCE_ACTION,
        canApprove
          ? Object.freeze({
              id: "approve_version",
              available: true,
            })
          : Object.freeze({
              id: "wait_for_approver",
              available: false,
            }),
        PROVIDER_PUBLISH_ACTION,
      ]);
    case "approved":
      return Object.freeze([
        REVIEW_EVIDENCE_ACTION,
        ALREADY_DECIDED_ACTION,
        PROVIDER_PUBLISH_ACTION,
      ]);
    case "draft":
    case "generated":
    case "publishing":
    case "live":
    case "paused":
    case "completed":
    case "archived":
      return Object.freeze([REVIEW_EVIDENCE_ACTION, PROVIDER_PUBLISH_ACTION]);
  }
}

/**
 * PRD-009e D3 and 009E-AC-005, 009E-AC-010. Where one version of a campaign stands, in a single
 * vocabulary every screen shares: the stored state, plus the two standings the state cannot say.
 * "Ad retired" is a standing of a version nobody has approved whose library ad was taken out of the
 * library (009c D4); "replaced" is a standing of an older version nobody decided on.
 */
export type CampaignStanding = CampaignState | "ad_retired" | "replaced";

/** The states a version nobody has decided on can still be in, and so the ones retirement changes. */
const UNAPPROVED_STATES: ReadonlySet<CampaignState> = new Set([
  "draft",
  "generated",
  "preflight_failed",
  "awaiting_approval",
]);

/**
 * The standing of the newest version, which is the only one the campaign's stored state describes.
 *
 * The recorded decision comes first, as PRD-008b requires of every surface (008B-AC-004): a send-back
 * leaves the state at `awaiting_approval`, so a rejected version keeps that state and the label
 * function reads the decision. Then retirement, which beats the checks, because a version whose ad
 * is gone cannot be approved however its checks came out (009d D8). Then the state itself.
 */
export function deriveCampaignStanding(
  input: Readonly<{
    state: CampaignState;
    decision: ApprovalDecision["decision"] | undefined;
    adRetired: boolean;
  }>,
): CampaignStanding {
  if (input.decision === undefined && input.adRetired && UNAPPROVED_STATES.has(input.state)) {
    return "ad_retired";
  }
  return input.state;
}

/**
 * The standing of an older version, which has no stored state of its own. What is known about it is
 * its decision and its last check: a decision wins, then a check that found something, and a
 * version that passed its check and was never decided on was simply replaced by a newer one.
 */
export function deriveOlderVersionStanding(
  record: Readonly<Pick<CampaignWorkspaceVersionRecord, "preflight" | "approval">>,
): CampaignStanding {
  if (record.approval?.decision === "approved") return "approved";
  if (record.approval?.decision === "rejected") return "awaiting_approval";
  if (record.preflight === undefined) return "generated";
  return record.preflight.blocking ? "preflight_failed" : "replaced";
}

export function campaignVersionHref(campaignRef: string, versionNo: number): string {
  return `/marketing/campaigns/${campaignRef}/versions/${String(versionNo)}`;
}

/** One row of a campaign's versions list (009E-AC-005). */
export interface CampaignVersionSummary {
  readonly versionNo: number;
  readonly campaignVersionRef: string;
  readonly savedAt: string;
  /** True when the viewer saved it: a saver's name is not recorded, so "by you" is all that is known. */
  readonly savedByViewer: boolean;
  readonly isLatest: boolean;
  readonly standing: CampaignStanding;
  readonly decision?: CampaignWorkspaceApprovalProjection;
  readonly href: string;
}

function approvalProjectionOf(approval: ApprovalDecision): CampaignWorkspaceApprovalProjection {
  return Object.freeze({
    decision: approval.decision,
    decidedAt: approval.decidedAt,
    actorRole: approval.actorRole,
    ...(approval.snapshot.approverDisplayName === undefined
      ? {}
      : { approverDisplayName: approval.snapshot.approverDisplayName }),
  });
}

/**
 * Every version of a campaign as a versions-list row, newest first. A version in another location
 * is refused with the same error as everywhere else, so a list can never mix locations. The newest
 * version takes the campaign's stored state and the library's verdict on its ad; every older one
 * is read from its own decision and check.
 */
export function projectCampaignVersions(
  records: readonly CampaignWorkspaceVersionRecord[],
  principal: Readonly<AuthenticatedPrincipal>,
  latest: Readonly<{ state: CampaignState; adRetired: boolean }>,
): readonly CampaignVersionSummary[] {
  const frozen = freezeAuthenticatedPrincipal(principal);
  const ordered = [...records].sort(
    (left, right) => right.version.versionNo - left.version.versionNo,
  );
  const newest = ordered[0]?.version.versionNo;
  return Object.freeze(
    ordered.map((record) => {
      assertCampaignAccessible(frozen, record.version);
      const isLatest = record.version.versionNo === newest;
      return Object.freeze({
        versionNo: record.version.versionNo,
        campaignVersionRef: record.version.campaignVersionRef,
        savedAt: record.version.createdAt,
        savedByViewer: record.version.createdBy === frozen.actorRef,
        isLatest,
        standing: isLatest
          ? deriveCampaignStanding({
              state: latest.state,
              decision: record.approval?.decision,
              adRetired: latest.adRetired,
            })
          : deriveOlderVersionStanding(record),
        ...(record.approval === undefined
          ? {}
          : { decision: approvalProjectionOf(record.approval) }),
        href: isLatest
          ? `/marketing/campaigns/${record.version.campaignRef}`
          : campaignVersionHref(record.version.campaignRef, record.version.versionNo),
      });
    }),
  );
}

export function projectCampaignWorkspace(
  record: CampaignWorkspaceReadRecord,
  principal: Readonly<AuthenticatedPrincipal>,
  persistenceKind: CampaignPersistenceKind,
): CampaignWorkspaceProjection {
  const frozen = freezeAuthenticatedPrincipal(principal);
  assertCampaignAccessible(frozen, record.version);
  const canApprove = campaignMayBeApprovedBy(frozen, record);
  const manifest = record.version.manifest;
  return Object.freeze({
    campaignRef: record.version.campaignRef,
    campaignVersionRef: record.version.campaignVersionRef,
    versionNo: record.version.versionNo,
    locationRef: record.version.locationRef,
    state: record.state,
    rowVersion: record.rowVersion,
    updatedAt: record.updatedAt,
    blueprint: manifest.blueprintId,
    headline: manifest.content.headline,
    disclosureText: manifest.content.disclosureText,
    dailyBudgetMinor: manifest.meta.dailyBudgetMinor,
    totalBudgetMinor: manifest.meta.totalBudgetMinor,
    specialAdCategory: manifest.meta.specialAdCategory,
    targetingCountry: manifest.meta.targeting.country,
    targetingRegions: Object.freeze([...manifest.meta.targeting.regions]),
    manifestHash: record.version.manifestHash,
    preflight: Object.freeze({
      blocking: record.preflight.blocking,
      resultHash: record.preflight.resultHash,
      evaluatedAt: record.preflight.evaluatedAt,
      findings: Object.freeze(
        record.preflight.findings.map((finding) =>
          Object.freeze({
            ruleCode: finding.ruleCode,
            severity: finding.severity,
            description: finding.description,
            remediation: finding.remediation,
          }),
        ),
      ),
    }),
    ...(record.approval === undefined ? {} : { approval: approvalProjectionOf(record.approval) }),
    nextActions: deriveCampaignNextActions(record.state, canApprove, record.approval?.decision),
    canApprove,
    persistenceKind,
    detailHref: `/marketing/campaigns/${record.version.campaignRef}`,
    providerPublicationAuthorized: false,
  });
}
