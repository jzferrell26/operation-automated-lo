import type { CampaignVersionSummary } from "@oalo/application";
import { Badge, Link, Surface } from "@oalo/ui";

import {
  VERSIONS,
  decidedLine,
  savedLine,
  versionLabel,
} from "../../../copy/campaign-page-messages.js";
import { campaignStateLabel } from "../../../copy/user-language.js";
import { standingTone } from "../campaign-page-model.js";
import { shortDay } from "../launch-model.js";
import { decisionWho } from "./campaign-approval-section.js";
import styles from "./campaign-page.module.css";
import { TextWithDays } from "./text-with-days.js";

/**
 * PRD-009e D2, D3 and 009E-AC-005. Every version of the campaign, newest first: its number, the
 * chip that reads its own decision, who saved it (a saver's name is not recorded, so "by you" when
 * the viewer saved it) and who decided on it and when. Every version but the one being shown links
 * to its own address, where an older version opens read-only.
 */
export function CampaignVersionsCard({
  versions,
  shownVersionNo,
}: Readonly<{ versions: readonly CampaignVersionSummary[]; shownVersionNo: number }>) {
  return (
    <Surface aria-labelledby="campaign-versions-title" data-versions="" padding="lg" role="region">
      <div className={styles.body}>
        <h2 className={styles.cardTitle} id="campaign-versions-title">
          {VERSIONS.title}
        </h2>
        <ol className={styles.versions}>
          {versions.map((version) => {
            const decision = version.decision;
            return (
              <li
                aria-current={version.versionNo === shownVersionNo ? "true" : undefined}
                data-version-no={version.versionNo}
                key={version.campaignVersionRef}
              >
                <strong>{versionLabel(version.versionNo)}</strong>
                <Badge tone={standingTone(version.standing, decision?.decision)}>
                  {campaignStateLabel(version.standing, decision?.decision)}
                </Badge>
                <p>
                  <TextWithDays
                    days={[{ dateTime: version.savedAt, text: shortDay(version.savedAt) }]}
                    text={savedLine(shortDay(version.savedAt), version.savedByViewer)}
                  />
                </p>
                {decision === undefined ? null : (
                  <p>
                    <TextWithDays
                      days={[{ dateTime: decision.decidedAt, text: shortDay(decision.decidedAt) }]}
                      text={decidedLine(
                        decision.decision === "approved" ? "Approved" : "Sent back",
                        shortDay(decision.decidedAt),
                        decisionWho(decision),
                      )}
                    />
                  </p>
                )}
                {/*
                  The version on screen says so, in words, where the other rows have their "Open"
                  link. `aria-current` alone told only assistive technology which row was shown, so
                  a sighted person could not tell which row they were on (writing review W-6).
                */}
                {version.versionNo === shownVersionNo ? (
                  <span className={styles.viewingNow}>{VERSIONS.viewing}</span>
                ) : (
                  <Link href={version.href}>
                    {VERSIONS.open}{" "}
                    <span className="oalo-visually-hidden">{versionLabel(version.versionNo)}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </Surface>
  );
}
