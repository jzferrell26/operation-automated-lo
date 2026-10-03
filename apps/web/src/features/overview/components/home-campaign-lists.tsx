import { Badge, Icon, Link, type IconName } from "@oalo/ui";

import {
  HOME_APPROVAL,
  HOME_PATHS,
  HOME_RUNNING,
  HOME_SAMPLE_AD_LABEL,
  HOME_SEE_ALL_CAMPAIGNS,
  homeRunDates,
  homeRunDays,
} from "../../../copy/home-messages.js";
import { TextWithDays } from "../../campaigns/components/text-with-days.js";
import type { HomeCampaignRow, HomeList } from "../model/home-campaigns.js";
import styles from "./overview.module.css";

/**
 * PRD-009b 009B-AC-009 and 009B-AC-010. "Running now" and "Needs your approval".
 *
 * Both are the same shape: up to three rows, each the ad's name as its one link, its dates where it
 * has them, and its status in words; "See all campaigns" when more exist; and an honest empty state
 * (an icon, what there is not, and why) when there are none. "Running now" ends in a link, not a
 * button, so the page keeps its one primary button. A campaign built on a sample ad says so in both
 * lists (009C-AC-005).
 */

type ListCardProps = Readonly<{
  titleId: string;
  heading: string;
  list: HomeList;
  icon: IconName;
  emptyTitle: string;
  emptyBody: string;
  emptyAction?: Readonly<{ label: string; href: string }>;
}>;

function ListCard({
  titleId,
  heading,
  list,
  icon,
  emptyTitle,
  emptyBody,
  emptyAction,
}: ListCardProps) {
  return (
    <section aria-labelledby={titleId} className={styles.card}>
      <h2 className={styles.sectionTitle} id={titleId}>
        {heading}
      </h2>
      {list.rows.length === 0 ? (
        <div className={styles.empty}>
          <Icon decorative name={icon} size="lg" tone="neutral" />
          <p className={styles.emptyTitle}>{emptyTitle}</p>
          <p className={styles.emptyBody}>{emptyBody}</p>
          {emptyAction === undefined ? null : (
            <Link href={emptyAction.href} variant="inline">
              {emptyAction.label}
            </Link>
          )}
        </div>
      ) : (
        <ul className={styles.rows}>
          {list.rows.map((row) => (
            <CampaignRow key={row.campaignRef} row={row} />
          ))}
        </ul>
      )}
      {list.total > list.rows.length ? (
        <Link href={HOME_PATHS.campaigns} variant="inline">
          {HOME_SEE_ALL_CAMPAIGNS}
        </Link>
      ) : null}
    </section>
  );
}

function CampaignRow({ row }: Readonly<{ row: HomeCampaignRow }>) {
  const dates = homeRunDates(row.startsAt, row.endsAt);
  return (
    <li>
      <h3 className={styles.rowTitle}>
        <Link href={row.href} variant="inline">
          {row.name}
        </Link>
      </h3>
      {dates === "" ? null : (
        <p className={styles.secondary}>
          <TextWithDays days={homeRunDays(row.startsAt, row.endsAt)} text={dates} />
        </p>
      )}
      <p className={styles.badges}>
        <Badge className={styles.stateChip} tone="info">
          {row.statusLabel}
        </Badge>
        {row.sample ? (
          <Badge className={styles.stateChip} tone="neutral">
            {HOME_SAMPLE_AD_LABEL}
          </Badge>
        ) : null}
      </p>
    </li>
  );
}

export function HomeRunningNow({ list }: Readonly<{ list: HomeList }>) {
  return (
    <ListCard
      emptyAction={{ label: HOME_RUNNING.emptyAction, href: HOME_PATHS.launch }}
      emptyBody={HOME_RUNNING.emptyBody}
      emptyTitle={HOME_RUNNING.emptyTitle}
      heading={HOME_RUNNING.heading}
      icon="megaphone"
      list={list}
      titleId="home-running-title"
    />
  );
}

export function HomeNeedsApproval({ list }: Readonly<{ list: HomeList }>) {
  return (
    <ListCard
      emptyBody={HOME_APPROVAL.emptyBody}
      emptyTitle={HOME_APPROVAL.emptyTitle}
      heading={HOME_APPROVAL.heading}
      icon="circle-check"
      list={list}
      titleId="home-approval-title"
    />
  );
}
