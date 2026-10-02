import { Badge, Icon, Link, type BadgeTone, type IconName } from "@oalo/ui";

import {
  HOME_CHECKLIST,
  HOME_CHECKLIST_HREFS,
  HOME_CHECKLIST_STATE_LABELS,
  HOME_PATHS,
  HOME_SETUP,
  homeChecklistActionName,
} from "../../../copy/home-messages.js";
import type {
  HomeChecklist,
  HomeChecklistItem,
  HomeChecklistState,
} from "../model/home-checklist.js";
import styles from "./overview.module.css";

/**
 * PRD-009b D2 and 009B-AC-004 to 009B-AC-008. The "Get set up" card, and the one place on Home that
 * says what is and is not connected.
 *
 * The states are read from saved records on the server and handed in. Each is a glyph plus words
 * (`Badge` carries a distinct glyph per tone), so none depends on colour. `data-checklist-state`
 * marks the label for the state-it-once test, which treats a state as a state and not as a sentence.
 *
 * Done (all three) collapses the card to one line with a link that opens it again through the
 * address, so nothing here needs a script or the browser's storage. Anything that needs attention
 * keeps the card open with that item marked.
 */

/**
 * The mockup draws a plug for both connections and a palette for the brand. `IconName` is a closed
 * set (`packages/ui/src/components/Icon.tsx`) with neither glyph, so each item takes the nearest one
 * the product already uses for the page it opens: Settings' navigation draws Connections as `globe`
 * and Brand kit as `sparkles` (`dashboard-preview/workspace-settings.tsx`). The first draft used
 * `bolt`, which is the old preview rail's logo mark and means "the product", not "connect", and
 * `building`, which Settings uses for the company profile. Adding `plug` and `palette` to the set
 * would match the mockup exactly and would change only this map.
 */
const ITEM_ICONS: Readonly<Record<HomeChecklistItem["id"], IconName>> = {
  highlevel: "globe",
  meta: "globe",
  brand: "sparkles",
};

const STATE_TONES: Readonly<Record<HomeChecklistState, BadgeTone>> = {
  connected: "success",
  done: "success",
  needs_attention: "warning",
  not_connected: "neutral",
  not_started: "neutral",
};

export function HomeSetupCard({
  checklist,
  reviewing,
}: Readonly<{ checklist: HomeChecklist; reviewing: boolean }>) {
  const needsAttention = checklist.items.some((item) => item.state === "needs_attention");
  const allDone = checklist.doneCount === checklist.total;

  if (allDone && !needsAttention && !reviewing) {
    return (
      <section
        aria-labelledby="home-setup-title"
        className={`${styles.card} ${styles.setup} ${styles.setupDone}`}
        data-home="setup"
      >
        <h2 className={styles.sectionTitle} id="home-setup-title">
          {HOME_SETUP.doneHeading}
        </h2>
        <Link href={HOME_PATHS.reviewSetup} variant="inline">
          {HOME_SETUP.reviewAction}
        </Link>
      </section>
    );
  }

  const percent = Math.round((checklist.doneCount / checklist.total) * 100);
  return (
    <section
      aria-labelledby="home-setup-title"
      className={`${styles.card} ${styles.setup}`}
      data-home="setup"
    >
      <div className={styles.cardHead}>
        <h2 className={styles.sectionTitle} id="home-setup-title">
          {HOME_SETUP.heading}
        </h2>
        <p className={styles.count}>{HOME_SETUP.count(checklist.doneCount, checklist.total)}</p>
      </div>
      <div
        aria-label={HOME_SETUP.progressLabel(checklist.doneCount, checklist.total)}
        className={styles.progress}
        role="img"
      >
        <span style={{ inlineSize: `${String(percent)}%` }} />
      </div>
      <p className={styles.secondary}>{HOME_SETUP.intro}</p>
      <ul className={styles.checklist}>
        {checklist.items.map((item) => (
          <ChecklistRow item={item} key={item.id} />
        ))}
      </ul>
    </section>
  );
}

function ChecklistRow({ item }: Readonly<{ item: HomeChecklistItem }>) {
  const copy = HOME_CHECKLIST[item.id];
  return (
    <li data-item={item.id} data-state={item.state}>
      <span aria-hidden="true" className={styles.itemIcon}>
        <Icon decorative name={ITEM_ICONS[item.id]} size="lg" />
      </span>
      <div>
        <h3 className={styles.itemTitle}>{copy.title}</h3>
        <p className={styles.secondary}>{copy.sentence}</p>
        <Badge
          className={`${styles.stateBadge} ${styles.stateChip}`}
          data-checklist-state={item.state}
          tone={STATE_TONES[item.state]}
        >
          {HOME_CHECKLIST_STATE_LABELS[item.state]}
        </Badge>
      </div>
      <Link
        aria-label={homeChecklistActionName(item.id, item.state)}
        className={styles.itemAction}
        href={HOME_CHECKLIST_HREFS[item.id]}
        variant="action"
      >
        {copy.actions[item.state]}
      </Link>
    </li>
  );
}
