import { contractVersion } from "@oalo/contracts";

export const storagePackage = Object.freeze({
  contractVersion,
  implementation: "private-and-published-storage-contract",
});

export {
  planPrivateTransfer,
  privateArtifactKey,
  publishProjection,
  publishedArtifactKey,
  withdrawProjection,
  type PublishedStoragePort,
} from "./production-storage.js";

export {
  withdrawProjectionWithAudit,
  type ProjectionWithdrawalAuditPort,
  type ProjectionWithdrawalRecord,
} from "./projection-withdrawal.js";

export {
  ProductionObjectStorePolicySchema,
  authorizePrivateObjectTransfer,
  publicationCleanupBackoffMilliseconds,
  publishProjectionWithObjectStore,
  reconcilePublicationCleanup,
  PublicationCleanupReleaseError,
  PublicationCleanupReconciliationRequiredError,
  withdrawProjectionWithObjectStoreAudit,
  type PrivateTransferAuthorization,
  type PublicationCleanupReconciliationPort,
  type PublicationCleanupRetryPolicy,
  type ProductionObjectStoreAdapter,
  type ProductionObjectStorePolicy,
} from "./production-object-store.js";
export type { PublicationCleanupIntent, PublicationCleanupLease } from "@oalo/contracts";

export {
  R2ObjectStoreConfigurationError,
  R2ObjectStoreError,
  createR2ObjectStoreClient,
  type R2FailureClassification,
  type R2FetchTransport,
  type R2HttpResponse,
  type R2ObjectStoreClient,
  type R2ObjectStoreDependencies,
  type R2ObjectStoreProbeResult,
  type SignedPrivateTransfer,
} from "./r2-object-store-client.js";
