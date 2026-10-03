"use client";

import type { AdsLibraryTopic } from "@oalo/contracts";
import { Button, Card, Icon, Link, LiveRegion, Stepper, TextArea, TextField } from "@oalo/ui";
import { useRouter } from "next/navigation.js";
import { useEffect, useRef, useState } from "react";

import { useThisAdSuffix } from "../../../copy/ads-library-messages.js";
import {
  AD_NOT_IN_LIBRARY_NOTICE,
  AD_TEXT_LABEL,
  BACK,
  BAND_PLACEHOLDER,
  ADD_IN_BRAND,
  BRAND_CARD_LINE,
  BRAND_CARD_LINE_EMPTY,
  BRAND_CARD_TITLE,
  BUDGET_TITLE,
  CAMPAIGNS_CRUMB,
  CANCEL,
  CHANGE_IN_BRAND,
  CHOOSE_LEAD,
  DAILY_BUDGET_FIX,
  DAILY_BUDGET_LABEL,
  DISCLOSURE_LOCKED_LABEL,
  END_DATE_FIX,
  ENDS_LABEL,
  HEADLINE_LABEL,
  CRUMBS_LABEL,
  LAUNCH_AN_AD,
  LAUNCH_STEPPER_LABEL,
  LAUNCH_STEP_TITLES,
  PLACE_REQUIRED,
  PREVIEW_NOTE,
  PREVIEW_TITLE,
  SAVE_AND_CHECK,
  SAVE_FAILED,
  SAVE_NOTE,
  SAVING_AND_CHECKING,
  STARTS_LABEL,
  STARTS_VALUE,
  TOPIC_LABELS,
  TOTAL_BUDGET_FIX,
  TOTAL_BUDGET_LABEL,
  USE_LIBRARY_WORDS,
  USE_THIS_AD,
  WHERE_TITLE,
  WORDS_HINT,
  WORDS_TITLE,
  characterCount,
  runLengthNote,
  setUpLead,
} from "../../../copy/launch-messages.js";
import {
  postInternalJson,
  refusalFrom,
  UNREACHED_REFUSAL,
  type InternalRefusal,
} from "../../http/internal-api.js";
import { userMessageSentence } from "../../http/user-messages.js";
import { SupportReference } from "../../shell/components/support-details.js";
import {
  budgetProblems,
  cancelHref,
  daysBetween,
  defaultPrefill,
  launchHref,
  parseLaunchAddress,
  reviewHref,
  type LaunchAdCard,
  type LaunchAddress,
  type LaunchBand,
  type LaunchPrefill,
} from "../launch-model.js";
import { brandInitials } from "../../workspace/ad-brand.js";
import { adColorVariables } from "./ad-creative.js";
import { AdCardGrid, TopicChipContent, TopicChips } from "./ad-library-cards.js";
import chips from "./ad-library-cards.module.css";
import { AdFeedPreview } from "./ad-feed-preview.js";
import { AdPlacesField } from "./ad-places-field.js";
import styles from "./launch.module.css";

/**
 * PRD-009d D1, D2, D4, D6 and 009D-AC-001, 002, 005 to 009. Steps 1 and 2 of "Launch an ad".
 *
 * The step lives in the address (`?step=1` or `2`, with `?ad=` once an ad is chosen), and moving
 * between the two never leaves the page, so the words a person typed are still there when they come
 * back from step 1 (D1). Nothing is saved until "Save and check", which saves the version, runs the
 * checks, and opens step 3 for it at an address that carries the saved campaign reference.
 */

export interface LaunchCampaignPrefill {
  readonly campaignRef: string;
  readonly adId: string;
  readonly prefill: LaunchPrefill;
}

export type LaunchFlowProps = Readonly<{
  initial: LaunchAddress;
  cards: readonly LaunchAdCard[];
  advertiser: LaunchBand;
  today: string;
  rememberedPlaces: readonly string[];
  campaign?: LaunchCampaignPrefill | undefined;
}>;

interface Draft {
  readonly headline: string;
  readonly primaryText: string;
  readonly daily: string;
  readonly total: string;
  readonly totalEdited: boolean;
  readonly endsOn: string;
  readonly places: readonly string[];
}

type FieldErrors = Partial<Record<"daily" | "total" | "endsOn" | "places", string>>;

/**
 * A refused save: the sentence said at the top of the form, and the whole refusal behind it, so
 * `SupportReference` can show the reference a sentence points at (writing review pass 2, W-27).
 */
interface SaveFailure {
  readonly sentence: string;
  readonly refusal: InternalRefusal;
}

const STEP_IDS = ["choose", "set-up", "review"] as const;

export function launchSteps(current: 1 | 2 | 3) {
  const titles = [LAUNCH_STEP_TITLES.choose, LAUNCH_STEP_TITLES.setUp, LAUNCH_STEP_TITLES.review];
  return titles.map((title, index) => ({
    id: STEP_IDS[index] ?? title,
    title,
    state:
      index + 1 < current
        ? ("complete" as const)
        : index + 1 === current
          ? ("current" as const)
          : ("upcoming" as const),
  }));
}

function draftFor(
  card: LaunchAdCard,
  today: string,
  rememberedPlaces: readonly string[],
  campaign: LaunchCampaignPrefill | undefined,
): Draft {
  const start = campaign?.prefill ?? {
    ...defaultPrefill(card, today),
    places: rememberedPlaces,
  };
  const sameAd = campaign === undefined || campaign.adId === card.id;
  return {
    headline: sameAd ? start.headline : card.headline,
    primaryText: sameAd ? start.primaryText : card.primaryText,
    daily: String(start.dailyBudgetDollars),
    total: String(start.totalBudgetDollars),
    totalEdited: campaign !== undefined,
    endsOn: start.endsOn,
    places: start.places,
  };
}

function amount(text: string): number {
  return text.trim() === "" ? Number.NaN : Number(text.replace(/[$,\s]/gu, ""));
}

export function LaunchFlow({
  initial,
  cards,
  advertiser,
  today,
  rememberedPlaces,
  campaign,
}: LaunchFlowProps) {
  const router = useRouter();
  const [address, setAddress] = useState<LaunchAddress>(initial);
  const [drafts, setDrafts] = useState<Readonly<Record<string, Draft>>>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<SaveFailure | undefined>(undefined);
  // W-30. An address that names an ad the library no longer holds shows step 1; this says why.
  const [adGone, setAdGone] = useState(() => {
    const named = initial.ad ?? (initial.step === 2 ? campaign?.adId : undefined);
    return named !== undefined && !cards.some((item) => item.id === named);
  });
  const [busy, setBusy] = useState(false);
  // Counts refused attempts, so a second refusal moves focus to the message again.
  const [refusals, setRefusals] = useState(0);
  const problem = useRef<HTMLDivElement>(null);

  // A refused save is said at the top of the form, and focus goes there, so the person hears it
  // and sees it at 390 even though "Save and check" sits at the bottom of a long form.
  useEffect(() => {
    if (refusals > 0) problem.current?.focus();
  }, [refusals]);

  // The browser's own Back and Forward move between the steps too, and they read the address.
  useEffect(() => {
    function readAddress() {
      setAddress(
        parseLaunchAddress(Object.fromEntries(new URLSearchParams(window.location.search))),
      );
    }
    window.addEventListener("popstate", readAddress);
    return () => window.removeEventListener("popstate", readAddress);
  }, []);

  function go(next: LaunchAddress) {
    setAddress(next);
    setFailure(undefined);
    setAdGone(false);
    setErrors({});
    setRefusals(0);
    window.history.pushState(null, "", launchHref(next));
  }

  const chosenId = address.ad ?? (address.step === 2 ? campaign?.adId : undefined);
  const card = cards.find((item) => item.id === chosenId);
  const step: 1 | 2 = address.step === 2 && card !== undefined ? 2 : 1;

  if (step === 1 || card === undefined) {
    return (
      <StepOne
        address={address}
        adGone={adGone}
        advertiser={advertiser}
        cards={cards}
        onTopic={(topic) => {
          const next = { ...address, step: 1 as const, topic };
          setAddress(next);
          window.history.replaceState(null, "", launchHref(next));
        }}
        onUse={(chosen) =>
          go({ step: 2, ad: chosen.id, from: address.from, campaign: address.campaign })
        }
      />
    );
  }

  const key = `${address.campaign ?? "new"}:${card.id}`;
  const draft = drafts[key] ?? draftFor(card, today, rememberedPlaces, campaign);
  function update(change: Partial<Draft>) {
    setDrafts((current) => {
      const base = current[key] ?? draft;
      const next = { ...base, ...change };
      const days = daysBetween(today, next.endsOn);
      const total =
        next.totalEdited || !Number.isFinite(amount(next.daily)) || days <= 0
          ? next.total
          : String(amount(next.daily) * days);
      return { ...current, [key]: { ...next, total } };
    });
    setFailure(undefined);
  }

  async function saveAndCheck() {
    if (card === undefined) return;
    const daily = amount(draft.daily);
    const total = amount(draft.total);
    const problems = budgetProblems(daily, total);
    const nextErrors: FieldErrors = {
      ...(problems.includes("daily") ? { daily: DAILY_BUDGET_FIX } : {}),
      ...(problems.includes("total") ? { total: TOTAL_BUDGET_FIX } : {}),
      ...(daysBetween(today, draft.endsOn) > 0 ? {} : { endsOn: END_DATE_FIX }),
      ...(draft.places.length > 0 ? {} : { places: PLACE_REQUIRED }),
    };
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setRefusals((count) => count + 1);
      return;
    }
    setRefusals(0);
    setBusy(true);
    setFailure(undefined);
    try {
      const response = await postInternalJson("/api/campaigns/preflight", {
        adId: card.id,
        adVersion: card.version,
        ...(address.campaign === undefined ? {} : { campaignRef: address.campaign }),
        headline: draft.headline,
        primaryText: draft.primaryText,
        endsOn: draft.endsOn,
        dailyBudgetDollars: daily,
        totalBudgetDollars: total,
        places: draft.places,
      });
      if (!response.ok) {
        const refusal = await refusalFrom(response);
        setFailure({
          sentence: `${SAVE_FAILED} ${userMessageSentence(refusal.code)}`,
          refusal,
        });
        return;
      }
      const saved = (await response.json()) as { campaignRef: string };
      router.push(reviewHref(saved.campaignRef, address.from));
    } catch {
      setFailure({
        sentence: `${SAVE_FAILED} ${userMessageSentence(UNREACHED_REFUSAL.code)}`,
        refusal: UNREACHED_REFUSAL,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page} data-launch-step="2">
      <LaunchHeader
        lead={setUpLead(card.name, TOPIC_LABELS[card.topic], card.version)}
        step={2}
        title={LAUNCH_STEP_TITLES.setUp}
      />
      <div className={styles.setUp}>
        <Card className={styles.form} padding="lg">
          {refusals > 0 ? (
            <LiveRegion
              className={styles.problem}
              message={userMessageSentence("INVALID_CAMPAIGN_DRAFT")}
              ref={problem}
              tabIndex={-1}
              urgency="alert"
              visible
            />
          ) : null}
          <section aria-labelledby="launch-brand-title" className={styles.section} id="brand">
            <h2 id="launch-brand-title">{BRAND_CARD_TITLE}</h2>
            <BrandSummary advertiser={advertiser} />
            <p className={styles.note}>
              {hasBrandName(advertiser) ? BRAND_CARD_LINE : BRAND_CARD_LINE_EMPTY}
            </p>
          </section>
          <section aria-labelledby="launch-words-title" className={styles.section} id="words">
            <div className={styles.sectionHeading}>
              <h2 id="launch-words-title">{WORDS_TITLE}</h2>
              <Button
                className={styles.resetLink}
                onClick={() => update({ headline: card.headline, primaryText: card.primaryText })}
                size="sm"
                variant="ghost"
              >
                {USE_LIBRARY_WORDS}
              </Button>
            </div>
            <div className={styles.countBelow}>
              <TextField
                description={characterCount(draft.headline.length, card.headlineMaxLength)}
                label={HEADLINE_LABEL}
                maxLength={card.headlineMaxLength}
                onChange={(event) => update({ headline: event.target.value })}
                requirement="required"
                value={draft.headline}
              />
            </div>
            <div className={styles.countBelow}>
              <TextArea
                description={characterCount(draft.primaryText.length, card.primaryTextMaxLength)}
                label={AD_TEXT_LABEL}
                maxLength={card.primaryTextMaxLength}
                onChange={(event) => update({ primaryText: event.target.value })}
                requirement="required"
                rows={4}
                value={draft.primaryText}
              />
            </div>
            <p className={styles.locked} data-locked-disclosure="">
              <Icon decorative name="lock" size="sm" />
              <strong>{DISCLOSURE_LOCKED_LABEL}</strong> {advertiser.disclosureLine}
            </p>
            <p className={styles.note}>{WORDS_HINT}</p>
          </section>
          <section aria-labelledby="launch-budget-title" className={styles.section} id="budget">
            <h2 id="launch-budget-title">{BUDGET_TITLE}</h2>
            <div className={styles.pair}>
              <div className={styles.money}>
                <TextField
                  className={styles.moneyInput}
                  error={errors.daily}
                  inputMode="decimal"
                  label={DAILY_BUDGET_LABEL}
                  onChange={(event) => update({ daily: event.target.value })}
                  value={draft.daily}
                />
              </div>
              <div className={styles.money}>
                <TextField
                  className={styles.moneyInput}
                  error={errors.total}
                  inputMode="decimal"
                  label={TOTAL_BUDGET_LABEL}
                  onChange={(event) => update({ total: event.target.value, totalEdited: true })}
                  value={draft.total}
                />
              </div>
              <TextField label={STARTS_LABEL} readOnly value={STARTS_VALUE} />
              <TextField
                error={errors.endsOn}
                label={ENDS_LABEL}
                min={today}
                onChange={(event) => update({ endsOn: event.target.value })}
                type="date"
                value={draft.endsOn}
              />
            </div>
            <p className={styles.note}>
              {runLengthNote(Math.max(daysBetween(today, draft.endsOn), 0))}
            </p>
          </section>
          <section aria-labelledby="launch-area-title" className={styles.section} id="area">
            <h2 id="launch-area-title">{WHERE_TITLE}</h2>
            <AdPlacesField
              error={errors.places}
              onChange={(places) => update({ places })}
              places={draft.places}
            />
          </section>
          <div className={styles.actions}>
            <Button
              onClick={() =>
                go({
                  step: 1,
                  topic: address.topic,
                  from: address.from,
                  campaign: address.campaign,
                })
              }
              variant="outline"
            >
              <span className={styles.withIcon}>
                <Icon className={styles.backGlyph} decorative name="chevron-down" size="sm" />
                {BACK}
              </span>
            </Button>
            <Button
              loading={busy}
              loadingLabel={SAVING_AND_CHECKING}
              onClick={() => {
                void saveAndCheck();
              }}
            >
              {SAVE_AND_CHECK}
            </Button>
          </div>
          <p className={styles.saveNote}>{SAVE_NOTE}</p>
          {failure === undefined ? null : (
            <>
              <LiveRegion message={failure.sentence} urgency="alert" visible />
              <SupportReference refusal={failure.refusal} />
            </>
          )}
        </Card>
        <aside aria-labelledby="launch-preview-title" className={styles.preview}>
          <div className={styles.sectionHeading}>
            <h2 className={styles.previewTitle} id="launch-preview-title">
              {PREVIEW_TITLE}
            </h2>
            <span className={styles.note}>{PREVIEW_NOTE}</span>
          </div>
          <div className={styles.feedFrame}>
            <AdFeedPreview
              advertiser={advertiser}
              alt={card.alt}
              art={card.art}
              callToAction={card.callToAction}
              headline={draft.headline}
              primaryText={draft.primaryText}
              sample={card.sample}
              shape="tall"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * The crumbs, the title, the step indicator, and the lead, in the order and at the distances the
 * launch mockups draw them (scored review R1-05). Each piece is one page gap from the next. Step 1
 * puts the indicator directly under the title and the lead under the indicator, because its lead
 * speaks to the ads below it; steps 2 and 3 keep the lead under the title as a subtitle, as their
 * mockups do, and put the indicator after the pair. A step with no lead draws none.
 */
export function LaunchHeader({
  step,
  title,
  lead,
}: Readonly<{ step: 1 | 2 | 3; title: string; lead?: string | undefined }>) {
  const stepper = <Stepper label={LAUNCH_STEPPER_LABEL} steps={launchSteps(step)} />;
  const leadLine = lead === undefined ? null : <p className={styles.lead}>{lead}</p>;
  return (
    <header className={styles.header}>
      <nav aria-label={CRUMBS_LABEL} className={styles.crumbs}>
        <Link href="/marketing/campaigns">{CAMPAIGNS_CRUMB}</Link>
        <span aria-hidden="true">/</span>
        <span>{LAUNCH_AN_AD}</span>
      </nav>
      {step === 1 ? (
        <>
          <h1>{title}</h1>
          {stepper}
          {leadLine}
        </>
      ) : (
        <>
          <div className={styles.headText}>
            <h1>{title}</h1>
            {leadLine}
          </div>
          {stepper}
        </>
      )}
    </header>
  );
}

/** Whether the person has a saved name, which is what "added for you from Brand" needs to be true. */
function hasBrandName(advertiser: LaunchBand): boolean {
  return advertiser.name.trim() !== "";
}

function BrandSummary({ advertiser }: Readonly<{ advertiser: LaunchBand }>) {
  const nameLine = !hasBrandName(advertiser)
    ? BAND_PLACEHOLDER
    : [advertiser.name, advertiser.title].filter((part) => part.trim() !== "").join(", ");
  const detail = [advertiser.nmls === "" ? "" : `NMLS ${advertiser.nmls}`, advertiser.company]
    .filter((part) => part.trim() !== "")
    .join(". ");
  return (
    <div className={styles.brandSummary} data-brand-summary="">
      <span
        aria-hidden="true"
        className={styles.summaryTile}
        style={adColorVariables(advertiser.colorPresetId)}
      >
        {hasBrandName(advertiser) ? brandInitials(advertiser.name) : ""}
      </span>
      <span>
        <strong>{nameLine}</strong>
        <br />
        <span className={styles.summaryDetail}>{detail}</span>
      </span>
      <Link className={styles.textLink} href="/brand">
        {hasBrandName(advertiser) ? CHANGE_IN_BRAND : ADD_IN_BRAND}
      </Link>
    </div>
  );
}

function StepOne({
  address,
  adGone,
  cards,
  advertiser,
  onTopic,
  onUse,
}: Readonly<{
  address: LaunchAddress;
  /** The address named an ad the library no longer holds (writing review W-30). */
  adGone: boolean;
  cards: readonly LaunchAdCard[];
  advertiser: LaunchBand;
  onTopic: (topic: AdsLibraryTopic | undefined) => void;
  onUse: (card: LaunchAdCard) => void;
}>) {
  return (
    <div className={styles.page} data-launch-step="1">
      {/* R1-06. With no ad in the library the lead would describe ads that do not exist; the empty
          state says what there is. The library tab drops its lead for the same reason. */}
      <LaunchHeader
        lead={cards.length === 0 ? undefined : CHOOSE_LEAD}
        step={1}
        title={LAUNCH_STEP_TITLES.choose}
      />
      {adGone ? (
        <p className={styles.lead} data-ad-gone="">
          {AD_NOT_IN_LIBRARY_NOTICE}
        </p>
      ) : null}
      {cards.length === 0 ? null : (
        <TopicChips
          cards={cards}
          renderChip={({ topic, label, count, selected }) => (
            <Button
              aria-pressed={selected}
              className={chips.chip}
              onClick={() => onTopic(topic)}
              variant="outline"
            >
              <TopicChipContent count={count} label={label} />
            </Button>
          )}
          selected={address.topic}
        />
      )}
      <AdCardGrid
        actionFor={(card) => (
          <Button onClick={() => onUse(card)} variant="secondary">
            {USE_THIS_AD}
            <span className="oalo-visually-hidden">{useThisAdSuffix(card.name)}</span>
          </Button>
        )}
        advertiser={advertiser}
        cards={cards}
        titleLevel={2}
        topic={address.topic}
      />
      <div className={styles.actions}>
        <Link href={cancelHref(address.from)} variant="action">
          {CANCEL}
        </Link>
      </div>
    </div>
  );
}
