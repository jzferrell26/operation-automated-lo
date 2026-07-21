import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { ArtifactRecord, PublishedCampaignProjection } from "@oalo/contracts";
import {
  PublicationCleanupReleaseError,
  PublicationCleanupReconciliationRequiredError,
  authorizePrivateObjectTransfer,
  publicationCleanupBackoffMilliseconds,
  publishedArtifactKey,
  publishProjectionWithObjectStore,
  reconcilePublicationCleanup,
  withdrawProjectionWithObjectStoreAudit,
  type ProductionObjectStoreAdapter,
} from "../../../../packages/storage/src/index.js";

const sha = (character: string) => character.repeat(64);
const policy = { privateBucket: "oalo-private-artifacts", publicBucket: "oalo-public-projections" };

function cleanupReconciliation() {
  return {
    enqueue: vi.fn(async () => "enqueued" as const),
  };
}

const artifact: ArtifactRecord = {
  schemaVersion: 1,
  artifactRef: "artifact_01Approved",
  artifactType: "pdf",
  locationRef: "location_01TenantA",
  campaignRef: "campaign_01OpenHouse",
  campaignVersionRef: "version_01Approved",
  manifestRef: "manifest_01Approved",
  blueprintVersionRef: "blueprint_01Approved",
  profileVersions: {
    brand: "brand_01Approved",
    compliance: "compliance_01Approved",
    partner: "partner_01Approved",
    routing: "routing_01Approved",
  },
  rendererVersion: "1.0.0",
  browserVersion: "140.0.0",
  templateVersion: "1.0.0",
  fontHashes: [sha("f")],
  sha256: sha("a"),
  mimeType: "application/pdf",
  byteSize: 64,
  pageCount: 1,
  storageKey:
    "locations/location_01TenantA/campaigns/campaign_01OpenHouse/versions/version_01Approved/artifact_01Approved/immutable.pdf",
  status: "ready",
  createdAt: "2026-07-21T12:00:00.000Z",
};

const projection: PublishedCampaignProjection = {
  schemaVersion: 1,
  publicCampaignId: "campaign_public_01",
  campaignVersionRef: artifact.campaignVersionRef,
  headline: "Approved open house",
  propertyAddress: "Approved public address",
  propertyDescription: "Approved public description",
  openHouseLabel: "Saturday",
  loanOfficerDisplayName: "Alex Morgan",
  realtorDisplayName: "Taylor Reed",
  disclosureBlocks: ["Approved disclosure"],
  callToActionLabel: "View details",
  artifactUrls: {},
  consentDisclosureVersion: "disclosure_01Approved",
  activeFrom: "2026-07-21T12:00:00.000Z",
  activeUntil: "2026-07-28T12:00:00.000Z",
};

describe("injected production object-store adapter", () => {
  it("authorizes only an exact tenant-private short-lived transfer with no public exposure", async () => {
    const adapter: Pick<ProductionObjectStoreAdapter, "authorizePrivateTransfer"> = {
      authorizePrivateTransfer: vi.fn(
        async ({
          bucket,
          request,
        }: Parameters<ProductionObjectStoreAdapter["authorizePrivateTransfer"]>[0]) => ({
          bucket,
          objectKey: request.objectKey,
          visibility: "private",
          publicReadUrl: null,
          publicBucketPath: null,
          authorization: "a".repeat(24),
          expiresAt: request.expiresAt,
        }),
      ),
    };
    const request = {
      schemaVersion: 1,
      direction: "download",
      visibility: "private",
      locationRef: artifact.locationRef,
      objectKey: artifact.storageKey,
      contentType: "application/pdf",
      maximumBytes: 1_000,
      expectedSha256: artifact.sha256,
      expiresAt: "2026-07-21T12:05:00.000Z",
    };
    const authorization = await authorizePrivateObjectTransfer(
      request,
      policy,
      adapter,
      new Date("2026-07-21T12:00:00.000Z"),
    );

    expect(authorization).toMatchObject({ visibility: "private", publicReadUrl: null });
    expect(adapter.authorizePrivateTransfer).toHaveBeenCalledOnce();
  });

  it("fails closed on a private bucket mismatch or public transfer exposure", async () => {
    const request = {
      schemaVersion: 1,
      direction: "upload",
      visibility: "private",
      locationRef: artifact.locationRef,
      objectKey: artifact.storageKey,
      contentType: "application/pdf",
      maximumBytes: 1_000,
      expectedSha256: artifact.sha256,
      expiresAt: "2026-07-21T12:05:00.000Z",
    };
    const adapter: Pick<ProductionObjectStoreAdapter, "authorizePrivateTransfer"> = {
      authorizePrivateTransfer: vi.fn(
        async ({
          request: approvedRequest,
        }: Parameters<ProductionObjectStoreAdapter["authorizePrivateTransfer"]>[0]) => ({
          bucket: "wrong-public-bucket",
          objectKey: approvedRequest.objectKey,
          visibility: "private",
          publicReadUrl: null,
          publicBucketPath: null,
          authorization: "a".repeat(24),
          expiresAt: approvedRequest.expiresAt,
        }),
      ),
    };
    await expect(
      authorizePrivateObjectTransfer(
        request,
        policy,
        adapter,
        new Date("2026-07-21T12:00:00.000Z"),
      ),
    ).rejects.toThrow("exact approved bucket");

    const exposedAdapter: Pick<ProductionObjectStoreAdapter, "authorizePrivateTransfer"> = {
      authorizePrivateTransfer: vi.fn(
        async ({
          bucket,
          request: approvedRequest,
        }: Parameters<ProductionObjectStoreAdapter["authorizePrivateTransfer"]>[0]) => ({
          bucket,
          objectKey: approvedRequest.objectKey,
          visibility: "private",
          publicReadUrl: "https://public.example.test/exposed.pdf",
          publicBucketPath: null,
          authorization: "a".repeat(24),
          expiresAt: approvedRequest.expiresAt,
        }),
      ),
    };
    await expect(
      authorizePrivateObjectTransfer(
        request,
        policy,
        exposedAdapter,
        new Date("2026-07-21T12:00:00.000Z"),
      ),
    ).rejects.toThrow();
  });

  it("copies only exact approved private artifacts and verifies public identity", async () => {
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
    > = {
      copyApprovedPrivateArtifact: vi.fn(
        async ({
          privateBucket,
          publicBucket,
          artifact: source,
          publishedKey,
        }: Parameters<ProductionObjectStoreAdapter["copyApprovedPrivateArtifact"]>[0]) => ({
          sourceBucket: privateBucket,
          sourceKey: source.storageKey,
          destinationBucket: publicBucket,
          destinationKey: publishedKey,
          visibility: "public",
          immutableUrl: `https://cdn.example.test/${publishedKey}`,
          sha256: source.sha256,
          artifactRef: source.artifactRef,
          campaignVersionRef: source.campaignVersionRef,
        }),
      ),
      quarantinePartialPublication: vi.fn(async ({ attemptedKeys, ...input }) => ({
        status: "quarantined",
        ...input,
        quarantinedKeys: attemptedKeys,
      })),
    };
    const published = await publishProjectionWithObjectStore(
      projection,
      [artifact],
      1,
      policy,
      adapter,
      cleanupReconciliation(),
    );

    expect(published.artifactUrls.pdf).toMatch(
      /^https:\/\/cdn\.example\.test\/locations\/[a-f0-9]{64}\/campaigns\//u,
    );
    expect(adapter.copyApprovedPrivateArtifact).toHaveBeenCalledOnce();
    expect(adapter.quarantinePartialPublication).not.toHaveBeenCalled();
  });

  it("quarantines every attempted public key and reuses cleanup identity on retry", async () => {
    const squareArtifact: ArtifactRecord = {
      ...artifact,
      artifactRef: "artifact_02ApprovedSquare",
      artifactType: "meta-square",
      sha256: sha("b"),
      mimeType: "image/png",
      storageKey:
        "locations/location_01TenantA/campaigns/campaign_01OpenHouse/versions/version_01Approved/artifact_02ApprovedSquare/immutable.png",
    };
    const copiedKeys: string[] = [];
    const quarantinePartialPublication = vi.fn(async ({ attemptedKeys, ...input }) => ({
      status: "quarantined" as const,
      ...input,
      quarantinedKeys: attemptedKeys,
    }));
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
    > = {
      copyApprovedPrivateArtifact: vi.fn(async (input) => {
        copiedKeys.push(input.publishedKey);
        if (input.artifact.artifactType === "meta-square") {
          throw new Error("second copy lost its receipt");
        }
        return {
          sourceBucket: input.privateBucket,
          sourceKey: input.artifact.storageKey,
          destinationBucket: input.publicBucket,
          destinationKey: input.publishedKey,
          visibility: "public" as const,
          immutableUrl: `https://cdn.example.test/${input.publishedKey}`,
          sha256: input.artifact.sha256,
          artifactRef: input.artifact.artifactRef,
          campaignVersionRef: input.artifact.campaignVersionRef,
        };
      }),
      quarantinePartialPublication,
    };
    const reconciliation = cleanupReconciliation();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        publishProjectionWithObjectStore(
          projection,
          [squareArtifact, artifact],
          2,
          policy,
          adapter,
          reconciliation,
        ),
      ).rejects.toThrow("second copy lost its receipt");
    }

    expect(copiedKeys).toHaveLength(4);
    expect(quarantinePartialPublication).toHaveBeenCalledTimes(2);
    const firstCleanup = quarantinePartialPublication.mock.calls[0]?.[0];
    const retryCleanup = quarantinePartialPublication.mock.calls[1]?.[0];
    expect(firstCleanup?.attemptedKeys).toHaveLength(2);
    expect(firstCleanup?.problemCode).toBe("PUBLICATION_PARTIAL_FAILURE");
    expect(retryCleanup?.attemptedKeys).toEqual(firstCleanup?.attemptedKeys);
    expect(retryCleanup?.idempotencyKey).toBe(firstCleanup?.idempotencyKey);
    expect(reconciliation.enqueue).not.toHaveBeenCalled();
  });

  it("quarantines the intended key when a copied-object receipt fails identity validation", async () => {
    const quarantinePartialPublication = vi.fn(async ({ attemptedKeys, ...input }) => ({
      status: "quarantined" as const,
      ...input,
      quarantinedKeys: attemptedKeys,
    }));
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
    > = {
      copyApprovedPrivateArtifact: vi.fn(async (input) => ({
        sourceBucket: input.privateBucket,
        sourceKey: input.artifact.storageKey,
        destinationBucket: input.publicBucket,
        destinationKey: input.publishedKey,
        visibility: "public" as const,
        immutableUrl: `https://cdn.example.test/${input.publishedKey}`,
        sha256: sha("f"),
        artifactRef: input.artifact.artifactRef,
        campaignVersionRef: input.artifact.campaignVersionRef,
      })),
      quarantinePartialPublication,
    };

    await expect(
      publishProjectionWithObjectStore(
        projection,
        [artifact],
        3,
        policy,
        adapter,
        cleanupReconciliation(),
      ),
    ).rejects.toThrow("receipt does not match");
    expect(quarantinePartialPublication).toHaveBeenCalledOnce();
    expect(quarantinePartialPublication.mock.calls[0]?.[0]).toMatchObject({
      attemptedKeys: [expect.stringContaining("/3/")],
      problemCode: "PUBLICATION_PARTIAL_FAILURE",
    });
  });

  it("persists an idempotent cleanup intent when immediate quarantine fails", async () => {
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
    > = {
      copyApprovedPrivateArtifact: vi.fn(async () => {
        throw new Error("copy failed after provider accepted the object");
      }),
      quarantinePartialPublication: vi.fn(async () => {
        throw new Error("public delete unavailable");
      }),
    };
    const enqueue = vi
      .fn()
      .mockResolvedValueOnce("enqueued" as const)
      .mockResolvedValueOnce("already_pending" as const);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        publishProjectionWithObjectStore(projection, [artifact], 4, policy, adapter, { enqueue }),
      ).rejects.toBeInstanceOf(PublicationCleanupReconciliationRequiredError);
    }

    expect(enqueue).toHaveBeenCalledTimes(2);
    const firstIntent = enqueue.mock.calls[0]?.[0];
    const retryIntent = enqueue.mock.calls[1]?.[0];
    expect(firstIntent).toMatchObject({
      problemCode: "PUBLICATION_PARTIAL_FAILURE",
      attemptedKeys: [expect.stringContaining("/4/")],
    });
    expect(retryIntent).toEqual(firstIntent);
  });

  it("surfaces all causes when durable cleanup intent persistence is unavailable", async () => {
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "copyApprovedPrivateArtifact" | "quarantinePartialPublication"
    > = {
      copyApprovedPrivateArtifact: vi.fn(async () => {
        throw new Error("copy failed");
      }),
      quarantinePartialPublication: vi.fn(async () => {
        throw new Error("cleanup failed");
      }),
    };

    await expect(
      publishProjectionWithObjectStore(projection, [artifact], 5, policy, adapter, {
        enqueue: vi.fn(async () => {
          throw new Error("cleanup reconciliation database unavailable");
        }),
      }),
    ).rejects.toMatchObject({
      name: "AggregateError",
      message:
        "Public artifact publication failed and durable cleanup reconciliation could not be recorded.",
    });
  });

  it("releases failed cleanup reconciliation for an idempotent successful retry", async () => {
    const publishedKey = publishedArtifactKey({
      locationRef: artifact.locationRef,
      publicCampaignId: projection.publicCampaignId,
      publishedVersion: 6,
      sha256: artifact.sha256,
      extension: "pdf",
    });
    const intent = {
      publicBucket: policy.publicBucket,
      locationRef: artifact.locationRef,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      publishedVersion: 6,
      attemptedKeys: [publishedKey],
      idempotencyKey: sha("d"),
      maximumAttempts: 3,
      problemCode: "PUBLICATION_PARTIAL_FAILURE" as const,
      attemptCount: 1,
      leaseOwner: "cleanup-worker-01",
      leaseUntil: "2026-07-21T12:05:00.000Z",
    };
    const pending = [[intent], [{ ...intent, attemptCount: 2 }]];
    const complete = vi.fn(async () => undefined);
    const releaseAfterFailure = vi
      .fn()
      .mockResolvedValueOnce("pending" as const)
      .mockResolvedValueOnce("dead_lettered" as const);
    const reconciliation = {
      claimAvailable: vi.fn(async () => pending.shift() ?? []),
      complete,
      releaseAfterFailure,
    };
    const quarantinePartialPublication = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient public delete failure"))
      .mockResolvedValueOnce({
        status: "quarantined" as const,
        publicBucket: intent.publicBucket,
        locationRef: intent.locationRef,
        publicCampaignId: intent.publicCampaignId,
        campaignVersionRef: intent.campaignVersionRef,
        publishedVersion: intent.publishedVersion,
        quarantinedKeys: intent.attemptedKeys,
        idempotencyKey: intent.idempotencyKey,
        problemCode: intent.problemCode,
      });

    await expect(
      reconcilePublicationCleanup(
        reconciliation,
        { quarantinePartialPublication },
        {
          leaseOwner: intent.leaseOwner,
          limit: 1,
          leaseUntil: intent.leaseUntil,
          clock: () => new Date("2026-07-21T12:00:00.000Z"),
        },
      ),
    ).resolves.toEqual({ leased: 1, completed: 0, released: 1, deadLettered: 0 });
    await expect(
      reconcilePublicationCleanup(
        reconciliation,
        { quarantinePartialPublication },
        {
          leaseOwner: intent.leaseOwner,
          limit: 1,
          leaseUntil: intent.leaseUntil,
          clock: () => new Date("2026-07-21T12:00:01.000Z"),
        },
      ),
    ).resolves.toEqual({ leased: 1, completed: 1, released: 0, deadLettered: 0 });

    expect(releaseAfterFailure).toHaveBeenCalledWith({
      availableAt: "2026-07-21T12:00:01.000Z",
      idempotencyKey: intent.idempotencyKey,
      leaseOwner: intent.leaseOwner,
      problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED",
    });
    expect(complete).toHaveBeenCalledWith({
      idempotencyKey: intent.idempotencyKey,
      leaseOwner: intent.leaseOwner,
      quarantinedKeys: intent.attemptedKeys,
    });
    expect(quarantinePartialPublication).toHaveBeenCalledTimes(2);
  });

  it("bounds cleanup retry delay and surfaces retry-state persistence failures", async () => {
    expect(publicationCleanupBackoffMilliseconds(1)).toBe(1_000);
    expect(publicationCleanupBackoffMilliseconds(20)).toBe(15 * 60 * 1_000);
    const intent = {
      publicBucket: policy.publicBucket,
      locationRef: artifact.locationRef,
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      publishedVersion: 7,
      attemptedKeys: [
        publishedArtifactKey({
          locationRef: artifact.locationRef,
          publicCampaignId: projection.publicCampaignId,
          publishedVersion: 7,
          sha256: artifact.sha256,
          extension: "pdf",
        }),
      ],
      idempotencyKey: sha("e"),
      maximumAttempts: 3,
      problemCode: "PUBLICATION_PARTIAL_FAILURE" as const,
      attemptCount: 1,
      leaseOwner: "cleanup-worker-02",
      leaseUntil: "2026-07-21T12:05:00.000Z",
    };
    await expect(
      reconcilePublicationCleanup(
        {
          claimAvailable: vi.fn(async () => [intent]),
          complete: vi.fn(async () => undefined),
          releaseAfterFailure: vi.fn(async () => {
            throw new Error("database release unavailable");
          }),
        },
        {
          quarantinePartialPublication: vi.fn(async () => {
            throw new Error("R2 delete unavailable");
          }),
        },
        {
          leaseOwner: intent.leaseOwner,
          limit: 1,
          leaseUntil: intent.leaseUntil,
          clock: () => new Date("2026-07-21T12:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(PublicationCleanupReleaseError);
  });

  it("withdraws the exact projection only with matching immutable audit evidence", async () => {
    const adapter: Pick<
      ProductionObjectStoreAdapter,
      "withdrawExactProjectionAndAppendImmutableAudit"
    > = {
      withdrawExactProjectionAndAppendImmutableAudit: vi.fn(
        async ({
          projection: value,
          record,
        }: Parameters<
          ProductionObjectStoreAdapter["withdrawExactProjectionAndAppendImmutableAudit"]
        >[0]) => ({
          auditRef: "audit_01Immutable",
          immutable: true,
          recordSha256: createHash("sha256").update(JSON.stringify(record)).digest("hex"),
          publicCampaignId: value.publicCampaignId,
          campaignVersionRef: value.campaignVersionRef,
        }),
      ),
    };
    const result = await withdrawProjectionWithObjectStoreAudit(
      projection,
      "operator_01Approved",
      new Date("2026-07-21T18:00:00.000Z"),
      adapter,
    );

    expect(result.record).toMatchObject({ publicCampaignId: projection.publicCampaignId });
    expect(result.auditRef).toBe("audit_01Immutable");
  });
});
