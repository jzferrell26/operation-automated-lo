import { ADS_LIBRARY_ART_SIZES, type PreflightRules } from "@oalo/contracts";

/**
 * PRD-009c D6. The library-ad ruleset's shared values.
 *
 * Its image minimum is the smallest art the catalog format allows, the square art's 1080 by 842,
 * because the open house minimum of 1200 by 630 (`apps/web/src/server/open-house-draft.ts`) would
 * refuse every library ad. The budget bounds are the open house ruleset's, which 009d D6 keeps.
 * 009d adds the library-ad rules (the word, brand, and date checks of its D5) in Wave 2.
 */

export const LIBRARY_AD_RULESET_VERSION_REF = "ruleset_libraryAd001";

export const LIBRARY_AD_MINIMUM_IMAGE = Object.freeze({
  width: ADS_LIBRARY_ART_SIZES.square.width,
  height: ADS_LIBRARY_ART_SIZES.square.height,
});

export function libraryAdPreflightRules(evaluatedAt: Date): PreflightRules {
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
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
  };
}
