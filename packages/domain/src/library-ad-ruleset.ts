import { normaliseLibraryAdText } from "./library-ad-text.js";
import { evaluateLibraryAdWords, type LibraryAdWordFinding } from "./library-ad-words.js";

/**
 * PRD-009d D5 and 009D-AC-014. The library-ad ruleset's own rules, and the registry of what each
 * ruleset runs.
 *
 * The registry is what step 3's "N of N checks passed" counts from: rules run is the length of the
 * entry for the stored `rulesetVersionRef`, and rules passed is that minus the distinct rule codes in
 * the stored findings. Nothing about the count is typed by hand, and a unit test pins each entry to
 * the codes the evaluator can actually produce.
 */

/** An NMLS number: 4 to 12 digits and nothing else. */
const NMLS_DIGITS = /^\p{N}{4,12}$/u;

/** The rules every blueprint shares, in the order the evaluator runs them. */
const SHARED_RULE_CODES = [
  "DISCLOSURE_REQUIRED",
  "CONSENT_REQUIRED",
  "IMAGE_NOT_APPROVED",
  "IMAGE_QUALITY_LOW",
  "BRAND_BANNED_PHRASE",
  "MERGE_TOKEN_NOT_ALLOWED",
  "CLAIM_POLICY_BLOCKED",
  "FINANCING_TERMS_BLOCKED",
  "META_HOUSING_CATEGORY_REQUIRED",
  "TARGETING_NOT_ALLOWED",
  "BUDGET_OUT_OF_BOUNDS",
  "GHL_ROUTING_INCOMPLETE",
] as const;

export const LIBRARY_AD_ONLY_RULE_CODES = [
  "WORDS_TOO_LONG",
  "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
  "WORDS_INVALID_CHARACTERS",
  "WORDS_NUMBER",
  "WORDS_CO_BRAND",
  "WORDS_PRIVATE_INFO_REQUEST",
  "NMLS_NUMBER_REQUIRED",
  "EQUAL_HOUSING_REQUIRED",
  "RUN_DATES_INVALID",
  "LIBRARY_AD_RETIRED",
] as const;

const OPEN_HOUSE_ONLY_RULE_CODES = [
  "OPEN_HOUSE_DATES_INVALID",
  "PARTNER_PERMISSION_REQUIRED",
  "PROPERTY_PERMISSION_REQUIRED",
] as const;

export type LibraryAdRuleCode =
  (typeof SHARED_RULE_CODES)[number] | (typeof LIBRARY_AD_ONLY_RULE_CODES)[number];
export type OpenHouseRuleCode =
  (typeof SHARED_RULE_CODES)[number] | (typeof OPEN_HOUSE_ONLY_RULE_CODES)[number];
export type PreflightRuleCode = LibraryAdRuleCode | OpenHouseRuleCode;

/** The library-ad ruleset reference (`apps/web/src/features/ads-library/server/library-ad-ruleset.ts`). */
export const LIBRARY_AD_RULESET_REF = "ruleset_libraryAd001";
/** The open house ruleset reference, which versions saved before PRD-009 carry. */
export const OPEN_HOUSE_RULESET_REF = "ruleset_openHouseFounding001";

export const PREFLIGHT_RULESET_REGISTRY: Readonly<{
  ruleset_libraryAd001: readonly LibraryAdRuleCode[];
  ruleset_openHouseFounding001: readonly OpenHouseRuleCode[];
}> = Object.freeze({
  [LIBRARY_AD_RULESET_REF]: Object.freeze([...SHARED_RULE_CODES, ...LIBRARY_AD_ONLY_RULE_CODES]),
  [OPEN_HOUSE_RULESET_REF]: Object.freeze([...SHARED_RULE_CODES, ...OPEN_HOUSE_ONLY_RULE_CODES]),
});

/** The rule codes a ruleset runs, or `undefined` for a ruleset the registry does not know. */
export function rulesetRuleCodes(
  rulesetVersionRef: string,
): readonly PreflightRuleCode[] | undefined {
  if (rulesetVersionRef === LIBRARY_AD_RULESET_REF)
    return PREFLIGHT_RULESET_REGISTRY.ruleset_libraryAd001;
  if (rulesetVersionRef === OPEN_HOUSE_RULESET_REF) {
    return PREFLIGHT_RULESET_REGISTRY.ruleset_openHouseFounding001;
  }
  return undefined;
}

export interface LibraryAdRuleContext {
  readonly headlineMaxLength: number;
  readonly primaryTextMaxLength: number;
  readonly partnerNames: readonly string[];
  readonly retiredOn: string | null;
}

export interface LibraryAdRuleInput {
  readonly content: {
    readonly headline: string;
    readonly body: string;
    readonly disclosureText: string;
    readonly consentText: string;
  };
  readonly advertiser: {
    readonly name: string;
    readonly title: string;
    readonly company: string;
    readonly nmls: string;
    readonly companyNmls: string;
  };
  readonly schedule: { readonly startsAt: string | null; readonly endsAt: string };
}

interface LibraryAdFinding {
  readonly severity: "blocking";
  readonly ruleCode: (typeof LIBRARY_AD_ONLY_RULE_CODES)[number];
  readonly description: string;
  readonly affected: string;
  readonly remediation: string;
}

function blocking(
  ruleCode: LibraryAdFinding["ruleCode"],
  description: string,
  affected: string,
  remediation: string,
): LibraryAdFinding {
  return Object.freeze({
    severity: "blocking" as const,
    ruleCode,
    description,
    affected,
    remediation,
  });
}

const EQUAL_HOUSING = /\bequal housing\b/u;

/** The calendar day of an ISO timestamp, in UTC, which is the day the check names "today". */
function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * The library-ad rules that are not shared with the open house ruleset, in the order the registry
 * lists them: the words' length, the word checks over every checked text, the NMLS number, the Equal
 * Housing line, the run dates, and retirement.
 */
export function evaluateLibraryAdRules(
  manifest: LibraryAdRuleInput,
  context: LibraryAdRuleContext,
  evaluatedAt: string,
): readonly (LibraryAdFinding | LibraryAdWordFinding)[] {
  const findings: (LibraryAdFinding | LibraryAdWordFinding)[] = [];
  if (manifest.content.headline.length > context.headlineMaxLength) {
    findings.push(
      blocking(
        "WORDS_TOO_LONG",
        "The headline is longer than this ad allows.",
        "content.headline",
        `Shorten the headline to ${String(context.headlineMaxLength)} characters or fewer.`,
      ),
    );
  }
  if (manifest.content.body.length > context.primaryTextMaxLength) {
    findings.push(
      blocking(
        "WORDS_TOO_LONG",
        "The ad text is longer than this ad allows.",
        "content.body",
        `Shorten the ad text to ${String(context.primaryTextMaxLength)} characters or fewer.`,
      ),
    );
  }
  findings.push(
    ...evaluateLibraryAdWords(
      {
        headline: manifest.content.headline,
        primaryText: manifest.content.body,
        name: manifest.advertiser.name,
        title: manifest.advertiser.title,
        company: manifest.advertiser.company,
        disclosureLine: manifest.content.disclosureText,
        leadFormWording: manifest.content.consentText,
      },
      context.partnerNames,
    ),
  );
  // An NMLS number is 4 to 12 digits; the person's is required and the company's is optional.
  const nmls = manifest.advertiser.nmls.trim();
  if (nmls.length === 0) {
    findings.push(
      blocking(
        "NMLS_NUMBER_REQUIRED",
        "Your Brand has no NMLS number.",
        "advertiser.nmls",
        "Add your NMLS number in Brand.",
      ),
    );
  } else if (!NMLS_DIGITS.test(nmls)) {
    findings.push(
      blocking(
        "NMLS_NUMBER_REQUIRED",
        "Your NMLS number in Brand is not 4 to 12 digits.",
        "advertiser.nmls",
        "Correct your NMLS number in Brand. It has 4 to 12 digits.",
      ),
    );
  }
  const companyNmls = manifest.advertiser.companyNmls.trim();
  if (companyNmls.length > 0 && !NMLS_DIGITS.test(companyNmls)) {
    findings.push(
      blocking(
        "NMLS_NUMBER_REQUIRED",
        "Your company's NMLS number in Brand is not 4 to 12 digits.",
        "advertiser.companyNmls",
        "Correct your company's NMLS number in Brand. It has 4 to 12 digits.",
      ),
    );
  }
  if (!EQUAL_HOUSING.test(normaliseLibraryAdText(manifest.content.disclosureText))) {
    findings.push(
      blocking(
        "EQUAL_HOUSING_REQUIRED",
        "Your disclosure line has no Equal Housing statement.",
        "content.disclosureText",
        "Add the Equal Housing line to your disclosure in Brand.",
      ),
    );
  }
  const today = utcDay(evaluatedAt);
  const startsAfterEnd =
    manifest.schedule.startsAt !== null &&
    new Date(manifest.schedule.startsAt).getTime() >= new Date(manifest.schedule.endsAt).getTime();
  if (utcDay(manifest.schedule.endsAt) <= today || startsAfterEnd) {
    findings.push(
      blocking(
        "RUN_DATES_INVALID",
        "The end date is not after today.",
        "schedule.endsAt",
        "Choose an end date after today.",
      ),
    );
  }
  if (context.retiredOn !== null) {
    findings.push(
      blocking(
        "LIBRARY_AD_RETIRED",
        "This ad was taken out of the library.",
        "libraryAd",
        "Choose another ad. Your budget, dates and area are kept.",
      ),
    );
  }
  return Object.freeze(findings);
}
