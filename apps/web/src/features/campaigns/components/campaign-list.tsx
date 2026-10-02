import { Badge, EmptyState, Link, Surface } from "@oalo/ui";

import {
  CAMPAIGNS_PAGE,
  CAMPAIGN_COLUMNS,
  EARLIER_FLOW_TOPIC,
  RUNS_NOT_SET,
  THUMBNAIL_ALT,
  TOPIC_NOT_IN_LIBRARY,
  WHERE_NOT_SET,
  runsRange,
  wherePreview,
} from "../../../copy/campaign-page-messages.js";
import { SAMPLE_AD_LABEL, TOPIC_LABELS } from "../../../copy/launch-messages.js";
import { campaignStateLabel } from "../../../copy/user-language.js";
import { monthDay, standingTone, type CampaignListRow } from "../campaign-page-model.js";
import { LAUNCH_PATH } from "../launch-model.js";
import { CampaignsTabs } from "./campaigns-tabs.js";
import styles from "./campaign-list.module.css";

/**
 * PRD-009e 009E-AC-009 to 009E-AC-012. The Campaigns list: the tab strip, one primary action
 * ("Launch an ad"), and every campaign with its true status. At 720px and wider it is a table with
 * Ad (a decorative thumbnail and the name as the link), Topic, Runs, Where it shows, Status, and
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

function runsWords(row: CampaignListRow, year: number): string {
  if (row.endsOn === undefined) return RUNS_NOT_SET;
  return runsRange(
    row.startsOn === undefined ? undefined : monthDay(row.startsOn, year),
    monthDay(row.endsOn, year),
  );
}

function whereWords(row: CampaignListRow): string {
  const [first, ...others] = row.places;
  return first === undefined ? WHERE_NOT_SET : wherePreview(first, others.length);
}

function Thumbnail({ row }: Readonly<{ row: CampaignListRow }>) {
  return (
    <span aria-hidden="true" className={styles.thumb}>
      {row.thumbnail === undefined ? null : (
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

function LaunchLink() {
  return (
    <Link className={styles.primaryLink} href={LAUNCH_PATH}>
      {CAMPAIGNS_PAGE.action}
    </Link>
  );
}

export function CampaignList({
  rows,
  now = new Date(),
}: Readonly<{ rows: readonly CampaignListRow[]; now?: Date }>) {
  const year = now.getUTCFullYear();
  return (
    <div className={styles.page} data-campaigns-page="">
      <header className={styles.head}>
        <div className={styles.headText}>
          <h1 className={styles.title}>{CAMPAIGNS_PAGE.title}</h1>
          <p className={styles.lead}>{CAMPAIGNS_PAGE.lead}</p>
        </div>
        {rows.length === 0 ? null : <LaunchLink />}
      </header>
      <CampaignsTabs current="campaigns" />
      {rows.length === 0 ? (
        <EmptyState
          description={CAMPAIGNS_PAGE.emptyDescription}
          primaryAction={<LaunchLink />}
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
                          <Link className={styles.rowLink} href={row.href}>
                            {row.name}
                          </Link>
                          <SampleLabel row={row} />
                        </span>
                      </span>
                    </td>
                    <td>{topicWords(row)}</td>
                    <td className={styles.nowrap}>{runsWords(row, year)}</td>
                    <td>{whereWords(row)}</td>
                    <td className={styles.nowrap}>
                      <StatusChip row={row} />
                    </td>
                    <td className={`${styles.muted} ${styles.nowrap}`}>
                      {monthDay(row.updatedAt, year)}
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
                <Surface className={styles.card} padding="md">
                  <div className={styles.cardHead}>
                    <Thumbnail row={row} />
                    <Link className={styles.rowLink} href={row.href}>
                      {row.name}
                    </Link>
                    <SampleLabel row={row} />
                  </div>
                  <p className={styles.cardFacts}>
                    {topicWords(row)}. {runsWords(row, year)}. {whereWords(row)}.
                  </p>
                  <p>
                    <StatusChip row={row} />{" "}
                    <span className={styles.cardFacts}>{monthDay(row.updatedAt, year)}</span>
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
