import { createHash } from "node:crypto";

import { AbortTaskRunError, logger, schedules } from "@trigger.dev/sdk";
import { parseProductionTaskRuntimeConfiguration } from "@oalo/config";
import { z } from "zod";

import type { ProductionTaskBindings } from "../core/production-task-bindings.js";
import {
  ProductionPublicationCleanupTaskRequestSchema,
  runProductionPublicationCleanupTask,
} from "../core/production-publication-cleanup.js";
import {
  ProductionTaskAuthorityProofSchema,
  createProductionTaskAuthorityProof,
  productionTaskBindings,
} from "../core/production-runtime-composition.js";
import { classifyTaskFailure } from "../core/task-retry-classification.js";

export const ProductionPublicationCleanupTaskEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    authority: ProductionTaskAuthorityProofSchema,
    request: ProductionPublicationCleanupTaskRequestSchema,
  })
  .strict()
  .readonly();

export const PUBLICATION_CLEANUP_SCHEDULE = Object.freeze({
  pattern: "*/5 * * * *",
  timezone: "UTC",
  environments: ["PRODUCTION"] as "PRODUCTION"[],
});

export const PUBLICATION_CLEANUP_SCHEDULE_LIMIT = 10;
export const PUBLICATION_CLEANUP_LEASE_DURATION_MILLISECONDS = 2 * 60 * 1_000;
export const PUBLICATION_CLEANUP_AUTHORITY_TTL_MILLISECONDS = 5 * 60 * 1_000;

const ScheduledPublicationCleanupPayloadSchema = z
  .object({
    scheduleId: z.string().min(1).max(200),
    type: z.literal("DECLARATIVE"),
    timestamp: z.date(),
    timezone: z.literal("UTC"),
  })
  .passthrough();

export interface ScheduledPublicationCleanupRuntime {
  readonly bindings: ProductionTaskBindings;
  readonly authority: Readonly<{
    locationRef: string;
    locationId: string;
    actorId: string;
  }>;
  readonly hmacKey: string;
}

function deployedScheduledPublicationCleanupRuntime(): ScheduledPublicationCleanupRuntime {
  const runtime = parseProductionTaskRuntimeConfiguration(process.env);
  return Object.freeze({
    bindings: productionTaskBindings(),
    authority: runtime.scheduledPublicationCleanupAuthority,
    hmacKey: runtime.taskAuthorityHmacKey,
  });
}

function scheduledRunDigest(
  payload: Readonly<{ scheduleId: string; timestamp: Date; timezone: string }>,
  locationRef: string,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        1,
        "reconcile-publication-cleanup",
        payload.scheduleId,
        payload.timestamp.toISOString(),
        payload.timezone,
        locationRef,
      ]),
    )
    .digest("hex");
}

export async function executePublicationCleanupTask(
  input: unknown,
  resolveBindings: () => ProductionTaskBindings = productionTaskBindings,
  now?: () => Date,
) {
  const envelope = ProductionPublicationCleanupTaskEnvelopeSchema.parse(input);
  const bindings = resolveBindings();
  return bindings.withDeliveryAuthority(
    envelope.authority,
    envelope.request.delivery,
    envelope.request,
    async () =>
      runProductionPublicationCleanupTask(envelope.request, {
        reconciliation: bindings.publicationCleanupReconciliation,
        objectStore: bindings.publicationObjectStore,
        ...(now === undefined ? {} : { now }),
      }),
  );
}

export async function executeScheduledPublicationCleanupTask(
  input: unknown,
  resolveRuntime: () => ScheduledPublicationCleanupRuntime = deployedScheduledPublicationCleanupRuntime,
  now: () => Date = () => new Date(),
) {
  const payload = ScheduledPublicationCleanupPayloadSchema.parse(input);
  const runtime = resolveRuntime();
  const digest = scheduledRunDigest(payload, runtime.authority.locationRef);
  const delivery = {
    schemaVersion: 1 as const,
    deliveryKind: "task" as const,
    deliveryRef: `task_${digest}`,
    businessOutcomeKey: digest,
    locationRef: runtime.authority.locationRef,
    correlationId: `correlation_${digest}`,
  };
  const request = {
    schemaVersion: 1 as const,
    delivery,
    leaseOwner: `trigger-cleanup:${digest}`,
    limit: PUBLICATION_CLEANUP_SCHEDULE_LIMIT,
    leaseDurationMilliseconds: PUBLICATION_CLEANUP_LEASE_DURATION_MILLISECONDS,
  };
  const authority = createProductionTaskAuthorityProof({
    delivery,
    request,
    locationId: runtime.authority.locationId,
    actorId: runtime.authority.actorId,
    expiresAt: new Date(
      now().getTime() + PUBLICATION_CLEANUP_AUTHORITY_TTL_MILLISECONDS,
    ).toISOString(),
    hmacKey: runtime.hmacKey,
  });

  return executePublicationCleanupTask(
    {
      schemaVersion: 1,
      authority,
      request,
    },
    () => runtime.bindings,
    now,
  );
}

export const reconcilePublicationCleanupWorker = schedules.task({
  id: "reconcile-publication-cleanup",
  cron: PUBLICATION_CLEANUP_SCHEDULE,
  queue: { concurrencyLimit: 1 },
  ttl: "5m",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 4_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload) => {
    logger.info("Scheduled publication cleanup started.", {
      scheduleId: payload.scheduleId,
      scheduledAt: payload.timestamp.toISOString(),
      timezone: payload.timezone,
    });
    try {
      const result = await executeScheduledPublicationCleanupTask(payload);
      logger.info("Scheduled publication cleanup completed.", {
        scheduleId: payload.scheduleId,
        leased: result.leased,
        completed: result.completed,
        released: result.released,
        deadLettered: result.deadLettered,
      });
      return result;
    } catch (error) {
      logger.error("Scheduled publication cleanup failed.", {
        scheduleId: payload.scheduleId,
        classification: classifyTaskFailure(error),
      });
      if (classifyTaskFailure(error) === "non-retryable") {
        throw new AbortTaskRunError("Rejected non-retryable publication cleanup input.");
      }
      throw error;
    }
  },
});
