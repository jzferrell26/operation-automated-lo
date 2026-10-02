import { Icon } from "@oalo/ui";

import { NOTICES } from "../../../copy/campaign-page-messages.js";
import type { CampaignNotice } from "../campaign-page-model.js";
import styles from "./campaign-page.module.css";
import { UseNewVersion } from "./use-new-version.js";

/**
 * SEAM (009C-AC-009, 009E-AC-006): the one place the campaign page mounts "A newer version of this ad
 * is in the library." and its action, "Use the new version".
 *
 * Today the notice and its action are this lane's own (`use-new-version.tsx` here, and the request
 * `server/campaign-page-data.ts` builds). Lane 009c part 2 built the same action for this page under
 * `features/ads-library/` (`newerVersionOffer`, `<UseNewVersion offer canUse />`, `newVersionRequest`).
 * When `gauntlet9/009c2-library` merges, this file's body becomes
 * `<UseNewVersion canUse={...} offer={...} />` from there, `use-new-version.tsx` and its test are
 * deleted, and the notice carries the offer that `newerVersionOffer` returns instead of
 * `useNewVersion`. Nothing else on the page changes.
 */
export function NewerVersionNotice({
  notice,
}: Readonly<{ notice: Extract<CampaignNotice, { kind: "newer-version" }> }>) {
  return (
    <>
      <p>
        <Icon decorative name="info" size="sm" tone="info" /> {NOTICES.newerVersion}
      </p>
      {notice.useNewVersion === undefined ? null : (
        <div className={styles.noticeActions}>
          <UseNewVersion request={notice.useNewVersion} />
        </div>
      )}
    </>
  );
}
