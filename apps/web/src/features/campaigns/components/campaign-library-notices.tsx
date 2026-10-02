import { Icon, Link } from "@oalo/ui";

import { NOTICES, retiredKept } from "../../../copy/campaign-page-messages.js";
import { adRetiredNotice } from "../../../copy/launch-messages.js";
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
      if (on === undefined) return NOTICES.missingUndecided;
      return notice.blocksApproval ? adRetiredNotice(on) : retiredKept(on);
    }
    case "missing":
      return notice.blocksApproval ? NOTICES.missingUndecided : NOTICES.missingApproved;
    case "newer-version":
      // Drawn by the ads library's `UseNewVersion`, which says its own sentence.
      return "";
    case "brand-changed":
      return NOTICES.brandChanged;
  }
}

function noticeAction(notice: CampaignNotice) {
  if (
    (notice.kind === "retired" || notice.kind === "missing") &&
    notice.chooseAnotherAdHref !== undefined
  ) {
    return (
      <Link href={notice.chooseAnotherAdHref} variant="action">
        {NOTICES.chooseAnotherAd}
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
            <li className={styles.notice} data-notice={notice.kind} key={notice.kind}>
              <UseNewVersion canUse={notice.canUse} offer={notice.offer} />
            </li>
          );
        }
        const action = noticeAction(notice);
        return (
          <li className={styles.notice} data-notice={notice.kind} key={notice.kind}>
            <p>
              <Icon decorative name="info" size="sm" tone="info" />{" "}
              <TextWithDays days={noticeDays(notice)} text={noticeSentence(notice)} />
            </p>
            {action === null ? null : <div className={styles.noticeActions}>{action}</div>}
          </li>
        );
      })}
    </ul>
  );
}
