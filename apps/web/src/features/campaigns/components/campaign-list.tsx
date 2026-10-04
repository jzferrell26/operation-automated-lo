import { Badge, EmptyState, Icon, Link, Surface } from "@oalo/ui";

import {
  CAMPAIGNS_PAGE,
  CAMPAIGN_CARD_LABELS,
  CAMPAIGN_COLUMNS,
  EARLIER_FLOW_TOPIC,
  RUNS_NOT_SET,
  THUMBNAIL_ALT,
  TOPIC_NOT_IN_LIBRARY,
  WHERE_NOT_SET,
  cardFact,
  runsRange,
  wherePreview,
} from "../../../copy/campaign-page-messages.js";
import { SAMPLE_AD_LABEL, TOPIC_LABELS } from "../../../copy/launch-messages.js";
import { campaignStateLabel } from "../../../copy/user-language.js";
import { monthDay, standingTone, type CampaignListRow } from "../campaign-page-model.js";
import { LAUNCH_PATH } from "../launch-model.js";
import { CampaignsTabs } from "./campaigns-tabs.js";
import styles from "./campaign-list.module.css";
import { KeepWordsWhole } from "./keep-words-whole.js";
import { LaunchAnAdHeaderAction, LaunchAnAdLink } from "./launch-an-ad-link.js";
import pageStyles from "./campaign-page.module.css";
import { TextWithDays, type DayInText } from "./text-with-days.js";

/**
 * PRD-009e 009E-AC-009 to 009E-AC-012. The Campaigns list: the tab strip, one primary action
 * ("Launch an ad"), and every campaign with its true status. At 720px and wider it is a table with
 * Ad (a decorative thumbnail and the name as the link), Topic, Dates, Where it shows, Status, and
 * Last change; below 720px it is cards with the same facts. It has no results column, no search,
 * and no filters (D-17): results live on each campaign's own page.
 *
 * With no campaigns the one primary action moves into the empty state, so the page still has
 * exactly one.
 */

function topicWords(row: CampaignListRow): string {
  if (row.earlierFlow) return EARLIER_FLOW_TOPIC;
  return row.topic === undefined ? TOPIC_NOT_IN_LIBRARY : TOPIC_LABELS[row.topic];
}

/** When a campaign runs, as the words and the days in them, so each day is drawn as a date. */
function runsWords(
  row: CampaignListRow,
  year: number,
): Readonly<{ text: string; days: readonly DayInText[] }> {
  if (row.endsOn === undefined) return { text: RUNS_NOT_SET, days: [] };
  const days = [row.startsOn, row.endsOn].flatMap((day) =>
    day === undefined ? [] : [{ dateTime: day, text: monthDay(day, year) }],
  );
  return {
    text: runsRange(
      row.startsOn === undefined ? undefined : monthDay(row.startsOn, year),
      monthDay(row.endsOn, year),
    ),
    days,
  };
}

function whereWords(row: CampaignListRow): string {
  const [first, ...others] = row.places;
  return first === undefined ? WHERE_NOT_SET : wherePreview(first, others.length);
}

/**
 * The ad's tall art, decorative. A campaign with no art to show (one made with the earlier flow, or
 * one whose ad the library no longer holds) keeps the tile, so the names line up, and says so with a
 * quiet words-only glyph instead of an empty box that reads as a picture that failed to load.
 */
function Thumbnail({ row }: Readonly<{ row: CampaignListRow }>) {
  return (
    <span
      aria-hidden="true"
      className={styles.thumb}
      data-thumb={row.thumbnail === undefined ? "none" : "art"}
    >
      {row.thumbnail === undefined ? (
        <Icon decorative name="file-text" size="md" />
      ) : (
        <img alt={THUMBNAIL_ALT} height={60} src={row.thumbnail} width={48} />
      )}
    </span>
  );
}

function StatusChip({ row }: Readonly<{ row: CampaignListRow }>) {
  return (
    <Badge data-campaign-standing={row.standing} tone={standingTone(row.standing, row.decision)}>
      {campaignStateLabel(row.standing, row.decision)}
    </Badge>
  );
}

/** "Sample ad" beside the name of a sample ad, as it is wherever else a sample ad appears (009C-AC-005). */
function SampleLabel({ row }: Readonly<{ row: CampaignListRow }>) {
  return row.sample ? <Badge tone="neutral">{SAMPLE_AD_LABEL}</Badge> : null;
}

export function CampaignList({
  rows,
  now = new Date(),
  libraryEmpty = false,
}: Readonly<{
  rows: readonly CampaignListRow[];
  now?: Date;
  /**
   * True when the ads library holds no ad a person could choose. The empty list then says what the
   * library says (009C-AC-012) instead of inviting a choice that does not exist (writing review W-10).
   */
  libraryEmpty?: boolean;
}>) {
  const year = now.getUTCFullYear();
  return (
    <div className={styles.page} data-campaigns-page="">
      <header className={pageStyles.head}>
        <div className={pageStyles.headText}>
          <h1 className={styles.title}>{CAMPAIGNS_PAGE.title}</h1>
          <p className={styles.lead}>{CAMPAIGNS_PAGE.lead}</p>
        </div>
        {rows.length === 0 ? null : (
          <LaunchAnAdHeaderAction href={LAUNCH_PATH}>
            {CAMPAIGNS_PAGE.action}
          </LaunchAnAdHeaderAction>
        )}
      </header>
      <CampaignsTabs current="campaigns" />
      {rows.length === 0 ? (
        <EmptyState
          description={
            libraryEmpty ? CAMPAIGNS_PAGE.emptyDescriptionNoAds : CAMPAIGNS_PAGE.emptyDescription
          }
          primaryAction={
            <LaunchAnAdLink href={LAUNCH_PATH}>{CAMPAIGNS_PAGE.action}</LaunchAnAdLink>
          }
          surface="card"
          title={CAMPAIGNS_PAGE.emptyTitle}
        />
      ) : (
        <>
          <Surface
            aria-label={CAMPAIGNS_PAGE.tableLabel}
            className={styles.tableWrap}
            data-campaign-table=""
            padding="none"
            role="region"
          >
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{CAMPAIGN_COLUMNS.ad}</th>
                  <th scope="col">{CAMPAIGN_COLUMNS.topic}</th>
                  <th scope="col">{CAMPAIGN_COLUMNS.runs}</th>
                  <th scope="col">{CAMPAIGN_COLUMNS.where}</th>
                  <th scope="col">{CAMPAIGN_COLUMNS.status}</th>
                  <th scope="col">{CAMPAIGN_COLUMNS.lastChange}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr data-campaign-row={row.campaignRef} key={row.campaignRef}>
                    <td>
                      <span className={styles.adCell}>
                        <Thumbnail row={row} />
                        <span className={styles.adName}>
                          <Link href={row.href} variant="title">
                            <KeepWordsWhole text={row.name} />
                          </Link>
                          <SampleLabel row={row} />
                        </span>
                      </span>
                    </td>
                    <td className={styles.nowrap}>
                      <KeepWordsWhole text={topicWords(row)} />
                    </td>
                    <td className={styles.nowrap}>
                      <TextWithDays {...runsWords(row, year)} />
                    </td>
                    <td>
                      <KeepWordsWhole text={whereWords(row)} />
                    </td>
                    <td className={styles.chipCell}>
                      <StatusChip row={row} />
                    </td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>
                      <time dateTime={row.updatedAt}>{monthDay(row.updatedAt, year)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
          <ul
            className={styles.cards}
            aria-label={CAMPAIGNS_PAGE.tableLabel}
            data-campaign-cards=""
          >
            {rows.map((row) => (
              <li key={row.campaignRef}>
                <Surface className={styles.card} padding="none">
                  <div className={styles.cardHead}>
                    <Thumbnail row={row} />
                    <span className={styles.adName}>
                      <Link href={row.href} variant="title">
                        <KeepWordsWhole text={row.name} />
                      </Link>
                      <SampleLabel row={row} />
                    </span>
                  </div>
                  {/* A card has no column header, so each fact is named (writing review W-9). */}
                  <p className={styles.cardFacts}>
                    <KeepWordsWhole text={cardFact(CAMPAIGN_CARD_LABELS.topic, topicWords(row))} />{" "}
                    <TextWithDays
                      days={runsWords(row, year).days}
                      text={cardFact(CAMPAIGN_CARD_LABELS.dates, runsWords(row, year).text)}
                    />{" "}
                    <KeepWordsWhole text={cardFact(CAMPAIGN_CARD_LABELS.where, whereWords(row))} />
                  </p>
                  {/* P3-7. The chip and the last change are two lines, as the mockup's list card draws
                      them: a chip beside running words puts its baseline off theirs. The last change
                      is a caption, the quiet line at the foot of the card. */}
                  <p>
                    <StatusChip row={row} />
                  </p>
                  <p className={styles.cardCaption}>
                    {CAMPAIGN_CARD_LABELS.lastChange}:{" "}
                    <time dateTime={row.updatedAt}>{monthDay(row.updatedAt, year)}</time>
                  </p>
                </Surface>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
