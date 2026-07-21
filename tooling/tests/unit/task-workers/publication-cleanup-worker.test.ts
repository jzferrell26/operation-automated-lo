import { describe, expect, it, vi } from "vitest";

import { runProductionPublicationCleanupTask } from "../../../../apps/tasks/src/core/production-publication-cleanup.js";
import type { ProductionTaskBindings } from "../../../../apps/tasks/src/core/production-task-bindings.js";
import {
  PUBLICATION_CLEANUP_AUTHORITY_TTL_MILLISECONDS,
  PUBLICATION_CLEANUP_LEASE_DURATION_MILLISECONDS,
  PUBLICATION_CLEANUP_SCHEDULE,
  PUBLICATION_CLEANUP_SCHEDULE_LIMIT,
  executePublicationCleanupTask,
  executeScheduledPublicationCleanupTask,
  reconcilePublicationCleanupWorker,
} from "../../../../apps/tasks/src/tasks/reconcile-publication-cleanup.js";

const sha = (character: string) => character.repeat(64);

const taskDelivery = Object.freeze({
  schemaVersion: 1 as const,
  deliveryKind: "task" as const,
  deliveryRef: "delivery_publication_cleanup_001",
  businessOutcomeKey: sha("b"),
  locationRef: "location_publication_cleanup_001",
  correlationId: "correlation_publication_cleanup_001",
});

const request = Object.freeze({
  schemaVersion: 1 as const,
  delivery: taskDelivery,
  leaseOwner: "publication-cleanup-worker-001",
  limit: 10,
  leaseDurationMilliseconds: 300_000,
});

function cleanupLease() {
  return Object.freeze({
    publicBucket: "oalo-public-staging",
    locationRef: taskDelivery.locationRef,
    publicCampaignId: "campaign_cleanup_001",
    campaignVersionRef: "campaignversion_cleanup_001",
    publishedVersion: 3,
    attemptedKeys: Object.freeze([
      "locations/tenant-namespace/campaigns/campaign_cleanup_001/3/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.pdf",
    ]),
    idempotencyKey: sha("c"),
    maximumAttempts: 5,
    problemCode: "PUBLICATION_PARTIAL_FAILURE" as const,
    attemptCount: 1,
    leaseOwner: request.leaseOwner,
    leaseUntil: "2026-07-21T12:05:00.000Z",
  });
}

describe("production publication cleanup worker", () => {
  it("registers a production-only five-minute UTC Trigger.dev schedule", () => {
    expect(reconcilePublicationCleanupWorker.id).toBe("reconcile-publication-cleanup");
    expect(PUBLICATION_CLEANUP_SCHEDULE).toEqual({
      pattern: "*/5 * * * *",
      timezone: "UTC",
      environments: ["PRODUCTION"],
    });
  });

  it("claims durable cleanup work and confirms idempotent R2 quarantine evidence", async () => {
    const lease = cleanupLease();
    const complete = vi.fn(async () => undefined);
    const claimAvailable = vi.fn(async () => [lease]);
    const quarantinePartialPublication = vi.fn(async ({ attemptedKeys, ...intent }) => ({
      status: "quarantined" as const,
      ...intent,
      quarantinedKeys: attemptedKeys,
    }));

    await expect(
      runProductionPublicationCleanupTask(request, {
        reconciliation: {
          enqueue: vi.fn(async () => "enqueued" as const),
          claimAvailable,
          complete,
          releaseAfterFailure: vi.fn(async () => "pending" as const),
        },
        objectStore: { quarantinePartialPublication },
        now: () => new Date("2026-07-21T12:00:00.000Z"),
      }),
    ).resolves.toEqual({
      schemaVersion: 1,
      delivery: taskDelivery,
      leased: 1,
      completed: 1,
      released: 0,
      deadLettered: 0,
    });

    expect(claimAvailable).toHaveBeenCalledWith({
      leaseOwner: request.leaseOwner,
      limit: request.limit,
      leaseUntil: "2026-07-21T12:05:00.000Z",
    });
    expect(quarantinePartialPublication).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledWith({
      idempotencyKey: lease.idempotencyKey,
      leaseOwner: lease.leaseOwner,
      quarantinedKeys: lease.attemptedKeys,
    });
  });

  it("anchors persisted backoff to failure time after a slow cleanup attempt", async () => {
    const lease = cleanupLease();
    const times = [new Date("2026-07-21T12:00:00.000Z"), new Date("2026-07-21T12:00:10.000Z")];
    const releaseAfterFailure = vi.fn(async () => "pending" as const);

    await expect(
      runProductionPublicationCleanupTask(request, {
        reconciliation: {
          enqueue: vi.fn(async () => "enqueued" as const),
          claimAvailable: vi.fn(async () => [lease]),
          complete: vi.fn(async () => undefined),
          releaseAfterFailure,
        },
        objectStore: {
          quarantinePartialPublication: vi.fn(async () => {
            throw new Error("slow R2 delete failed");
          }),
        },
        now: () => {
          const next = times.shift();
          if (next === undefined) throw new Error("Unexpected additional clock read.");
          return next;
        },
      }),
    ).resolves.toMatchObject({ leased: 1, completed: 0, released: 1, deadLettered: 0 });

    expect(releaseAfterFailure).toHaveBeenCalledWith({
      availableAt: "2026-07-21T12:00:11.000Z",
      idempotencyKey: lease.idempotencyKey,
      leaseOwner: lease.leaseOwner,
      problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
    });
  });

  it("routes the deployed worker through delivery authority and production cleanup bindings", async () => {
    const lease = cleanupLease();
    const withDeliveryAuthority = vi.fn(
      async (
        _proof: unknown,
        _delivery: unknown,
        _request: unknown,
        work: () => Promise<unknown>,
      ) => work(),
    );
    const quarantinePartialPublication = vi.fn(async ({ attemptedKeys, ...intent }) => ({
      status: "quarantined" as const,
      ...intent,
      quarantinedKeys: attemptedKeys,
    }));
    const bindings = {
      withDeliveryAuthority,
      publicationCleanupReconciliation: {
        enqueue: vi.fn(async () => "enqueued" as const),
        claimAvailable: vi.fn(async () => [lease]),
        complete: vi.fn(async () => undefined),
        releaseAfterFailure: vi.fn(async () => "pending" as const),
      },
      publicationObjectStore: { quarantinePartialPublication },
    } as unknown as ProductionTaskBindings;
    const authority = {
      schemaVersion: 1 as const,
      delivery: taskDelivery,
      locationId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
      expiresAt: "2030-07-21T12:00:00.000Z",
      requestSha256: sha("e"),
      signature: sha("d"),
    };

    await expect(
      executePublicationCleanupTask({ schemaVersion: 1, authority, request }, () => bindings),
    ).resolves.toMatchObject({ leased: 1, completed: 1, deadLettered: 0 });

    expect(withDeliveryAuthority).toHaveBeenCalledWith(
      authority,
      taskDelivery,
      request,
      expect.any(Function),
    );
    expect(quarantinePartialPublication).toHaveBeenCalledOnce();
  });

  it("derives a fresh authority-gated cleanup invocation from Trigger schedule metadata", async () => {
    const withDeliveryAuthority = vi.fn(
      async (
        _proof: unknown,
        _delivery: unknown,
        _request: unknown,
        work: () => Promise<unknown>,
      ) => work(),
    );
    const claimAvailable = vi.fn(async () => []);
    const bindings = {
      withDeliveryAuthority,
      publicationCleanupReconciliation: {
        enqueue: vi.fn(async () => "enqueued" as const),
        claimAvailable,
        complete: vi.fn(async () => undefined),
        releaseAfterFailure: vi.fn(async () => "pending" as const),
      },
      publicationObjectStore: {
        quarantinePartialPublication: vi.fn(),
      },
    } as unknown as ProductionTaskBindings;
    const scheduledAt = new Date("2026-07-21T12:00:00.000Z");
    const now = new Date("2026-07-21T12:00:02.000Z");

    await expect(
      executeScheduledPublicationCleanupTask(
        {
          scheduleId: "sched_publication_cleanup_001",
          type: "DECLARATIVE",
          timestamp: scheduledAt,
          timezone: "UTC",
          upcoming: [],
        },
        () => ({
          bindings,
          authority: {
            locationRef: taskDelivery.locationRef,
            locationId: "11111111-1111-4111-8111-111111111111",
            actorId: "22222222-2222-4222-8222-222222222222",
          },
          hmacKey: "e".repeat(64),
        }),
        () => now,
      ),
    ).resolves.toMatchObject({ leased: 0, completed: 0, released: 0, deadLettered: 0 });

    expect(withDeliveryAuthority).toHaveBeenCalledOnce();
    const [proof, delivery] = vi.mocked(withDeliveryAuthority).mock.calls[0] ?? [];
    expect(proof).toMatchObject({
      delivery,
      locationId: "11111111-1111-4111-8111-111111111111",
      actorId: "22222222-2222-4222-8222-222222222222",
      expiresAt: new Date(
        now.getTime() + PUBLICATION_CLEANUP_AUTHORITY_TTL_MILLISECONDS,
      ).toISOString(),
    });
    expect(delivery).toMatchObject({
      deliveryKind: "task",
      locationRef: taskDelivery.locationRef,
    });
    expect(claimAvailable).toHaveBeenCalledWith({
      leaseOwner: expect.stringMatching(/^trigger-cleanup:[a-f0-9]{64}$/u),
      limit: PUBLICATION_CLEANUP_SCHEDULE_LIMIT,
      leaseUntil: new Date(
        now.getTime() + PUBLICATION_CLEANUP_LEASE_DURATION_MILLISECONDS,
      ).toISOString(),
    });
  });
});
