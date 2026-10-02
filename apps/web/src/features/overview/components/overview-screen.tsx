import { HOME_FOOTER, homeGreeting } from "../../../copy/home-messages.js";
import type { HomeData } from "../model/home-view.js";
import { HomeNeedsApproval, HomeRunningNow } from "./home-campaign-lists.js";
import { HomeSetupCard } from "./home-setup-card.js";
import { HomeStartCard } from "./home-start-card.js";
import styles from "./overview.module.css";

type OverviewScreenProps = Readonly<{
  /** The person's first name for the greeting, or nothing when the account has none. */
  firstName: string | undefined;
  home: HomeData;
  /** True when the person opened the finished checklist again (`?review=setup`). */
  reviewSetup?: boolean;
}>;

/**
 * PRD-009b D1 and 009B-AC-001. Home: a greeting, the start card that leads to "Launch an ad", the
 * "Get set up" card, "Running now", "Needs your approval" (for people who can approve), and one
 * sentence that says HighLevel stays the CRM.
 *
 * Until 2026-10-01 this was the CRM overview: health strips, a wall of "Not connected" metrics, a
 * coming-later row that linked to removed pages, and a design-reference gallery. None of it is here.
 * Nothing on this page is a figure, so no number can be shown that has no live source (MTK-009), and
 * nothing is read from the browser (009B-AC-005).
 *
 * The cards sit in document order (start, setup, running, approval) and the stylesheet lays them out
 * in two columns at desktop widths and stacks them in that same order below 1100px, which is the
 * order D1 gives for 768 and 390.
 *
 * The two lists sit in two equal columns from 1100px and stack below it, as the rest of the page
 * does (009B-AC-003). A person who cannot approve gets no "Needs your approval" card (D3,
 * 009B-AC-010), so "Running now" is alone in the row at half width, as the mockup draws each card,
 * rather than an empty approval card saying "Nothing to approve" to someone who never approves.
 */
export function OverviewScreen({ firstName, home, reviewSetup = false }: OverviewScreenProps) {
  return (
    <div className={styles.home}>
      <p className={styles.welcome}>{homeGreeting(firstName)}</p>
      <div className={styles.grid}>
        <HomeStartCard topics={home.topics} />
        <HomeSetupCard
          checklist={home.checklist}
          libraryEmpty={home.topics.length === 0}
          reviewing={reviewSetup}
        />
        <div className={styles.lists}>
          <HomeRunningNow list={home.running} />
          {home.approval === undefined ? null : <HomeNeedsApproval list={home.approval} />}
        </div>
      </div>
      <p className={styles.footer}>{HOME_FOOTER}</p>
    </div>
  );
}
