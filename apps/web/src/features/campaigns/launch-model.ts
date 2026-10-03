import type { LibraryAdRefusalReason, PreflightRuleCode } from "@oalo/application";
import {
  ADS_LIBRARY_TOPICS,
  AdsLibraryAdIdSchema,
  OpaqueReferenceSchema,
  type AdsLibraryCallToAction,
  type AdsLibraryTopic,
} from "@oalo/contracts";

/**
 * PRD-009d. The pure model of "Launch an ad": what its address may say, what each step is handed,
 * which sentence the launch button carries, and which step fixes what a check found. No React and
 * no `node:` import, so the client steps and the server page share it.
 */

/** The brand band's values, frozen into a version at "Save and check" (D3, 009c D5 `advertiser`). */
export interface LaunchBand {
  readonly name: string;
  readonly title: string;
  readonly company: string;
  readonly nmls: string;
  readonly companyNmls: string;
  readonly colorPresetId: string;
  readonly disclosureLine: string;
}

/** One ad as a card, step 2, and the previews read it: display fields only, never compliance or approval. */
export interface LaunchAdCard {
  readonly id: string;
  readonly version: number;
  readonly topic: AdsLibraryTopic;
  readonly name: string;
  readonly headline: string;
  readonly primaryText: string;
  readonly headlineMaxLength: number;
  readonly primaryTextMaxLength: number;
  readonly callToAction: AdsLibraryCallToAction;
  readonly alt: string;
  readonly art: Readonly<{ tall: string; square: string }>;
  /** The day the curator approved this version, as `YYYY-MM-DD`; newer approvals sort first. */
  readonly approvedOn: string;
  readonly sample: boolean;
}

/** What step 2 starts from: the library's words, or a campaign's latest version (D1, 009D-AC-020). */
export interface LaunchPrefill {
  readonly headline: string;
  readonly primaryText: string;
  readonly dailyBudgetDollars: number;
  readonly totalBudgetDollars: number;
  readonly endsOn: string;
  readonly places: readonly string[];
}

export const LAUNCH_FROM = ["home", "campaigns", "library"] as const;
export type LaunchFrom = (typeof LAUNCH_FROM)[number];

export interface LaunchAddress {
  readonly step: 1 | 2 | 3;
  readonly topic?: AdsLibraryTopic | undefined;
  readonly ad?: string | undefined;
  readonly from?: LaunchFrom | undefined;
  readonly campaign?: string | undefined;
}

function single(value: string | readonly string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * D1. Each address value is typed and anything else is ignored: `step` is 1, 2, or 3; `topic` one
 * of the five topic ids; `ad` an id the server then resolves from the catalog; `from` one of
 * `home`, `campaigns`, or `library`; `campaign` a reference the server resolves under the session's
 * workspace. No value is ever used as a web address, so "Cancel" cannot become an open redirect.
 */
export function parseLaunchAddress(
  search: Readonly<Record<string, string | readonly string[] | undefined>>,
): LaunchAddress {
  const step = single(search["step"]);
  const topic = single(search["topic"]);
  const ad = single(search["ad"]);
  const from = single(search["from"]);
  const campaign = single(search["campaign"]);
  return {
    step: step === "2" ? 2 : step === "3" ? 3 : 1,
    topic: (ADS_LIBRARY_TOPICS as readonly string[]).includes(topic ?? "")
      ? (topic as AdsLibraryTopic)
      : undefined,
    ad: ad !== undefined && AdsLibraryAdIdSchema.safeParse(ad).success ? ad : undefined,
    from: (LAUNCH_FROM as readonly string[]).includes(from ?? "")
      ? (from as LaunchFrom)
      : undefined,
    campaign:
      campaign !== undefined && OpaqueReferenceSchema.safeParse(campaign).success
        ? campaign
        : undefined,
  };
}

export const LAUNCH_PATH = "/marketing/campaigns/new";

/** The address of a step, built only from typed values. */
export function launchHref(address: LaunchAddress, hash?: string): string {
  const query = new URLSearchParams({ step: String(address.step) });
  if (address.topic !== undefined) query.set("topic", address.topic);
  if (address.ad !== undefined) query.set("ad", address.ad);
  if (address.campaign !== undefined) query.set("campaign", address.campaign);
  if (address.from !== undefined) query.set("from", address.from);
  return `${LAUNCH_PATH}?${query.toString()}${hash === undefined ? "" : `#${hash}`}`;
}

/** D2: "Cancel" returns to the page `from` names, or to Campaigns when it names none. */
export function cancelHref(from: LaunchFrom | undefined): string {
  if (from === "home") return "/overview";
  if (from === "library") return "/marketing/campaigns/library";
  return "/marketing/campaigns";
}

/** The step 3 address of a saved campaign: a reload re-reads the saved version (D1). */
export function reviewHref(campaignRef: string, from?: LaunchFrom): string {
  return launchHref({ step: 3, campaign: campaignRef, from });
}

/** D6: $25 a day for 14 days, so $350 in total. */
export const DEFAULT_DAILY_BUDGET_DOLLARS = 25;
export const DEFAULT_RUN_DAYS = 14;
export const BUDGET_BOUNDS_DOLLARS = Object.freeze({
  dailyMin: 5,
  dailyMax: 1_000,
  totalMax: 5_000,
});

/** A calendar day `days` after `today` (both `YYYY-MM-DD`, read in UTC). */
export function addDays(today: string, days: number): string {
  const day = new Date(`${today}T00:00:00.000Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000,
  );
}

export function defaultPrefill(card: LaunchAdCard, today: string): LaunchPrefill {
  return {
    headline: card.headline,
    primaryText: card.primaryText,
    dailyBudgetDollars: DEFAULT_DAILY_BUDGET_DOLLARS,
    totalBudgetDollars: DEFAULT_DAILY_BUDGET_DOLLARS * DEFAULT_RUN_DAYS,
    endsOn: addDays(today, DEFAULT_RUN_DAYS),
    places: [],
  };
}

export type BudgetProblem = "daily" | "total";

/** D6 and 009D-AC-007: the field a budget outside the ruleset's bounds belongs to, if any. */
export function budgetProblems(daily: number, total: number): readonly BudgetProblem[] {
  const problems: BudgetProblem[] = [];
  if (
    !Number.isFinite(daily) ||
    daily < BUDGET_BOUNDS_DOLLARS.dailyMin ||
    daily > BUDGET_BOUNDS_DOLLARS.dailyMax
  ) {
    problems.push("daily");
  }
  if (
    !Number.isFinite(total) ||
    total < BUDGET_BOUNDS_DOLLARS.dailyMin ||
    total > BUDGET_BOUNDS_DOLLARS.totalMax
  ) {
    problems.push("total");
  }
  return problems;
}

export function dollars(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** A day written the way a loan officer reads it: "Tue, Oct 20, 2026". */
export function readableDay(isoDay: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDay.slice(0, 10)}T12:00:00.000Z`));
}

/** "Oct 1, 2026", for a review or approval date. */
export function shortDay(isoDay: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDay.slice(0, 10)}T12:00:00.000Z`));
}

export const CALL_TO_ACTION_LABELS: Readonly<Record<AdsLibraryCallToAction, string>> =
  Object.freeze({
    APPLY_NOW: "Apply now",
    DOWNLOAD: "Download",
    GET_QUOTE: "Get quote",
    LEARN_MORE: "Learn more",
    SIGN_UP: "Sign up",
    SUBSCRIBE: "Subscribe",
  });

/** The states step 3 draws in place of Approve, one for each reason the approval command refuses. */
export type LaunchAdRefusalState = "retired" | "replaced" | "art-changed" | "missing";

/**
 * QA-06, 009C-AC-008, 009D D8. Which state step 3 draws for each reason the approval command refuses
 * a library-ad version (`libraryAdRefusalFor`, the one rule the command and every screen share). It
 * is exhaustive over the reasons (a `Record` keyed by the reason union), so a new refusal cannot be
 * added without saying what step 3 shows for it, and step 3 never offers Approve where the command
 * would refuse.
 */
export const AD_REFUSAL_STATES: Readonly<Record<LibraryAdRefusalReason, LaunchAdRefusalState>> =
  Object.freeze<Record<LibraryAdRefusalReason, LaunchAdRefusalState>>({
    retired: "retired",
    replaced: "replaced",
    art_changed: "art-changed",
    missing: "missing",
  });

/** D7's inputs. In PRD-009 `metaConnected` and `launchingTurnedOn` are always false in the product. */
export interface LaunchState {
  readonly metaConnected: boolean;
  readonly retiredOn: string | null;
  readonly approved: boolean;
  readonly launchingTurnedOn: boolean;
}

export type LaunchSentence =
  | Readonly<{ kind: "meta-not-connected" }>
  | Readonly<{ kind: "retired"; retiredOn: string }>
  | Readonly<{ kind: "not-approved" }>
  | Readonly<{ kind: "not-turned-on" }>;

/**
 * D7. The one sentence "Launch on Facebook" carries. The button is disabled in every row, because
 * PRD-009 has no launch route; with everything true the last row still says launching is not turned
 * on, since nothing in PRD-009 can turn it on.
 */
export function launchSentenceFor(state: LaunchState): LaunchSentence {
  if (!state.metaConnected) return { kind: "meta-not-connected" };
  if (state.retiredOn !== null) return { kind: "retired", retiredOn: state.retiredOn };
  if (!state.approved) return { kind: "not-approved" };
  return { kind: "not-turned-on" };
}

/** Where "Fix it" goes (009D-AC-019): a step, and on step 2 the part of the form that holds it. */
export type FixTarget =
  Readonly<{ step: 1 }> | Readonly<{ step: 2; at: "words" | "brand" | "budget" | "area" }>;

type RuleTarget = FixTarget | "words-or-brand";

/**
 * 009D-AC-019. The map from rule code to the step that holds what a finding names. It is exhaustive
 * over the rule codes (a `Record` keyed by the code union), so a new rule cannot be added without a
 * place to fix it. A word rule names the words when its finding is in the headline or ad text, and
 * Brand ("Change in Brand") when it is in a Brand text.
 */
export const FIX_TARGETS: Readonly<Record<PreflightRuleCode, RuleTarget>> = Object.freeze<
  Record<PreflightRuleCode, RuleTarget>
>({
  DISCLOSURE_REQUIRED: { step: 2, at: "brand" },
  CONSENT_REQUIRED: { step: 2, at: "brand" },
  IMAGE_NOT_APPROVED: { step: 1 },
  IMAGE_QUALITY_LOW: { step: 1 },
  BRAND_BANNED_PHRASE: { step: 2, at: "words" },
  MERGE_TOKEN_NOT_ALLOWED: { step: 2, at: "words" },
  CLAIM_POLICY_BLOCKED: { step: 2, at: "words" },
  FINANCING_TERMS_BLOCKED: { step: 2, at: "words" },
  META_HOUSING_CATEGORY_REQUIRED: { step: 1 },
  TARGETING_NOT_ALLOWED: { step: 2, at: "area" },
  BUDGET_OUT_OF_BOUNDS: { step: 2, at: "budget" },
  GHL_ROUTING_INCOMPLETE: { step: 2, at: "area" },
  WORDS_TOO_LONG: { step: 2, at: "words" },
  WORDS_RATE_PAYMENT_OR_TERM_CLAIM: "words-or-brand",
  WORDS_INVALID_CHARACTERS: "words-or-brand",
  WORDS_NUMBER: "words-or-brand",
  WORDS_CO_BRAND: "words-or-brand",
  WORDS_PRIVATE_INFO_REQUEST: "words-or-brand",
  NMLS_NUMBER_REQUIRED: { step: 2, at: "brand" },
  EQUAL_HOUSING_REQUIRED: { step: 2, at: "brand" },
  RUN_DATES_INVALID: { step: 2, at: "budget" },
  LIBRARY_AD_RETIRED: { step: 1 },
  OPEN_HOUSE_DATES_INVALID: { step: 1 },
  PARTNER_PERMISSION_REQUIRED: { step: 1 },
  PROPERTY_PERMISSION_REQUIRED: { step: 1 },
});

const WORD_PATHS: ReadonlySet<string> = new Set(["content.headline", "content.body"]);

export function fixTargetFor(finding: Readonly<{ ruleCode: string; affected: string }>): FixTarget {
  const target = (FIX_TARGETS as Readonly<Record<string, RuleTarget | undefined>>)[
    finding.ruleCode
  ];
  if (target === undefined) return { step: 2, at: "words" };
  if (target !== "words-or-brand") return target;
  return { step: 2, at: WORD_PATHS.has(finding.affected) ? "words" : "brand" };
}
