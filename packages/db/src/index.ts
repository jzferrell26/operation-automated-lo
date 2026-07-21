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
  withSupportTransaction,
  withTenantTransaction,
  type SupportContextAuthority,
  type SupportDatabaseContext,
  type TenantContextAuthority,
  type TenantDatabaseContext,
  type TenantTransaction,
} from "./transaction-context.js";
