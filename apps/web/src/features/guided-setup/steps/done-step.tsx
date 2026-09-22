"use client";

import { Icon } from "@oalo/ui";

import { NOT_CONNECTED_SOURCE } from "../../../copy/user-language.js";
import { GUIDED_SETUP_ANCHORS } from "../anchor-registry.js";
import styles from "../guided-setup.module.css";

/**
 * PRD-006c D3 step 7 and 006C-AC-018. The last thing the walkthrough says.
 *
 * The step's own body, from the copy contract, says the campaign is saved and approved and that it
 * will not run as an ad because HighLevel and Meta are not connected. This line adds the third
 * account by name, using the same sentence the shell's banner uses, so the closing statement names
 * every account the product would need and claims nothing about any of them.
 *
 * There is no connect control here, no publish control, and no spend control. The walkthrough ends
 * by telling the truth about what is not connected, not by offering to connect it.
 */
export function DoneStep() {
  return (
    <p className={styles.stepBody} data-tour={GUIDED_SETUP_ANCHORS.setupDone}>
      <Icon decorative name="lock" size="sm" tone="info" />
      {NOT_CONNECTED_SOURCE}
    </p>
  );
}
