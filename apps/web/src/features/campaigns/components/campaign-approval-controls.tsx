"use client";

import { Button, Card, SafeAction, type SafeActionDecision } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useEffect, useRef, useState } from "react";

import {
  APPROVER_OR_OWNER,
  CAMPAIGN_CREATOR_PARTY,
  CAMPAIGN_NOT_AN_AD_YET,
  NEEDS_CHANGES_NEXT_ACTION,
  WORKSPACE_OWNER_PARTY,
} from "../../../copy/user-language.js";
import { APPROVE_LINE, APPROVE_TITLE } from "../../../copy/launch-messages.js";
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
  /**
   * PRD-008b D2. True once the route has answered 200 to a decision made on this card, a duplicate
   * included. It is local on purpose: the refreshed page hands this component `alreadyDecided`, but
   * the person who just decided should see the outcome they caused rather than the blocked control
   * a later visitor sees, and the same instance keeps this state across the refresh.
   */
  const [decided, setDecided] = useState(false);
  const router = useRouter();
  const outcomeRef = useRef<HTMLParagraphElement | null>(null);

  /*
   * The control that had focus (the confirm button, or Send back) is gone once the outcome replaces
   * it, and focus would fall to the top of the document. The outcome is where the person's
   * attention belongs, and it is already the page's status announcement.
   */
  useEffect(() => {
    if (decided) outcomeRef.current?.focus();
  }, [decided]);

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
      setDecided(true);
      /*
       * The server-rendered regions around this card (where the campaign stands, the check result,
       * what to do next, who signed off) were written before the decision existed. Refreshing
       * re-reads them through the same session-scoped server path as any page load; nothing is
       * fetched from the browser, and a refused or unreachable answer never gets here.
       */
      router.refresh();
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

  if (decided) {
    // PRD-008b D2. A recorded decision is not offered again. The card says only what was recorded.
    // PRD-008d's baseline review of 2026-10-01: it also keeps its title, so the card a person has
    // just decided on is the same card, by name, as the one a later visit shows, and not the only
    // untitled card on the page.
    return (
      <Card data-approval-card="" padding="md">
        <strong>{APPROVE_TITLE}</strong>
        <p ref={outcomeRef} role="status" tabIndex={-1}>
          {status?.sentence}
        </p>
      </Card>
    );
  }

  return (
    <Card data-approval-card="" padding="md">
      <strong>{APPROVE_TITLE}</strong>
      <p>{APPROVE_LINE}</p>
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
      {/*
        PRD-008b 008B-AC-010 and 008B-AC-011. The card asks somebody who cannot approve to send the
        link to an approver, which is a step on a version that is waiting for one: the checks passed
        and nobody has decided. Once a version was approved, or sent back, there is nothing for an
        approver to do with the link. And a version whose checks need changes is waiting for its
        author, so nothing about it can be approved yet and an approver has nothing to do with the
        link either.
      */}
      {canApprove || alreadyDecided !== undefined || blocking ? null : (
        <CampaignHandOff campaignHref={campaignHref} />
      )}
      {/*
        The live region stays on the page so an outcome is announced, but it says nothing until there
        is one. "Nobody has approved this version yet." is the Approval card's own sentence, directly
        above, so it is not said twice (writing review W-7).
      */}
      <p role="status">{status?.sentence}</p>
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
  /*
   * The second sentence is the contract's own (`user-language.ts`), so the page, the saved notice and
   * this outcome cannot say different things about whether the ad runs. It used to promise that
   * connecting both accounts was enough, which launching being off in PRD-009 makes untrue (W-2).
   */
  return duplicate ? "Already approved." : `Approved. ${CAMPAIGN_NOT_AN_AD_YET}`;
}

/** A version nobody can approve yet: it is waiting for the person who wrote it. */
function needsChanges(): SafeActionDecision {
  return {
    state: "blocked",
    explanation: "This version needs changes before anyone can approve it.",
    requiredRole: APPROVER_OR_OWNER,
    prerequisite: "A version where the checks find nothing to fix",
    responsibleParty: CAMPAIGN_CREATOR_PARTY,
    nextAction: NEEDS_CHANGES_NEXT_ACTION,
  };
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
      // The section that says who decided is above this card on the campaign page.
      nextAction: "Read who decided, above. Nothing else happens from this page.",
    };
  }
  /*
   * The checks come before the viewer's permission. A version whose checks need changes is not
   * approvable by anyone, so `canApprove` is false for an approver as well as for a creator, and
   * testing it first told an approver they lacked the permission they hold, and told everybody to
   * send the page to an approver, who could do nothing with it. The reason is the checks, and the
   * person who can act on it is whoever wrote the campaign.
   */
  if (input.blocking) return needsChanges();
  if (!input.canApprove) {
    return {
      state: "permission_restricted",
      explanation: "Only an approver or your workspace owner can approve a campaign.",
      requiredRole: APPROVER_OR_OWNER,
      responsibleParty: WORKSPACE_OWNER_PARTY,
      nextAction: "Send them this page and ask them to look at this version.",
    };
  }
  if (input.state !== "awaiting_approval") return needsChanges();
  return {
    state: "ready",
    explanation:
      "Read the wording, the budget, where the ad shows, the dates, and the disclosures before you approve.",
    requiredRole: APPROVER_OR_OWNER,
    confirmation: {
      title: "Approve this version",
      effect:
        "Saves your name as the approver of this exact version. Nothing is published or sent.",
      scope: "This version of the campaign, as it reads right now",
      result: "This version is approved. Changing the campaign later needs a new approval.",
    },
  };
}
