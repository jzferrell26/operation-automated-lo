import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { ArtifactRecord, PublishedCampaignProjection } from "@oalo/contracts";
import {
  authorizePrivateObjectTransfer,
  publishProjectionWithObjectStore,
  withdrawProjectionWithObjectStoreAudit,
  type ProductionObjectStoreAdapter,
} from "../../../../packages/storage/src/index.js";

const sha = (character: string) => character.repeat(64);
const policy = { privateBucket: "oalo-private-artifacts", publicBucket: "oalo-public-projections" };

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
    const adapter: Pick<ProductionObjectStoreAdapter, "copyApprovedPrivateArtifact"> = {
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
    };
    const published = await publishProjectionWithObjectStore(
      projection,
      [artifact],
      1,
      policy,
      adapter,
    );

    expect(published.artifactUrls.pdf).toMatch(/^https:\/\/cdn\.example\.test\/campaigns\//u);
    expect(adapter.copyApprovedPrivateArtifact).toHaveBeenCalledOnce();
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
