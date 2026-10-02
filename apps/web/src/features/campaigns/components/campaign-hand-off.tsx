"use client";

import { Button, Icon } from "@oalo/ui";
import { useState } from "react";

import { HAND_OFF } from "../../../copy/launch-messages.js";
import styles from "./campaign-page.module.css";

/**
 * PRD-006c D3 step 6, the branch for everyone who cannot approve.
 *
 * "Ask an approver" without the link is advice, not a step, so the control gives them the link.
 * It points at the campaign in the user's own workspace and is useless to anyone without a session
 * for that workspace, which is what makes it safe to send.
 *
 * PRD-009d D8: the same card sits on step 3 of "Launch an ad" and on the campaign page. Its words
 * live in `launch-messages.ts`.
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
    <div className={styles.handOff} data-hand-off="">
      <Button
        onClick={() => {
          void copyLink();
        }}
        size="sm"
        variant="secondary"
      >
        {HAND_OFF.copyLinkLabel}
      </Button>
      <p aria-live="polite" className={styles.hint}>
        {copied ? (
          <>
            <Icon decorative name="check" size="sm" tone="success" />
            {HAND_OFF.copiedNotice}
          </>
        ) : (
          HAND_OFF.body
        )}
      </p>
    </div>
  );
}
