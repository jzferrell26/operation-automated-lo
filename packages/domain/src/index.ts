export const foundationPhase = "phase-0-evidence-harness" as const;
export {
  estimateMortgageBalance,
  estimatedSaleProceeds,
  hypotheticalBorrowingRoom,
  nextMonthlyRefresh,
  type AmortizationInput,
} from "./homeowner-finance.js";

export * from "./tenant-installation.js";

export type FoundationPhase = typeof foundationPhase;

export interface FoundationStatus {
  readonly phase: FoundationPhase;
  readonly productionTrafficEnabled: false;
}

export {
  commandStatuses,
  isRetryableProviderFailure,
  providerFailureClasses,
  requiresReconciliation,
  type CommandStatus,
  type ProviderFailureClass,
  type ProviderWriteResult,
  type ReconciliationResult,
} from "./durable-foundation.js";

export {
  ProfilePolicyError,
  assertBrandSampleClassification,
  assertProfileCanBecomeCurrent,
  assertProfileFieldOwnership,
  evaluateProfileReadiness,
} from "./profile-foundation.js";

export {
  CampaignPolicyError,
  assertCampaignTransition,
  assertCampaignVersionTenant,
  assertPublishFreshness,
  evaluateCampaignPreflight,
  evaluatePaidAdBrandBoundary,
  preflightHasOnlyDeterministicInputs,
  validateApprovalLink,
} from "./campaign-foundation.js";

export {
  LIBRARY_AD_ONLY_RULE_CODES,
  LIBRARY_AD_RULESET_REF,
  OPEN_HOUSE_RULESET_REF,
  PREFLIGHT_RULESET_REGISTRY,
  rulesetRuleCodes,
  type LibraryAdRuleCode,
  type OpenHouseRuleCode,
  type PreflightRuleCode,
} from "./library-ad-ruleset.js";
export {
  LIBRARY_AD_TEXT_FIELDS,
  LIBRARY_AD_TEXT_PATHS,
  LIBRARY_AD_WORD_RULE_CODES,
  evaluateLibraryAdWords,
  findRatePaymentOrTermClaim,
  type LibraryAdTextField,
  type LibraryAdTexts,
  type LibraryAdWordRuleCode,
} from "./library-ad-words.js";
export { normaliseLibraryAdText } from "./library-ad-text.js";
export {
  LIBRARY_AD_PLACE_AUDIENCE_WORDS,
  LIBRARY_AD_PLACE_LIMITS,
  US_STATE_CODES,
  libraryAdPlacesProblem,
} from "./library-ad-places.js";
