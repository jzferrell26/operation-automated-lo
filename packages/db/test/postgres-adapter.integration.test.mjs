import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

import {
  PostgresAdapterError,
  createPostgresAiTelemetryPort,
  createPostgresPool,
  createPostgresPublicationCleanupReconciliationPort,
  createResolverAwarePostgresDeliveryGuard,
  leaseOutboxBatchContract,
} from "../dist/index.js";

const databaseUrl = process.env.OALO_TEST_DATABASE_URL;
if (databaseUrl !== undefined && !new URL(databaseUrl).pathname.startsWith("/oalo_test_")) {
  throw new Error("OALO_TEST_DATABASE_URL must identify an oalo_test_ database");
}

describe(
  "PostgreSQL 17 adapter integration",
  { concurrency: false, skip: databaseUrl === undefined },
  () => {
    it("executes through the real driver without retaining prepared statements", async () => {
      const pool = testPool(databaseUrl);
      const connection = await pool.connect();
      try {
        const version = await connection.execute(
          request(
            "test.server-version",
            `
select current_setting('server_version_num')::integer as server_version_num
      `,
          ),
        );
        assert.equal(version.rows.length, 1);
        const versionRow = version.rows[0];
        assert.equal(typeof versionRow, "object");
        assert.ok(versionRow !== null);
        assert.ok(
          versionRow.server_version_num >= 170000 && versionRow.server_version_num < 180000,
        );

        await connection.execute(
          request("test.parameter-round-trip", "select $1::text as safe_value", ["safe-value"]),
        );
        const prepared = await connection.execute(
          request(
            "test.prepared-statements",
            `
select pg_catalog.count(*)::integer as prepared_count
from pg_catalog.pg_prepared_statements
      `,
          ),
        );
        assert.deepEqual(prepared.rows, [{ prepared_count: 0 }]);

        await assert.rejects(
          connection.execute({
            ...request("test.named-statement", "select 1"),
            preparedStatementMode: "named",
          }),
          (error) =>
            error instanceof PostgresAdapterError &&
            error.code === "DB_PREPARED_STATEMENT_FORBIDDEN",
        );
      } finally {
        await connection.release();
        await pool.close();
      }
    });

    it("round-trips every leased outbox field through the migrated SQL function", async () => {
      const pool = testPool(databaseUrl);
      const connection = await pool.connect();
      let transactionOpen = false;
      try {
        await connection.execute(request("test.begin", "begin"));
        transactionOpen = true;
        await connection.execute(
          request(
            "test.outbox-fixture",
            `
insert into platform.locations (id, display_name, status)
values ('00000000-0000-4000-8000-000000000191', 'Adapter Integration Tenant', 'active');

insert into integration.command_executions (
  id, location_id, command_name, schema_version, actor_id, actor_type,
  resource_type, resource_id, input_hash, idempotency_key, status,
  correlation_id, committed_at
) values (
  '00000000-0000-4000-8000-000000000591',
  '00000000-0000-4000-8000-000000000191',
  'RenderCampaign', 1,
  '00000000-0000-4000-8000-000000000291', 'system',
  'campaign', 'campaign_adapter_001', repeat('a', 64), repeat('b', 64),
  'committed', 'correlation_adapter_001', pg_catalog.statement_timestamp()
);

insert into integration.outbox_events (
  id, location_id, command_id, event_name, schema_version, aggregate_type,
  aggregate_id, aggregate_version, idempotency_key, payload_ref,
  correlation_id, available_at
) values (
  '00000000-0000-4000-8000-000000000791',
  '00000000-0000-4000-8000-000000000191',
  '00000000-0000-4000-8000-000000000591',
  'campaign.render-requested.v1', 1, 'campaign', 'campaign_adapter_001', 12,
  repeat('c', 64), 'payload_adapter_001', 'correlation_adapter_001',
  '2026-01-21T15:30:00.000Z'::timestamptz
)
      `,
          ),
        );

        const leased = await connection.execute({
          statementName: leaseOutboxBatchContract.name,
          text: leaseOutboxBatchContract.text,
          values: ["scheduler_adapter_001", 60, 10],
          preparedStatementMode: "unnamed",
        });
        assert.equal(leased.rows.length, 1);
        assert.deepEqual(leaseOutboxBatchContract.decode(leased.rows[0]), {
          aggregateRef: "campaign_adapter_001",
          aggregateType: "campaign",
          aggregateVersion: 12,
          availableAt: "2026-01-21T15:30:00.000Z",
          commandRef: "00000000-0000-4000-8000-000000000591",
          correlationId: "correlation_adapter_001",
          eventId: "00000000-0000-4000-8000-000000000791",
          eventName: "campaign.render-requested.v1",
          leaseOwner: "scheduler_adapter_001",
          locationRef: "00000000-0000-4000-8000-000000000191",
          schemaVersion: 1,
        });
      } finally {
        if (transactionOpen) await connection.execute(request("test.rollback", "rollback"));
        await connection.release();
        await pool.close();
      }
    });

    it("resolves and isolates delivery claims for two tenants", async () => {
      const suffix = randomUUID().replaceAll("-", "");
      const tenantA = tenantFixture("a", suffix);
      const tenantB = tenantFixture("b", suffix);
      const pool = testPool(databaseUrl);
      const setupConnection = await pool.connect();
      try {
        for (const tenant of [tenantA, tenantB]) {
          await setupConnection.execute(
            request(
              `test.delivery-location-${tenant.label}`,
              "insert into platform.locations (id, display_name, status) values ($1::uuid, $2::text, 'active')",
              [tenant.locationId, `Delivery Guard Tenant ${tenant.label.toUpperCase()}`],
            ),
          );
          await setupConnection.execute(
            request(
              `test.delivery-actor-${tenant.label}`,
              "insert into platform.app_users (id, safe_display_name) values ($1::uuid, $2::text)",
              [tenant.actorId, `Delivery Guard Actor ${tenant.label.toUpperCase()}`],
            ),
          );
          await setupConnection.execute(
            request(
              `test.delivery-role-${tenant.label}`,
              "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, 'location_admin')",
              [tenant.locationId, tenant.actorId],
            ),
          );
        }
      } finally {
        await setupConnection.release();
      }

      const contexts = new Map(
        [tenantA, tenantB].map((tenant) => [tenant.locationRef, resolvedContext(tenant)]),
      );
      const resolver = {
        async resolveDeliveryDatabaseContext(delivery) {
          return contexts.get(delivery.locationRef);
        },
      };
      const firstGuard = createResolverAwarePostgresDeliveryGuard(pool, resolver);
      const secondGuard = createResolverAwarePostgresDeliveryGuard(pool, resolver);
      const sharedDelivery = Object.freeze({
        businessOutcomeKey: "d".repeat(64),
        deliveryKind: "task",
        deliveryRef: `delivery_${suffix}`,
        schemaVersion: 1,
      });
      const deliveryA = Object.freeze({ ...sharedDelivery, ...deliveryContextFields(tenantA) });
      const deliveryB = Object.freeze({ ...sharedDelivery, ...deliveryContextFields(tenantB) });
      const retryableDelivery = Object.freeze({
        ...deliveryA,
        businessOutcomeKey: "e".repeat(64),
        deliveryKind: "command",
        deliveryRef: `command_${suffix}`,
      });
      const uncertainDelivery = Object.freeze({
        ...deliveryA,
        businessOutcomeKey: "2".repeat(64),
        deliveryKind: "event",
        deliveryRef: `uncertain_${suffix}`,
      });

      try {
        const concurrentClaims = await Promise.all([
          firstGuard.claim(deliveryA),
          secondGuard.claim(deliveryA),
        ]);
        assert.deepEqual(concurrentClaims.toSorted(), [false, true]);
        assert.equal(await firstGuard.claim(deliveryB), true);
        await firstGuard.complete(deliveryA);
        await firstGuard.complete(deliveryB);
        assert.equal(await secondGuard.claim(deliveryA), false);
        assert.equal(await secondGuard.claim(deliveryB), false);

        assert.equal(await firstGuard.claim(retryableDelivery), true);
        await firstGuard.release(retryableDelivery);
        assert.equal(await secondGuard.claim(retryableDelivery), true);
        await secondGuard.complete(retryableDelivery);

        assert.equal(await firstGuard.claim(uncertainDelivery), true);
        await firstGuard.markCompletionUncertain(
          uncertainDelivery,
          "DELIVERY_COMPLETION_UNCERTAIN",
        );
        assert.equal(await secondGuard.claim(uncertainDelivery), false);
        await assert.rejects(
          firstGuard.markCompletionUncertain(uncertainDelivery, "DELIVERY_COMPLETION_UNCERTAIN"),
          { code: "DELIVERY_CLAIM_NOT_ACTIVE" },
        );

        const unknownDelivery = Object.freeze({
          ...deliveryA,
          businessOutcomeKey: "f".repeat(64),
          deliveryRef: `unknown_${suffix}`,
          locationRef: `location_unknown_${suffix}`,
        });
        await assert.rejects(firstGuard.claim(unknownDelivery), {
          code: "DELIVERY_CONTEXT_UNKNOWN",
        });

        const mismatchedGuard = createResolverAwarePostgresDeliveryGuard(pool, {
          async resolveDeliveryDatabaseContext() {
            return resolvedContext(tenantA);
          },
        });
        await assert.rejects(mismatchedGuard.claim(deliveryB), {
          code: "DELIVERY_CONTEXT_MISMATCH",
        });

        const revokedGuard = createResolverAwarePostgresDeliveryGuard(pool, {
          async resolveDeliveryDatabaseContext() {
            return { ...resolvedContext(tenantB), authorityState: "revoked" };
          },
        });
        await assert.rejects(revokedGuard.claim(deliveryB), {
          code: "DELIVERY_CONTEXT_REVOKED",
        });

        const malformedGuard = createResolverAwarePostgresDeliveryGuard(pool, {
          async resolveDeliveryDatabaseContext() {
            return { ...resolvedContext(tenantB), actorId: "not-a-uuid" };
          },
        });
        await assert.rejects(malformedGuard.claim(deliveryB), { code: "DB_CONTEXT_INVALID" });

        const crossTenantActorGuard = createResolverAwarePostgresDeliveryGuard(pool, {
          async resolveDeliveryDatabaseContext() {
            return { ...resolvedContext(tenantB), actorId: tenantA.actorId };
          },
        });
        await assert.rejects(
          crossTenantActorGuard.claim({
            ...deliveryB,
            businessOutcomeKey: "1".repeat(64),
            deliveryRef: `cross_${suffix}`,
          }),
          (error) => error?.code === "42501",
        );

        const verificationConnection = await pool.connect();
        try {
          const persisted = await verificationConnection.execute(
            request(
              "test.delivery-tenant-counts",
              `
select location_id::text as location_id, pg_catalog.count(*)::integer as claim_count
from integration.delivery_claims
where location_id in ($1::uuid, $2::uuid)
group by location_id
order by location_id
              `,
              [tenantA.locationId, tenantB.locationId],
            ),
          );
          assert.deepEqual(
            persisted.rows.toSorted((left, right) =>
              left.location_id.localeCompare(right.location_id),
            ),
            [
              { claim_count: 3, location_id: tenantA.locationId },
              { claim_count: 1, location_id: tenantB.locationId },
            ].toSorted((left, right) => left.location_id.localeCompare(right.location_id)),
          );
          const uncertain = await verificationConnection.execute(
            request(
              "test.delivery-completion-uncertain",
              `
select status, problem_code, completion_uncertain_at is not null as has_uncertain_at
from integration.delivery_claims
where location_id = $1::uuid and external_delivery_id = $2::text
              `,
              [tenantA.locationId, uncertainDelivery.deliveryRef],
            ),
          );
          assert.deepEqual(uncertain.rows, [
            {
              has_uncertain_at: true,
              problem_code: "DELIVERY_COMPLETION_UNCERTAIN",
              status: "completion_uncertain",
            },
          ]);
        } finally {
          await verificationConnection.release();
        }
      } finally {
        const cleanupConnection = await pool.connect();
        try {
          await cleanupConnection.execute(
            request(
              "test.cleanup-delivery-claims",
              "delete from integration.delivery_claims where location_id in ($1::uuid, $2::uuid)",
              [tenantA.locationId, tenantB.locationId],
            ),
          );
          await cleanupConnection.execute(
            request(
              "test.cleanup-delivery-role",
              "delete from platform.role_bindings where location_id in ($1::uuid, $2::uuid)",
              [tenantA.locationId, tenantB.locationId],
            ),
          );
          await cleanupConnection.execute(
            request(
              "test.cleanup-delivery-actor",
              "delete from platform.app_users where id in ($1::uuid, $2::uuid)",
              [tenantA.actorId, tenantB.actorId],
            ),
          );
          await cleanupConnection.execute(
            request(
              "test.cleanup-delivery-location",
              "delete from platform.locations where id in ($1::uuid, $2::uuid)",
              [tenantA.locationId, tenantB.locationId],
            ),
          );
        } finally {
          await cleanupConnection.release();
          await pool.close();
        }
      }
    });

    it("atomically persists AI telemetry and durably reconciles telemetry and publication cleanup", async () => {
      const suffix = randomUUID().replaceAll("-", "");
      const tenant = tenantFixture("durable", suffix);
      const actorRef = `actor_${suffix}`;
      const pool = testPool(databaseUrl);
      const setupConnection = await pool.connect();
      try {
        await setupConnection.execute(
          request(
            "test.durable-location",
            "insert into platform.locations (id, ghl_location_id, display_name, status) values ($1::uuid, $2::text, $3::text, 'active')",
            [tenant.locationId, tenant.locationRef, "Durable Reconciliation Tenant"],
          ),
        );
        await setupConnection.execute(
          request(
            "test.durable-actor",
            "insert into platform.app_users (id, safe_display_name) values ($1::uuid, $2::text)",
            [tenant.actorId, "Durable Reconciliation Actor"],
          ),
        );
        await setupConnection.execute(
          request(
            "test.durable-role",
            "insert into platform.role_bindings (location_id, user_id, role) values ($1::uuid, $2::uuid, 'location_admin')",
            [tenant.locationId, tenant.actorId],
          ),
        );
      } finally {
        await setupConnection.release();
      }

      const telemetryContext = Object.freeze({
        actorId: tenant.actorId,
        actorRef,
        authorityState: "active",
        correlationId: tenant.correlationId,
        locationId: tenant.locationId,
        locationRef: tenant.locationRef,
      });
      const telemetry = createPostgresAiTelemetryPort(pool, {
        async resolveAiTelemetryDatabaseContext() {
          return telemetryContext;
        },
      });
      const cleanup = createPostgresPublicationCleanupReconciliationPort(pool, {
        async resolvePublicationCleanupDatabaseContext() {
          return {
            actorId: tenant.actorId,
            authorityState: "active",
            correlationId: tenant.correlationId,
            locationId: tenant.locationId,
            locationRef: tenant.locationRef,
          };
        },
      });
      const occurredAt = "2026-07-21T19:30:00.000Z";
      const pair = telemetryPair({ actorRef, occurredAt, suffix, tenant });
      const rollbackPair = Object.freeze({
        trace: pair.trace,
        usage: Object.freeze({ ...pair.usage, usageEventRef: `usage_rollback_${suffix}` }),
      });
      const cleanupIntent = Object.freeze({
        attemptedKeys: Object.freeze([
          `public/campaign_${suffix}/v1/social.png`,
          `public/campaign_${suffix}/v1/print.pdf`,
        ]),
        campaignVersionRef: `campaignversion_${suffix}`,
        idempotencyKey: `${suffix}${suffix}`,
        locationRef: tenant.locationRef,
        maximumAttempts: 3,
        problemCode: "PUBLICATION_PARTIAL_FAILURE",
        publicBucket: "oalo-public-test",
        publicCampaignId: `campaign_${suffix}`,
        publishedVersion: 1,
      });

      try {
        await assert.rejects(
          cleanup.enqueue({ ...cleanupIntent, locationRef: `location_other_${suffix}` }),
          (error) => error !== undefined,
          "cleanup enqueue must reject a locationRef outside the active tenant",
        );
        await assert.doesNotReject(
          telemetry.recordAtomically(pair),
          "initial AI telemetry pair should persist",
        );
        await assert.rejects(
          telemetry.recordAtomically(rollbackPair),
          (error) => error !== undefined,
        );

        await telemetry.markReconciliationRequired({
          ...rollbackPair,
          problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED",
        });
        await telemetry.markReconciliationRequired({
          ...rollbackPair,
          problemCode: "AI_TELEMETRY_PERSISTENCE_FAILED",
        });

        assert.equal(await cleanup.enqueue(cleanupIntent), "enqueued");
        assert.equal(await cleanup.enqueue(cleanupIntent), "already_pending");
        const firstLeaseUntil = new Date(Date.now() + 300_000).toISOString();
        const firstLease = await cleanup.claimAvailable({
          leaseOwner: `cleanup_${suffix}`,
          leaseUntil: firstLeaseUntil,
          limit: 10,
        });
        assert.equal(firstLease.length, 1);
        assert.deepEqual(firstLease[0]?.attemptedKeys, cleanupIntent.attemptedKeys);
        assert.equal(firstLease[0]?.attemptCount, 1);
        assert.equal(
          await cleanup.releaseAfterFailure({
            availableAt: new Date(Date.now() + 60_000).toISOString(),
            idempotencyKey: cleanupIntent.idempotencyKey,
            leaseOwner: `cleanup_${suffix}`,
            problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
          }),
          "pending",
        );

        const verificationConnection = await pool.connect();
        try {
          const telemetryCounts = await verificationConnection.execute(
            request(
              "test.ai-telemetry-counts",
              `
select
  (select pg_catalog.count(*)::integer from integration.ai_usage_events
    where location_id = $1::uuid) as usage_count,
  (select pg_catalog.count(*)::integer from integration.ai_trace_records
    where location_id = $1::uuid) as trace_count,
  (select pg_catalog.count(*)::integer from integration.ai_usage_events
    where usage_event_ref = $2::text) as rolled_back_usage_count,
  (select pg_catalog.count(*)::integer from integration.ai_telemetry_reconciliation_queue
    where location_id = $1::uuid) as reconciliation_count
              `,
              [tenant.locationId, rollbackPair.usage.usageEventRef],
            ),
          );
          assert.deepEqual(telemetryCounts.rows, [
            {
              reconciliation_count: 1,
              rolled_back_usage_count: 0,
              trace_count: 1,
              usage_count: 1,
            },
          ]);
          const pendingCleanup = await verificationConnection.execute(
            request(
              "test.publication-cleanup-pending",
              `
select status, attempt_count, last_error_code, attempted_keys
from integration.publication_cleanup_intents
where location_id = $1::uuid and idempotency_key = $2::text
              `,
              [tenant.locationId, cleanupIntent.idempotencyKey],
            ),
          );
          assert.deepEqual(pendingCleanup.rows, [
            {
              attempt_count: 1,
              attempted_keys: cleanupIntent.attemptedKeys,
              last_error_code: "PUBLICATION_QUARANTINE_RETRY_FAILED",
              status: "pending",
            },
          ]);
          await verificationConnection.execute(
            request(
              "test.publication-cleanup-advance-backoff",
              `
update integration.publication_cleanup_intents
set available_at = pg_catalog.statement_timestamp() - interval '1 second'
where location_id = $1::uuid and idempotency_key = $2::text
              `,
              [tenant.locationId, cleanupIntent.idempotencyKey],
            ),
          );
        } finally {
          await verificationConnection.release();
        }

        const secondLease = await cleanup.claimAvailable({
          leaseOwner: `cleanup_retry_${suffix}`,
          leaseUntil: new Date(Date.now() + 300_000).toISOString(),
          limit: 10,
        });
        assert.equal(secondLease.length, 1);
        assert.equal(secondLease[0]?.attemptCount, 2);
        await cleanup.complete({
          idempotencyKey: cleanupIntent.idempotencyKey,
          leaseOwner: `cleanup_retry_${suffix}`,
          quarantinedKeys: cleanupIntent.attemptedKeys,
        });
        assert.equal(await cleanup.enqueue(cleanupIntent), "already_completed");
      } finally {
        const cleanupConnection = await pool.connect();
        try {
          for (const [statementName, text, values] of [
            [
              "test.cleanup-publication-intents",
              "delete from integration.publication_cleanup_intents where location_id = $1::uuid",
              [tenant.locationId],
            ],
            [
              "test.cleanup-ai-reconciliation",
              "delete from integration.ai_telemetry_reconciliation_queue where location_id = $1::uuid",
              [tenant.locationId],
            ],
            [
              "test.cleanup-ai-traces",
              "delete from integration.ai_trace_records where location_id = $1::uuid",
              [tenant.locationId],
            ],
            [
              "test.cleanup-ai-usage",
              "delete from integration.ai_usage_events where location_id = $1::uuid",
              [tenant.locationId],
            ],
            [
              "test.cleanup-durable-role",
              "delete from platform.role_bindings where location_id = $1::uuid",
              [tenant.locationId],
            ],
            [
              "test.cleanup-durable-actor",
              "delete from platform.app_users where id = $1::uuid",
              [tenant.actorId],
            ],
            [
              "test.cleanup-durable-location",
              "delete from platform.locations where id = $1::uuid",
              [tenant.locationId],
            ],
          ]) {
            await cleanupConnection.execute(request(statementName, text, values));
          }
        } finally {
          await cleanupConnection.release();
          await pool.close();
        }
      }
    });
  },
);

function testPool(connectionString) {
  return createPostgresPool({
    applicationName: "oalo-db-integration",
    connectionString,
    deploymentEnvironment: "test",
    maxConnections: 2,
    poolingMode: "transaction",
    preparedStatements: false,
    sslMode: "disable",
  });
}

function request(statementName, text, values = []) {
  return Object.freeze({
    preparedStatementMode: "unnamed",
    statementName,
    text: text.trim(),
    values,
  });
}

function tenantFixture(label, suffix) {
  return Object.freeze({
    actorId: randomUUID(),
    correlationId: `correlation_${label}_${suffix}`,
    label,
    locationId: randomUUID(),
    locationRef: `location_${label}_${suffix}`,
  });
}

function resolvedContext(tenant) {
  return Object.freeze({
    actorId: tenant.actorId,
    authorityState: "active",
    correlationId: tenant.correlationId,
    locationId: tenant.locationId,
    locationRef: tenant.locationRef,
  });
}

function deliveryContextFields(tenant) {
  return Object.freeze({
    correlationId: tenant.correlationId,
    locationRef: tenant.locationRef,
  });
}

function telemetryPair({ actorRef, occurredAt, suffix, tenant }) {
  const shared = Object.freeze({
    actorRef,
    correlationRef: tenant.correlationId,
    failureClassification: undefined,
    feature: "campaign_pack",
    latencyMs: 125,
    locationRef: tenant.locationRef,
    modelPolicyVersionRef: `modelpolicy_${suffix}`,
    occurredAt,
    outcome: "accepted",
    promptPolicyVersionRef: `promptpolicy_${suffix}`,
    providerRequestRef: `providerrequest_${suffix}`,
  });
  const usage = {
    usageEventRef: `usage_${suffix}`,
    locationRef: shared.locationRef,
    actorRef: shared.actorRef,
    feature: shared.feature,
    campaignRef: `campaign_${suffix}`,
    brandVersionRef: `brandversion_${suffix}`,
    correlationRef: shared.correlationRef,
    providerRef: "provider_anthropic",
    modelRef: "claude-sonnet-production",
    modelPolicyVersionRef: shared.modelPolicyVersionRef,
    promptPolicyVersionRef: shared.promptPolicyVersionRef,
    providerRequestRef: shared.providerRequestRef,
    tokenUsage: {
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 25,
      totalTokens: 125,
      uncachedInputTokens: 100,
    },
    estimatedCostUsd: 0.01,
    latencyMs: shared.latencyMs,
    retryCount: 0,
    outcome: shared.outcome,
    chargedPlanUnit: "campaign_pack",
    occurredAt: shared.occurredAt,
  };
  const trace = {
    traceRef: `trace_${suffix}`,
    locationRef: shared.locationRef,
    actorRef: shared.actorRef,
    correlationRef: shared.correlationRef,
    feature: shared.feature,
    routeRef: "route_primary",
    modelPolicyVersionRef: shared.modelPolicyVersionRef,
    promptPolicyVersionRef: shared.promptPolicyVersionRef,
    promptContextHash: "a".repeat(64),
    acceptedOutputHash: "b".repeat(64),
    providerRequestRef: shared.providerRequestRef,
    latencyMs: shared.latencyMs,
    outcome: shared.outcome,
    occurredAt: shared.occurredAt,
  };
  return Object.freeze({ trace: Object.freeze(trace), usage: Object.freeze(usage) });
}
