import { describe, expect, it } from "vitest";

import { campaignManifestFixture } from "../../../../packages/db/test/campaign-manifest-fixture.mjs";
import {
  acquireQueueLeaseContract,
  AiTelemetryPersistenceError,
  authorityActiveContract,
  createPostgresAiTelemetryPort,
  createPostgresCampaignReadRepository,
  createPostgresPool,
  createPostgresPublicationCleanupReconciliationPort,
  createResolverAwarePostgresDeliveryGuard,
  DatabaseContextError,
  defineSqlContract,
  DeliveryGuardContextError,
  DeliveryGuardPersistenceError,
  isSqlDriverResult,
  leaseOutboxBatchContract,
  PostgresAdapterError,
  PublicationCleanupPersistenceError,
  withSupportTransaction,
  withTenantTransaction,
  type DatabaseConnection,
  type DatabasePool,
  type AiTelemetryPair,
  type PublicationCleanupIntent,
  type SqlDriverResult,
  type SqlRequest,
} from "@oalo/db";

const context = Object.freeze({
  actorId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  correlationId: "correlation_db_unit_001",
  locationId: "11111111-1111-4111-8111-111111111111",
});

const delivery = Object.freeze({
  businessOutcomeKey: "b".repeat(64),
  correlationId: context.correlationId,
  deliveryKind: "task" as const,
  deliveryRef: "delivery_db_unit_001",
  locationRef: "location_db_unit_001",
  schemaVersion: 1 as const,
});

const telemetryPair: AiTelemetryPair = Object.freeze({
  usage: Object.freeze({
    actorRef: "actor_db_unit_001",
    brandVersionRef: "brandversion_db_unit_001",
    campaignRef: "campaign_db_unit_001",
    chargedPlanUnit: "campaign_pack",
    correlationRef: context.correlationId,
    estimatedCostUsd: 0.0125,
    feature: "campaign_pack",
    latencyMs: 125,
    locationRef: delivery.locationRef,
    modelPolicyVersionRef: "modelpolicy_db_unit_001",
    modelRef: "claude-sonnet-production",
    occurredAt: "2026-07-21T19:30:00.000Z",
    outcome: "accepted",
    promptPolicyVersionRef: "promptpolicy_db_unit_001",
    providerRef: "provider_anthropic",
    providerRequestRef: "providerrequest_db_unit_001",
    retryCount: 0,
    tokenUsage: Object.freeze({
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 25,
      totalTokens: 125,
      uncachedInputTokens: 100,
    }),
    usageEventRef: "usage_db_unit_001",
  }),
  trace: Object.freeze({
    acceptedOutputHash: "a".repeat(64),
    actorRef: "actor_db_unit_001",
    correlationRef: context.correlationId,
    feature: "campaign_pack",
    latencyMs: 125,
    locationRef: delivery.locationRef,
    modelPolicyVersionRef: "modelpolicy_db_unit_001",
    occurredAt: "2026-07-21T19:30:00.000Z",
    outcome: "accepted",
    promptContextHash: "b".repeat(64),
    promptPolicyVersionRef: "promptpolicy_db_unit_001",
    providerRequestRef: "providerrequest_db_unit_001",
    routeRef: "route_primary",
    traceRef: "trace_db_unit_001",
  }),
});

const telemetryContext = Object.freeze({
  ...context,
  actorRef: telemetryPair.usage.actorRef,
  authorityState: "active" as const,
  locationRef: telemetryPair.usage.locationRef,
});

const cleanupIntent: PublicationCleanupIntent = Object.freeze({
  attemptedKeys: Object.freeze([
    "public/campaign_db_unit_001/v1/social.png",
    "public/campaign_db_unit_001/v1/print.pdf",
  ]),
  campaignVersionRef: "campaignversion_db_unit_001",
  idempotencyKey: "c".repeat(64),
  locationRef: delivery.locationRef,
  maximumAttempts: 3,
  problemCode: "PUBLICATION_PARTIAL_FAILURE",
  publicBucket: "oalo-public-unit",
  publicCampaignId: "campaign_db_unit_001",
  publishedVersion: 1,
});

const cleanupContext = Object.freeze({
  ...context,
  authorityState: "active" as const,
  locationRef: delivery.locationRef,
});

const cleanupLeaseRow = Object.freeze({
  attempt_count: 1,
  attempted_keys: cleanupIntent.attemptedKeys,
  campaign_version_ref: cleanupIntent.campaignVersionRef,
  idempotency_key: cleanupIntent.idempotencyKey,
  lease_owner: "cleanup-worker-unit",
  lease_until: new Date("2099-07-21T19:35:00.000Z"),
  location_ref: cleanupIntent.locationRef,
  maximum_attempts: cleanupIntent.maximumAttempts,
  problem_code: cleanupIntent.problemCode,
  public_bucket: cleanupIntent.publicBucket,
  public_campaign_id: cleanupIntent.publicCampaignId,
  published_version: cleanupIntent.publishedVersion,
});

describe("database production contracts", () => {
  it("decodes complete durable rows and rejects malformed driver values", () => {
    const row = {
      aggregate_ref: "campaign.safe-ref",
      aggregate_type: "campaign",
      aggregate_version: "7",
      available_at: new Date("2026-07-21T15:30:00.000Z"),
      command_ref: "00000000-0000-4000-8000-000000000532",
      correlation_id: "corr.db-unit-001",
      event_id: "00000000-0000-4000-8000-000000000732",
      event_name: "campaign.render-requested.v1",
      lease_owner: "worker.db-unit-001",
      location_ref: "00000000-0000-4000-8000-000000000131",
      schema_version: 1n,
    };

    expect(leaseOutboxBatchContract.decode(row)).toMatchObject({
      aggregateVersion: 7,
      availableAt: "2026-07-21T15:30:00.000Z",
      leaseOwner: "worker.db-unit-001",
    });
    expect(authorityActiveContract.decode({ active: true })).toEqual({ active: true });
    expect(acquireQueueLeaseContract.decode({ lease_id: "lease.safe-ref" })).toEqual({
      leaseId: "lease.safe-ref",
    });

    expect(() => leaseOutboxBatchContract.decode(null)).toThrow("must be an object");
    expect(() => leaseOutboxBatchContract.decode({ ...row, extra: true })).toThrow(
      "columns do not match",
    );
    expect(() => leaseOutboxBatchContract.decode({ ...row, schema_version: -1 })).toThrow(
      "non-negative safe integer",
    );
    expect(() => leaseOutboxBatchContract.decode({ ...row, available_at: "invalid" })).toThrow(
      "valid timestamp",
    );
    expect(() => authorityActiveContract.decode({ active: "yes" })).toThrow("must be boolean");
    expect(() => acquireQueueLeaseContract.decode({ lease_id: 1 })).toThrow("must be text");
  });

  it("enforces stable SQL contracts and driver result shapes", () => {
    const contract = defineSqlContract({
      access: "read",
      decode: (row: unknown) => row,
      name: "test.read-value.v1",
      text: "select 1",
    });
    expect(Object.isFrozen(contract)).toBe(true);
    expect(() => defineSqlContract({ ...contract, name: "UPPER" })).toThrow(
      "stable lowercase identifiers",
    );
    expect(() => defineSqlContract({ ...contract, text: "  " })).toThrow("cannot be empty");
    expect(isSqlDriverResult({ rowCount: 0, rows: [] })).toBe(true);
    expect(isSqlDriverResult({ rowCount: 0, rows: null })).toBe(false);
    expect(isSqlDriverResult(null)).toBe(false);
  });
});

describe("PostgreSQL adapter configuration", () => {
  const valid = Object.freeze({
    applicationName: "oalo-unit-test",
    connectionString: "postgresql://postgres:postgres@127.0.0.1:55422/postgres",
    deploymentEnvironment: "test",
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
  });

  it("constructs and closes a transaction-pool-safe client without connecting eagerly", async () => {
    const pool = createPostgresPool(valid);
    await pool.close();
    await pool.close();
    await expect(pool.connect()).rejects.toMatchObject({ code: "DB_POOL_CLOSED" });
  });

  it("rejects unsafe, unknown, and internally inconsistent settings", () => {
    const invalidConfigurations = [
      null,
      { ...valid, unknown: true },
      { ...valid, poolingMode: "session" },
      { ...valid, preparedStatements: true },
      { ...valid, sslMode: "sometimes" },
      { ...valid, deploymentEnvironment: "production", sslMode: "disable" },
      { ...valid, deploymentEnvironment: "unknown" },
      { ...valid, connectionString: "not-a-url" },
      { ...valid, connectionString: "https://example.com/database" },
      { ...valid, connectionString: "postgresql:///database" },
      { ...valid, connectionString: `${valid.connectionString}#fragment` },
      { ...valid, connectionString: `${valid.connectionString}?sslmode=require` },
      { ...valid, applicationName: "Unsafe Name" },
      { ...valid, maxConnections: 0 },
    ];
    for (const configuration of invalidConfigurations) {
      expect(() => createPostgresPool(configuration)).toThrow(PostgresAdapterError);
    }
  });
});

describe("scoped database transactions", () => {
  it("sets verified tenant context, decodes reads and writes, and closes the scope", async () => {
    const connection = new FakeConnection();
    const pool = new FakePool(connection);
    let escapedRead: (() => Promise<unknown>) | undefined;

    const result = await withTenantTransaction(
      pool,
      { resolveTenantDatabaseContext: async () => context },
      async (transaction) => {
        const readContract = defineSqlContract({
          access: "read",
          decode: (row: unknown) => (row as { value: string }).value,
          name: "test.read-value.v1",
          text: "select 'verified' as value",
        });
        const writeContract = defineSqlContract({
          access: "write",
          decode: (row: unknown) => (row as { affected: boolean }).affected,
          name: "test.write-value.v1",
          text: "select true as affected",
        });
        escapedRead = () => transaction.read(readContract);
        expect(await transaction.read(readContract)).toEqual(["verified"]);
        expect(await transaction.write(writeContract)).toEqual([true]);
        await expect(transaction.write(readContract)).rejects.toBeInstanceOf(DatabaseContextError);
        await expect(transaction.read(writeContract)).rejects.toBeInstanceOf(DatabaseContextError);
        return "committed";
      },
    );

    expect(result).toBe("committed");
    expect(connection.statementNames()).toEqual(
      expect.arrayContaining([
        "transaction.begin",
        "transaction.assume-app-runtime-role",
        "transaction.set-context",
        "transaction.read-context",
        "test.read-value.v1",
        "test.write-value.v1",
        "transaction.commit",
      ]),
    );
    const assumeIndex = connection.statementNames().indexOf("transaction.assume-app-runtime-role");
    const contextIndex = connection.statementNames().indexOf("transaction.set-context");
    expect(assumeIndex).toBeGreaterThanOrEqual(0);
    expect(contextIndex).toBeGreaterThan(assumeIndex);
    expect(
      connection.requests.find(
        (entry) => entry.statementName === "transaction.assume-app-runtime-role",
      )?.text,
    ).toBe("set local role app_runtime");
    await expect(escapedRead?.()).rejects.toMatchObject({ code: "DB_TRANSACTION_CLOSED" });
  });

  it("uses support context and aggregates rollback and release failures", async () => {
    const supportConnection = new FakeConnection();
    await withSupportTransaction(
      new FakePool(supportConnection),
      {
        resolveSupportDatabaseContext: async () => ({
          ...context,
          subjectId: "campaign.safe-ref",
          subjectType: "campaign",
        }),
      },
      async () => undefined,
    );
    expect(supportConnection.statementNames()).toContain("transaction.assume-support-runtime-role");
    expect(
      supportConnection.requests.find((entry) => entry.statementName === "transaction.set-context")
        ?.text,
    ).toContain("begin_support_access");

    const failing = new FakeConnection({ failRelease: true, failRollback: true });
    await expect(
      withTenantTransaction(
        new FakePool(failing),
        { resolveTenantDatabaseContext: async () => context },
        async () => {
          throw new Error("work failed");
        },
      ),
    ).rejects.toBeInstanceOf(AggregateError);
  });

  it("skips SET LOCAL ROLE when OALO_DB_ASSUME_RUNTIME_ROLE is false", async () => {
    const previous = process.env.OALO_DB_ASSUME_RUNTIME_ROLE;
    process.env.OALO_DB_ASSUME_RUNTIME_ROLE = "false";
    try {
      const connection = new FakeConnection();
      await withTenantTransaction(
        new FakePool(connection),
        { resolveTenantDatabaseContext: async () => context },
        async () => undefined,
      );
      expect(connection.statementNames()).not.toContain("transaction.assume-app-runtime-role");
      expect(connection.statementNames()).toContain("transaction.set-context");
    } finally {
      if (previous === undefined) {
        delete process.env.OALO_DB_ASSUME_RUNTIME_ROLE;
      } else {
        process.env.OALO_DB_ASSUME_RUNTIME_ROLE = previous;
      }
    }
  });

  it("rejects invalid authority context before acquiring a connection", async () => {
    const pool = new FakePool(new FakeConnection());
    await expect(
      withTenantTransaction(
        pool,
        { resolveTenantDatabaseContext: async () => ({ ...context, locationId: "not-a-uuid" }) },
        async () => undefined,
      ),
    ).rejects.toMatchObject({ code: "DB_CONTEXT_INVALID" });
    expect(pool.connectCalls).toBe(0);
  });
});

describe("PostgreSQL delivery guard", () => {
  const resolvedContext = Object.freeze({
    ...context,
    authorityState: "active" as const,
    locationRef: delivery.locationRef,
  });

  it("claims, completes, and releases through the same verified transaction boundary", async () => {
    const connection = new FakeConnection();
    const guard = createResolverAwarePostgresDeliveryGuard(new FakePool(connection), {
      resolveDeliveryDatabaseContext: async () => resolvedContext,
    });

    await expect(guard.claim(delivery)).resolves.toBe(true);
    await expect(guard.complete(delivery)).resolves.toBeUndefined();
    await expect(guard.release(delivery)).resolves.toBeUndefined();
    await expect(
      guard.markCompletionUncertain(delivery, "DELIVERY_COMPLETION_UNCERTAIN"),
    ).resolves.toBeUndefined();
    expect(connection.statementNames()).toContain("integration.claim-delivery.v1");
    expect(connection.statementNames()).toContain("integration.complete-delivery.v1");
    expect(connection.statementNames()).toContain("integration.release-delivery.v1");
    expect(connection.statementNames()).toContain(
      "integration.mark-delivery-completion-uncertain.v1",
    );
  });

  it("fails closed for missing, revoked, malformed, or mismatched context", async () => {
    const candidates = [
      undefined,
      "invalid",
      { ...resolvedContext, authorityState: "revoked" },
      { ...resolvedContext, authorityState: "pending" },
      { ...resolvedContext, locationRef: "location.other" },
      { ...resolvedContext, extra: true },
    ];
    for (const candidate of candidates) {
      const guard = createResolverAwarePostgresDeliveryGuard(new FakePool(new FakeConnection()), {
        resolveDeliveryDatabaseContext: async () => candidate,
      });
      await expect(guard.claim(delivery)).rejects.toBeInstanceOf(DeliveryGuardContextError);
    }
  });

  it("rejects incomplete persistence results", async () => {
    const connection = new FakeConnection({ claimRows: [], mutationRows: [{ affected: false }] });
    const guard = createResolverAwarePostgresDeliveryGuard(new FakePool(connection), {
      resolveDeliveryDatabaseContext: async () => resolvedContext,
    });
    await expect(guard.claim(delivery)).rejects.toBeInstanceOf(DeliveryGuardPersistenceError);
    await expect(guard.complete(delivery)).rejects.toBeInstanceOf(DeliveryGuardPersistenceError);
  });
});

describe("PostgreSQL AI telemetry adapter", () => {
  it("records a validated pair and marks every supported reconciliation state", async () => {
    const connection = new FakeConnection({
      rowsByStatement: {
        "integration.record-ai-telemetry-pair.v1": [
          {
            trace_ref: telemetryPair.trace.traceRef,
            usage_event_ref: telemetryPair.usage.usageEventRef,
          },
        ],
      },
    });
    const port = createPostgresAiTelemetryPort(new FakePool(connection), {
      resolveAiTelemetryDatabaseContext: async () => telemetryContext,
    });

    await expect(port.recordAtomically(telemetryPair)).resolves.toBeUndefined();
    const request = connection.requests.find(
      (entry) => entry.statementName === "integration.record-ai-telemetry-pair.v1",
    );
    expect(JSON.parse(String(request?.values[0]))).toMatchObject({
      usageEventRef: telemetryPair.usage.usageEventRef,
    });
    expect(JSON.parse(String(request?.values[1]))).toMatchObject({
      traceRef: telemetryPair.trace.traceRef,
    });

    for (const status of ["pending", "reconciling", "completed"] as const) {
      const markerConnection = new FakeConnection({
        rowsByStatement: {
          "integration.mark-ai-telemetry-reconciliation.v1": [{ status }],
        },
      });
      const markerPort = createPostgresAiTelemetryPort(new FakePool(markerConnection), {
        resolveAiTelemetryDatabaseContext: async () => telemetryContext,
      });
      await expect(
        markerPort.markReconciliationRequired({
          ...telemetryPair,
          problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED",
        }),
      ).resolves.toBeUndefined();
    }
  });

  it("rejects telemetry pairs that do not describe the same provider attempt", async () => {
    const traceVariants: readonly Readonly<Record<string, unknown>>[] = [
      { locationRef: "location_other_001" },
      { actorRef: "actor_other_001" },
      { correlationRef: "correlation_other_001" },
      { feature: "repair" },
      { modelPolicyVersionRef: "modelpolicy_other_001" },
      { promptPolicyVersionRef: "promptpolicy_other_001" },
      { providerRequestRef: "providerrequest_other_001" },
      { latencyMs: 126 },
      { outcome: "failed" },
      { failureClassification: "timeout" },
      { occurredAt: "2026-07-21T19:31:00.000Z" },
    ];
    const port = createPostgresAiTelemetryPort(new FakePool(new FakeConnection()), {
      resolveAiTelemetryDatabaseContext: async () => telemetryContext,
    });

    for (const variant of traceVariants) {
      await expect(
        port.recordAtomically({
          trace: { ...telemetryPair.trace, ...variant } as AiTelemetryPair["trace"],
          usage: telemetryPair.usage,
        }),
      ).rejects.toBeInstanceOf(AiTelemetryPersistenceError);
    }
    await expect(
      port.recordAtomically({ trace: telemetryPair.trace, usage: {} } as never),
    ).rejects.toThrow();
    await expect(
      port.markReconciliationRequired({
        ...telemetryPair,
        problemCode: "WRONG_PROBLEM_CODE",
      } as never),
    ).rejects.toMatchObject({ code: "AI_TELEMETRY_RESULT_INVALID" });
  });

  it("fails closed for invalid, revoked, or mismatched telemetry context", async () => {
    const candidates: readonly Readonly<{ candidate: unknown; code: string }>[] = [
      { candidate: null, code: "AI_TELEMETRY_CONTEXT_INVALID" },
      { candidate: "invalid", code: "AI_TELEMETRY_CONTEXT_INVALID" },
      { candidate: [], code: "AI_TELEMETRY_CONTEXT_INVALID" },
      { candidate: { ...telemetryContext, extra: true }, code: "AI_TELEMETRY_CONTEXT_INVALID" },
      { candidate: { ...telemetryContext, actorId: 1 }, code: "AI_TELEMETRY_CONTEXT_INVALID" },
      {
        candidate: { ...telemetryContext, authorityState: "revoked" },
        code: "AI_TELEMETRY_CONTEXT_REVOKED",
      },
      {
        candidate: { ...telemetryContext, authorityState: "pending" },
        code: "AI_TELEMETRY_CONTEXT_INVALID",
      },
      {
        candidate: { ...telemetryContext, locationRef: "location_other_001" },
        code: "AI_TELEMETRY_CONTEXT_MISMATCH",
      },
      {
        candidate: { ...telemetryContext, actorRef: "actor_other_001" },
        code: "AI_TELEMETRY_CONTEXT_MISMATCH",
      },
      {
        candidate: { ...telemetryContext, correlationId: "correlation_other_001" },
        code: "AI_TELEMETRY_CONTEXT_MISMATCH",
      },
    ];

    for (const { candidate, code } of candidates) {
      const pool = new FakePool(new FakeConnection());
      const port = createPostgresAiTelemetryPort(pool, {
        resolveAiTelemetryDatabaseContext: async () => candidate,
      });
      await expect(port.recordAtomically(telemetryPair)).rejects.toMatchObject({ code });
      expect(pool.connectCalls).toBe(0);
    }
  });

  it("rejects malformed or non-confirming telemetry persistence results", async () => {
    const validRecord = {
      trace_ref: telemetryPair.trace.traceRef,
      usage_event_ref: telemetryPair.usage.usageEventRef,
    };
    const recordRows: readonly (readonly unknown[])[] = [
      [],
      [null],
      [{ ...validRecord, usage_event_ref: 1 }],
      [{ ...validRecord, extra: true }],
      [{ ...validRecord, usage_event_ref: "usage_other_001" }],
      [{ ...validRecord, trace_ref: "trace_other_001" }],
    ];
    for (const rows of recordRows) {
      const port = aiPortWithRows("integration.record-ai-telemetry-pair.v1", rows);
      await expect(port.recordAtomically(telemetryPair)).rejects.toBeInstanceOf(
        AiTelemetryPersistenceError,
      );
    }

    const markerRows: readonly (readonly unknown[])[] = [
      [],
      [null],
      [{ status: "unknown" }],
      [{ extra: true, status: "pending" }],
    ];
    for (const rows of markerRows) {
      const port = aiPortWithRows("integration.mark-ai-telemetry-reconciliation.v1", rows);
      await expect(
        port.markReconciliationRequired({
          ...telemetryPair,
          problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED",
        }),
      ).rejects.toBeInstanceOf(AiTelemetryPersistenceError);
    }
  });
});

describe("PostgreSQL publication cleanup adapter", () => {
  it("enqueues, claims, releases, and completes cleanup work", async () => {
    const connection = new FakeConnection({
      rowsByStatement: {
        "integration.claim-publication-cleanup.v1": [cleanupLeaseRow],
        "integration.complete-publication-cleanup.v1": [{ affected: true }],
        "integration.enqueue-publication-cleanup.v1": [{ result: "enqueued" }],
        "integration.release-publication-cleanup.v1": [{ status: "pending" }],
      },
    });
    const port = createPostgresPublicationCleanupReconciliationPort(new FakePool(connection), {
      resolvePublicationCleanupDatabaseContext: async () => cleanupContext,
    });

    await expect(port.enqueue(cleanupIntent)).resolves.toBe("enqueued");
    await expect(
      port.claimAvailable({
        leaseOwner: cleanupLeaseRow.lease_owner,
        leaseUntil: "2099-07-21T19:35:00.000Z",
        limit: 10,
      }),
    ).resolves.toEqual([
      {
        attemptCount: cleanupLeaseRow.attempt_count,
        attemptedKeys: cleanupIntent.attemptedKeys,
        campaignVersionRef: cleanupIntent.campaignVersionRef,
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        leaseUntil: "2099-07-21T19:35:00.000Z",
        locationRef: cleanupIntent.locationRef,
        maximumAttempts: cleanupIntent.maximumAttempts,
        problemCode: cleanupIntent.problemCode,
        publicBucket: cleanupIntent.publicBucket,
        publicCampaignId: cleanupIntent.publicCampaignId,
        publishedVersion: cleanupIntent.publishedVersion,
      },
    ]);
    await expect(
      port.releaseAfterFailure({
        availableAt: "2099-07-21T20:00:00.000Z",
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
      }),
    ).resolves.toBe("pending");
    await expect(
      port.complete({
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        quarantinedKeys: cleanupIntent.attemptedKeys,
      }),
    ).resolves.toBeUndefined();

    const enqueueRequest = connection.requests.find(
      (entry) => entry.statementName === "integration.enqueue-publication-cleanup.v1",
    );
    expect(JSON.parse(String(enqueueRequest?.values[0]))).toEqual(cleanupIntent);
    const claimRequest = connection.requests.find(
      (entry) => entry.statementName === "integration.claim-publication-cleanup.v1",
    );
    expect(claimRequest?.values).toEqual([
      cleanupLeaseRow.lease_owner,
      10,
      new Date("2099-07-21T19:35:00.000Z"),
    ]);
  });

  it("returns every supported enqueue and release status", async () => {
    for (const result of [
      "enqueued",
      "already_pending",
      "already_completed",
      "already_dead_lettered",
    ] as const) {
      const port = cleanupPortWithRows("integration.enqueue-publication-cleanup.v1", [{ result }]);
      await expect(port.enqueue(cleanupIntent)).resolves.toBe(result);
    }

    for (const status of ["pending", "dead_lettered"] as const) {
      const port = cleanupPortWithRows("integration.release-publication-cleanup.v1", [{ status }]);
      await expect(
        port.releaseAfterFailure({
          availableAt: "2099-07-21T20:00:00.000Z",
          idempotencyKey: cleanupIntent.idempotencyKey,
          leaseOwner: cleanupLeaseRow.lease_owner,
          problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
        }),
      ).resolves.toBe(status);
    }
  });

  it("rejects invalid cleanup intents before opening a connection", async () => {
    const invalidIntents: readonly unknown[] = [
      null,
      { ...cleanupIntent, extra: true },
      { ...cleanupIntent, publicBucket: 1 },
      { ...cleanupIntent, publicBucket: "A_invalid" },
      { ...cleanupIntent, publicCampaignId: 1 },
      { ...cleanupIntent, publicCampaignId: "short" },
      { ...cleanupIntent, campaignVersionRef: 1 },
      { ...cleanupIntent, campaignVersionRef: "short" },
      { ...cleanupIntent, campaignVersionRef: "v".repeat(129) },
      { ...cleanupIntent, publishedVersion: 1.5 },
      { ...cleanupIntent, publishedVersion: 0 },
      { ...cleanupIntent, maximumAttempts: 1.5 },
      { ...cleanupIntent, maximumAttempts: 0 },
      { ...cleanupIntent, maximumAttempts: 21 },
      { ...cleanupIntent, problemCode: "WRONG_PROBLEM_CODE" },
      { ...cleanupIntent, attemptedKeys: [] },
      { ...cleanupIntent, attemptedKeys: Array.from({ length: 101 }, (_, index) => `${index}`) },
      { ...cleanupIntent, attemptedKeys: [1] },
      { ...cleanupIntent, attemptedKeys: [""] },
      { ...cleanupIntent, attemptedKeys: ["k".repeat(1_025)] },
      { ...cleanupIntent, idempotencyKey: "not-a-sha" },
    ];

    for (const intent of invalidIntents) {
      const pool = new FakePool(new FakeConnection());
      const port = createPostgresPublicationCleanupReconciliationPort(pool, {
        resolvePublicationCleanupDatabaseContext: async () => cleanupContext,
      });
      await expect(port.enqueue(intent as never)).rejects.toMatchObject({
        code: "PUBLICATION_CLEANUP_INPUT_INVALID",
      });
      expect(pool.connectCalls).toBe(0);
    }
  });

  it("rejects invalid claim, completion, and release inputs", async () => {
    const port = cleanupPortWithRows("integration.claim-publication-cleanup.v1", []);
    const claimInputs: readonly unknown[] = [
      { leaseOwner: 1, leaseUntil: "2099-07-21T19:35:00.000Z", limit: 1 },
      { leaseOwner: "", leaseUntil: "2099-07-21T19:35:00.000Z", limit: 1 },
      { leaseOwner: "w".repeat(201), leaseUntil: "2099-07-21T19:35:00.000Z", limit: 1 },
      { leaseOwner: "worker", leaseUntil: "2099-07-21T19:35:00.000Z", limit: 1.5 },
      { leaseOwner: "worker", leaseUntil: "2099-07-21T19:35:00.000Z", limit: 0 },
      { leaseOwner: "worker", leaseUntil: "2099-07-21T19:35:00.000Z", limit: 101 },
      { leaseOwner: "worker", leaseUntil: "invalid", limit: 1 },
      { leaseOwner: "worker", leaseUntil: "2000-01-01T00:00:00.000Z", limit: 1 },
    ];
    for (const input of claimInputs) {
      await expect(port.claimAvailable(input as never)).rejects.toMatchObject({
        code: "PUBLICATION_CLEANUP_INPUT_INVALID",
      });
    }

    const completionInputs: readonly unknown[] = [
      {
        idempotencyKey: "not-a-sha",
        leaseOwner: cleanupLeaseRow.lease_owner,
        quarantinedKeys: cleanupIntent.attemptedKeys,
      },
      {
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: "",
        quarantinedKeys: cleanupIntent.attemptedKeys,
      },
      {
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        quarantinedKeys: [],
      },
    ];
    for (const input of completionInputs) {
      await expect(port.complete(input as never)).rejects.toMatchObject({
        code: "PUBLICATION_CLEANUP_INPUT_INVALID",
      });
    }

    const releaseInputs: readonly unknown[] = [
      {
        availableAt: "2099-07-21T20:00:00.000Z",
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        problemCode: "WRONG_PROBLEM_CODE",
      },
      {
        availableAt: 1,
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
      },
      {
        availableAt: "invalid",
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: cleanupLeaseRow.lease_owner,
        problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
      },
      {
        availableAt: "2099-07-21T20:00:00.000Z",
        idempotencyKey: "not-a-sha",
        leaseOwner: cleanupLeaseRow.lease_owner,
        problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
      },
      {
        availableAt: "2099-07-21T20:00:00.000Z",
        idempotencyKey: cleanupIntent.idempotencyKey,
        leaseOwner: "",
        problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
      },
    ];
    for (const input of releaseInputs) {
      await expect(port.releaseAfterFailure(input as never)).rejects.toMatchObject({
        code: "PUBLICATION_CLEANUP_INPUT_INVALID",
      });
    }
  });

  it("fails closed for invalid or revoked cleanup context", async () => {
    const candidates: readonly Readonly<{ candidate: unknown; code: string }>[] = [
      { candidate: null, code: "PUBLICATION_CLEANUP_CONTEXT_INVALID" },
      { candidate: "invalid", code: "PUBLICATION_CLEANUP_CONTEXT_INVALID" },
      { candidate: [], code: "PUBLICATION_CLEANUP_CONTEXT_INVALID" },
      {
        candidate: { ...cleanupContext, extra: true },
        code: "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      },
      {
        candidate: { ...cleanupContext, actorId: 1 },
        code: "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      },
      {
        candidate: { ...cleanupContext, authorityState: "revoked" },
        code: "PUBLICATION_CLEANUP_CONTEXT_REVOKED",
      },
      {
        candidate: { ...cleanupContext, authorityState: "pending" },
        code: "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      },
    ];

    for (const { candidate, code } of candidates) {
      const pool = new FakePool(new FakeConnection());
      const port = createPostgresPublicationCleanupReconciliationPort(pool, {
        resolvePublicationCleanupDatabaseContext: async () => candidate,
      });
      await expect(port.enqueue(cleanupIntent)).rejects.toMatchObject({ code });
      expect(pool.connectCalls).toBe(0);
    }
  });

  it("decodes string timestamps and rejects malformed cleanup lease rows", async () => {
    const stringTimestampPort = cleanupPortWithRows("integration.claim-publication-cleanup.v1", [
      { ...cleanupLeaseRow, lease_until: "2099-07-21T19:35:00.000Z" },
    ]);
    await expect(
      stringTimestampPort.claimAvailable({
        leaseOwner: cleanupLeaseRow.lease_owner,
        leaseUntil: "2099-07-21T19:35:00.000Z",
        limit: 1,
      }),
    ).resolves.toHaveLength(1);

    const invalidRows: readonly unknown[] = [
      null,
      [],
      { ...cleanupLeaseRow, extra: true },
      { ...cleanupLeaseRow, public_bucket: 1 },
      { ...cleanupLeaseRow, public_campaign_id: 1 },
      { ...cleanupLeaseRow, campaign_version_ref: 1 },
      { ...cleanupLeaseRow, published_version: "1" },
      { ...cleanupLeaseRow, attempted_keys: "not-an-array" },
      { ...cleanupLeaseRow, idempotency_key: 1 },
      { ...cleanupLeaseRow, problem_code: "WRONG_PROBLEM_CODE" },
      { ...cleanupLeaseRow, attempt_count: "1" },
      { ...cleanupLeaseRow, attempt_count: 1.5 },
      { ...cleanupLeaseRow, attempt_count: 0 },
      { ...cleanupLeaseRow, maximum_attempts: "3" },
      { ...cleanupLeaseRow, maximum_attempts: 1.5 },
      { ...cleanupLeaseRow, maximum_attempts: 0 },
      { ...cleanupLeaseRow, maximum_attempts: 21 },
      { ...cleanupLeaseRow, lease_owner: 1 },
      { ...cleanupLeaseRow, lease_until: 1 },
      { ...cleanupLeaseRow, lease_until: "invalid" },
      { ...cleanupLeaseRow, attempted_keys: [] },
    ];
    for (const row of invalidRows) {
      const port = cleanupPortWithRows("integration.claim-publication-cleanup.v1", [row]);
      await expect(
        port.claimAvailable({
          leaseOwner: cleanupLeaseRow.lease_owner,
          leaseUntil: "2099-07-21T19:35:00.000Z",
          limit: 1,
        }),
      ).rejects.toBeInstanceOf(PublicationCleanupPersistenceError);
    }
  });

  it("rejects malformed or non-confirming mutation results", async () => {
    const enqueueRows: readonly (readonly unknown[])[] = [
      [],
      [null],
      [{ result: "unknown" }],
      [{ extra: true, result: "enqueued" }],
    ];
    for (const rows of enqueueRows) {
      await expect(
        cleanupPortWithRows("integration.enqueue-publication-cleanup.v1", rows).enqueue(
          cleanupIntent,
        ),
      ).rejects.toBeInstanceOf(PublicationCleanupPersistenceError);
    }

    const completeRows: readonly (readonly unknown[])[] = [
      [],
      [null],
      [{ affected: "yes" }],
      [{ affected: false }],
      [{ affected: true, extra: true }],
    ];
    for (const rows of completeRows) {
      await expect(
        cleanupPortWithRows("integration.complete-publication-cleanup.v1", rows).complete({
          idempotencyKey: cleanupIntent.idempotencyKey,
          leaseOwner: cleanupLeaseRow.lease_owner,
          quarantinedKeys: cleanupIntent.attemptedKeys,
        }),
      ).rejects.toBeInstanceOf(PublicationCleanupPersistenceError);
    }

    const releaseRows: readonly (readonly unknown[])[] = [
      [],
      [null],
      [{ status: "unknown" }],
      [{ extra: true, status: "pending" }],
    ];
    for (const rows of releaseRows) {
      await expect(
        cleanupPortWithRows("integration.release-publication-cleanup.v1", rows).releaseAfterFailure(
          {
            availableAt: "2099-07-21T20:00:00.000Z",
            idempotencyKey: cleanupIntent.idempotencyKey,
            leaseOwner: cleanupLeaseRow.lease_owner,
            problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
          },
        ),
      ).rejects.toBeInstanceOf(PublicationCleanupPersistenceError);
    }
  });
});

describe("postgres campaign workspace reads", () => {
  const versionRow = Object.freeze({
    location_ref: "location_01TenantA",
    campaign_ref: "campaign_01OpenHouse",
    campaign_version_ref: "version_01Campaign",
    version_no: 1,
    source_campaign_ref: null,
    input_versions: Object.freeze({
      blueprintVersionRef: "blueprint_01OpenHouse",
      brandProfileVersionRef: "profile_01Brand",
      complianceProfileVersionRef: "profile_01Compliance",
      partnerProfileVersionRef: "profile_01Partner",
      routingProfileVersionRef: "profile_01Routing",
      rulesetVersionRef: "ruleset_01Policy",
    }),
    manifest: campaignManifestFixture,
    manifest_hash: "a".repeat(64),
    created_by_actor_ref: "user_01Creator",
    created_at: new Date("2026-07-21T16:00:00.000Z"),
  });
  const preflightRow = Object.freeze({
    campaign_ref: "campaign_01OpenHouse",
    campaign_version_ref: "version_01Campaign",
    manifest_hash: "a".repeat(64),
    input_versions: versionRow.input_versions,
    ruleset_version_ref: "ruleset_01Policy",
    findings: [],
    blocking: false,
    result_hash: "c".repeat(64),
    evaluated_at: new Date("2026-07-21T16:00:00.000Z"),
  });
  const aggregateRow = Object.freeze({
    campaign_ref: "campaign_01OpenHouse",
    status: "awaiting_approval",
    row_version: 2,
    updated_at: new Date("2026-07-21T16:01:00.000Z"),
  });

  it("lists and loads tenant campaigns without a write lock", async () => {
    const connection = new FakeConnection({
      rowsByStatement: {
        "campaign.select-location-list.v1": [aggregateRow],
        "campaign.select-read-aggregate.v1": [aggregateRow],
        "campaign.select-latest-version.v1": [versionRow],
        "campaign.select-latest-preflight.v1": [preflightRow],
        "campaign.select-latest-approval.v1": [
          {
            approval_ref: "approval_01Decision",
            location_ref: "location_01TenantA",
            campaign_ref: "campaign_01OpenHouse",
            campaign_version_ref: "version_01Campaign",
            manifest_hash: "a".repeat(64),
            preflight_result_hash: "c".repeat(64),
            actor_ref: "user_01Creator",
            actor_kind: "human",
            actor_role: "location_admin",
            decided_at: new Date("2026-07-21T16:05:00.000Z"),
            ip_audit_hash: "e".repeat(64),
            decision: "approved",
            snapshot: {
              pageVersionRef: "page_01Approved",
              pdfVersionRef: "pdf_01Approved",
              creativeVersionRef: "creative_01Approved",
              copyVersionRef: "copy_01Approved",
              emailPackageVersionRef: "email_01Approved",
              smsPackageVersionRef: "sms_01Approved",
              disclosureVersionRef: "disclosure_01Approved",
              targetingHash: "1".repeat(64),
              budgetHash: "2".repeat(64),
              datesHash: "3".repeat(64),
              formVersionRef: "form_01Approved",
              destinationVersionRef: "destination_01Approved",
            },
          },
        ],
      },
    });
    const repository = createPostgresCampaignReadRepository(new FakePool(connection), {
      resolveTenantDatabaseContext: async () => context,
    });
    const listed = await repository.listForLocation();
    expect(listed).toHaveLength(1);
    expect(listed[0]?.version.campaignRef).toBe("campaign_01OpenHouse");
    expect(listed[0]?.approval?.decision).toBe("approved");
    expect(connection.statementNames()).not.toContain("campaign.lock-approval-aggregate.v1");
    await expect(repository.getByCampaignRef("campaign_01OpenHouse")).resolves.toMatchObject({
      state: "awaiting_approval",
      rowVersion: 2,
    });
  });

  it("skips incomplete aggregates and returns undefined for unknown refs", async () => {
    const missingVersion = new FakeConnection({
      rowsByStatement: {
        "campaign.select-location-list.v1": [aggregateRow],
        "campaign.select-latest-version.v1": [],
        "campaign.select-read-aggregate.v1": [],
      },
    });
    const repository = createPostgresCampaignReadRepository(new FakePool(missingVersion), {
      resolveTenantDatabaseContext: async () => context,
    });
    await expect(repository.listForLocation()).resolves.toEqual([]);
    await expect(repository.getByCampaignRef("campaign_missing001")).resolves.toBeUndefined();

    const missingPreflight = new FakeConnection({
      rowsByStatement: {
        "campaign.select-location-list.v1": [aggregateRow],
        "campaign.select-latest-version.v1": [versionRow],
        "campaign.select-latest-preflight.v1": [],
      },
    });
    const incomplete = createPostgresCampaignReadRepository(new FakePool(missingPreflight), {
      resolveTenantDatabaseContext: async () => context,
    });
    await expect(incomplete.listForLocation()).resolves.toEqual([]);
  });
});

function aiPortWithRows(statementName: string, rows: readonly unknown[]) {
  return createPostgresAiTelemetryPort(
    new FakePool(
      new FakeConnection({
        rowsByStatement: { [statementName]: rows },
      }),
    ),
    { resolveAiTelemetryDatabaseContext: async () => telemetryContext },
  );
}

function cleanupPortWithRows(statementName: string, rows: readonly unknown[]) {
  return createPostgresPublicationCleanupReconciliationPort(
    new FakePool(
      new FakeConnection({
        rowsByStatement: { [statementName]: rows },
      }),
    ),
    { resolvePublicationCleanupDatabaseContext: async () => cleanupContext },
  );
}

interface FakeConnectionOptions {
  readonly claimRows?: readonly unknown[];
  readonly failRelease?: boolean;
  readonly failRollback?: boolean;
  readonly mutationRows?: readonly unknown[];
  readonly rowsByStatement?: Readonly<Record<string, readonly unknown[]>>;
}

class FakeConnection implements DatabaseConnection {
  readonly requests: SqlRequest[] = [];
  readonly #options: FakeConnectionOptions;

  constructor(options: FakeConnectionOptions = {}) {
    this.#options = options;
  }

  async execute(request: SqlRequest): Promise<SqlDriverResult> {
    this.requests.push(request);
    if (request.statementName === "transaction.rollback" && this.#options.failRollback === true) {
      throw new Error("rollback failed");
    }
    if (request.statementName === "transaction.read-context") {
      return {
        rowCount: 1,
        rows: [
          {
            actor_id: context.actorId,
            correlation_id: context.correlationId,
            location_id: context.locationId,
          },
        ],
      };
    }
    if (request.statementName === "test.read-value.v1") {
      return { rowCount: 1, rows: [{ value: "verified" }] };
    }
    if (request.statementName === "test.write-value.v1") {
      return { rowCount: 1, rows: [{ affected: true }] };
    }
    const configuredRows = this.#options.rowsByStatement?.[request.statementName];
    if (configuredRows !== undefined) {
      return { rowCount: configuredRows.length, rows: configuredRows };
    }
    if (request.statementName === "integration.claim-delivery.v1") {
      const rows = this.#options.claimRows ?? [{ acquired: true }];
      return { rowCount: rows.length, rows };
    }
    if (
      request.statementName === "integration.complete-delivery.v1" ||
      request.statementName === "integration.release-delivery.v1" ||
      request.statementName === "integration.mark-delivery-completion-uncertain.v1"
    ) {
      const rows = this.#options.mutationRows ?? [{ affected: true }];
      return { rowCount: rows.length, rows };
    }
    return { rowCount: 0, rows: [] };
  }

  async release(): Promise<void> {
    if (this.#options.failRelease === true) throw new Error("release failed");
  }

  statementNames(): string[] {
    return this.requests.map((entry) => entry.statementName);
  }
}

class FakePool implements DatabasePool {
  connectCalls = 0;
  readonly #connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.#connection = connection;
  }

  async connect(): Promise<DatabaseConnection> {
    this.connectCalls += 1;
    return this.#connection;
  }
}
