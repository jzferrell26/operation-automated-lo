import { contractVersion } from "@oalo/contracts";

export const databasePackage = Object.freeze({
  contractVersion,
  implementation: "postgres-17-tenant-foundation",
});

export {
  acquireQueueLeaseContract,
  authorityActiveContract,
  leaseOutboxBatchContract,
  type AuthorityActiveRow,
  type LeasedOutboxEventRow,
  type QueueLeaseRow,
} from "./foundation-contracts.js";
export {
  createResolverAwarePostgresDeliveryGuard,
  DeliveryGuardContextError,
  DeliveryGuardPersistenceError,
  PostgresDeliveryGuard,
  type DatabaseDeliveryGuardPort,
  type DeliveryDatabaseContextResolver,
  type ResolvedDeliveryDatabaseContext,
} from "./delivery-guard.js";
export {
  AiTelemetryPersistenceError,
  createPostgresAiTelemetryPort,
  PostgresAiTelemetryPort,
  type AiTelemetryDatabaseContextResolver,
  type AiTelemetryPair,
  type DatabaseAiTelemetryPort,
  type ResolvedAiTelemetryDatabaseContext,
} from "./ai-telemetry.js";
export {
  createPostgresPublicationCleanupReconciliationPort,
  PostgresPublicationCleanupReconciliationPort,
  PublicationCleanupPersistenceError,
  type DatabasePublicationCleanupReconciliationPort,
  type PublicationCleanupDatabaseContextResolver,
  type ResolvedPublicationCleanupDatabaseContext,
} from "./publication-cleanup.js";
export type { PublicationCleanupIntent, PublicationCleanupLease } from "@oalo/contracts";
export {
  CampaignPersistenceError,
  PostgresCampaignVersionRepository,
  campaignVersionContracts,
  createPostgresCampaignVersionRepository,
} from "./campaign-repository.js";
export {
  createPostgresPool,
  PostgresAdapterError,
  PostgresDatabasePool,
  type DatabaseDeploymentEnvironment,
  type PostgresPoolConfiguration,
} from "./postgres-adapter.js";
export {
  defineSqlContract,
  type DatabaseConnection,
  type DatabasePool,
  type SqlContract,
  type SqlDriverResult,
  type SqlRequest,
  type SqlScalar,
} from "./sql-contract.js";
export {
  DatabaseContextError,
  isSqlDriverResult,
  shouldAssumeRuntimeRole,
  withSupportTransaction,
  withTenantTransaction,
  type SupportContextAuthority,
  type SupportDatabaseContext,
  type TenantContextAuthority,
  type TenantDatabaseContext,
  type TenantTransaction,
} from "./transaction-context.js";
