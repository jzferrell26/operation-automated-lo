import type { DeliveryGuardPort } from "@oalo/application";
import type { AiTelemetryPort, AnthropicMessagesProviderClient } from "@oalo/ai";
import type { DeliveryReference } from "@oalo/contracts";
import {
  createMetaPublishingProgressPollingPort,
  type ProductionMetaReadTransport,
} from "@oalo/ghl";
import type { DeterministicBrowserPort, PrivateArtifactPort } from "@oalo/rendering";
import type {
  ProductionObjectStoreAdapter,
  PublicationCleanupReconciliationPort,
} from "@oalo/storage";

import type {
  ProductionMetaPublishPollTaskRequest,
  ProductionMetaPublishPollingPort,
} from "./production-poll-meta-publish.js";

export interface DatabaseBackedDeliveryGuardPort extends DeliveryGuardPort {
  readonly idempotencyStore: "database";
}

export function createMetaReadPollingPortFactory(
  transport: ProductionMetaReadTransport,
): ProductionTaskBindings["createMetaPublishPollingPort"] {
  return (request) =>
    createMetaPublishingProgressPollingPort({
      locationRef: request.delivery.locationRef,
      campaignId: request.campaignId,
      transport,
    });
}

/**
 * The runtime bootstrap must install a database-backed delivery guard and real
 * service ports before a task can process a non-fixture workload. Deliberately
 * no default implementation exists in this package.
 */
export interface ProductionTaskBindings {
  readonly deliveryGuard: DatabaseBackedDeliveryGuardPort;
  readonly aiProvider: AnthropicMessagesProviderClient;
  readonly aiTelemetry: AiTelemetryPort;
  readonly pdfBrowser: DeterministicBrowserPort;
  readonly pdfStorage: PrivateArtifactPort;
  readonly publicationCleanupReconciliation: PublicationCleanupReconciliationPort;
  readonly publicationObjectStore: Pick<
    ProductionObjectStoreAdapter,
    "quarantinePartialPublication"
  >;
  readonly withDeliveryAuthority: <Result>(
    proof: unknown,
    delivery: DeliveryReference,
    request: unknown,
    work: () => Promise<Result>,
  ) => Promise<Result>;
  readonly createMetaPublishPollingPort: (
    request: ProductionMetaPublishPollTaskRequest,
  ) => ProductionMetaPublishPollingPort | Promise<ProductionMetaPublishPollingPort>;
}
