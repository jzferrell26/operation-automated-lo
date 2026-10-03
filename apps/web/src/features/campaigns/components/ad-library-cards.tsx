import { ADS_LIBRARY_TOPICS, type AdsLibraryTopic } from "@oalo/contracts";
import { Badge, EmptyState } from "@oalo/ui";
import type { ReactNode } from "react";

import {
  ALL_TOPICS,
  EMPTY_LIBRARY,
  EMPTY_LIBRARY_TITLE,
  TOPIC_CHIPS_LABEL,
  TOPIC_LABELS,
  adCardVersionLine,
} from "../../../copy/launch-messages.js";
import { shortDay, type LaunchAdCard, type LaunchBand } from "../launch-model.js";
import { AdCreative } from "./ad-creative.js";
import styles from "./ad-library-cards.module.css";
import { TextWithDays } from "./text-with-days.js";

/**
 * PRD-009d D2 and PRD-009c D2 (009C-AC-010, 011). The three pieces the library shows ads with: the
 * topic chips with counts, the card grid, and one ad card. Step 1 of "Launch an ad" uses them now,
 * and 009c's "Ads library" tab reuses them in Wave 3. They take display fields only (009C-AC-013):
 * a card never sees an entry's compliance notes or approval block.
 */

/** Active ads only, newest approval first within a topic (009C-AC-011), then by name. */
export function orderedCards(cards: readonly LaunchAdCard[]): readonly LaunchAdCard[] {
  return [...cards].sort(
    (left, right) =>
      ADS_LIBRARY_TOPICS.indexOf(left.topic) - ADS_LIBRARY_TOPICS.indexOf(right.topic) ||
      right.approvedOn.localeCompare(left.approvedOn) ||
      left.name.localeCompare(right.name),
  );
}

export function topicCounts(
  cards: readonly LaunchAdCard[],
): readonly Readonly<{ topic: AdsLibraryTopic; count: number }>[] {
  return ADS_LIBRARY_TOPICS.map((topic) => ({
    topic,
    count: cards.filter((card) => card.topic === topic).length,
  })).filter((entry) => entry.count > 0);
}

export type TopicChipsProps = Readonly<{
  cards: readonly LaunchAdCard[];
  selected: AdsLibraryTopic | undefined;
  /** Renders one chip as a control: a link on a server page, a button inside step 1. */
  renderChip: (
    chip: Readonly<{
      topic: AdsLibraryTopic | undefined;
      label: string;
      count: number;
      selected: boolean;
    }>,
  ) => ReactNode;
}>;

/** "All 8", then one chip per topic that has an active ad, each with its count (D-17). */
export function TopicChips({ cards, selected, renderChip }: TopicChipsProps) {
  return (
    <ul aria-label={TOPIC_CHIPS_LABEL} className={styles.chips}>
      <li>
        {renderChip({
          topic: undefined,
          label: ALL_TOPICS,
          count: cards.length,
          selected: selected === undefined,
        })}
      </li>
      {topicCounts(cards).map(({ topic, count }) => (
        <li key={topic}>
          {renderChip({ topic, label: TOPIC_LABELS[topic], count, selected: selected === topic })}
        </li>
      ))}
    </ul>
  );
}

export function TopicChipContent({ label, count }: Readonly<{ label: string; count: number }>) {
  return (
    <>
      {label} <span className={styles.chipCount}>{count}</span>
    </>
  );
}

/**
 * The level of an ad's name. A heading may only go down one level at a time, so it is 3 under the
 * library tab's own "Ads library" section heading and 2 on step 1, where the page title is the only
 * heading above the cards (009G-AC-001: axe reports a jump from 1 to 3 as `heading-order`).
 */
export type AdCardTitleLevel = 2 | 3;

export type AdCardProps = Readonly<{
  card: LaunchAdCard;
  advertiser: LaunchBand;
  /** "Use this ad": a secondary control, so no single blue button competes with the ads (D2). */
  action: ReactNode;
  titleLevel?: AdCardTitleLevel;
}>;

/** One ad: the art with the viewer's own brand band applied, its topic, name, words, and version. */
export function AdCard({ card, advertiser, action, titleLevel = 3 }: AdCardProps) {
  const Title = titleLevel === 2 ? "h2" : "h3";
  return (
    <article aria-labelledby={`ad-card-${card.id}`} className={styles.card} data-ad-card={card.id}>
      <AdCreative
        advertiser={advertiser}
        alt={card.alt}
        art={card.art}
        sample={card.sample}
        shape="tall"
      />
      <div className={styles.cardBody}>
        <Badge className={styles.topic} icon="tag" tone="neutral">
          {TOPIC_LABELS[card.topic]}
        </Badge>
        <Title className={styles.cardTitle} id={`ad-card-${card.id}`}>
          {card.name}
        </Title>
        <p className={styles.cardWords}>{card.headline}</p>
        <p className={styles.cardVersion}>
          <TextWithDays
            days={[{ dateTime: card.approvedOn.slice(0, 10), text: shortDay(card.approvedOn) }]}
            text={adCardVersionLine(card.version, shortDay(card.approvedOn))}
          />
        </p>
        <div className={styles.cardAction}>{action}</div>
      </div>
    </article>
  );
}

export type AdCardGridProps = Readonly<{
  cards: readonly LaunchAdCard[];
  topic: AdsLibraryTopic | undefined;
  advertiser: LaunchBand;
  actionFor: (card: LaunchAdCard) => ReactNode;
  /** The level of each card's name; see `AdCardTitleLevel`. */
  titleLevel?: AdCardTitleLevel;
}>;

/**
 * Four cards a row at 1440, three at 1180, two at 768, and one at 390 (design section 5.2). With no
 * active ad it says so in one sentence and shows no grid (009C-AC-012).
 */
export function AdCardGrid({ cards, topic, advertiser, actionFor, titleLevel }: AdCardGridProps) {
  if (cards.length === 0) {
    // R1-06: the shared empty state, not a hand-built paragraph (rubric axis 9). The description is
    // 009C-AC-012's sentence, whole.
    return (
      <EmptyState data-empty-library="" description={EMPTY_LIBRARY} title={EMPTY_LIBRARY_TITLE} />
    );
  }
  const shown = orderedCards(cards).filter((card) => topic === undefined || card.topic === topic);
  return (
    <ul className={styles.grid} data-ad-card-grid="">
      {shown.map((card) => (
        <li key={`${card.id}-${String(card.version)}`}>
          <AdCard
            action={actionFor(card)}
            advertiser={advertiser}
            card={card}
            {...(titleLevel === undefined ? {} : { titleLevel })}
          />
        </li>
      ))}
    </ul>
  );
}
