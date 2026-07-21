import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { createAnthropicMessagesProviderClient, type AiTelemetryPort } from "@oalo/ai";
import {
  parseProductionServiceConfiguration,
  parseProductionTaskRuntimeConfiguration,
  type ProductionHighLevelLocationPitConfiguration,
  type ProductionServiceConfiguration,
} from "@oalo/config";
import { DeliveryReferenceSchema, type DeliveryReference } from "@oalo/contracts";
import {
  createPostgresPool,
  createPostgresAiTelemetryPort,
  createPostgresPublicationCleanupReconciliationPort,
  createResolverAwarePostgresDeliveryGuard,
  type AiTelemetryDatabaseContextResolver,
  type AiTelemetryPair,
  type DeliveryDatabaseContextResolver,
  type PublicationCleanupDatabaseContextResolver,
  type ResolvedDeliveryDatabaseContext,
} from "@oalo/db";
import {
  createLeadConnectorV2HttpTransport,
  type LeadConnectorFetchTransport,
  type LeadConnectorLocationTokenResolver,
} from "@oalo/ghl";
import { PlaywrightBrowserAdapter, type ApprovedRenderAssetLoaderPort } from "@oalo/rendering";
import {
  createR2ObjectStoreClient,
  type PublicationCleanupReconciliationPort,
} from "@oalo/storage";
import { z } from "zod";

import {
  createMetaReadPollingPortFactory,
  type DatabaseBackedDeliveryGuardPort,
  type ProductionTaskBindings,
} from "./production-task-bindings.js";
import type { ProductionMetaPublishPollTaskRequest } from "./production-poll-meta-publish.js";
import { TaskPermanentError } from "./task-retry-classification.js";

const TaskAuthorityHmacKeySchema = z.string().regex(/^[a-f0-9]{64}$/u);

export const ProductionTaskAuthorityProofSchema = z
  .object({
    schemaVersion: z.literal(1),
    delivery: DeliveryReferenceSchema,
    locationId: z.uuid(),
    actorId: z.uuid(),
    expiresAt: z.iso.datetime({ offset: true }),
    requestSha256: z.string().regex(/^[a-f0-9]{64}$/u),
    signature: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict()
  .readonly();

export type ProductionTaskAuthorityProof = z.infer<typeof ProductionTaskAuthorityProofSchema>;

export interface ProductionTaskDeliveryAuthority {
  readonly resolver: DeliveryDatabaseContextResolver &
    AiTelemetryDatabaseContextResolver &
    PublicationCleanupDatabaseContextResolver;
  withAuthority<Result>(
    proof: unknown,
    delivery: DeliveryReference,
    request: unknown,
    work: () => Promise<Result>,
  ): Promise<Result>;
}

export interface ProductionTaskRuntimeDependencies {
  readonly deliveryAuthority: ProductionTaskDeliveryAuthority;
  readonly highLevelFetch?: LeadConnectorFetchTransport;
  readonly resolveLocationToken: LeadConnectorLocationTokenResolver;
  readonly renderAssetLoader?: ApprovedRenderAssetLoaderPort;
}

export interface DeployedProductionTaskBindingsDependencies {
  readonly highLevelFetch?: LeadConnectorFetchTransport;
}

export class ProductionTaskRuntimeConfigurationError extends TaskPermanentError {
  readonly code = "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" as const;

  constructor() {
    super("Production task runtime configuration is absent or invalid.");
    this.name = "ProductionTaskRuntimeConfigurationError";
  }
}

export class ProductionTaskAuthorityError extends TaskPermanentError {
  readonly code = "PRODUCTION_TASK_AUTHORITY_INVALID" as const;

  constructor() {
    super("Production task delivery authority is absent, expired, or invalid.");
    this.name = "ProductionTaskAuthorityError";
  }
}

function databaseDeliveryGuard(
  guard: ReturnType<typeof createResolverAwarePostgresDeliveryGuard>,
): DatabaseBackedDeliveryGuardPort {
  return Object.freeze({
    idempotencyStore: "database" as const,
    claim: (delivery: DeliveryReference) => guard.claim(delivery),
    complete: (delivery: DeliveryReference) => guard.complete(delivery),
    release: (delivery: DeliveryReference) => guard.release(delivery),
    markCompletionUncertain: (
      delivery: DeliveryReference,
      problemCode: "DELIVERY_COMPLETION_UNCERTAIN",
    ) => guard.markCompletionUncertain(delivery, problemCode),
  });
}

function authorityPayload(input: {
  readonly delivery: DeliveryReference;
  readonly locationId: string;
  readonly actorId: string;
  readonly expiresAt: string;
  readonly requestSha256: string;
}): string {
  return JSON.stringify([
    1,
    input.delivery.schemaVersion,
    input.delivery.deliveryKind,
    input.delivery.deliveryRef,
    input.delivery.businessOutcomeKey,
    input.delivery.locationRef,
    input.delivery.correlationId,
    input.locationId,
    input.actorId,
    input.expiresAt,
    input.requestSha256,
  ]);
}

function authoritySignature(input: {
  readonly delivery: DeliveryReference;
  readonly locationId: string;
  readonly actorId: string;
  readonly expiresAt: string;
  readonly requestSha256: string;
  readonly hmacKey: string;
}): string {
  return createHmac("sha256", Buffer.from(input.hmacKey, "hex"))
    .update(authorityPayload(input))
    .digest("hex");
}

function canonicalAuthorityJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalAuthorityJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${canonicalAuthorityJson(record[key])}`)
      .join(",")}}`;
  }
  throw new ProductionTaskAuthorityError();
}

function requestSha256(request: unknown): string {
  return createHash("sha256").update(canonicalAuthorityJson(request)).digest("hex");
}

export function createProductionTaskAuthorityProof(input: {
  readonly delivery: unknown;
  readonly request: unknown;
  readonly locationId: string;
  readonly actorId: string;
  readonly expiresAt: string;
  readonly hmacKey: string;
}): ProductionTaskAuthorityProof {
  const delivery = DeliveryReferenceSchema.parse(input.delivery);
  const boundRequestSha256 = requestSha256(input.request);
  const unsigned = {
    delivery,
    locationId: input.locationId,
    actorId: input.actorId,
    expiresAt: input.expiresAt,
    requestSha256: boundRequestSha256,
    hmacKey: TaskAuthorityHmacKeySchema.parse(input.hmacKey),
  };
  return ProductionTaskAuthorityProofSchema.parse({
    schemaVersion: 1,
    delivery,
    locationId: input.locationId,
    actorId: input.actorId,
    expiresAt: input.expiresAt,
    requestSha256: boundRequestSha256,
    signature: authoritySignature(unsigned),
  });
}

function deliveryMatches(left: DeliveryReference, right: DeliveryReference): boolean {
  return (
    left.schemaVersion === right.schemaVersion &&
    left.deliveryKind === right.deliveryKind &&
    left.deliveryRef === right.deliveryRef &&
    left.businessOutcomeKey === right.businessOutcomeKey &&
    left.locationRef === right.locationRef &&
    left.correlationId === right.correlationId
  );
}

export function createTrustedProductionTaskDeliveryAuthority(
  hmacKeyInput: unknown,
  now: () => Date = () => new Date(),
): ProductionTaskDeliveryAuthority {
  const hmacKey = TaskAuthorityHmacKeySchema.parse(hmacKeyInput);
  const contexts = new AsyncLocalStorage<ResolvedDeliveryDatabaseContext>();
  function activeContext(): ResolvedDeliveryDatabaseContext {
    const context = contexts.getStore();
    if (context === undefined) {
      throw new ProductionTaskAuthorityError();
    }
    return context;
  }

  const resolver: ProductionTaskDeliveryAuthority["resolver"] = Object.freeze({
    async resolveDeliveryDatabaseContext(delivery: DeliveryReference): Promise<unknown> {
      const context = activeContext();
      if (
        context.locationRef !== delivery.locationRef ||
        context.correlationId !== delivery.correlationId
      ) {
        throw new ProductionTaskAuthorityError();
      }
      return context;
    },
    async resolveAiTelemetryDatabaseContext(pair: AiTelemetryPair): Promise<unknown> {
      const context = activeContext();
      if (
        context.locationRef !== pair.usage.locationRef ||
        context.correlationId !== pair.usage.correlationRef
      ) {
        throw new ProductionTaskAuthorityError();
      }
      return Object.freeze({
        actorId: context.actorId,
        actorRef: pair.usage.actorRef,
        authorityState: "active" as const,
        correlationId: context.correlationId,
        locationId: context.locationId,
        locationRef: context.locationRef,
      });
    },
    async resolvePublicationCleanupDatabaseContext(): Promise<unknown> {
      const context = activeContext();
      return Object.freeze({
        actorId: context.actorId,
        authorityState: "active" as const,
        correlationId: context.correlationId,
        locationId: context.locationId,
        locationRef: context.locationRef,
      });
    },
  });

  return Object.freeze({
    resolver,
    async withAuthority<Result>(
      proofInput: unknown,
      delivery: DeliveryReference,
      request: unknown,
      work: () => Promise<Result>,
    ): Promise<Result> {
      const parsed = ProductionTaskAuthorityProofSchema.safeParse(proofInput);
      if (!parsed.success || !deliveryMatches(parsed.data.delivery, delivery)) {
        throw new ProductionTaskAuthorityError();
      }
      if (parsed.data.requestSha256 !== requestSha256(request)) {
        throw new ProductionTaskAuthorityError();
      }
      const expiresAt = Date.parse(parsed.data.expiresAt);
      if (!Number.isFinite(expiresAt) || expiresAt <= now().getTime()) {
        throw new ProductionTaskAuthorityError();
      }
      const expected = authoritySignature({
        delivery,
        locationId: parsed.data.locationId,
        actorId: parsed.data.actorId,
        expiresAt: parsed.data.expiresAt,
        requestSha256: parsed.data.requestSha256,
        hmacKey,
      });
      const expectedBytes = Buffer.from(expected, "hex");
      const receivedBytes = Buffer.from(parsed.data.signature, "hex");
      if (
        expectedBytes.length !== receivedBytes.length ||
        !timingSafeEqual(expectedBytes, receivedBytes)
      ) {
        throw new ProductionTaskAuthorityError();
      }
      const context: ResolvedDeliveryDatabaseContext = Object.freeze({
        locationId: parsed.data.locationId,
        actorId: parsed.data.actorId,
        correlationId: delivery.correlationId,
        locationRef: delivery.locationRef,
        authorityState: "active",
      });
      return contexts.run(context, work);
    },
  });
}

export function createSingleLocationHighLevelLocationTokenResolver(
  configuration: ProductionHighLevelLocationPitConfiguration,
): LeadConnectorLocationTokenResolver {
  const locationRef = configuration.locationRef;
  const locationToken = Object.freeze({
    locationId: configuration.locationId,
    accessToken: configuration.accessToken,
  });
  return async (input) => {
    if (input.locationRef !== locationRef) {
      throw new ProductionTaskRuntimeConfigurationError();
    }
    return locationToken;
  };
}

function composeProductionTaskBindings(
  configuration: ProductionServiceConfiguration,
  dependencies: ProductionTaskRuntimeDependencies,
): ProductionTaskBindings {
  if (
    typeof dependencies?.deliveryAuthority?.resolver?.resolveDeliveryDatabaseContext !==
      "function" ||
    typeof dependencies.deliveryAuthority.resolver.resolveAiTelemetryDatabaseContext !==
      "function" ||
    typeof dependencies.deliveryAuthority.resolver.resolvePublicationCleanupDatabaseContext !==
      "function" ||
    typeof dependencies?.deliveryAuthority?.withAuthority !== "function" ||
    (dependencies.highLevelFetch !== undefined &&
      typeof dependencies.highLevelFetch !== "function") ||
    typeof dependencies?.resolveLocationToken !== "function"
  ) {
    throw new ProductionTaskRuntimeConfigurationError();
  }
  const pool = createPostgresPool(configuration.database);
  const deliveryGuard = databaseDeliveryGuard(
    createResolverAwarePostgresDeliveryGuard(pool, dependencies.deliveryAuthority.resolver),
  );
  const aiTelemetry: AiTelemetryPort = createPostgresAiTelemetryPort(
    pool,
    dependencies.deliveryAuthority.resolver,
  );
  const publicationCleanupReconciliation: PublicationCleanupReconciliationPort =
    createPostgresPublicationCleanupReconciliationPort(
      pool,
      dependencies.deliveryAuthority.resolver,
    );
  const metaTransport = createLeadConnectorV2HttpTransport(
    { requestTimeoutMs: configuration.ghl.requestTimeoutMs },
    {
      resolveLocationToken: dependencies.resolveLocationToken,
      ...(dependencies.highLevelFetch === undefined ? {} : { fetch: dependencies.highLevelFetch }),
    },
  );
  const aiProvider = createAnthropicMessagesProviderClient(configuration.anthropic);
  const objectStore = createR2ObjectStoreClient(configuration.r2);
  const pdfBrowser = new PlaywrightBrowserAdapter(dependencies.renderAssetLoader);
  return Object.freeze({
    deliveryGuard,
    aiProvider,
    aiTelemetry,
    pdfBrowser,
    pdfStorage: objectStore,
    publicationCleanupReconciliation,
    publicationObjectStore: objectStore,
    withDeliveryAuthority: dependencies.deliveryAuthority.withAuthority,
    createMetaPublishPollingPort: (request: ProductionMetaPublishPollTaskRequest) =>
      createMetaReadPollingPortFactory(metaTransport)(request),
  });
}

export function createProductionTaskBindings(
  input: unknown,
  dependencies: ProductionTaskRuntimeDependencies,
): ProductionTaskBindings {
  try {
    return composeProductionTaskBindings(parseProductionServiceConfiguration(input), dependencies);
  } catch (error) {
    if (error instanceof ProductionTaskRuntimeConfigurationError) throw error;
    throw new ProductionTaskRuntimeConfigurationError();
  }
}

export function createDeployedProductionTaskBindings(
  input: unknown,
  dependencies: DeployedProductionTaskBindingsDependencies = {},
): ProductionTaskBindings {
  try {
    const runtime = parseProductionTaskRuntimeConfiguration(input);
    return composeProductionTaskBindings(runtime.services, {
      deliveryAuthority: createTrustedProductionTaskDeliveryAuthority(runtime.taskAuthorityHmacKey),
      resolveLocationToken: createSingleLocationHighLevelLocationTokenResolver(
        runtime.highLevelLocationPit,
      ),
      ...(dependencies.highLevelFetch === undefined
        ? {}
        : { highLevelFetch: dependencies.highLevelFetch }),
    });
  } catch (error) {
    if (error instanceof ProductionTaskRuntimeConfigurationError) throw error;
    throw new ProductionTaskRuntimeConfigurationError();
  }
}

export function createProductionTaskBindingsAccessor(
  initialize: () => ProductionTaskBindings,
): () => ProductionTaskBindings {
  let initialized: ProductionTaskBindings | undefined;
  return () => {
    if (initialized === undefined) {
      const candidate = initialize();
      if (candidate.deliveryGuard.idempotencyStore !== "database") {
        throw new ProductionTaskRuntimeConfigurationError();
      }
      initialized = Object.freeze({ ...candidate });
    }
    return initialized;
  };
}

const deployedProductionTaskBindings = createProductionTaskBindingsAccessor(() =>
  createDeployedProductionTaskBindings(process.env),
);

export function productionTaskBindings(): ProductionTaskBindings {
  return deployedProductionTaskBindings();
}
