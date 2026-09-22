"use client";

import { Icon } from "@oalo/ui";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import { CAMPAIGN_FIELD_LABELS, CAMPAIGN_FIELD_SEQUENCE } from "./step-model.js";
import styles from "../guided-setup.module.css";

/**
 * PRD-006c D3 step 4. The one step whose work happens on the page rather than in the panel.
 *
 * The panel lists the fields in the order a loan officer fills them and marks the one it is
 * currently pointing at, so the highlight on the page and the words in the panel say the same
 * thing. The step finishes when the create screen reports a saved campaign, not when the user
 * presses Continue: a step that could be skipped past the work would be a tour, not a setup.
 */

export function CreateCampaignStep({ currentIndex }: Readonly<{ currentIndex: number }>) {
  return (
    <div className={styles.stepBody}>
      <span className={styles.starterNote}>
        <Icon decorative name="info" size="sm" tone="info" />
        {GUIDED_SETUP_STEPS.createCampaign.starterTextNote}
      </span>
      <ul className={styles.fieldChecklist}>
        {CAMPAIGN_FIELD_SEQUENCE.map((anchor, index) => (
          <li
            className={styles.fieldChecklistItem}
            data-current={index === currentIndex}
            key={anchor}
          >
            <Icon
              decorative
              name={index < currentIndex ? "check" : "circle-dot"}
              size="sm"
              tone={index === currentIndex ? "info" : "neutral"}
            />
            {CAMPAIGN_FIELD_LABELS[anchor]}
          </li>
        ))}
      </ul>
      <span>{GUIDED_SETUP_STEPS.createCampaign.submitHint}</span>
    </div>
  );
}
