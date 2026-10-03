import { contractVersion } from "@oalo/contracts";
export { calculateHomeEquity, buildHomeReport, homeReportFreshness } from "./homeowner-reports.js";
import { foundationPhase, type FoundationStatus } from "@oalo/domain";

export * from "./tenant-installation.js";

export interface FoundationSnapshot extends FoundationStatus {
  readonly contractVersion: typeof contractVersion;
}

export function getFoundationSnapshot(): FoundationSnapshot {
  return Object.freeze({
    phase: foundationPhase,
    productionTrafficEnabled: false,
    contractVersion,
  });
}

export {
  DeliveryCompletionUncertainError,
  executeCommand,
  executeProviderOperation,
  processDelivery,
  queueConstraint,
  sweepOutbox,
  type CommandAuthorityPort,
  type CommandTransaction,
  type CommittedCommand,
  type DeliveryGuardPort,
  type ExecuteCommandResult,
  type OutboxDispatcher,
  type OutboxLease,
  type OutboxPort,
  type ProviderOperationOutcome,
  type ProviderOperationPort,
  type QueueClass,
  type QueueConstraint,
  type SweepResult,
  type TransactionPort,
} from "./durable-foundation.js";

export {
  appendProfileVersion,
  compileBrandRules,
  confirmBrandSuggestion,
  evaluateValidatedProfileReadiness,
  fetchExternalProfileUrl,
  ingestProfileAsset,
  previewProfileVersion,
  rollBackProfileVersion,
  resolveExternalProfileUrl,
  validateExternalProfileUrl,
  type AppendProfileVersionInput,
  type PrivateProfileAssetPort,
  type PinnedProfileRetrieverPort,
  type ProfileAssetDecoderPort,
  type ProfileDnsResolverPort,
  type ProfileRepository,
  type ProfileTransaction,
  type ValidatedExternalProfileFetchPlan,
} from "./profile-foundation.js";

export {
  appendCampaignTransition,
  authorizePaidAdProjectionForRendering,
  campaignProjectionHash,
  canonicalCampaignHash,
  completeRegeneration,
  createApprovalDecision,
  createCampaignVersion,
  createCampaignProjections,
  createProjectionApprovalDecision,
  duplicateCampaign,
  recordGeneration,
  redeemApprovalLink,
  retryCampaignOperation,
  runCampaignPreflight,
  type PaidAdBrandAttestationAuthority,
  runPaidAdBrandPreflight,
  type ApprovalAuthorityPort,
  type ApprovalLinkPort,
  type CampaignEventPort,
  type CampaignVersionRepository,
  type CampaignVersionTransaction,
  type CampaignProjectionPair,
  type PaidAdBrandPreflightResult,
} from "./campaign-foundation.js";

export {
  libraryAdCopyRef,
  libraryAdCreativeRef,
  libraryAdDisclosureRef,
  libraryAdImageRef,
} from "./library-ad-references.js";

export {
  CAMPAIGN_APPROVAL_ROLES,
  CAMPAIGN_MUTATION_ROLES,
  CampaignCommandForbiddenError,
  CampaignPrincipalInvalidError,
  CampaignResourceNotAccessibleError,
  approvalActorRoleForPrincipal,
  assertCampaignAccessible,
  assertMayExecuteCampaignMutation,
  assertPrincipalOwnsTransaction,
  createCampaignTenantContext,
  createSessionApprovalAuthority,
  freezeAuthenticatedPrincipal,
  type AuthenticatedPrincipal,
  type AuthenticationMode,
} from "./campaign-command-context.js";

export {
  CampaignApprovalNotReadyError,
  CampaignApprovalStaleError,
  CampaignLibraryAdRefusedError,
  executeHumanCampaignApproval,
  libraryAdRefusalFor,
  recordedLibraryAdOf,
  type LibraryAdCatalogPort,
  type LibraryAdCatalogStanding,
  type LibraryAdRefusalReason,
  type RecordedLibraryAd,
  type CampaignApprovalCommitInput,
  type CampaignApprovalCommitResult,
  type CampaignApprovalEvidence,
  type CampaignApprovalRepository,
  type CampaignApprovalTransaction,
  type HumanCampaignApprovalInput,
  type HumanCampaignApprovalResult,
} from "./campaign-approval-command.js";

export {
  campaignMayBeApprovedBy,
  campaignVersionHref,
  deriveCampaignNextActions,
  deriveCampaignStanding,
  deriveOlderVersionStanding,
  principalHasCampaignApprovalRole,
  projectCampaignVersions,
  projectCampaignWorkspace,
  type CampaignNextActionId,
  type CampaignPersistenceKind,
  type CampaignStanding,
  type CampaignVersionSummary,
  type CampaignWorkspaceApprovalProjection,
  type CampaignWorkspaceNextAction,
  type CampaignWorkspacePreflightProjection,
  type CampaignWorkspaceProjection,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceReadRepository,
  type CampaignWorkspaceVersionRecord,
} from "./campaign-workspace-read.js";

/**
 * PRD-009d D5 and 009D-AC-014. The ruleset registry and the library-ad rule codes, for the web
 * application, which reads the domain only through this package. Step 3 counts the checks a saved
 * version ran from the registry entry for its stored ruleset reference.
 */
export {
  LIBRARY_AD_RULESET_REF,
  OPEN_HOUSE_RULESET_REF,
  PREFLIGHT_RULESET_REGISTRY,
  evaluateLibraryAdWords,
  rulesetRuleCodes,
  type LibraryAdRuleCode,
  type LibraryAdTexts,
  type PreflightRuleCode,
} from "@oalo/domain";

export {
  LeadSubmissionRejectedError,
  acceptPublicLeadSubmission,
  evaluateLeadPathLaunchGate,
  normalizeLeadEmail,
  normalizeLeadPhone,
  type LeadAbuseGuardPort,
  type LeadCampaignResolverPort,
  type LeadSubmissionAcceptancePort,
  type LeadSubmissionClockPort,
  type LeadSubmissionIdentityPort,
  type LeadSubmissionPorts,
  type PublicLeadAcceptedResponse,
  type PublicLeadRequestMetadata,
  type ResolvedLeadCampaign,
} from "./lead-intake.js";

export {
  LaunchReadinessError,
  ONBOARDING_CHECKLIST,
  OnboardingRoleBindingLedger,
  authorizeOnboardingRoleAssignment,
  configureOnboardingProviderObjects,
  evaluatePermissionReadiness,
  recomputeLaunchReadiness,
  recordOnboardingEvent,
  safeReadinessDiagnostics,
  validateChecklistCardinality,
  type LaunchReadinessClockPort,
  type LaunchReadinessHashPort,
  type LaunchReadinessIdentityPort,
  type LaunchReadinessPolicy,
  type LaunchReadinessPorts,
  type LaunchReadinessRepositoryPort,
  type LaunchReadinessVerifierPort,
  type OnboardingEventPort,
  type OnboardingConfigurationPort,
  type OnboardingConfigurationRequest,
  type OnboardingProviderObject,
  type OnboardingRoleBinding,
} from "./launch-readiness.js";

export {
  ONBOARDING_PROGRESS_STEP_IDS,
  OnboardingProgressConflictError,
  OnboardingProgressRecordSchema,
  OnboardingProgressScopeSchema,
  OnboardingProgressStepIdSchema,
  OnboardingRecoveryEventSchema,
  OnboardingRecoveryKindSchema,
  OnboardingSectionVerificationSchema,
  ServerOnboardingProgressRepository,
  onboardingProgressRecordKey,
  type OnboardingProgressRecord,
  type OnboardingProgressRecordStorePort,
  type OnboardingProgressScope,
  type OnboardingProgressStepId,
  type OnboardingRecoveryEvent,
  type OnboardingRecoveryKind,
  type OnboardingSectionVerification,
} from "./onboarding-progress.js";

export {
  REPORTING_METRIC_KEYS,
  ReportingError,
  aggregateBlueprintMetrics,
  authorizeAgencyPortfolio,
  buildCampaignReportingRecord,
  buildSafeSupportNotification,
  canOpenReportingTarget,
  createReportingException,
  filterCampaignHistory,
  projectRealtorCampaigns,
  recordCollaboratorAuditEvent,
  summarizeCohortEvents,
  type CampaignHistoryFilter,
  type CampaignReportingInput,
  type CohortSummary,
  type CollaboratorAuditPort,
  type ReportingMetricKey,
  type ReportingTargetAuthorization,
} from "./reporting.js";
