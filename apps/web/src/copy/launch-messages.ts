import type { PreflightRuleCode } from "@oalo/application";
import type { AdsLibraryTopic } from "@oalo/contracts";

/**
 * PRD-009d. Every sentence "Launch an ad" puts on a screen, in one file the user-language guard and
 * the writing review read (`library/knowledge/private/standards/user-language-contract.md`).
 *
 * The strings the design fixes are copied exactly from `design/00-direction.md` sections 6 and 9 as
 * 009d corrects them: the area hint carries the two Meta rules the Meta rules check VERIFIED (E1),
 * and nothing here promises a logo (D3).
 */

export const LAUNCH_AN_AD = "Launch an ad";
export const LAUNCH_STEPPER_LABEL = "Launch an ad steps";
export const LAUNCH_STEP_TITLES = Object.freeze({
  choose: "Choose an ad",
  setUp: "Set it up",
  review: "Review and launch",
});
export const CAMPAIGNS_CRUMB = "Campaigns";
export const CRUMBS_LABEL = "Where you are";

export const TOPIC_LABELS: Readonly<Record<AdsLibraryTopic, string>> = Object.freeze({
  "first-time-buyers": "First-time buyers",
  refinance: "Refinance",
  "va-loans": "VA loans",
  "pre-approval": "Pre-approval",
  "down-payment-help": "Down payment help",
});

/** Step 1, Choose an ad. */
export const CHOOSE_LEAD =
  "Each ad already has its image and words. Your brand is added for you, and you can change the words in the next step.";
export const TOPIC_CHIPS_LABEL = "Show ads about";
export const ALL_TOPICS = "All";
export const USE_THIS_AD = "Use this ad";
export const CANCEL = "Cancel";
export const SAMPLE_AD_LABEL = "Sample ad";
/** 009C-AC-012: the library with no active ad, said once, with what happens next. */
export const EMPTY_LIBRARY =
  "No ads in the library yet. New ads are added after they're reviewed, so there's nothing to set up until then.";
export function adCardVersionLine(version: number, reviewedOn: string): string {
  return `Version ${String(version)}. Reviewed ${reviewedOn}.`;
}

/** Step 2, Set it up. */
export function setUpLead(name: string, topic: string, version: number): string {
  return `${name}. ${topic}, version ${String(version)}.`;
}
export const BRAND_CARD_TITLE = "Your brand on the ad";
export const BRAND_CARD_LINE =
  "Added for you from Brand. The image and layout come from the library and can't be changed.";
export const CHANGE_IN_BRAND = "Change in Brand";
/** The placeholder band when a person has no brand yet (D3). */
export const BAND_PLACEHOLDER = "Your name and NMLS number go here";
export const WORDS_TITLE = "Ad words";
export const HEADLINE_LABEL = "Headline";
export const AD_TEXT_LABEL = "Ad text";
export const USE_LIBRARY_WORDS = "Use the library words";
export function characterCount(count: number, maximum: number): string {
  return `${String(count)} of ${String(maximum)} characters`;
}
export const DISCLOSURE_LOCKED_LABEL = "Disclosure, from your brand:";
export const WORDS_HINT =
  "Don't add rates, payments or loan terms here. The checks will send them back for changes.";
export const BUDGET_TITLE = "Budget and dates";
export const DAILY_BUDGET_LABEL = "Daily budget";
export const TOTAL_BUDGET_LABEL = "Total budget";
export const STARTS_LABEL = "Starts";
export const STARTS_VALUE = "When you launch it";
export const ENDS_LABEL = "Ends";
export function runLengthNote(days: number): string {
  return `Set to run for ${String(days)} days. Change the end date if you like.`;
}
export const DAILY_BUDGET_FIX = "Choose a daily budget from $5 to $1,000.";
export const TOTAL_BUDGET_FIX = "Choose a total budget from $5 to $5,000.";
export const END_DATE_FIX = "Choose an end date after today.";
export const WHERE_TITLE = "Where it shows";
export const ADD_PLACE_LABEL = "Add a city or state";
export const ADD_PLACE_PLACEHOLDER = "For example: Round Rock, TX";
export const ADD_PLACE = "Add";
export function removePlaceLabel(place: string): string {
  return `Remove ${place}`;
}
export const PLACES_LIST_LABEL = "Places this ad shows";
export const PLACE_REFUSED =
  "Type a city and its state, like Austin, TX, or a state, like Texas. ZIP codes, distances and people can't be used.";
export const PLACE_LIMIT = "You can add up to 5 states and 10 cities.";
export const PLACE_REQUIRED = "Add a city or state.";
/** D4 as the Meta rules check amended it (E1): both Meta clauses are VERIFIED. */
export const AREA_HINT =
  "Mortgage ads can't be aimed by age, gender or ZIP code, so you choose places, not people. Around a city, Meta requires the area to include everything within 15 miles.";
export const SHOWS_IN_LABEL = "Shows in:";
export const SHOWS_IN_VALUE = "the Facebook feed.";
export const PREVIEW_TITLE = "Your ad so far";
export const PREVIEW_NOTE = "Updates as you type";
export const BACK = "Back";
export const SAVE_AND_CHECK = "Save and check";
export const SAVING_AND_CHECKING = "Saving and checking";
export const SAVE_NOTE = "We save this version and run the checks. Nothing is published.";

/** Step 3, Review and launch. */
export const REVIEW_LEAD = "This is the actual ad. Look it over, then approve it.";
export const YOUR_AD = "Your ad";
export const SHAPE_LABEL = "Shape";
export const SHAPE_TALL = "Tall (4:5)";
export const SHAPE_SQUARE = "Square (1:1)";
export const SHAPES_NOTE = "Your approval covers both shapes.";
export const FRAME_CAPTION =
  "Shown as it might look in a Facebook feed. The image comes from the ads library, and the band underneath is your brand.";
export const SPONSORED = "Sponsored";
export const WHAT_YOU_APPROVE = "What you approve";
export function checksCount(passed: number, run: number): string {
  return `${String(passed)} of ${String(run)} checks passed.`;
}
export const SEE_WHAT_WE_CHECKED = "See what we checked";
export const FACTS_TITLE = "The ad, budget and area";
export const CHANGE = "Change";
export const FACT_LABELS = Object.freeze({
  ad: "Ad",
  words: "Words",
  budget: "Budget",
  runs: "Runs",
  shows: "Where it shows",
  leads: "New leads go to",
});
export function adFact(name: string, version: number): string {
  return `${name}, library version ${String(version)}`;
}
export const HEADLINE_CHANGED = "Headline changed";
export const HEADLINE_UNCHANGED = "Headline unchanged";
export const AD_TEXT_CHANGED = "Ad text changed";
export const AD_TEXT_UNCHANGED = "Ad text unchanged";
export function budgetFact(daily: string, total: string): string {
  return `${daily} a day, up to ${total} in total`;
}
export function runsFact(endsOn: string): string {
  return `From launch until ${endsOn}`;
}
export const FACEBOOK_FEED = "the Facebook feed";
export const LEADS_NOT_CONNECTED = "Your HighLevel account, once it's connected";
/** 009D-AC-015: the line that replaces "Approving applies to this exact version." */
export const APPROVE_LINE =
  "Approving applies to this exact version, with your words. Nothing is published or sent.";
export const APPROVE_TITLE = "Approve this version";
export const LAUNCH_TITLE = "Launch";
export const LAUNCH_ON_FACEBOOK = "Launch on Facebook";

/**
 * D7. The one sentence tied to "Launch on Facebook". The Meta sentence carries a link, so it is
 * stored in three parts: the words before the link, the link's words, and the words after.
 */
export const LAUNCH_SENTENCES = Object.freeze({
  metaNotConnected: Object.freeze({
    before: "Meta isn't connected yet, so ",
    link: "connect it in Settings",
    after: " to launch this ad.",
  }),
  notApproved: "Approve this version first.",
  notTurnedOn:
    "Launching on Facebook isn't turned on for your workspace yet. Nothing has been published.",
});
export function launchRetiredSentence(retiredOn: string): string {
  return `This ad was taken out of the library on ${retiredOn}, so this campaign can't launch.`;
}

/** D8, the PRD-008b states on step 3. Existing strings are reused from `user-language.ts`. */
export const FIX_IT = "Fix it";
export const WHAT_TO_FIX = "What to fix:";
export const APPROVED_CHIP = "Approved";
export function approvedLine(approver: string, decidedOn: string): string {
  return `Approved by ${approver} on ${decidedOn}. The approval covers this version only.`;
}
export const MAKE_A_NEW_VERSION = "Make a new version";
export const AD_RETIRED_CHIP = "Ad retired";
export function adRetiredNotice(retiredOn: string): string {
  return `This ad was taken out of the library on ${retiredOn}, so this draft can't be approved. Your budget, dates and area are kept.`;
}
export const CHOOSE_ANOTHER_AD = "Choose another ad";

/**
 * D8's hand-off card, for a person who cannot approve. It moved here from the guided setup's copy,
 * which PRD-009b removed.
 */
export const HAND_OFF = Object.freeze({
  body: "You can't approve campaigns in this workspace. Send this link to an approver.",
  copyLinkLabel: "Copy the link",
  copiedNotice: "Link copied.",
});

/**
 * 009D-AC-014. "See what we checked": every rule a ruleset can run, in plain words. The map is
 * exhaustive over the rule codes, so a new rule cannot reach step 3 without a name.
 */
export const RULE_PLAIN_NAMES: Readonly<Record<PreflightRuleCode, string>> = Object.freeze({
  DISCLOSURE_REQUIRED: "Has a disclosure line",
  CONSENT_REQUIRED: "Has lead form wording",
  IMAGE_NOT_APPROVED: "Uses only reviewed images",
  IMAGE_QUALITY_LOW: "Images are large enough",
  BRAND_BANNED_PHRASE: "No promises like guaranteed approval",
  MERGE_TOKEN_NOT_ALLOWED: "No fill-in placeholders",
  CLAIM_POLICY_BLOCKED: "No unreviewed claims",
  FINANCING_TERMS_BLOCKED: "No financing terms",
  META_HOUSING_CATEGORY_REQUIRED: "Runs as a housing ad on Meta",
  TARGETING_NOT_ALLOWED: "No age, gender or ZIP code targeting",
  BUDGET_OUT_OF_BOUNDS: "Budget within the limits",
  GHL_ROUTING_INCOMPLETE: "New leads have somewhere to go",
  WORDS_TOO_LONG: "Words within this ad's length",
  WORDS_RATE_PAYMENT_OR_TERM_CLAIM: "No rate, payment or term claims in your words",
  WORDS_INVALID_CHARACTERS: "No hidden or special characters",
  WORDS_NUMBER: "No numbers that state rates, payments or terms",
  WORDS_CO_BRAND: "Shows only you, never a Realtor or brokerage",
  WORDS_PRIVATE_INFO_REQUEST: "Doesn't ask for private details",
  NMLS_NUMBER_REQUIRED: "NMLS number on the ad",
  EQUAL_HOUSING_REQUIRED: "Equal Housing line on the ad",
  RUN_DATES_INVALID: "Ends after today",
  LIBRARY_AD_RETIRED: "The ad is still in the library",
  OPEN_HOUSE_DATES_INVALID: "Open house dates are ahead",
  PARTNER_PERMISSION_REQUIRED: "Partner permission recorded",
  PROPERTY_PERMISSION_REQUIRED: "Property permission recorded",
});

/** Save errors the step 2 form says in its own words. */
export const SAVE_FAILED = "We couldn't save this version. Nothing was saved.";
