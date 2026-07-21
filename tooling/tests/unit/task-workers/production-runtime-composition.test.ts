import { describe, expect, it, vi } from "vitest";

import {
  ProductionTaskAuthorityError,
  ProductionTaskRuntimeConfigurationError,
  createDeployedProductionTaskBindings,
  createProductionTaskAuthorityProof,
  createProductionTaskBindings,
  createProductionTaskBindingsAccessor,
  createSingleLocationHighLevelLocationTokenResolver,
  createTrustedProductionTaskDeliveryAuthority,
} from "../../../../apps/tasks/src/core/production-runtime-composition.js";
import type { ProductionTaskBindings } from "../../../../apps/tasks/src/core/production-task-bindings.js";
import { executePollMetaPublishTask } from "../../../../apps/tasks/src/tasks/poll-meta-publish.js";
import { executeRenderCampaignPdfTask } from "../../../../apps/tasks/src/tasks/render-campaign-pdf.js";
import {
  createCandidateDeploymentManifest,
  parseProductionServiceConfiguration,
  productionTriggerProjectReference,
} from "../../../../packages/config/src/index.js";
import {
  LEADCONNECTOR_V2_API_VERSION,
  LEADCONNECTOR_V2_BASE_URL,
  type LeadConnectorFetchTransport,
} from "../../../../packages/ghl/src/index.js";
import { commonRenderManifest } from "../../fixtures/prd001d-render-manifests.js";

const modelRef = "claude-sonnet-configured";
const authorityHmacKey = "a".repeat(64);
const highLevelAccessToken = `pit_${"t".repeat(48)}`;
const productionServiceEnvironment = {
  OALO_ENVIRONMENT: "staging",
  OALO_DATABASE_URL: "postgresql://runtime:secret@db.example.test/oalo?sslmode=require",
  OALO_DATABASE_SSL_MODE: "require",
  OALO_ANTHROPIC_PROVIDER_REF: "provider_01Anthropic",
  OALO_ANTHROPIC_API_KEY: `sk-ant-${"s".repeat(40)}`,
  OALO_ANTHROPIC_PRICING_JSON: JSON.stringify({
    [modelRef]: {
      uncachedInputUsdPerMillionTokens: 3,
      cacheWriteUsdPerMillionTokens: 3.75,
      cacheReadUsdPerMillionTokens: 0.3,
      outputUsdPerMillionTokens: 15,
    },
  }),
  OALO_R2_ACCOUNT_ID: "a".repeat(32),
  OALO_R2_ACCESS_KEY_ID: "accessKey_01Production",
  OALO_R2_SECRET_ACCESS_KEY: "s".repeat(48),
  OALO_R2_PRIVATE_BUCKET: "oalo-private-staging",
  OALO_R2_PUBLIC_BUCKET: "oalo-public-staging",
  OALO_R2_PUBLIC_BASE_URL: "https://assets.example.test/immutable/",
  OALO_GHL_READINESS_LOCATION_REF: "location_01TenantA",
  OALO_PROVIDER_TIMEOUT_MS: "5000",
};

function fullTaskEnvironment() {
  const commit = "c".repeat(40);
  const buildId = "build-staging-task-001";
  const appUrl = "https://staging.oalo.test";
  const releaseManifest = createCandidateDeploymentManifest({
    environment: "staging",
    commit,
    buildId,
    generatedAt: "2026-07-21T12:00:00.000Z",
    verificationReference: "test:tasks:staging:001",
    versions: {
      web: buildId,
      tasks: buildId,
      databaseMigration: "migration-001",
      contract: "contract-001",
      renderer: "renderer-001",
      template: "template-001",
    },
  });
  return {
    ...productionServiceEnvironment,
    OALO_APP_URL: appUrl,
    OALO_ALLOWED_ORIGINS: appUrl,
    OALO_PROVIDER_MODE: "contract-test",
    OALO_DATA_CLASSIFICATION: "approved-test-only",
    OALO_STRIPE_MODE: "test",
    OALO_TRIGGER_ENVIRONMENT: "staging",
    OALO_SUPABASE_MODE: "staging",
    OALO_PRODUCTION_TRAFFIC: "disabled",
    OALO_BUILD_COMMIT: commit,
    OALO_BUILD_ID: buildId,
    OALO_DATABASE_ID: "staging:database",
    OALO_TASK_PROJECT_ID: "proj_staging_tasks_001",
    OALO_SECRET_SCOPE_ID: "staging:secrets",
    OALO_PRIVATE_STORAGE_ID: "staging:private",
    OALO_PUBLISHED_STORAGE_ID: "staging:published",
    OALO_PROVIDER_APP_ID: "staging:provider",
    OALO_RELEASE_MANIFEST_JSON: JSON.stringify(releaseManifest),
    OALO_TASK_AUTHORITY_HMAC_KEY: authorityHmacKey,
    OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON: JSON.stringify({
      locationRef: productionServiceEnvironment.OALO_GHL_READINESS_LOCATION_REF,
      locationId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
    }),
    OALO_GHL_LOCATION_PIT_JSON: JSON.stringify({
      locationId: productionServiceEnvironment.OALO_GHL_READINESS_LOCATION_REF,
      accessToken: highLevelAccessToken,
    }),
    NEXT_PUBLIC_OALO_ENVIRONMENT: "staging",
    NEXT_PUBLIC_OALO_APP_URL: appUrl,
    NEXT_PUBLIC_OALO_BUILD_ID: buildId,
  };
}

const deliveryAuthority = {
  resolver: {
    async resolveDeliveryDatabaseContext(
      delivery: Readonly<{
        locationRef: string;
        correlationId: string;
      }>,
    ) {
      return {
        locationRef: delivery.locationRef,
        locationId: "11111111-1111-4111-8111-111111111111",
        actorId: "22222222-2222-4222-8222-222222222222",
        correlationId: delivery.correlationId,
        authorityState: "active",
      };
    },
    async resolveAiTelemetryDatabaseContext(pair: {
      readonly usage: {
        readonly actorRef: string;
        readonly correlationRef: string;
        readonly locationRef: string;
      };
    }) {
      return {
        actorId: "22222222-2222-4222-8222-222222222222",
        actorRef: pair.usage.actorRef,
        authorityState: "active",
        correlationId: pair.usage.correlationRef,
        locationId: "11111111-1111-4111-8111-111111111111",
        locationRef: pair.usage.locationRef,
      };
    },
    async resolvePublicationCleanupDatabaseContext() {
      return {
        actorId: "22222222-2222-4222-8222-222222222222",
        authorityState: "active",
        correlationId: "correlation_01ProductionTask",
        locationId: "11111111-1111-4111-8111-111111111111",
        locationRef: commonRenderManifest.locationRef,
      };
    },
  },
  async withAuthority<Result>(
    _proof: unknown,
    _delivery: unknown,
    _request: unknown,
    work: () => Promise<Result>,
  ): Promise<Result> {
    return work();
  },
};

const runtimeDependencies = {
  deliveryAuthority,
  resolveLocationToken: async () => ({
    locationId: "provider-location-01",
    accessToken: "token_01ProductionResolverSecret",
  }),
};

const sha = (character: string) => character.repeat(64);

function delivery(deliveryRef: string) {
  return {
    schemaVersion: 1 as const,
    deliveryKind: "task" as const,
    deliveryRef,
    businessOutcomeKey: sha("b"),
    locationRef: commonRenderManifest.locationRef,
    correlationId: "correlation_01ProductionTask",
  };
}

function authorityProof(taskDelivery: ReturnType<typeof delivery>, request: unknown) {
  return createProductionTaskAuthorityProof({
    delivery: taskDelivery,
    request,
    locationId: "11111111-1111-4111-8111-111111111111",
    actorId: "22222222-2222-4222-8222-222222222222",
    expiresAt: "2030-07-21T12:00:00.000Z",
    hmacKey: authorityHmacKey,
  });
}

function publishAuthority() {
  return {
    publisherRole: "publisher" as const,
    currentPreflightPassed: true as const,
    currentApprovalPassed: true as const,
    exactVersionMatch: true as const,
    tokenHealth: "healthy" as const,
    connectedAssets: true as const,
    externalCategoryEvidence: "confirmed" as const,
    finalSummaryConfirmed: true as const,
    materialHashMatch: true as const,
  };
}

function workerBindings(): ProductionTaskBindings {
  const composed = createProductionTaskBindings(productionServiceEnvironment, runtimeDependencies);
  const claimed = new Set<string>();
  return Object.freeze({
    ...composed,
    deliveryGuard: {
      idempotencyStore: "database" as const,
      async claim(taskDelivery: ReturnType<typeof delivery>) {
        if (claimed.has(taskDelivery.deliveryRef)) return false;
        claimed.add(taskDelivery.deliveryRef);
        return true;
      },
      async complete() {},
      async release() {},
      async markCompletionUncertain() {},
    },
    pdfBrowser: {
      async render() {
        return {
          bytes: new TextEncoder().encode("%PDF-1.4\n%%EOF\n"),
          mimeType: "application/pdf" as const,
          pageCount: 1,
        };
      },
    },
    pdfStorage: {
      async store() {
        return "private/tenant-01/artifact-01.pdf";
      },
    },
    createMetaPublishPollingPort: () => ({
      async poll() {
        return {
          state: "live",
          completedSteps: 2,
          totalSteps: 2,
          observedAt: "2026-07-21T12:01:00.000Z",
        };
      },
    }),
  });
}

describe("production runtime composition", () => {
  it("validates server-only service configuration without returning raw environment keys", () => {
    const parsed = parseProductionServiceConfiguration(productionServiceEnvironment);

    expect(parsed).toMatchObject({
      database: {
        deploymentEnvironment: "staging",
        poolingMode: "transaction",
        preparedStatements: false,
      },
      anthropic: { providerRef: "provider_01Anthropic", requestTimeoutMs: 5_000 },
      ghl: { readinessLocationRef: "location_01TenantA", requestTimeoutMs: 5_000 },
    });
    expect(parsed).not.toHaveProperty("OALO_ANTHROPIC_API_KEY");
  });

  it("composes concrete database, HighLevel, AI, browser, and object-store bindings", () => {
    const bindings = createProductionTaskBindings(
      productionServiceEnvironment,
      runtimeDependencies,
    );

    expect(bindings.deliveryGuard.idempotencyStore).toBe("database");
    expect(typeof bindings.deliveryGuard.claim).toBe("function");
    expect(typeof bindings.aiProvider.generate).toBe("function");
    expect(typeof bindings.aiTelemetry.recordAtomically).toBe("function");
    expect(typeof bindings.aiTelemetry.markReconciliationRequired).toBe("function");
    expect(typeof bindings.pdfBrowser.render).toBe("function");
    expect(typeof bindings.pdfStorage.store).toBe("function");
    expect(typeof bindings.publicationCleanupReconciliation.enqueue).toBe("function");
    expect(typeof bindings.publicationCleanupReconciliation.claimAvailable).toBe("function");
    expect(typeof bindings.deliveryGuard.markCompletionUncertain).toBe("function");
    expect(typeof bindings.withDeliveryAuthority).toBe("function");
    expect(typeof bindings.createMetaPublishPollingPort).toBe("function");
  });

  it("uses the full runtime contract for deployed composition and Trigger project identity", () => {
    const environment = fullTaskEnvironment();
    const bindings = createDeployedProductionTaskBindings(environment);

    expect(productionTriggerProjectReference(environment)).toBe("proj_staging_tasks_001");
    expect(bindings.deliveryGuard.idempotencyStore).toBe("database");
    expect(typeof bindings.withDeliveryAuthority).toBe("function");
  });

  it("executes configured location PIT auth through the concrete transport with injected HTTP", async () => {
    const highLevelFetch: LeadConnectorFetchTransport = vi.fn(async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          state: "live",
          completedSteps: 2,
          totalSteps: 2,
          observedAt: "2026-07-21T12:01:00.000Z",
        }),
    }));
    const bindings = createDeployedProductionTaskBindings(fullTaskEnvironment(), {
      highLevelFetch,
    });
    const request = {
      schemaVersion: 1 as const,
      delivery: delivery("delivery_01ConfiguredHighLevel"),
      campaignId: "campaign_meta_01",
      authority: publishAuthority(),
      maximumPolls: 1,
    };

    const pollingPort = await bindings.createMetaPublishPollingPort(request);
    await expect(pollingPort.poll()).resolves.toMatchObject({ state: "live" });

    expect(highLevelFetch).toHaveBeenCalledOnce();
    const call = vi.mocked(highLevelFetch).mock.calls[0];
    expect(call?.[0]).toBe(
      `${LEADCONNECTOR_V2_BASE_URL}/ad-publishing/facebook/campaigns/campaign_meta_01/publishing-progress?locationId=location_01TenantA`,
    );
    expect(call?.[1].headers).toEqual({
      Accept: "application/json",
      Authorization: `Bearer ${highLevelAccessToken}`,
      Version: LEADCONNECTOR_V2_API_VERSION,
    });
  });

  it("initializes once on the first worker call and serves both deployed task entrypoints", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    let initializations = 0;
    const bindings = workerBindings();
    const resolveBindings = createProductionTaskBindingsAccessor(() => {
      initializations += 1;
      return bindings;
    });
    const pdfDelivery = delivery("delivery_01BootstrapPdf");
    const metaDelivery = delivery("delivery_02BootstrapMeta");
    const pdfRequest = {
      schemaVersion: 1 as const,
      requestedAt: "2026-07-21T12:00:00.000Z",
      delivery: pdfDelivery,
      manifest: commonRenderManifest,
    };
    const metaRequest = {
      schemaVersion: 1 as const,
      delivery: metaDelivery,
      campaignId: "campaign_meta_01",
      authority: publishAuthority(),
      maximumPolls: 1,
    };

    const pdf = await executeRenderCampaignPdfTask(
      {
        schemaVersion: 1,
        authority: authorityProof(pdfDelivery, pdfRequest),
        request: pdfRequest,
      },
      resolveBindings,
    );
    const meta = await executePollMetaPublishTask(
      {
        schemaVersion: 1,
        authority: authorityProof(metaDelivery, metaRequest),
        request: metaRequest,
      },
      resolveBindings,
    );

    expect(pdf.disposition).toBe("rendered");
    expect(meta.disposition).toBe("terminal-live");
    expect(initializations).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("propagates deployed-wrapper cancellation into the provider polling boundary", async () => {
    const taskDelivery = delivery("delivery_03WrapperAbort");
    const controller = new AbortController();
    controller.abort();
    const poll = vi.fn(async (signal?: AbortSignal) => {
      if (signal?.aborted === true) throw signal.reason;
      throw new Error("Expected the deployed wrapper to provide an aborted signal.");
    });
    const bindings = Object.freeze({
      ...workerBindings(),
      createMetaPublishPollingPort: vi.fn(() => ({ poll })),
    });
    const resolveBindings = vi.fn(() => bindings);
    const request = {
      schemaVersion: 1 as const,
      delivery: taskDelivery,
      campaignId: "campaign_meta_01",
      authority: publishAuthority(),
      maximumPolls: 30,
    };

    await expect(
      executePollMetaPublishTask(
        {
          schemaVersion: 1,
          authority: authorityProof(taskDelivery, request),
          request,
        },
        resolveBindings,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(resolveBindings).toHaveBeenCalledOnce();
    expect(bindings.createMetaPublishPollingPort).toHaveBeenCalledOnce();
    expect(poll).toHaveBeenCalledExactlyOnceWith(controller.signal);
  });

  it("binds signed per-delivery authority and rejects missing or expired authority stably", async () => {
    const taskDelivery = delivery("delivery_03Authority");
    const trustedAuthority = createTrustedProductionTaskDeliveryAuthority(
      authorityHmacKey,
      () => new Date("2026-07-21T12:00:00.000Z"),
    );
    const request = Object.freeze({ task: "render-pdf", artifactRef: "artifact_01Authority" });
    const proof = createProductionTaskAuthorityProof({
      delivery: taskDelivery,
      request,
      locationId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
      expiresAt: "2026-07-21T12:05:00.000Z",
      hmacKey: authorityHmacKey,
    });

    const context = await trustedAuthority.withAuthority(proof, taskDelivery, request, async () =>
      trustedAuthority.resolver.resolveDeliveryDatabaseContext(taskDelivery),
    );
    expect(context).toMatchObject({
      locationRef: taskDelivery.locationRef,
      correlationId: taskDelivery.correlationId,
      authorityState: "active",
    });
    await expect(
      trustedAuthority.resolver.resolveDeliveryDatabaseContext(taskDelivery),
    ).rejects.toBeInstanceOf(ProductionTaskAuthorityError);
    await expect(
      trustedAuthority.withAuthority(
        { ...proof, expiresAt: "2026-07-21T11:59:00.000Z" },
        taskDelivery,
        request,
        async () => undefined,
      ),
    ).rejects.toMatchObject({ code: "PRODUCTION_TASK_AUTHORITY_INVALID" });
    await expect(
      trustedAuthority.withAuthority(
        proof,
        taskDelivery,
        { ...request, artifactRef: "artifact_02Tampered" },
        async () => undefined,
      ),
    ).rejects.toMatchObject({ code: "PRODUCTION_TASK_AUTHORITY_INVALID" });
  });

  it("fails missing or mismatched HighLevel runtime auth at composition with a stable error", () => {
    expect(() => createDeployedProductionTaskBindings({})).toThrow(
      ProductionTaskRuntimeConfigurationError,
    );
    const missingAuth = fullTaskEnvironment();
    delete (missingAuth as Partial<typeof missingAuth>).OALO_GHL_LOCATION_PIT_JSON;
    expect(() => createDeployedProductionTaskBindings(missingAuth)).toThrowError(
      expect.objectContaining({ code: "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" }),
    );
    const missingScheduledAuthority = fullTaskEnvironment();
    delete (missingScheduledAuthority as Partial<typeof missingScheduledAuthority>)
      .OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON;
    expect(() => createDeployedProductionTaskBindings(missingScheduledAuthority)).toThrowError(
      expect.objectContaining({ code: "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" }),
    );
    const mismatchedScheduledAuthority = {
      ...fullTaskEnvironment(),
      OALO_PUBLICATION_CLEANUP_SCHEDULE_AUTHORITY_JSON: JSON.stringify({
        locationRef: "location_01TenantB",
        locationId: "11111111-1111-4111-8111-111111111111",
        actorId: "22222222-2222-4222-8222-222222222222",
      }),
    };
    expect(() => createDeployedProductionTaskBindings(mismatchedScheduledAuthority)).toThrowError(
      expect.objectContaining({ code: "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" }),
    );
    const mismatchedAuth = {
      ...fullTaskEnvironment(),
      OALO_GHL_LOCATION_PIT_JSON: JSON.stringify({
        locationId: "location_01TenantB",
        accessToken: highLevelAccessToken,
      }),
    };
    expect(() => createDeployedProductionTaskBindings(mismatchedAuth)).toThrowError(
      expect.objectContaining({ code: "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" }),
    );
  });

  it("rejects any request outside the configured single location without exposing the PIT", async () => {
    const resolveLocationToken = createSingleLocationHighLevelLocationTokenResolver({
      locationRef: "location_01TenantA",
      locationId: "location_01TenantA",
      accessToken: highLevelAccessToken,
    });

    await expect(
      resolveLocationToken({
        locationRef: "location_01TenantB",
        signal: new AbortController().signal,
      }),
    ).rejects.toMatchObject({ code: "PRODUCTION_TASK_RUNTIME_CONFIGURATION_INVALID" });
  });
});
