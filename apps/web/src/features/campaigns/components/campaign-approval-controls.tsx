"use client";

import { Button, Card, SafeAction, type SafeActionDecision } from "@oalo/ui";
import { useState } from "react";

import {
  APPROVER_OR_OWNER,
  CAMPAIGN_CREATOR_PARTY,
  WORKSPACE_OWNER_PARTY,
} from "../../../copy/user-language.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import { CampaignHandOff } from "./campaign-hand-off.js";
import { userMessageSentence } from "../../http/user-messages.js";
import {
  postInternalJson,
  refusalFrom,
  UNREACHED_REFUSAL,
  type InternalRefusal,
} from "../../http/internal-api.js";
import { SupportReference } from "../../shell/components/support-details.js";

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

/**
 * What the control says back after a decision, and what support would need if it went wrong.
 *
 * The two travel together because they are decided together: a refusal the product has no sentence
 * for is the one case that owes the person a reference (PRD-006b D7), and splitting the pair into
 * two pieces of state is how one of them gets left behind on a later branch.
 */
type ApprovalStatus = Readonly<{
  sentence: string;
  /** Present only when the answer was a refusal. `SupportReference` decides whether to show it. */
  refusal: InternalRefusal | undefined;
}>;

/** A decision that landed. Nothing went wrong, so there is nothing for support to look up. */
function recorded(sentence: string): ApprovalStatus {
  return Object.freeze({ sentence, refusal: undefined });
}

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
  const [status, setStatus] = useState<ApprovalStatus | null>(
    alreadyDecided === undefined ? null : recorded(decisionStatus(alreadyDecided, false)),
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
      if (!response.ok) {
        /*
         * PRD-006b D7. The route's code becomes two sentences and never reaches the status line.
         * A code the product has no sentence for is answered with the generic pair, which tells
         * the person to contact support, so it also carries the reference the route put on the
         * response. Without it that sentence sent somebody to support with nothing to quote.
         */
        const refusal = await refusalFrom(response);
        setStatus({ sentence: userMessageSentence(refusal.code), refusal });
        return;
      }
      const body = (await response.json()) as {
        decision: "approved" | "rejected";
        duplicate?: boolean;
      };
      setStatus(recorded(decisionStatus(body.decision, body.duplicate === true)));
    } catch {
      // Nothing answered, so there is no code to map and no reference to quote. Both are said.
      setStatus({
        sentence: userMessageSentence(UNREACHED_REFUSAL.code),
        refusal: UNREACHED_REFUSAL,
      });
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
        /*
         * `03-components/button-and-safe-action.md`: "Feature code imports `Button` and
         * `SafeAction` from `@oalo/ui`. It does not consume a raw button primitive", and
         * "`secondary` supports a paired action". This is the paired action beside the approve
         * control, so it is the secondary variant and it inherits the primitive's 44px target,
         * shared focus ring, and motion bucket. It was a bare HTML button element borrowing
         * `.hint` from the draft builder's module, which drew it 152 by 21 against 44 by 44 (design
         * brief section 14, WCAG 2.2 SC 2.5.8) and blocked two named states from being
         * photographed. The disabled reason sits adjacent, as the button specification requires:
         * while a decision is saving, the `SafeAction` above carries "Saving your decision" as its
         * own progress label.
         */
        <Button
          disabled={busy}
          onClick={() => {
            void submit("rejected");
          }}
          type="button"
          variant="secondary"
        >
          Send back for changes
        </Button>
      ) : null}
      {canApprove ? null : <CampaignHandOff campaignHref={campaignHref} />}
      <p role="status">{status?.sentence ?? "Nobody has approved this version yet."}</p>
      <SupportReference refusal={status?.refusal} />
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
