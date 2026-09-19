"use client";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import styles from "../guided-setup.module.css";

/**
 * PRD-006c D3 step 5. What the checks found, said the way a loan officer needs it.
 *
 * PRD-006b D5 fixes the order: the plain description first, the fix second, and the rule's own
 * code only inside the collapsed support region on the campaign page itself, never here. The panel
 * repeats the explanations rather than telling the user to go and read them, because the point of
 * the step is that somebody reading their first check result is not left to interpret it alone.
 */

export type CampaignFinding = Readonly<{
  description: string;
  remediation: string;
  severity: "blocking" | "warning";
  ruleCode: string;
}>;

export function ResultStep({ findings }: Readonly<{ findings: readonly CampaignFinding[] }>) {
  if (findings.length === 0) {
    return <p className={styles.stepBody}>{GUIDED_SETUP_STEPS.readTheResult.readyBody}</p>;
  }
  return (
    <ul className={styles.findingList}>
      {findings.map((finding) => (
        <li className={styles.finding} key={finding.ruleCode}>
          <span className={styles.findingTitle}>{finding.description}</span>
          <span>{finding.remediation}</span>
        </li>
      ))}
    </ul>
  );
}
