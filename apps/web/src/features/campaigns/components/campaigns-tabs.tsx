import { CAMPAIGNS_TABS } from "../../../copy/campaign-page-messages.js";
import styles from "./campaigns-tabs.module.css";

export const CAMPAIGNS_LIST_PATH = "/marketing/campaigns";
export const ADS_LIBRARY_PATH = "/marketing/campaigns/library";

export type CampaignsTab = "campaigns" | "library";

type CampaignsTabsProps = Readonly<{ current: CampaignsTab }>;

/**
 * PRD-009e (009E-AC-009) and 009c (009C-AC-010). The tab strip that heads both Campaigns tabs:
 * "Your campaigns" at `/marketing/campaigns` and "Ads library" at `/marketing/campaigns/library`.
 * Each tab is its own page, so the tabs are links in a labelled `nav`, and the current one carries
 * `aria-current="page"` (with weight and an underline, so the mark is never colour alone), as the
 * top menu does.
 */
export function CampaignsTabs({ current }: CampaignsTabsProps) {
  return (
    <nav aria-label={CAMPAIGNS_TABS.label} className={styles.tabs}>
      <a
        aria-current={current === "campaigns" ? "page" : undefined}
        className={styles.tab}
        href={CAMPAIGNS_LIST_PATH}
      >
        {CAMPAIGNS_TABS.campaigns}
      </a>
      <a
        aria-current={current === "library" ? "page" : undefined}
        className={styles.tab}
        href={ADS_LIBRARY_PATH}
      >
        {CAMPAIGNS_TABS.library}
      </a>
    </nav>
  );
}
