"use client";

import { Card, SafeAction, type SafeActionDecision } from "@oalo/ui";
import { useState } from "react";

import {
  APPROVER_OR_OWNER,
  CAMPAIGN_CREATOR_PARTY,
  WORKSPACE_OWNER_PARTY,
} from "../../../copy/user-language.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import { CampaignHandOff } from "./campaign-hand-off.js";
import { userMessageSentence } from "../../http/user-messages.js";
import { postInternalJson } from "../../http/internal-api.js";
import styles from "./open-house-draft-builder.module.css";

export type CampaignApprovalControlsProps = Readonly<{
  /** Where this campaign lives, so a user who cannot approve can hand the address to someone who can. */
  campaignHref: string;
  campaignRef: string;
  campaignVersionRef: string;
  manifestHash: string;
  preflightResultHash: string;
  rowVersion: number;
  canApprove: boolean;
  alreadyDecided?: "approved" | "rejected" | undefined;
  blocking: boolean;
  state: string;
}>;

export function CampaignApprovalControls({
  campaignHref,
  campaignRef,
  campaignVersionRef,
  manifestHash,
  preflightResultHash,
  rowVersion,
  canApprove,
  alreadyDecided,
  blocking,
  state,
}: CampaignApprovalControlsProps) {
  const [status, setStatus] = useState<string | null>(
    alreadyDecided === undefined ? null : decisionStatus(alreadyDecided, false),
  );
  const [busy, setBusy] = useState(false);

  const decision: SafeActionDecision = resolveDecision({
    canApprove,
    alreadyDecided,
    blocking,
    state,
    campaignVersionRef,
    busy,
  });

  async function submit(next: "approved" | "rejected") {
    setBusy(true);
    setStatus(null);
    try {
      const response = await postInternalJson("/api/campaigns/approve", {
        campaignRef,
        decision: next,
        expectedCampaignVersionRef: campaignVersionRef,
        expectedManifestHash: manifestHash,
        expectedPreflightResultHash: preflightResultHash,
        expectedRowVersion: rowVersion,
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        // PRD-006b D7. The route's code becomes two sentences; the code never reaches this line.
        const record = payload as { error?: string };
        setStatus(userMessageSentence(record.error));
        return;
      }
      const body = payload as { decision: "approved" | "rejected"; duplicate?: boolean };
      setStatus(decisionStatus(body.decision, body.duplicate === true));
    } catch {
      setStatus(userMessageSentence(undefined));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card data-tour={GUIDED_SETUP_ANCHORS.campaignApproveControl} padding="md">
      <strong>Approve this campaign</strong>
      <p>Approving applies to this exact version. Nothing is published or sent.</p>
      <SafeAction
        confirmLabel="Yes, approve"
        decision={decision}
        label="Approve this version"
        onConfirm={() => submit("approved")}
      />
      {canApprove && alreadyDecided === undefined && !blocking && state === "awaiting_approval" ? (
        <button
          className={styles.hint}
          disabled={busy}
          type="button"
          onClick={() => void submit("rejected")}
        >
          Send back for changes
        </button>
      ) : null}
      {canApprove ? null : <CampaignHandOff campaignHref={campaignHref} />}
      <p role="status">{status ?? "Nobody has approved this version yet."}</p>
    </Card>
  );
}

/** What a recorded decision says, once, wherever it is said. */
function decisionStatus(decision: "approved" | "rejected", duplicate: boolean): string {
  if (decision === "rejected") {
    return duplicate
      ? "Already sent back for changes."
      : "Sent back for changes. The campaign creator can fix it and save a new version.";
  }
  return duplicate
    ? "Already approved."
    : "Approved. This campaign won't run as an ad until HighLevel and Meta are connected.";
}

function resolveDecision(input: {
  canApprove: boolean;
  alreadyDecided?: "approved" | "rejected" | undefined;
  blocking: boolean;
  state: string;
  campaignVersionRef: string;
  busy: boolean;
}): SafeActionDecision {
  if (input.busy) {
    return {
      state: "loading",
      explanation: "Saving your decision.",
      requiredRole: APPROVER_OR_OWNER,
      lastSafeState: "Nothing has changed yet",
      progressLabel: "Saving your decision",
    };
  }
  if (input.alreadyDecided !== undefined) {
    return {
      state: "blocked",
      explanation: "Someone has already decided on this version.",
      requiredRole: APPROVER_OR_OWNER,
      prerequisite: "A new version, after someone changes the campaign",
      responsibleParty: CAMPAIGN_CREATOR_PARTY,
      nextAction: "Read the decision below. Nothing else happens from this page.",
    };
  }
  if (!input.canApprove) {
    return {
      state: "permission_restricted",
      explanation: "Only an approver or your workspace owner can approve a campaign.",
      requiredRole: APPROVER_OR_OWNER,
      responsibleParty: WORKSPACE_OWNER_PARTY,
      nextAction: "Send them this page and ask them to look at this version.",
    };
  }
  if (input.blocking || input.state !== "awaiting_approval") {
    return {
      state: "blocked",
      explanation: "This version needs changes before anyone can approve it.",
      requiredRole: APPROVER_OR_OWNER,
      prerequisite: "A version where the checks find nothing to fix",
      responsibleParty: CAMPAIGN_CREATOR_PARTY,
      nextAction: "Fix what the checks found, then save it again.",
    };
  }
  return {
    state: "ready",
    explanation:
      "Read the wording, the budget, where the ad runs, the dates, and the disclosures before you approve.",
    requiredRole: APPROVER_OR_OWNER,
    confirmation: {
      title: "Approve this version",
      effect: "Records your name against this exact version. Nothing is published or sent.",
      scope: "This version of the campaign, as it reads right now",
      result: "The campaign is approved. Changing it later needs a new approval.",
    },
  };
}
