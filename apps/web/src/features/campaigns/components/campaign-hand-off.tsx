"use client";

import { Button, Icon } from "@oalo/ui";
import { useState } from "react";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { GUIDED_SETUP_ANCHORS } from "../../guided-setup/anchor-registry.js";
import styles from "./open-house-draft-builder.module.css";

/**
 * PRD-006c D3 step 6, the branch for everyone who cannot approve.
 *
 * "Ask an approver" without the link is advice, not a step, so the control gives them the link.
 * It points at the campaign in the user's own workspace and is useless to anyone without a session
 * for that workspace, which is what makes it safe to send.
 *
 * It lives on the campaign screen rather than inside the walkthrough panel because a user who
 * dismissed the walkthrough still needs it, and a control that exists only inside a guided step is
 * a control most people never find.
 *
 * The clipboard write is wrapped: a browser that refuses it must not break the page. When it fails
 * the address is still on screen and still selectable, so nobody is stuck.
 */
export function CampaignHandOff({ campaignHref }: Readonly<{ campaignHref: string }>) {
  const [copied, setCopied] = useState(false);

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(new URL(campaignHref, window.location.href).toString());
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.handOff} data-tour={GUIDED_SETUP_ANCHORS.campaignHandoffLink}>
      <Button
        onClick={() => {
          void copyLink();
        }}
        size="sm"
        variant="secondary"
      >
        {GUIDED_SETUP_STEPS.approveOrHandOff.copyLinkLabel}
      </Button>
      <p aria-live="polite" className={styles.hint}>
        {copied ? (
          <>
            <Icon decorative name="check" size="sm" tone="success" />
            {GUIDED_SETUP_STEPS.approveOrHandOff.copiedNotice}
          </>
        ) : (
          GUIDED_SETUP_STEPS.approveOrHandOff.handOffBody
        )}
      </p>
    </div>
  );
}
