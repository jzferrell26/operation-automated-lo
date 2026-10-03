"use client";

import type { LibraryAdRefusalReason } from "@oalo/application";
import type { AdsLibraryCallToAction, AdsLibraryTopic } from "@oalo/contracts";
import { adPlaceLabel } from "@oalo/contracts";
import { Badge, Card, Icon, Link } from "@oalo/ui";
import { useState, type ReactNode } from "react";

import {
  AD_ART_CHANGED_CHIP,
  AD_ART_CHANGED_NOTICE,
  AD_MISSING_CHIP,
  AD_REPLACED_CHIP,
  AD_REPLACED_NOTICE,
  AD_RETIRED_CHIP,
  AD_TEXT_CHANGED,
  AD_TEXT_UNCHANGED,
  APPROVED_CHIP,
  CHANGE,
  CHOOSE_ANOTHER_AD,
  FACEBOOK_FEED,
  FACT_LABELS,
  FACTS_TITLE,
  FIX_IT,
  FRAME_CAPTION,
  HEADLINE_CHANGED,
  HEADLINE_UNCHANGED,
  LEADS_NOT_CONNECTED,
  LAUNCH_STEP_TITLES,
  MAKE_A_NEW_VERSION,
  REVIEW_LEAD,
  RULE_NEEDS_CHANGES,
  RULE_PASSED,
  SEE_WHAT_WE_CHECKED,
  SHAPE_LABEL,
  SHAPE_SQUARE,
  SHAPE_TALL,
  SHAPES_NOTE,
  WHAT_TO_FIX,
  WHAT_YOU_APPROVE,
  YOUR_AD,
  adFact,
  adRetiredNotice,
  approvedLine,
  budgetFact,
  checksCount,
  runsFact,
} from "../../../copy/launch-messages.js";
import { NOTICES } from "../../../copy/campaign-page-messages.js";
import {
  CAMPAIGN_SENT_BACK_LABEL,
  CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION,
  CHECK_RESULT_NEEDS_CHANGES,
  CHECK_RESULT_PASSED,
  CHECK_RESULT_READY,
  SUPPORT_DETAILS_LABELS,
} from "../../../copy/user-language.js";
import { UseNewVersion } from "../../ads-library/components/use-new-version.js";
import type { NewerVersionOffer } from "../../ads-library/newer-version.js";
import { SupportDetails } from "../../shell/components/support-details.js";
import {
  AD_REFUSAL_STATES,
  dollars,
  fixTargetFor,
  launchHref,
  readableDay,
  shortDay,
  type LaunchAdRefusalState,
  type LaunchBand,
  type LaunchFrom,
} from "../launch-model.js";
import { AdFeedPreview } from "./ad-feed-preview.js";
import type { AdShape } from "./ad-creative.js";
import { CampaignApprovalControls } from "./campaign-approval-controls.js";
import { CampaignHandOff } from "./campaign-hand-off.js";
import { LaunchHeader } from "./launch-flow.js";
import { LaunchOnFacebook } from "./launch-on-facebook.js";
import { TextWithDays } from "./text-with-days.js";
import campaignPage from "./campaign-page.module.css";
import styles from "./launch.module.css";

/**
 * PRD-009d D7, D8 and 009D-AC-013 to 019. Step 3, Review and launch.
 *
 * Everything here is read from the saved version, its stored check result, and its recorded
 * decision; nothing on this page is typed by hand. The state D8 draws comes from the recorded
 * decision first, as PRD-008b requires of every surface (008B-AC-004, 008B-AC-009 to 011), then from
 * the catalog (an ad the approval command would refuse), then from the checks, then from whether
 * the viewer may approve.
 *
 * "The catalog says no" is not decided here. The server asks `libraryAdRefusalFor`, the one rule the
 * approval command itself uses, and hands step 3 its answer as `adRefusal` (QA-06), so this step
 * never offers Approve for a version the command would refuse: a retired ad, a replaced ad, an ad
 * missing from the catalog, or an ad whose pictures changed (009C-AC-008).
 */

export interface LaunchReviewFinding {
  readonly ruleCode: string;
  readonly affected: string;
  readonly remediation: string;
}

export interface LaunchReviewData {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
  readonly manifestHash: string;
  readonly preflightResultHash: string;
  readonly rowVersion: number;
  readonly state: string;
  readonly detailHref: string;
  readonly canApprove: boolean;
  readonly decision?:
    | Readonly<{ decision: "approved" | "rejected"; approver: string; decidedAt: string }>
    | undefined;
  readonly ad: Readonly<{
    id: string;
    version: number;
    name: string;
    topic: AdsLibraryTopic | undefined;
    alt: string;
    art: Readonly<{ tall: string; square: string }>;
    sample: boolean;
    callToAction: AdsLibraryCallToAction;
    defaults: Readonly<{ headline: string; primaryText: string }> | undefined;
  }>;
  /** The day the library took the ad out, when the ad was retired and the library says when. */
  readonly retiredOn: string | null;
  /**
   * Why the approval command would refuse this version's library ad, or `undefined` when it would
   * not (`libraryAdRefusalFor`). It is required, never optional, so no caller can leave it out.
   */
  readonly adRefusal: LibraryAdRefusalReason | undefined;
  /** The offer to move to the ad's newer version, set only for a replaced ad that has one. */
  readonly newerVersion: NewerVersionOffer | undefined;
  /** Whether the viewer may save a campaign version, which "Use the new version" does. */
  readonly canMakeNewVersion: boolean;
  readonly words: Readonly<{ headline: string; primaryText: string }>;
  readonly advertiser: LaunchBand;
  readonly budget: Readonly<{ dailyDollars: number; totalDollars: number }>;
  readonly endsOn: string;
  readonly places: Readonly<{ states: readonly string[]; cities: readonly string[] }>;
  readonly checks: Readonly<{
    run: number;
    passed: number;
    blocking: boolean;
    rules: readonly Readonly<{ code: string; name: string; passed: boolean }>[];
    findings: readonly LaunchReviewFinding[];
  }>;
}

export type LaunchReviewState =
  "ready" | "cannot-approve" | "needs-changes" | "approved" | "sent-back" | LaunchAdRefusalState;

/**
 * D8: which state step 3 draws. The recorded decision comes first, then what the catalog says about
 * the ad (any reason the approval command would refuse it, which beats the checks because a version
 * whose ad is gone, replaced, or changed cannot be approved however its checks came out), then the
 * checks.
 */
export function launchReviewState(
  review: Pick<LaunchReviewData, "decision" | "adRefusal" | "checks" | "canApprove">,
): LaunchReviewState {
  if (review.decision?.decision === "approved") return "approved";
  if (review.decision?.decision === "rejected") return "sent-back";
  if (review.adRefusal !== undefined) return AD_REFUSAL_STATES[review.adRefusal];
  if (review.checks.blocking) return "needs-changes";
  return review.canApprove ? "ready" : "cannot-approve";
}

/**
 * W-26. A check that found something comes first, so a person scanning "See what we checked" for the
 * problem meets it at the top; each group keeps the order the ruleset runs its checks in.
 */
function failedFirst(
  rules: LaunchReviewData["checks"]["rules"],
): LaunchReviewData["checks"]["rules"] {
  return [...rules.filter((rule) => !rule.passed), ...rules.filter((rule) => rule.passed)];
}

function placeLabels(places: LaunchReviewData["places"]): readonly string[] {
  return [
    ...places.cities.map((value) => adPlaceLabel({ kind: "city", value })),
    ...places.states.map((value) => adPlaceLabel({ kind: "state", value })),
  ];
}

export function LaunchReview({
  review,
  from,
}: Readonly<{ review: LaunchReviewData; from?: LaunchFrom | undefined }>) {
  const [shape, setShape] = useState<AdShape>("tall");
  const state = launchReviewState(review);
  const changeHref = launchHref({ step: 2, campaign: review.campaignRef, from });
  const defaults = review.ad.defaults;
  return (
    <div className={styles.page} data-launch-step="3" data-review-state={state}>
      <LaunchHeader lead={REVIEW_LEAD} step={3} title={LAUNCH_STEP_TITLES.review} />
      <div className={styles.review}>
        <Card className={styles.adCard} padding="lg">
          <div className={styles.sectionHeading}>
            <h2>{YOUR_AD}</h2>
            <fieldset className={styles.shapeSwitch}>
              <legend className="oalo-visually-hidden">{SHAPE_LABEL}</legend>
              {(
                [
                  ["tall", SHAPE_TALL],
                  ["square", SHAPE_SQUARE],
                ] as const
              ).map(([value, label]) => (
                <label className={styles.shapeOption} key={value}>
                  <input
                    type="radio"
                    checked={shape === value}
                    name="ad-shape"
                    onChange={() => setShape(value)}
                    value={value}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
          <div className={styles.feedFrame}>
            <AdFeedPreview
              advertiser={review.advertiser}
              alt={review.ad.alt}
              art={review.ad.art}
              callToAction={review.ad.callToAction}
              headline={review.words.headline}
              primaryText={review.words.primaryText}
              sample={review.ad.sample}
              shape={shape}
            />
          </div>
          <p className={styles.caption}>{FRAME_CAPTION}</p>
          <p className={styles.caption}>{SHAPES_NOTE}</p>
        </Card>
        <div className={styles.reviewSide}>
          <Card className={styles.approveCard} padding="lg">
            <div className={styles.sectionHeading}>
              <h2 className={styles.cardTitle}>{WHAT_YOU_APPROVE}</h2>
              <Badge tone={review.checks.blocking ? "critical" : "success"}>
                {review.checks.blocking ? CHECK_RESULT_NEEDS_CHANGES : CHECK_RESULT_PASSED}
              </Badge>
            </div>
            <p className={styles.note} data-checks-count="">
              {checksCount(review.checks.passed, review.checks.run)}
            </p>
            <details className={styles.checked}>
              <summary>{SEE_WHAT_WE_CHECKED}</summary>
              <ul className={styles.ruleList}>
                {failedFirst(review.checks.rules).map((rule) => (
                  <li data-rule-passed={rule.passed} key={rule.code}>
                    {rule.passed ? (
                      <>
                        <Icon decorative name="check" size="sm" tone="success" />
                        <span className="oalo-visually-hidden">{RULE_PASSED}: </span>
                      </>
                    ) : (
                      <strong className={styles.ruleNeedsChanges}>{RULE_NEEDS_CHANGES}:</strong>
                    )}{" "}
                    {rule.name}
                  </li>
                ))}
              </ul>
            </details>
            <div className={styles.sectionHeading}>
              <h3 className={styles.factsTitle}>{FACTS_TITLE}</h3>
              <Link className={styles.textLink} href={changeHref}>
                {CHANGE}
              </Link>
            </div>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.ad}</dt>
                <dd>{adFact(review.ad.name, review.ad.version)}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.words}</dt>
                <dd>
                  {defaults === undefined || defaults.headline !== review.words.headline
                    ? HEADLINE_CHANGED
                    : HEADLINE_UNCHANGED}
                  {". "}
                  {defaults === undefined || defaults.primaryText !== review.words.primaryText
                    ? AD_TEXT_CHANGED
                    : AD_TEXT_UNCHANGED}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.budget}</dt>
                <dd>
                  {budgetFact(
                    dollars(review.budget.dailyDollars),
                    dollars(review.budget.totalDollars),
                  )}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.runs}</dt>
                <dd>
                  <TextWithDays
                    days={[
                      { dateTime: review.endsOn.slice(0, 10), text: readableDay(review.endsOn) },
                    ]}
                    text={runsFact(readableDay(review.endsOn))}
                  />
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.shows}</dt>
                <dd>
                  <ul className={styles.factList}>
                    {placeLabels(review.places).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                    <li>{FACEBOOK_FEED}</li>
                  </ul>
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{FACT_LABELS.leads}</dt>
                <dd>{LEADS_NOT_CONNECTED}</dd>
              </div>
            </dl>
          </Card>
          <LaunchDecision changeHref={changeHref} from={from} review={review} state={state} />
          <LaunchOnFacebook
            retiredDateTime={review.retiredOn ?? undefined}
            state={{
              metaConnected: false,
              retiredOn: review.retiredOn === null ? null : shortDay(review.retiredOn),
              approved: state === "approved",
              launchingTurnedOn: false,
            }}
          />
          {/* R1-16. "Details for support" is a quiet card in the column, as the mockup draws it, and the
              campaign page draws it with the same rules. */}
          <div className={campaignPage.support}>
            <SupportDetails
              rows={[
                [SUPPORT_DETAILS_LABELS.versionId, review.campaignVersionRef],
                [SUPPORT_DETAILS_LABELS.contentFingerprint, review.manifestHash],
                [SUPPORT_DETAILS_LABELS.checkFingerprint, review.preflightResultHash],
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * What the card for an ad the approval command refuses says and offers: a chip, the sentence the
 * command's own refusal says, and the one action that fixes it. A retired or missing ad has nowhere
 * to go but another ad; an ad whose pictures changed is fixed by saving a new version, which records
 * the pictures the library holds now. An undated retirement (the library did not say when) says the
 * campaign page's sentence for an ad that is no longer there.
 */
function refusedCard(
  state: LaunchAdRefusalState,
  review: Pick<LaunchReviewData, "retiredOn">,
  hrefs: Readonly<{ chooseAnotherAd: string; makeANewVersion: string }>,
): Readonly<{ chip: string; sentence: ReactNode; href: string; action: string }> {
  switch (state) {
    case "retired":
      return {
        chip: AD_RETIRED_CHIP,
        sentence:
          review.retiredOn === null ? (
            NOTICES.missingUndecided
          ) : (
            <TextWithDays
              days={[{ dateTime: review.retiredOn.slice(0, 10), text: shortDay(review.retiredOn) }]}
              text={adRetiredNotice(shortDay(review.retiredOn))}
            />
          ),
        href: hrefs.chooseAnotherAd,
        action: CHOOSE_ANOTHER_AD,
      };
    case "replaced":
      return {
        chip: AD_REPLACED_CHIP,
        sentence: AD_REPLACED_NOTICE,
        href: hrefs.chooseAnotherAd,
        action: CHOOSE_ANOTHER_AD,
      };
    case "art-changed":
      return {
        chip: AD_ART_CHANGED_CHIP,
        sentence: AD_ART_CHANGED_NOTICE,
        href: hrefs.makeANewVersion,
        action: MAKE_A_NEW_VERSION,
      };
    case "missing":
      return {
        chip: AD_MISSING_CHIP,
        sentence: NOTICES.missingUndecided,
        href: hrefs.chooseAnotherAd,
        action: CHOOSE_ANOTHER_AD,
      };
  }
}

/** D8: the decision card for each state step 3 can be in. */
function LaunchDecision({
  review,
  state,
  changeHref,
  from,
}: Readonly<{
  review: LaunchReviewData;
  state: LaunchReviewState;
  changeHref: string;
  from: LaunchFrom | undefined;
}>) {
  if (state === "approved" && review.decision !== undefined) {
    return (
      <Card className={styles.decisionCard} data-decision-card="approved" padding="lg">
        <Badge className={styles.decisionChip} tone="success">
          {APPROVED_CHIP}
        </Badge>
        <p>
          <TextWithDays
            days={[
              {
                dateTime: review.decision.decidedAt,
                text: shortDay(review.decision.decidedAt),
              },
            ]}
            text={approvedLine(review.decision.approver, shortDay(review.decision.decidedAt))}
          />
        </p>
      </Card>
    );
  }
  if (state === "sent-back") {
    return (
      <Card className={styles.decisionCard} data-decision-card="sent-back" padding="lg">
        <Badge className={styles.decisionChip} tone="warning">
          {CAMPAIGN_SENT_BACK_LABEL}
        </Badge>
        <p>{CAMPAIGN_SENT_BACK_NEEDS_NEW_VERSION}</p>
        <Link className={styles.primaryLink} href={changeHref} variant="action">
          {MAKE_A_NEW_VERSION}
        </Link>
      </Card>
    );
  }
  const refused = review.adRefusal === undefined ? undefined : AD_REFUSAL_STATES[review.adRefusal];
  if (refused !== undefined && state === refused) {
    if (refused === "replaced" && review.newerVersion !== undefined) {
      // 009c D4: a replaced version gets the newer-version notice instead of an approval, with the
      // ads library's own "Use the new version" for somebody who can save a version.
      return (
        <Card className={styles.decisionCard} data-decision-card={refused} padding="lg">
          <Badge className={styles.decisionChip} tone="neutral">
            {AD_REPLACED_CHIP}
          </Badge>
          <UseNewVersion canUse={review.canMakeNewVersion} offer={review.newerVersion} />
        </Card>
      );
    }
    const card = refusedCard(refused, review, {
      chooseAnotherAd: launchHref({ step: 1, campaign: review.campaignRef, from }),
      makeANewVersion: changeHref,
    });
    return (
      <Card className={styles.decisionCard} data-decision-card={refused} padding="lg">
        <Badge className={styles.decisionChip} tone="neutral">
          {card.chip}
        </Badge>
        <p>{card.sentence}</p>
        <Link className={styles.primaryLink} href={card.href} variant="action">
          {card.action}
        </Link>
      </Card>
    );
  }
  if (state === "cannot-approve") {
    // D8, "Ready for approval, viewer can't approve": the reason and the hand-off, and nothing this
    // viewer could press that would not work.
    return (
      <Card className={styles.decisionCard} data-decision-card="cannot-approve" padding="lg">
        <Badge className={styles.decisionChip} tone="info">
          {CHECK_RESULT_READY}
        </Badge>
        <CampaignHandOff campaignHref={review.detailHref} />
      </Card>
    );
  }
  const firstBlocking = review.checks.findings[0];
  const target = firstBlocking === undefined ? undefined : fixTargetFor(firstBlocking);
  return (
    <div className={styles.decision} data-decision-card={state}>
      {state === "needs-changes" && firstBlocking !== undefined && target !== undefined ? (
        <Card className={styles.decisionCard} padding="lg">
          <Badge className={styles.decisionChip} tone="critical">
            {CHECK_RESULT_NEEDS_CHANGES}
          </Badge>
          <ul className={styles.fixes}>
            {review.checks.findings.map((finding) => (
              <li key={`${finding.ruleCode}:${finding.affected}`}>
                <strong>{WHAT_TO_FIX}</strong> {finding.remediation}
              </li>
            ))}
          </ul>
          <Link
            className={styles.primaryLink}
            href={
              target.step === 1
                ? launchHref({ step: 1, campaign: review.campaignRef, from })
                : launchHref({ step: 2, campaign: review.campaignRef, from }, target.at)
            }
            variant="action"
          >
            {FIX_IT}
          </Link>
        </Card>
      ) : null}
      <CampaignApprovalControls
        alreadyDecided={review.decision?.decision}
        blocking={review.checks.blocking}
        campaignHref={review.detailHref}
        campaignRef={review.campaignRef}
        campaignVersionRef={review.campaignVersionRef}
        canApprove={review.canApprove}
        manifestHash={review.manifestHash}
        preflightResultHash={review.preflightResultHash}
        rowVersion={review.rowVersion}
        state={review.state}
      />
    </div>
  );
}
