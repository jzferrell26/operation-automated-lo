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
  publishProjectionWithObjectStore,
  withdrawProjectionWithObjectStoreAudit,
  type PrivateTransferAuthorization,
  type ProductionObjectStoreAdapter,
  type ProductionObjectStorePolicy,
} from "./production-object-store.js";
