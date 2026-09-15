import { contractVersion } from "@oalo/contracts";
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
  executeHumanCampaignApproval,
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
  deriveCampaignNextActions,
  principalHasCampaignApprovalRole,
  projectCampaignWorkspace,
  type CampaignNextActionId,
  type CampaignPersistenceKind,
  type CampaignWorkspaceApprovalProjection,
  type CampaignWorkspaceNextAction,
  type CampaignWorkspacePreflightProjection,
  type CampaignWorkspaceProjection,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceReadRepository,
} from "./campaign-workspace-read.js";

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
  REPORTING_METRIC_DEFINITIONS,
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
  type ReportingTargetAuthorization,
} from "./reporting.js";
