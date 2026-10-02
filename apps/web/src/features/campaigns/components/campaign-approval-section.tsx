import type { CampaignWorkspaceApprovalProjection } from "@oalo/application";
import { Surface } from "@oalo/ui";

import {
  APPROVAL,
  APPROVER_ROLE_NOUNS,
  decisionParts,
  type DecisionWho,
} from "../../../copy/campaign-page-messages.js";
import {
  APPROVAL_ROLE_LABELS,
  CAMPAIGN_SENT_BACK_LABEL,
  CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION,
} from "../../../copy/user-language.js";
import { shortDay } from "../launch-model.js";
import styles from "./campaign-page.module.css";

/** Who made a decision: the recorded name when there is one, and always the role beside it. */
export function decisionWho(decision: CampaignWorkspaceApprovalProjection): DecisionWho {
  return {
    name: decision.approverDisplayName,
    roleNoun: APPROVER_ROLE_NOUNS[decision.actorRole],
    rolePhrase: APPROVAL_ROLE_LABELS[decision.actorRole],
  };
}

/**
 * PRD-009e D2, 009E-AC-004. The approval of the version being shown: "Approved by <name>, <role>,
 * on <date>.", with the name the decider's own session recorded and always beside the role, or the
 * role and the date alone for a decision recorded without a name (every decision made before
 * PRD-009). The name is whatever the person typed at sign-up and is not verified, so it is shown as
 * text and never as a claim of identity; the role is the authoritative record.
 *
 * With no decision it says nobody has approved this version yet, which is true whether it is
 * waiting for an approver or was never checked.
 */
export function CampaignApprovalSection({
  decision,
}: Readonly<{ decision: CampaignWorkspaceApprovalProjection | undefined }>) {
  if (decision === undefined) {
    return (
      <Surface
        aria-labelledby="campaign-approval-title"
        data-approval-section=""
        padding="md"
        role="region"
      >
        <div className={styles.body}>
          <h2 className={styles.cardTitle} id="campaign-approval-title">
            {APPROVAL.title}
          </h2>
          <p className={styles.small}>{APPROVAL.nobody}</p>
        </div>
      </Surface>
    );
  }
  const approved = decision.decision === "approved";
  const parts = decisionParts(
    approved ? "Approved" : CAMPAIGN_SENT_BACK_LABEL,
    decisionWho(decision),
  );
  return (
    <Surface
      aria-labelledby="campaign-approval-title"
      data-approval-section=""
      data-decision={decision.decision}
      padding="md"
      role="region"
    >
      <div className={styles.body}>
        <h2 className={styles.cardTitle} id="campaign-approval-title">
          {APPROVAL.title}
        </h2>
        <p className={styles.small}>
          {parts.lead}
          {parts.name === undefined ? null : <strong>{parts.name}</strong>}
          {parts.trail}
          <time dateTime={decision.decidedAt}>{shortDay(decision.decidedAt)}</time>.
        </p>
        <p className={styles.small}>
          {approved ? APPROVAL.covers : CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION}
        </p>
      </div>
    </Surface>
  );
}
