import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

import { campaignProjectionHash } from "../../packages/application/src/index.js";

import {
  PdfBinaryInspectionSchema,
  PlaywrightBrowserAdapter,
  inspectPdfBinary,
  publicPageVisualFingerprints,
  paidAdRenderAssetManifestHash,
  renderPaidAdCreativeSource,
  renderSourceForManifest,
  supportedPublicPageWidths,
} from "../../packages/rendering/src/index.js";
import { renderingGoldenFixtures } from "../../tooling/tests/fixtures/prd001d-render-manifests.js";

describe("PRD-001d golden rendering corpus", () => {
  it("covers common, long-text, missing-photo, portrait-photo and multi-disclosure fixtures", () => {
    expect(Object.keys(renderingGoldenFixtures)).toEqual([
      "common",
      "longText",
      "missingPhoto",
      "portraitPhoto",
      "multiDisclosure",
    ]);
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const page = renderSourceForManifest(manifest, "public-page-projection");
      const pdf = renderSourceForManifest(manifest, "pdf");
      expect(page.html).toContain(manifest.publicContent.headline);
      expect(pdf.html).toContain(manifest.publicContent.headline);
    }
  });

  it("produces deterministic, width-specific page fingerprints at every supported width", () => {
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const first = publicPageVisualFingerprints(manifest);
      const second = publicPageVisualFingerprints(structuredClone(manifest));
      expect(second).toEqual(first);
      expect(Object.keys(first).map(Number)).toEqual([...supportedPublicPageWidths]);
      expect(new Set(Object.values(first))).toHaveLength(supportedPublicPageWidths.length);
    }
  });

  it("fingerprints every generated PDF page and preserves all disclosure endings", () => {
    for (const manifest of Object.values(renderingGoldenFixtures)) {
      const pdf = renderSourceForManifest(manifest, "pdf");
      const pages = pdf.html.match(/<section class="pdf-page">[\s\S]*?<\/section>/gu) ?? [];
      const fingerprints = pages.map((page) => createHash("sha256").update(page).digest("hex"));
      expect(pages.length).toBeGreaterThanOrEqual(3);
      expect(new Set(fingerprints)).toHaveLength(pages.length);
      for (const disclosure of manifest.publicContent.disclosureBlocks) {
        expect(pdf.html).toContain(disclosure.slice(-Math.min(120, disclosure.length)));
      }
    }
  });

  it("keeps consent and configured crop geometry in the golden render sources", () => {
    const page = renderSourceForManifest(renderingGoldenFixtures.common, "public-page-projection");
    const commonSquare = renderSourceForManifest(renderingGoldenFixtures.common, "meta-square");
    const portraitStory = renderSourceForManifest(
      renderingGoldenFixtures.portraitPhoto,
      "meta-story",
    );

    expect(page.html).toContain(
      `Consent disclosure version: ${renderingGoldenFixtures.common.consentDisclosureVersion}`,
    );
    expect(page.html.indexOf("Consent disclosure version")).toBeLessThan(
      page.html.indexOf('class="cta"'),
    );
    expect(commonSquare.html).toContain('data-focal-point="50%,50%"');
    expect(commonSquare.html).toContain('data-safe-zone="5%,6%,5%,6%"');
    expect(portraitStory.html).toContain('data-focal-point="50%,35%"');
    expect(portraitStory.html).toContain('data-safe-zone="5%,8%,10%,8%"');
  });

  it("renders real tagged PDF bytes and stable browser rasters with all network access denied", async () => {
    const manifest = renderingGoldenFixtures.missingPhoto;
    const adapter = new PlaywrightBrowserAdapter();
    const pageSource = renderSourceForManifest(manifest, "public-page-projection");
    const pdfSource = renderSourceForManifest(manifest, "pdf");

    for (const width of supportedPublicPageWidths) {
      const raster = await adapter.captureRaster(manifest, pageSource, { width, height: 900 });
      const metadata = await import("sharp").then(({ default: sharp }) => sharp(raster).metadata());
      expect(metadata).toMatchObject({ format: "png", width });
    }

    const firstPdfRaster = await adapter.captureRaster(manifest, pdfSource, {
      width: 816,
      height: 1056,
    });
    const secondPdfRaster = await adapter.captureRaster(manifest, pdfSource, {
      width: 816,
      height: 1056,
    });
    expect(createHash("sha256").update(secondPdfRaster).digest("hex")).toBe(
      createHash("sha256").update(firstPdfRaster).digest("hex"),
    );

    const pdf = await adapter.render({
      kind: "collateral",
      manifest,
      artifactType: "pdf",
      source: pdfSource,
      networkPolicy: "deny-all",
    });
    expect(pdf.mimeType).toBe("application/pdf");
    expect(PdfBinaryInspectionSchema.parse(inspectPdfBinary(pdf.bytes))).toMatchObject({
      hasRemoteRuntimeDependency: false,
      hasTaggedStructure: true,
      pageCount: pdf.pageCount,
    });
  }, 60_000);

  it("renders only authorized paid-ad property and lender pixels with cover crop and safe zones", async () => {
    const propertyBytes = await sharp({
      create: { width: 600, height: 1200, channels: 3, background: "#d51f2b" },
    })
      .composite([
        {
          input: Buffer.from(
            '<svg width="600" height="600"><rect width="600" height="600" fill="#1455d9"/></svg>',
          ),
          top: 600,
          left: 0,
        },
      ])
      .png()
      .toBuffer();
    const logoBytes = await sharp({
      create: { width: 320, height: 120, channels: 3, background: "#16b84e" },
    })
      .png()
      .toBuffer();
    const propertySha = createHash("sha256").update(propertyBytes).digest("hex");
    const logoSha = createHash("sha256").update(logoBytes).digest("hex");
    const paidInput = {
      schemaVersion: 1 as const,
      projectionRef: "projection_01VisualPaid",
      locationRef: "location_01VisualTenant",
      campaignRef: "campaign_01VisualPaid",
      campaignVersionRef: "version_01VisualPaid",
      template: { id: "open-house-boost-paid-ad" as const, version: "2.0.0" },
      advertiserIdentity: {
        kind: "lender" as const,
        displayName: "Acme Home Lending",
        logoAssetRef: "asset_01VisualLenderLogo",
      },
      copy: {
        primaryText: "Explore a home with a licensed lender.",
        headline: "Tour the home",
        description: "Open house financing guidance.",
      },
      creative: {
        headline: "Tour the home",
        body: "Saturday from 1 PM to 3 PM.",
        callToActionLabel: "Learn more",
        propertyImageAssetRefs: ["asset_01VisualProperty"],
        identityAssetRefs: ["asset_01VisualLenderLogo"],
        disclosureBlocks: ["Equal Housing Opportunity."],
      },
      leadForm: {
        headline: "Request details",
        description: "A licensed lender will follow up.",
        callToActionLabel: "Request details",
        privacyPolicyUrl: "https://lender.example/privacy",
      },
      approvalSummary: {
        approvalSummaryRef: "summary_01VisualPaid",
        scope: "paid_ad" as const,
        previewRef: "preview_01VisualPaid",
        requiredApproverRoles: ["lender_approver" as const],
      },
    };
    const projectionHash = campaignProjectionHash(paidInput);
    const paidAdProjection = {
      ...paidInput,
      projectionHash,
      approvalSummary: { ...paidInput.approvalSummary, projectionHash },
    };
    const assetManifestInput = {
      schemaVersion: 1 as const,
      assetManifestRef: "assetmanifest_01VisualPaid",
      campaignVersionRef: paidAdProjection.campaignVersionRef,
      paidAdProjectionHash: projectionHash,
      identityAssets: [
        {
          assetRef: "asset_01VisualLenderLogo",
          sha256: logoSha,
          mimeType: "image/png" as const,
          width: 320,
          height: 120,
          focalPoint: { x: 0.5, y: 0.5 },
          approvalStatus: "approved" as const,
        },
      ],
      propertyAssets: [
        {
          assetRef: "asset_01VisualProperty",
          sha256: propertySha,
          mimeType: "image/png" as const,
          width: 600,
          height: 1200,
          focalPoint: { x: 0.5, y: 0.5 },
          approvalStatus: "approved" as const,
        },
      ],
      creativeSafeZones: {
        metaSquare: { top: 0.04, right: 0.07, bottom: 0.08, left: 0.09 },
        metaStory: { top: 0.06, right: 0.1, bottom: 0.14, left: 0.11 },
      },
    };
    const assetManifest = {
      ...assetManifestInput,
      manifestHash: paidAdRenderAssetManifestHash(assetManifestInput),
    };
    const evidence = {
      schemaVersion: 1 as const,
      campaignVersionRef: paidAdProjection.campaignVersionRef,
      collateralProjectionHash: "a".repeat(64),
      paidAdProjectionHash: projectionHash,
      rulesetVersionRef: "ruleset_01VisualPaid",
      brandBoundaryRulesHash: "b".repeat(64),
      blocking: false as const,
      resultHash: "c".repeat(64),
    };
    const source = await renderPaidAdCreativeSource(
      {
        paidAdProjection,
        evidence,
        brandAuthority: { assertAuthorized: async () => undefined },
        assetAuthority: { resolveAuthorizedManifest: async () => assetManifest },
      },
      "meta-square",
    );
    expect(source.html).toContain("object-fit:cover");
    expect(source.html).toContain("object-position:50% 50%");
    expect(source.html).toContain('data-safe-zone="4%,7%,8%,9%"');
    expect(source.html).toContain(`/media/asset_01VisualProperty/${propertySha}`);
    expect(source.html).toContain(`/media/asset_01VisualLenderLogo/${logoSha}`);

    const loadAsset = vi.fn(async ({ assetRef }: { assetRef: string }) => {
      if (assetRef === "asset_01VisualProperty") return propertyBytes;
      if (assetRef === "asset_01VisualLenderLogo") return logoBytes;
      throw new Error("Unknown paid-ad render asset");
    });
    const adapter = new PlaywrightBrowserAdapter({
      load: loadAsset,
    });
    const output = await adapter.render({
      kind: "paid_ad",
      paidAdContext: {
        locationRef: paidAdProjection.locationRef,
        campaignRef: paidAdProjection.campaignRef,
        campaignVersionRef: paidAdProjection.campaignVersionRef,
        projectionHash,
      },
      artifactType: "meta-square",
      source,
      networkPolicy: "deny-all",
    });
    const { data, info } = await sharp(output.bytes).raw().toBuffer({ resolveWithObject: true });
    let redDominant = 0;
    let blueDominant = 0;
    let greenDominant = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const red = data[offset] ?? 0;
      const green = data[offset + 1] ?? 0;
      const blue = data[offset + 2] ?? 0;
      if (red > green * 1.5 && red > blue * 1.5) redDominant += 1;
      if (blue > red * 1.5 && blue > green * 1.5) blueDominant += 1;
      if (green > red * 1.5 && green > blue * 1.5) greenDominant += 1;
    }
    expect(output).toMatchObject({ mimeType: "image/png", width: 1080, height: 1080 });
    expect(redDominant).toBeGreaterThan(10_000);
    expect(blueDominant).toBeGreaterThan(500);
    expect(greenDominant).toBeGreaterThan(1_000);

    for (const rejectedUrl of [
      `/media/asset_01UnknownProperty/${"d".repeat(64)}`,
      "https://169.254.169.254/latest/meta-data/iam/security-credentials/",
      `/media/asset_01VisualProperty/${propertySha}/../../private/collateral.png`,
    ]) {
      const priorLoadCount = loadAsset.mock.calls.length;
      const rejectedSource = {
        ...source,
        html: source.html.replace(`/media/asset_01VisualProperty/${propertySha}`, rejectedUrl),
      };
      await expect(
        adapter.render({
          kind: "paid_ad",
          paidAdContext: {
            locationRef: paidAdProjection.locationRef,
            campaignRef: paidAdProjection.campaignRef,
            campaignVersionRef: paidAdProjection.campaignVersionRef,
            projectionHash,
          },
          artifactType: "meta-square",
          source: rejectedSource,
          networkPolicy: "deny-all",
        }),
      ).rejects.toThrow();
      const requestsAfterRejection = loadAsset.mock.calls.slice(priorLoadCount);
      expect(
        requestsAfterRejection.every(
          ([request]) => request.assetRef === "asset_01VisualLenderLogo",
        ),
      ).toBe(true);
    }

    const checksumMismatchAdapter = new PlaywrightBrowserAdapter({
      async load() {
        return logoBytes;
      },
    });
    await expect(
      checksumMismatchAdapter.render({
        kind: "paid_ad",
        paidAdContext: {
          locationRef: paidAdProjection.locationRef,
          campaignRef: paidAdProjection.campaignRef,
          campaignVersionRef: paidAdProjection.campaignVersionRef,
          projectionHash,
        },
        artifactType: "meta-square",
        source,
        networkPolicy: "deny-all",
      }),
    ).rejects.toThrow("bytes do not match the manifest checksum");

    const mislabeledBytes = await sharp({
      create: { width: 600, height: 1200, channels: 3, background: "#d51f2b" },
    })
      .jpeg()
      .toBuffer();
    const mislabeledSha = createHash("sha256").update(mislabeledBytes).digest("hex");
    const mislabeledManifestInput = {
      ...assetManifestInput,
      propertyAssets: [
        {
          ...assetManifestInput.propertyAssets[0]!,
          sha256: mislabeledSha,
          mimeType: "image/png" as const,
        },
      ],
    };
    const mislabeledSource = {
      ...source,
      html: source.html.replace(propertySha, mislabeledSha),
      assetManifest: {
        ...mislabeledManifestInput,
        manifestHash: paidAdRenderAssetManifestHash(mislabeledManifestInput),
      },
    };
    const mislabeledAdapter = new PlaywrightBrowserAdapter({
      async load({ assetRef }) {
        if (assetRef === "asset_01VisualProperty") return mislabeledBytes;
        if (assetRef === "asset_01VisualLenderLogo") return logoBytes;
        throw new Error("Unknown paid-ad render asset");
      },
    });
    await expect(
      mislabeledAdapter.render({
        kind: "paid_ad",
        paidAdContext: {
          locationRef: paidAdProjection.locationRef,
          campaignRef: paidAdProjection.campaignRef,
          campaignVersionRef: paidAdProjection.campaignVersionRef,
          projectionHash,
        },
        artifactType: "meta-square",
        source: mislabeledSource,
        networkPolicy: "deny-all",
      }),
    ).rejects.toThrow("metadata does not match");

    const decompressionBytes = await sharp({
      create: { width: 4_096, height: 3_000, channels: 3, background: "#d51f2b" },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const decompressionSha = createHash("sha256").update(decompressionBytes).digest("hex");
    const decompressionManifestInput = {
      ...assetManifestInput,
      propertyAssets: [
        {
          ...assetManifestInput.propertyAssets[0]!,
          sha256: decompressionSha,
          width: 4_096,
          height: 3_000,
        },
      ],
    };
    const decompressionSource = {
      ...source,
      html: source.html.replace(propertySha, decompressionSha),
      assetManifest: {
        ...decompressionManifestInput,
        manifestHash: paidAdRenderAssetManifestHash(decompressionManifestInput),
      },
    };
    const decompressionAdapter = new PlaywrightBrowserAdapter({
      async load({ assetRef }) {
        if (assetRef === "asset_01VisualProperty") return decompressionBytes;
        if (assetRef === "asset_01VisualLenderLogo") return logoBytes;
        throw new Error("Unknown paid-ad render asset");
      },
    });
    await expect(
      decompressionAdapter.render({
        kind: "paid_ad",
        paidAdContext: {
          locationRef: paidAdProjection.locationRef,
          campaignRef: paidAdProjection.campaignRef,
          campaignVersionRef: paidAdProjection.campaignVersionRef,
          projectionHash,
        },
        artifactType: "meta-square",
        source: decompressionSource,
        networkPolicy: "deny-all",
      }),
    ).rejects.toThrow();
  }, 60_000);
});
