"use client";

import { GUIDED_SETUP_STEPS } from "../../../copy/guided-setup-messages.js";
import type { SetupResultFinding } from "../model/campaign-result.js";
import styles from "../guided-setup.module.css";

/**
 * PRD-006c D3 step 5. What the checks found, said the way a loan officer needs it.
 *
 * PRD-006b D5 fixes the order: the plain description first, the fix second, and the rule's own
 * code only inside the collapsed support region on the campaign page itself, never here. The panel
 * repeats the explanations rather than telling the user to go and read them, because the point of
 * the step is that somebody reading their first check result is not left to interpret it alone.
 *
 * `result` is `undefined` when the campaign could not be read. The step then says so rather than
 * choosing one of the two outcomes: telling somebody their campaign is ready when nothing was read
 * is the one answer worse than admitting the panel does not know.
 */

export type ResultStepProps = Readonly<{
  result: Readonly<{ ready: boolean; findings: readonly SetupResultFinding[] }> | undefined;
}>;

export function ResultStep({ result }: ResultStepProps) {
  if (result === undefined) {
    return <p className={styles.stepBody}>{GUIDED_SETUP_STEPS.readTheResult.unknownBody}</p>;
  }
  if (result.findings.length === 0) {
    return (
      <p className={styles.stepBody}>
        {result.ready
          ? GUIDED_SETUP_STEPS.readTheResult.readyBody
          : GUIDED_SETUP_STEPS.readTheResult.needsChangesBody}
      </p>
    );
  }
  return (
    <ul className={styles.findingList}>
      {result.findings.map((finding) => (
        <li className={styles.finding} key={finding.description}>
          <span className={styles.findingTitle}>{finding.description}</span>
          <span>{finding.remediation}</span>
        </li>
      ))}
    </ul>
  );
}
