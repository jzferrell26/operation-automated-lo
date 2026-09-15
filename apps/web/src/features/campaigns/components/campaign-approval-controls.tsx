"use client";

import { Card, SafeAction, type SafeActionDecision } from "@oalo/ui";
import { useState } from "react";

import { postInternalJson } from "../../http/internal-api.js";
import styles from "./open-house-draft-builder.module.css";

export type CampaignApprovalControlsProps = Readonly<{
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
    alreadyDecided === undefined
      ? null
      : `Recorded ${alreadyDecided}. Provider publication remains disabled.`,
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
        const record = payload as { error?: string };
        throw new Error(record.error ?? "CAMPAIGN_APPROVAL_FAILED");
      }
      const body = payload as { decision: string; duplicate?: boolean };
      setStatus(
        body.duplicate
          ? `Already recorded ${body.decision}. Provider publication remains disabled.`
          : `Recorded ${body.decision}. Provider publication remains disabled.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CAMPAIGN_APPROVAL_FAILED");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="md">
      <strong>Human approval</strong>
      <p>
        Approval binds to this exact campaign version and preflight hash. Later edits create a new
        version and cannot inherit this decision. No HighLevel or Meta publish runs from this
        control.
      </p>
      <SafeAction
        confirmLabel="Record approved"
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
          Record rejected (stays awaiting approval)
        </button>
      ) : null}
      <p role="status">{status ?? "No approval has been recorded for this version."}</p>
    </Card>
  );
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
      explanation: "Recording the human approval decision.",
      requiredRole: "location_admin or campaign_approver",
      lastSafeState: input.state,
      progressLabel: "Recording approval",
    };
  }
  if (input.alreadyDecided !== undefined) {
    return {
      state: "blocked",
      explanation: "This version already has a recorded human decision.",
      requiredRole: "location_admin or campaign_approver",
      prerequisite: "A new campaign version after material edits",
      responsibleParty: "Campaign creator",
      nextAction: "Review the recorded decision. Do not republish from this screen.",
    };
  }
  if (!input.canApprove) {
    return {
      state: "permission_restricted",
      explanation: "Only a verified human with campaign_approver or location_admin may approve.",
      requiredRole: "location_admin or campaign_approver",
      responsibleParty: "Workspace administrator",
      nextAction: "Ask an authorized approver to review this exact version.",
    };
  }
  if (input.blocking || input.state !== "awaiting_approval") {
    return {
      state: "blocked",
      explanation: "A current passing preflight on this exact version is required before approval.",
      requiredRole: "location_admin or campaign_approver",
      prerequisite: "Passing deterministic preflight for this campaign version",
      responsibleParty: "Campaign creator",
      nextAction: "Fix blocking findings and freeze a new version if the content changed.",
    };
  }
  return {
    state: "ready",
    explanation:
      "Review the version, preflight, budget, targeting, dates, disclosures, and approval scope before recording a human decision.",
    requiredRole: "location_admin or campaign_approver",
    confirmation: {
      title: "Approve this exact campaign version",
      effect: "Records an auditable human approval. Does not publish to any provider.",
      scope: `Campaign version ${input.campaignVersionRef}`,
      result: "Campaign status becomes approved for this version only.",
    },
  };
}
