import { US_STATES } from "@oalo/contracts";
import { Badge, Link, Surface } from "@oalo/ui";

import {
  EARLIER_FLOW,
  EARLIER_FLOW_EYEBROW,
  EARLIER_FLOW_LINE,
  FIXES_TITLE,
  LAUNCH_AN_AD_INSTEAD,
  OLDER_VERSION,
  SUPPORT_LABELS,
  libraryEyebrow,
  listPlaces,
  runLine,
  supportLibraryAd,
} from "../../../copy/campaign-page-messages.js";
import { CAMPAIGNS_CRUMB, CRUMBS_LABEL, TOPIC_LABELS } from "../../../copy/launch-messages.js";
import { SUPPORT_DETAILS_LABELS, campaignStateLabel } from "../../../copy/user-language.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import {
  standingTone,
  type CampaignPageData,
  type EarlierFlowCampaignPage,
  type LibraryAdCampaignPage,
} from "../campaign-page-model.js";
import { dollars, launchHref, readableDay, shortDay } from "../launch-model.js";
import { CampaignAdCard } from "./campaign-ad-card.js";
import { CampaignApprovalControls } from "./campaign-approval-controls.js";
import { CampaignApprovalSection } from "./campaign-approval-section.js";
import { CampaignHeaderActions } from "./campaign-header-actions.js";
import { CampaignLibraryNotices } from "./campaign-library-notices.js";
import { CampaignResultsCard } from "./campaign-results-card.js";
import { CampaignVersionsCard } from "./campaign-versions-card.js";
import { TextWithDays, type DayInText } from "./text-with-days.js";
import styles from "./campaign-page.module.css";

/**
 * PRD-009e, 009E-AC-001 to 009E-AC-008 and 009E-AC-012. The campaign page: one page for one version
 * of one campaign, saying honestly how it is doing (spend, leads sent to HighLevel, and cost per
 * lead, which are not live yet), showing the exact library ad and words that were approved, who
 * approved them, every version, and any library notice.
 *
 * It is handed data that was already read under the session's workspace and already decided about
 * (`CampaignPageData`), so it makes no decision of its own. It shows no address, open house time,
 * Realtor partner, contact list, lead table, pipeline, appointment, application, or funded figure,
 * and links to none of them (009E-AC-008): the data it is handed has no place to carry one.
 */
export function PersistedCampaignScreen({ page }: Readonly<{ page: CampaignPageData }>) {
  return page.kind === "library-ad" ? (
    <LibraryAdScreen page={page} />
  ) : (
    <EarlierFlowScreen page={page} />
  );
}

function Crumbs({ current }: Readonly<{ current: string }>) {
  return (
    <nav aria-label={CRUMBS_LABEL} className={styles.crumbs}>
      <Link href="/marketing/campaigns">{CAMPAIGNS_CRUMB}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

function StandingChip({ page }: Readonly<{ page: CampaignPageData }>) {
  const decision = page.decision?.decision;
  return (
    <p>
      <Badge data-campaign-standing={page.standing} tone={standingTone(page.standing, decision)}>
        {campaignStateLabel(page.standing, decision)}
      </Badge>
    </p>
  );
}

function Fixes({ fixes }: Readonly<{ fixes: readonly string[] }>) {
  if (fixes.length === 0) return null;
  return (
    <Surface aria-labelledby="campaign-fixes-title" data-fixes="" padding="md" role="region">
      <div className={styles.body}>
        <h2 className={styles.cardTitle} id="campaign-fixes-title">
          {FIXES_TITLE}
        </h2>
        <ul className={styles.fixes}>
          {fixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ul>
      </div>
    </Surface>
  );
}

function OlderVersionNotice({ page }: Readonly<{ page: CampaignPageData }>) {
  return (
    <Surface data-older-version="" padding="md">
      <div className={styles.older}>
        <p>{OLDER_VERSION.notice}</p>
        <div className={styles.noticeActions}>
          <Link href={page.detailHref} variant="action">
            {OLDER_VERSION.seeLatest}
          </Link>
        </div>
      </div>
    </Surface>
  );
}

/** "Austin, TX and Texas": the places in a sentence, a state by its full name. */
function placeWords(places: LibraryAdCampaignPage["places"]): string {
  return listPlaces([...places.cities, ...places.states.map((code) => US_STATES[code] ?? code)]);
}

function LibraryAdScreen({ page }: Readonly<{ page: LibraryAdCampaignPage }>) {
  const topic = page.topic === undefined ? undefined : TOPIC_LABELS[page.topic];
  const retired = page.notices.find((notice) => notice.kind === "retired");
  const startsOn = page.startsOn === undefined ? undefined : readableDay(page.startsOn);
  const endsOn = readableDay(page.endsOn);
  const runSentence = runLine({
    startsOn,
    endsOn,
    places: placeWords(page.places),
    daily: dollars(page.budget.dailyDollars),
    total: dollars(page.budget.totalDollars),
  });
  const runDays: DayInText[] = [
    ...(page.startsOn === undefined || startsOn === undefined
      ? []
      : [{ dateTime: page.startsOn, text: startsOn }]),
    { dateTime: page.endsOn, text: endsOn },
  ];
  return (
    <div className={styles.page} data-campaign-page="library-ad" data-version-no={page.versionNo}>
      <Crumbs current={page.name} />
      <header className={styles.head}>
        <div className={styles.headText}>
          <p className={styles.eyebrow}>{libraryEyebrow(topic)}</p>
          <h1 className={styles.title}>{page.name}</h1>
          <p className={styles.lead}>
            <TextWithDays days={runDays} text={runSentence} />
          </p>
          <StandingChip page={page} />
        </div>
        {page.isLatest ? (
          <CampaignHeaderActions
            launch={{
              metaConnected: false,
              retiredOn:
                retired?.kind === "retired" && retired.retiredOn !== null
                  ? shortDay(retired.retiredOn)
                  : null,
              approved: page.decision?.decision === "approved",
              launchingTurnedOn: false,
            }}
            makeNewVersionHref={page.canMakeNewVersion ? page.makeNewVersionHref : undefined}
            retiredOnDay={retired?.kind === "retired" ? retired.retiredOn : null}
          />
        ) : null}
      </header>

      {page.isLatest ? (
        <CampaignResultsCard results={page.results} />
      ) : (
        <OlderVersionNotice page={page} />
      )}

      <div className={styles.detailGrid}>
        <CampaignAdCard page={page} />
        <div className={styles.stack}>
          <CampaignApprovalSection decision={page.decision} />
          <Fixes fixes={page.fixes} />
          {page.approvalControls === undefined ? null : (
            <CampaignApprovalControls {...page.approvalControls} />
          )}
          <CampaignLibraryNotices notices={page.notices} />
          <CampaignVersionsCard shownVersionNo={page.versionNo} versions={page.versions} />
          <div className={styles.support}>
            <SupportDetails
              rows={[
                [SUPPORT_DETAILS_LABELS.versionId, page.campaignVersionRef],
                [SUPPORT_LABELS.libraryAd, supportLibraryAd(page.ad.id, page.ad.version)],
                [SUPPORT_DETAILS_LABELS.supportReference, page.campaignRef],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * D4. A campaign saved before PRD-009: read-only, with one honest line, its saved words, and its
 * recorded decisions. It has no "Make a new version" and no approve control, and the page offers
 * "Launch an ad" instead. Its property fields are never read, so none can be shown.
 */
function EarlierFlowScreen({ page }: Readonly<{ page: EarlierFlowCampaignPage }>) {
  return (
    <div className={styles.page} data-campaign-page="earlier-flow" data-version-no={page.versionNo}>
      <Crumbs current={page.headline} />
      <header className={styles.head}>
        <div className={styles.headText}>
          <p className={styles.eyebrow}>{EARLIER_FLOW_EYEBROW}</p>
          <h1 className={styles.title}>{page.headline}</h1>
          <p className={styles.lead}>{EARLIER_FLOW_LINE}</p>
          <StandingChip page={page} />
        </div>
        <div className={styles.headActions}>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} href={launchHref({ step: 1, from: "campaigns" })}>
              {LAUNCH_AN_AD_INSTEAD}
            </Link>
          </div>
        </div>
      </header>
      <div className={styles.detailGrid}>
        <Surface
          aria-labelledby="campaign-words-title"
          data-saved-words=""
          padding="lg"
          role="region"
        >
          <div className={styles.body}>
            <h2 className={styles.cardTitle} id="campaign-words-title">
              {EARLIER_FLOW.wordsTitle}
            </h2>
            <dl className={styles.facts}>
              <div>
                <dt>{EARLIER_FLOW.headline}</dt>
                <dd>{page.headline}</dd>
              </div>
              <div>
                <dt>{EARLIER_FLOW.adText}</dt>
                <dd>{page.body}</dd>
              </div>
              <div>
                <dt>{EARLIER_FLOW.disclosure}</dt>
                <dd>{page.disclosureText}</dd>
              </div>
            </dl>
          </div>
        </Surface>
        <div className={styles.stack}>
          <CampaignApprovalSection decision={page.decision} />
          <CampaignVersionsCard shownVersionNo={page.versionNo} versions={page.versions} />
          <div className={styles.support}>
            <SupportDetails
              rows={[
                [SUPPORT_DETAILS_LABELS.versionId, page.campaignVersionRef],
                [SUPPORT_DETAILS_LABELS.supportReference, page.campaignRef],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
