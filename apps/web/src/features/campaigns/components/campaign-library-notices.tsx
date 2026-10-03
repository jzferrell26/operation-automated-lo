import { Icon, Link, Surface } from "@oalo/ui";

import { USE_NEW_VERSION_ASK } from "../../../copy/ads-library-messages.js";
import { NOTICES, retiredKept } from "../../../copy/campaign-page-messages.js";
import {
  AD_ART_CHANGED_NOTICE,
  AD_REPLACED_NOTICE,
  AD_RETIRED_UNDATED_NOTICE,
  MAKE_A_NEW_VERSION,
  adRetiredNotice,
} from "../../../copy/launch-messages.js";
import { UseNewVersion } from "../../ads-library/components/use-new-version.js";
import type { CampaignNotice } from "../campaign-page-model.js";
import { shortDay } from "../launch-model.js";
import styles from "./campaign-page.module.css";
import { TextWithDays, type DayInText } from "./text-with-days.js";

/**
 * PRD-009e 009E-AC-006. One-line library notices, only when they apply, each with at most one
 * action: the ad was retired or is no longer in the library (with "Choose another ad" for a version
 * nobody has approved), a newer version of the ad exists (the ads library's own notice, with its
 * "Use the new version" for a version nobody has decided on, 009C-AC-009), and Brand changed after
 * this version was saved.
 *
 * Amended 2026-10-03 (writing review delta check, D-4). The page offers no Approve where the approval
 * command would refuse (QA-06), so two more notices say why, in step 3's own sentences: the ad's
 * pictures changed after this version was saved (with "Make a new version"), and a newer version of
 * the ad exists that the page cannot offer to move to (with "Choose another ad").
 *
 * Amended 2026-10-03 (quality close-out, QA-12). The newer-version notice names who can use the new
 * version to somebody who cannot save one, in `USE_NEW_VERSION_ASK`, as step 3 does.
 *
 * A notice on an approved version only says what changed: the approval covers the version that was
 * approved, so nothing here asks the person to redo it.
 */

/** The day a retired notice names, as a day, so the sentence can draw it as a date. */
function noticeDays(notice: CampaignNotice): readonly DayInText[] {
  return notice.kind === "retired" && notice.retiredOn !== null
    ? [{ dateTime: notice.retiredOn, text: shortDay(notice.retiredOn) }]
    : [];
}

function noticeSentence(notice: CampaignNotice): string {
  switch (notice.kind) {
    case "retired": {
      const on = notice.retiredOn === null ? undefined : shortDay(notice.retiredOn);
      // Step 3 says the same sentence for the same state (writing review delta check, D-5), so a
      // retired ad is "taken out of the library" on both and "isn't in the library" stays the
      // missing ad's.
      if (on === undefined) {
        return notice.blocksApproval ? AD_RETIRED_UNDATED_NOTICE : NOTICES.missingUndecided;
      }
      return notice.blocksApproval ? adRetiredNotice(on) : retiredKept(on);
    }
    case "missing":
      return notice.blocksApproval ? NOTICES.missingUndecided : NOTICES.missingApproved;
    case "art-changed":
      return AD_ART_CHANGED_NOTICE;
    case "replaced":
      return AD_REPLACED_NOTICE;
    case "newer-version":
      // Drawn by the ads library's `UseNewVersion`, which says its own sentence.
      return "";
    case "brand-changed":
      return NOTICES.brandChanged;
  }
}

function noticeAction(notice: CampaignNotice) {
  if (
    (notice.kind === "retired" || notice.kind === "missing" || notice.kind === "replaced") &&
    notice.chooseAnotherAdHref !== undefined
  ) {
    return (
      <Link href={notice.chooseAnotherAdHref} variant="action">
        {NOTICES.chooseAnotherAd}
      </Link>
    );
  }
  if (notice.kind === "art-changed" && notice.makeNewVersionHref !== undefined) {
    return (
      <Link href={notice.makeNewVersionHref} variant="action">
        {MAKE_A_NEW_VERSION}
      </Link>
    );
  }
  return null;
}

export function CampaignLibraryNotices({
  notices,
}: Readonly<{ notices: readonly CampaignNotice[] }>) {
  if (notices.length === 0) return null;
  return (
    <ul className={styles.notices} data-library-notices="">
      {notices.map((notice) => {
        if (notice.kind === "newer-version") {
          return (
            <li data-notice={notice.kind} key={notice.kind}>
              <Surface className={styles.notice} padding="lg">
                {/* QA-12. Somebody who cannot save a version is told who can, in step 3's own
                    sentence, so an approver who followed the hand-off link has a next step. */}
                <UseNewVersion
                  askWhenCannot={USE_NEW_VERSION_ASK}
                  canUse={notice.canUse}
                  offer={notice.offer}
                />
              </Surface>
            </li>
          );
        }
        const action = noticeAction(notice);
        return (
          <li data-notice={notice.kind} key={notice.kind}>
            <Surface className={styles.notice} padding="lg">
              <p className={styles.noticeText}>
                <Icon decorative name="info" size="sm" tone="info" />
                <span>
                  <TextWithDays days={noticeDays(notice)} text={noticeSentence(notice)} />
                </span>
              </p>
              {action === null ? null : <div className={styles.noticeActions}>{action}</div>}
            </Surface>
          </li>
        );
      })}
    </ul>
  );
}
