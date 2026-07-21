import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { ArtifactRecord, PublishedCampaignProjection, RenderManifest } from "@oalo/contracts";
import {
  canonicalRenderBytes,
  renderArtifactBatch,
  renderContentHash,
  type DeterministicBrowserPort,
  type PrivateArtifactPort,
} from "../../../../packages/rendering/src/production-rendering.js";
import {
  planPrivateTransfer,
  privateArtifactKey,
  publishProjection,
  publishedArtifactKey,
  withdrawProjection,
  type PublishedStoragePort,
} from "../../../../packages/storage/src/production-storage.js";

const sha = (character: string) => character.repeat(64);
const createdAt = new Date("2026-07-21T12:00:00.000Z");

const manifest: RenderManifest = {
  schemaVersion: 1,
  manifestRef: "manifest_01Stable",
  locationRef: "location_01TenantA",
  campaignRef: "campaign_01OpenHouse",
  campaignVersionRef: "version_01Approved",
  blueprintVersionRef: "blueprint_01Approved",
  consentDisclosureVersion: "disclosure_01Approved",
  profileVersions: {
    brand: "brand_01Approved",
    compliance: "compliance_01Approved",
    partner: "partner_01Approved",
    routing: "routing_01Approved",
  },
  renderer: { id: "oalo-playwright", version: "1.0.0" },
  browser: { id: "chromium", version: "140.0.0" },
  template: { id: "open-house-boost", version: "1.0.0" },
  fonts: [{ family: "Inter", version: "4.1", sha256: sha("f") }],
  creativeSafeZones: {
    metaSquare: { top: 0.05, right: 0.06, bottom: 0.05, left: 0.06 },
    metaStory: { top: 0.05, right: 0.08, bottom: 0.1, left: 0.08 },
  },
  publicContent: {
    headline: "Tour 123 Main Street",
    propertyAddress: "123 Main Street",
    propertyDescription: "A fixture-backed property description.",
    openHouseLabel: "Saturday, 1 PM to 3 PM",
    loanOfficerDisplayName: "Alex Morgan",
    realtorDisplayName: "Taylor Reed",
    disclosureBlocks: ["Equal Housing Opportunity."],
    callToActionLabel: "View the open house",
    destinationPath: "/c/campaign-public-01",
  },
  assets: [
    {
      assetRef: "asset_01Exterior",
      sha256: sha("a"),
      mimeType: "image/jpeg",
      width: 1600,
      height: 900,
      focalPoint: { x: 0.5, y: 0.5 },
      approvalStatus: "approved",
    },
  ],
};

function renderPorts() {
  const browser: DeterministicBrowserPort = {
    render: vi.fn(async ({ manifest: input, artifactType, networkPolicy }) => {
      expect(networkPolicy).toBe("deny-all");
      const bytes = canonicalRenderBytes({ input, artifactType });
      if (artifactType === "pdf") {
        return { bytes, mimeType: "application/pdf" as const, pageCount: 1 };
      }
      return { bytes, mimeType: "text/html" as const };
    }),
  };
  const storage: PrivateArtifactPort = {
    store: vi.fn(async (input) =>
      privateArtifactKey({
        locationRef: input.locationRef,
        campaignRef: input.campaignRef,
        campaignVersionRef: input.campaignVersionRef,
        artifactRef: input.artifactRef,
        sha256: input.sha256,
        extension: input.mimeType === "application/pdf" ? "pdf" : "html",
      }),
    ),
  };
  return { browser, storage };
}

const baseProjection: PublishedCampaignProjection = {
  schemaVersion: 1,
  publicCampaignId: "campaign_public_01",
  campaignVersionRef: manifest.campaignVersionRef,
  headline: manifest.publicContent.headline,
  propertyAddress: manifest.publicContent.propertyAddress,
  propertyDescription: manifest.publicContent.propertyDescription,
  openHouseLabel: manifest.publicContent.openHouseLabel,
  loanOfficerDisplayName: manifest.publicContent.loanOfficerDisplayName,
  realtorDisplayName: manifest.publicContent.realtorDisplayName,
  disclosureBlocks: manifest.publicContent.disclosureBlocks,
  callToActionLabel: manifest.publicContent.callToActionLabel,
  artifactUrls: {},
  consentDisclosureVersion: manifest.consentDisclosureVersion,
  activeFrom: "2026-07-21T12:00:00.000Z",
  activeUntil: "2026-07-28T12:00:00.000Z",
};

function publishedPort(options?: Readonly<{ copiedSha?: string }>): PublishedStoragePort & {
  copies: Array<{ artifact: ArtifactRecord; publishedKey: string }>;
  withdrawals: string[];
} {
  const copies: Array<{ artifact: ArtifactRecord; publishedKey: string }> = [];
  const withdrawals: string[] = [];
  return {
    copies,
    withdrawals,
    async copyApprovedArtifact(input) {
      copies.push(input);
      return {
        immutableUrl: `https://cdn.example.test/${input.publishedKey}`,
        sha256: options?.copiedSha ?? input.artifact.sha256,
      };
    },
    async withdraw(publicCampaignId, campaignVersionRef) {
      withdrawals.push(`${publicCampaignId}:${campaignVersionRef}`);
    },
  };
}

describe("deterministic production rendering", () => {
  it("canonicalizes object order and normalizes text before hashing", () => {
    const left = { z: "Cafe\u0301\r\n", a: 1 };
    const right = { a: 1, z: "Caf\u00e9\n" };
    expect(canonicalRenderBytes(left)).toEqual(canonicalRenderBytes(right));
    expect(renderContentHash(left)).toBe(renderContentHash(right));
  });

  it("renders stable immutable artifacts with exact lineage and no network access", async () => {
    const firstPorts = renderPorts();
    const secondPorts = renderPorts();
    const first = await renderArtifactBatch(
      { manifest, artifactTypes: ["public-page-projection", "pdf"], createdAt },
      firstPorts,
    );
    const second = await renderArtifactBatch(
      { manifest, artifactTypes: ["public-page-projection", "pdf"], createdAt },
      secondPorts,
    );

    expect(second).toEqual(first);
    expect(first).toHaveLength(2);
    expect(first[0]).toMatchObject({
      artifactType: "public-page-projection",
      campaignVersionRef: manifest.campaignVersionRef,
      manifestRef: manifest.manifestRef,
      blueprintVersionRef: manifest.blueprintVersionRef,
      profileVersions: manifest.profileVersions,
      rendererVersion: "1.0.0",
      browserVersion: "140.0.0",
      templateVersion: "1.0.0",
      fontHashes: [sha("f")],
      status: "ready",
    });
    expect(first[0]?.storageKey).toContain(first[0]?.sha256);
    expect(firstPorts.browser.render).toHaveBeenCalledTimes(2);
    expect(firstPorts.storage.store).toHaveBeenCalledTimes(2);
  });

  it("changes artifact identity and bytes when approved content changes", async () => {
    const original = await renderArtifactBatch(
      { manifest, artifactTypes: ["pdf"], createdAt },
      renderPorts(),
    );
    const changed = await renderArtifactBatch(
      {
        manifest: {
          ...manifest,
          publicContent: { ...manifest.publicContent, headline: "A changed headline" },
        },
        artifactTypes: ["pdf"],
        createdAt,
      },
      renderPorts(),
    );
    expect(changed[0]?.artifactRef).not.toBe(original[0]?.artifactRef);
    expect(changed[0]?.sha256).not.toBe(original[0]?.sha256);
  });

  it("rejects raw rendering instructions and unapproved assets before invoking ports", async () => {
    const ports = renderPorts();
    await expect(
      renderArtifactBatch(
        {
          manifest: { ...manifest, rawHtml: "<script>fetch('https://attacker.test')</script>" },
          artifactTypes: ["pdf"],
          createdAt,
        },
        ports,
      ),
    ).rejects.toThrow();
    await expect(
      renderArtifactBatch(
        {
          manifest: {
            ...manifest,
            assets: [{ ...manifest.assets[0], approvalStatus: "pending" }],
          },
          artifactTypes: ["pdf"],
          createdAt,
        },
        ports,
      ),
    ).rejects.toThrow();
    expect(ports.browser.render).not.toHaveBeenCalled();
    expect(ports.storage.store).not.toHaveBeenCalled();
  });
});

describe("private and published storage contracts", () => {
  it("builds immutable tenant-private and public object keys", () => {
    expect(
      privateArtifactKey({
        locationRef: manifest.locationRef,
        campaignRef: manifest.campaignRef,
        campaignVersionRef: manifest.campaignVersionRef,
        artifactRef: "artifact_01Rendered",
        sha256: sha("a"),
        extension: "png",
      }),
    ).toBe(
      `locations/${manifest.locationRef}/campaigns/${manifest.campaignRef}/versions/${manifest.campaignVersionRef}/artifact_01Rendered/${sha("a")}.png`,
    );
    expect(
      publishedArtifactKey({
        locationRef: manifest.locationRef,
        publicCampaignId: baseProjection.publicCampaignId,
        publishedVersion: 7,
        sha256: sha("b"),
        extension: "pdf",
      }),
    ).toBe(
      `locations/${createHash("sha256").update(manifest.locationRef).digest("hex")}/campaigns/${baseProjection.publicCampaignId}/7/${sha("b")}.pdf`,
    );
    expect(() =>
      privateArtifactKey({
        locationRef: "../escape",
        campaignRef: manifest.campaignRef,
        campaignVersionRef: manifest.campaignVersionRef,
        artifactRef: "artifact_01Rendered",
        sha256: sha("a"),
        extension: "png",
      }),
    ).toThrow("opaque path segment");
  });

  it("limits private transfers to ten minutes and the exact tenant prefix", () => {
    const request = {
      schemaVersion: 1 as const,
      direction: "upload" as const,
      visibility: "private" as const,
      locationRef: manifest.locationRef,
      objectKey: `locations/${manifest.locationRef}/source/asset_01Exterior.jpg`,
      contentType: "image/jpeg" as const,
      maximumBytes: 5_000_000,
      expectedSha256: sha("a"),
      expiresAt: "2026-07-21T12:10:00.000Z",
    };
    expect(planPrivateTransfer(request, createdAt)).toEqual(request);
    expect(() =>
      planPrivateTransfer({ ...request, expiresAt: "2026-07-21T12:10:00.001Z" }, createdAt),
    ).toThrow("within the next ten minutes");
    expect(() =>
      planPrivateTransfer(
        { ...request, objectKey: "locations/location_02TenantB/source/asset.jpg" },
        createdAt,
      ),
    ).toThrow("outside the tenant prefix");
  });

  it("publishes only approved-version artifacts and derives the public URLs", async () => {
    const artifacts = await renderArtifactBatch(
      { manifest, artifactTypes: ["public-page-projection", "pdf"], createdAt },
      renderPorts(),
    );
    const port = publishedPort();
    const projection = await publishProjection(baseProjection, artifacts, 3, port);
    const tenantNamespace = createHash("sha256").update(manifest.locationRef).digest("hex");

    expect(projection.artifactUrls).toEqual({
      "public-page-projection": expect.stringMatching(
        new RegExp(
          `^https://cdn\\.example\\.test/locations/${tenantNamespace}/campaigns/campaign_public_01/3/`,
          "u",
        ),
      ),
      pdf: expect.stringMatching(
        new RegExp(
          `^https://cdn\\.example\\.test/locations/${tenantNamespace}/campaigns/campaign_public_01/3/`,
          "u",
        ),
      ),
    });
    expect(port.copies.map((copy) => copy.publishedKey)).toEqual([
      expect.stringMatching(/\.html$/u),
      expect.stringMatching(/\.pdf$/u),
    ]);
  });

  it("rejects empty, stale, duplicate, or checksum-mismatched publication inputs", async () => {
    const [artifact] = await renderArtifactBatch(
      { manifest, artifactTypes: ["pdf"], createdAt },
      renderPorts(),
    );
    expect(artifact).toBeDefined();
    const readyArtifact = artifact as ArtifactRecord;

    await expect(publishProjection(baseProjection, [], 1, publishedPort())).rejects.toThrow(
      "At least one approved artifact",
    );
    await expect(
      publishProjection(
        baseProjection,
        [{ ...readyArtifact, campaignVersionRef: "version_02Stale" }],
        1,
        publishedPort(),
      ),
    ).rejects.toThrow("approved campaign version");
    await expect(
      publishProjection(baseProjection, [readyArtifact, readyArtifact], 1, publishedPort()),
    ).rejects.toThrow("appears more than once");
    await expect(
      publishProjection(baseProjection, [readyArtifact], 1, publishedPort({ copiedSha: sha("0") })),
    ).rejects.toThrow("checksum does not match");
  });

  it("withdraws the exact public projection and rejects private fields", async () => {
    const port = publishedPort();
    await withdrawProjection(baseProjection, port);
    expect(port.withdrawals).toEqual([
      `${baseProjection.publicCampaignId}:${baseProjection.campaignVersionRef}`,
    ]);

    await expect(
      publishProjection({ ...baseProjection, accessToken: "must-never-be-public" }, [], 1, port),
    ).rejects.toThrow();
  });
});
