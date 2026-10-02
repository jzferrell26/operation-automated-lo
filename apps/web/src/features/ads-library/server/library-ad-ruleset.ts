import {
  ADS_LIBRARY_ART_SIZES,
  type AdsLibraryEntry,
  type LibraryAdRuleContext,
  type PreflightRules,
} from "@oalo/contracts";

/**
 * PRD-009c D6 and PRD-009d D5. The library-ad ruleset.
 *
 * Its image minimum is the smallest art the catalog format allows, the square art's 1080 by 842,
 * because the open house minimum of 1200 by 630 would refuse every library ad. The budget bounds are
 * the open house ruleset's, which 009d D6 keeps: $5 to $1,000 a day and at most $5,000 in total.
 *
 * The rules themselves live in the domain (`packages/domain/src/library-ad-ruleset.ts`): every
 * shared rule plus the word, brand, date, and retirement checks of 009d D5. What they need beyond
 * the shared values is the check's own context: the ad's word limits, the person's saved Realtor
 * partners (whose names the co-brand rule refuses), and whether the ad was retired before the check
 * ran.
 */

export const LIBRARY_AD_RULESET_VERSION_REF = "ruleset_libraryAd001";

export const LIBRARY_AD_MINIMUM_IMAGE = Object.freeze({
  width: ADS_LIBRARY_ART_SIZES.square.width,
  height: ADS_LIBRARY_ART_SIZES.square.height,
});

/** D6: the bounds a daily and a total budget must stay inside, in cents. */
export const LIBRARY_AD_BUDGET_BOUNDS = Object.freeze({
  minimumDailyBudgetMinor: 500,
  maximumDailyBudgetMinor: 100_000,
  maximumTotalBudgetMinor: 500_000,
});

/** The context of one check of `entry`, for a person whose saved partners are `partnerNames`. */
export function libraryAdRuleContext(
  entry: AdsLibraryEntry,
  partnerNames: readonly string[],
): LibraryAdRuleContext {
  return {
    headlineMaxLength: entry.editable.headline.maxLength,
    primaryTextMaxLength: entry.editable.primaryText.maxLength,
    partnerNames: [...partnerNames],
    retiredOn: entry.status === "retired" ? (entry.retired?.on ?? null) : null,
  };
}

export function libraryAdPreflightRules(
  evaluatedAt: Date,
  context: LibraryAdRuleContext,
): PreflightRules {
  return {
    schemaVersion: 1,
    rulesetVersionRef: LIBRARY_AD_RULESET_VERSION_REF,
    evaluatedAt: evaluatedAt.toISOString(),
    minimumImageWidth: LIBRARY_AD_MINIMUM_IMAGE.width,
    minimumImageHeight: LIBRARY_AD_MINIMUM_IMAGE.height,
    earliestStartAt: evaluatedAt.toISOString(),
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    ...LIBRARY_AD_BUDGET_BOUNDS,
    warnings: [],
    libraryAd: context,
  };
}
