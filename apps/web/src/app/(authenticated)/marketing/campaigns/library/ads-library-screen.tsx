import {
  ADS_LIBRARY_HEADING,
  ADS_LIBRARY_LEAD,
  ADS_LIBRARY_PAGE_TITLE,
} from "../../../../../copy/ads-library-messages.js";
import { AdCardGrid } from "../../../../../features/campaigns/components/ad-library-cards.js";
import { CampaignsTabs } from "../../../../../features/campaigns/components/campaigns-tabs.js";
import { AdsLibraryBrowser } from "./ads-library-browser.js";
import type { AdsLibraryPageData } from "./ads-library-page-data.js";
import styles from "./ads-library.module.css";

/**
 * PRD-009c part 2, 009C-AC-010 and 009C-AC-012. The "Ads library" tab: the Campaigns title and its
 * tab strip, then the library with its lead sentence, topic chips, and grid of ads
 * (`design/mockups/ads-library.html`).
 *
 * With no active ad, which is the real library as shipped, the tab says so in one sentence and shows
 * neither the chips nor the grid; the lead is left out too, because it describes ads there are none
 * of. This is a server component. The only client component on it is the browser of chips and
 * cards, and it receives display fields and nothing else (009C-AC-013).
 */
export function AdsLibraryScreen({ data }: Readonly<{ data: AdsLibraryPageData }>) {
  const empty = data.cards.length === 0;
  return (
    <div className={styles.page} data-ads-library="">
      <header className={styles.header}>
        <h1>{ADS_LIBRARY_PAGE_TITLE}</h1>
      </header>
      <CampaignsTabs current="library" />
      <section aria-labelledby="ads-library-heading" className={styles.section}>
        <div className={styles.heading}>
          <h2 id="ads-library-heading">{ADS_LIBRARY_HEADING}</h2>
          {empty ? null : <p className={styles.lead}>{ADS_LIBRARY_LEAD}</p>}
        </div>
        {empty ? (
          <AdCardGrid
            actionFor={() => null}
            advertiser={data.advertiser}
            cards={data.cards}
            topic={undefined}
          />
        ) : (
          <AdsLibraryBrowser
            advertiser={data.advertiser}
            cards={data.cards}
            initialTopic={data.topic}
          />
        )}
      </section>
    </div>
  );
}
