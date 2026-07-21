import type { DeliveryGuardPort } from "@oalo/application";
import {
  createMetaPublishingProgressPollingPort,
  type ProductionMetaReadTransport,
} from "@oalo/ghl";
import type { DeterministicBrowserPort, PrivateArtifactPort } from "@oalo/rendering";

import type {
  ProductionMetaPublishPollTaskRequest,
  ProductionMetaPublishPollingPort,
} from "./production-poll-meta-publish.js";
import { TaskPermanentError } from "./task-retry-classification.js";

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
  readonly pdfBrowser: DeterministicBrowserPort;
  readonly pdfStorage: PrivateArtifactPort;
  readonly createMetaPublishPollingPort: (
    request: ProductionMetaPublishPollTaskRequest,
  ) => ProductionMetaPublishPollingPort | Promise<ProductionMetaPublishPollingPort>;
}

let bindings: ProductionTaskBindings | undefined;

export function configureProductionTaskBindings(next: ProductionTaskBindings): void {
  if (bindings !== undefined) {
    throw new TaskPermanentError("Production task bindings are already configured.");
  }
  if (next.deliveryGuard.idempotencyStore !== "database") {
    throw new TaskPermanentError(
      "Production task bindings require a database-backed idempotency guard.",
    );
  }
  bindings = Object.freeze({ ...next });
}

export function requireProductionTaskBindings(): ProductionTaskBindings {
  if (bindings === undefined) {
    throw new TaskPermanentError(
      "Production task bindings are not configured. Refusing to run with fixture or in-memory ports.",
    );
  }
  return bindings;
}
