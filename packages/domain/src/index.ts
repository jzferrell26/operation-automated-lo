export const foundationPhase = "phase-0-evidence-harness" as const;

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
  preflightHasOnlyDeterministicInputs,
  validateApprovalLink,
} from "./campaign-foundation.js";
