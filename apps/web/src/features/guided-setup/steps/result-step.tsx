"use client";

import {
  campaignStanding,
  type SetupCampaignResult,
  type SetupResultFinding,
} from "../model/campaign-result.js";
import { readTheResultBody } from "./step-model.js";
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
  result:
    | Readonly<
        Pick<SetupCampaignResult, "decision" | "ready"> & {
          findings: readonly SetupResultFinding[];
        }
      >
    | undefined;
}>;

export function ResultStep({ result }: ResultStepProps) {
  // PRD-008b 008B-AC-011. What the sentence says follows where the campaign stands, not the check
  // result alone, so a version somebody has decided is not described as ready for approval.
  if (result === undefined || result.findings.length === 0) {
    return <p className={styles.stepBody}>{readTheResultBody(campaignStanding(result))}</p>;
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
