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
}

export interface CampaignWorkspaceReadRecord {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly updatedAt: string;
  readonly approval?: ApprovalDecision;
}

export interface CampaignWorkspaceReadRepository {
  listForLocation(): Promise<readonly CampaignWorkspaceReadRecord[]>;
  getByCampaignRef(campaignRef: string): Promise<CampaignWorkspaceReadRecord | undefined>;
}

export interface CampaignWorkspaceProjection {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
  readonly locationRef: string;
  readonly state: CampaignState;
  readonly rowVersion: number;
  readonly updatedAt: string;
  readonly headline: string;
  readonly propertyAddress: string;
  readonly openHouseStartsAt: string;
  readonly openHouseEndsAt: string;
  readonly realtorDisplayName: string;
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

export function deriveCampaignNextActions(
  state: CampaignState,
  canApprove: boolean,
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
        Object.freeze({
          id: "already_decided",
          available: false,
        }),
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
    headline: manifest.content.headline,
    propertyAddress: manifest.property.address,
    openHouseStartsAt: manifest.property.openHouseStartsAt,
    openHouseEndsAt: manifest.property.openHouseEndsAt,
    realtorDisplayName: manifest.partner.realtorDisplayName,
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
    ...(record.approval === undefined
      ? {}
      : {
          approval: Object.freeze({
            decision: record.approval.decision,
            decidedAt: record.approval.decidedAt,
            actorRole: record.approval.actorRole,
          }),
        }),
    nextActions: deriveCampaignNextActions(record.state, canApprove),
    canApprove,
    persistenceKind,
    detailHref: `/marketing/campaigns/${record.version.campaignRef}`,
    providerPublicationAuthorized: false,
  });
}
