import {
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";
import { ApprovalDecisionSchema } from "@oalo/contracts";

import { createLocalSyntheticPrincipal } from "../../../server/authenticated-principal.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
} from "../../../server/campaign-command-test-support.js";
import { compileOpenHouseDraft } from "../../../server/open-house-draft.js";

/**
 * A campaign as each screen that shows where it stands reads it, before and after a decision.
 *
 * A send-back does not move a campaign out of `awaiting_approval`: the approval command records the
 * rejection and sets that state again (`campaign-approval-command.ts`, `toState`). The only thing on
 * the record that says it happened is the decision, so the sent-back view is built through the real
 * projection with that decision attached, the way a page reads it after the refresh. Every screen
 * that names a campaign's state is tried against it, because each one used to read the state alone.
 * An approval does move the state, to `approved`, and records its decision the same way.
 */

/** Somebody who may approve, which is the case where a stale "ready" is most misleading. */
export const APPROVER: AuthenticatedPrincipal = {
  ...createLocalSyntheticPrincipal(),
  role: "campaign_approver" as const,
  actorRef: "principal_localApprover001",
  actorId: "00000000-0000-4000-8000-000000000812",
};

async function compiledDraft() {
  return compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
}

/** A fresh draft, read the way an approver reads it before anyone has decided. */
export async function awaitingApprovalProjection(
  principal: AuthenticatedPrincipal = APPROVER,
): Promise<CampaignWorkspaceProjection> {
  const compiled = await compiledDraft();
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "awaiting_approval" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    },
    principal,
    "postgres",
  );
}

/**
 * A draft the checks refused, read by `principal`: nobody can approve it, because there is nothing
 * to approve yet. The Realtor has not given permission, which is a finding that blocks.
 */
export async function needsChangesProjection(
  principal: AuthenticatedPrincipal = APPROVER,
): Promise<CampaignWorkspaceProjection> {
  const compiled = await compileOpenHouseDraft(
    { ...OPEN_HOUSE_DRAFT_INPUT, realtorPermissionConfirmed: false },
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
  if (!compiled.preflight.blocking) {
    throw new Error("The needs-changes draft no longer fails the checks, so it is not a fixture.");
  }
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      state: "preflight_failed" as const,
      rowVersion: 1,
      updatedAt: compiled.version.createdAt,
    },
    principal,
    "postgres",
  );
}

/** The same draft after somebody recorded a decision on it, read by `principal`. */
async function decidedProjection(
  decision: "approved" | "rejected",
  principal: AuthenticatedPrincipal,
): Promise<CampaignWorkspaceProjection> {
  const compiled = await compiledDraft();
  const { artifacts } = compiled.version.manifest;
  return projectCampaignWorkspace(
    {
      version: compiled.version,
      preflight: compiled.preflight,
      // An approval moves the campaign on; a send-back leaves it waiting, with the rejection on it.
      state: decision === "approved" ? ("approved" as const) : ("awaiting_approval" as const),
      rowVersion: 2,
      updatedAt: compiled.version.createdAt,
      approval: ApprovalDecisionSchema.parse({
        schemaVersion: 1,
        approvalRef: "approval_decided001",
        locationRef: compiled.version.locationRef,
        campaignRef: compiled.version.campaignRef,
        campaignVersionRef: compiled.version.campaignVersionRef,
        manifestHash: compiled.version.manifestHash,
        preflightResultHash: compiled.preflight.resultHash,
        actorRef: "principal_localApprover001",
        actorKind: "human",
        actorRole: "approver",
        decidedAt: "2026-10-01T12:00:00.000Z",
        ipAuditHash: "e".repeat(64),
        decision,
        snapshot: {
          pageVersionRef: artifacts.pageVersionRef,
          pdfVersionRef: artifacts.pdfVersionRef,
          creativeVersionRef: artifacts.creativeVersionRef,
          copyVersionRef: artifacts.copyVersionRef,
          emailPackageVersionRef: artifacts.emailPackageVersionRef,
          smsPackageVersionRef: artifacts.smsPackageVersionRef,
          disclosureVersionRef: artifacts.disclosureVersionRef,
          targetingHash: "1".repeat(64),
          budgetHash: "2".repeat(64),
          datesHash: "3".repeat(64),
          formVersionRef: artifacts.formVersionRef,
          destinationVersionRef: artifacts.destinationVersionRef,
        },
      }),
    },
    principal,
    "postgres",
  );
}

/** The same draft after somebody pressed "Send back for changes". */
export async function sentBackProjection(
  principal: AuthenticatedPrincipal = APPROVER,
): Promise<CampaignWorkspaceProjection> {
  return decidedProjection("rejected", principal);
}

/** The same draft after somebody approved it. */
export async function approvedProjection(
  principal: AuthenticatedPrincipal = APPROVER,
): Promise<CampaignWorkspaceProjection> {
  return decidedProjection("approved", principal);
}
