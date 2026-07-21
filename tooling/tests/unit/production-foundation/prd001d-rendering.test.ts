import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  normalizeUploadedImages,
  publicCampaignPerformanceBudget,
  renderArtifactBatch,
  renderSourceForManifest,
  SharpImageNormalizationAdapter,
  type ImageNormalizationPort,
} from "../../../../packages/rendering/src/index.js";
import {
  withdrawProjectionWithAudit,
  type ProjectionWithdrawalAuditPort,
} from "../../../../packages/storage/src/index.js";
import { commonRenderManifest } from "../../fixtures/prd001d-render-manifests.js";

const projection = {
  schemaVersion: 1 as const,
  publicCampaignId: "campaign_public_01",
  campaignVersionRef: commonRenderManifest.campaignVersionRef,
  headline: commonRenderManifest.publicContent.headline,
  propertyAddress: commonRenderManifest.publicContent.propertyAddress,
  propertyDescription: commonRenderManifest.publicContent.propertyDescription,
  openHouseLabel: commonRenderManifest.publicContent.openHouseLabel,
  loanOfficerDisplayName: commonRenderManifest.publicContent.loanOfficerDisplayName,
  realtorDisplayName: commonRenderManifest.publicContent.realtorDisplayName,
  disclosureBlocks: commonRenderManifest.publicContent.disclosureBlocks,
  callToActionLabel: commonRenderManifest.publicContent.callToActionLabel,
  artifactUrls: {},
  consentDisclosureVersion: commonRenderManifest.consentDisclosureVersion,
  activeFrom: "2026-07-21T12:00:00.000Z",
  activeUntil: "2026-07-28T12:00:00.000Z",
};

describe("PRD-001d safe campaign rendering", () => {
  it("builds a responsive server document from approved content with strict CSP and metadata", () => {
    const source = renderSourceForManifest(commonRenderManifest, "public-page-projection");

    expect(source.networkPolicy).toBe("deny-all");
    expect(source.output).toEqual({ format: "html" });
    expect(source.html).toContain('<meta name="viewport"');
    expect(source.html).toContain("@media (min-width:48rem)");
    expect(source.html).toContain(commonRenderManifest.publicContent.propertyAddress);
    expect(source.html).toContain(commonRenderManifest.publicContent.loanOfficerDisplayName);
    expect(source.html).toContain(commonRenderManifest.publicContent.realtorDisplayName);
    expect(source.html).toContain('<meta property="og:title"');
    expect(source.responseHeaders["content-security-policy"]).toContain("default-src 'none'");
    expect(source.responseHeaders["content-security-policy"]).toContain("script-src 'none'");
    expect(source.responseHeaders["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(source.responseHeaders["content-security-policy"]).not.toContain("unsafe-inline");
  });

  it("encodes public text, rejects control characters and unsafe destinations", () => {
    const scripted = {
      ...commonRenderManifest,
      publicContent: {
        ...commonRenderManifest.publicContent,
        propertyDescription: '<script>alert("stored")</script>',
      },
    };
    const source = renderSourceForManifest(scripted, "public-page-projection");
    expect(source.html).toContain("&lt;script&gt;alert(&quot;stored&quot;)&lt;/script&gt;");
    expect(source.html).not.toContain('<script>alert("stored")</script>');

    expect(() =>
      renderSourceForManifest(
        {
          ...commonRenderManifest,
          publicContent: {
            ...commonRenderManifest.publicContent,
            propertyDescription: "unsafe\u0000text",
          },
        },
        "public-page-projection",
      ),
    ).toThrow("control character");
    expect(() =>
      renderSourceForManifest(
        {
          ...commonRenderManifest,
          publicContent: {
            ...commonRenderManifest.publicContent,
            destinationPath: "javascript:alert(1)",
          },
        },
        "public-page-projection",
      ),
    ).toThrow();
  });

  it("uses one opaque, non-personal link payload for the CTA and QR artifact", () => {
    const page = renderSourceForManifest(commonRenderManifest, "public-page-projection");
    const qr = renderSourceForManifest(commonRenderManifest, "qr");
    const href = page.html.match(/class="cta"[^>]+href="([^"]+)"/u)?.[1];
    const qrPayload = qr.html.match(/data-qr-payload="([^"]+)"/u)?.[1];

    expect(href).toBeDefined();
    expect(qrPayload).toBe(href);
    expect(href).toContain(`v=${commonRenderManifest.campaignVersionRef}`);
    expect(href).toMatch(/t=track_[a-f0-9]{24}/u);
    expect(href).not.toContain("Alex");
    expect(href).not.toContain("Main");
    expect(page.html).toContain(
      `Consent disclosure version: ${commonRenderManifest.consentDisclosureVersion}`,
    );
    expect(page.html).toContain('aria-describedby="compliance-version consent-disclosure-version"');
    expect(page.html.indexOf("Consent disclosure version")).toBeLessThan(
      page.html.indexOf('class="cta"'),
    );
  });

  it("creates paginated print source without remote runtime dependencies or lost long text", () => {
    const description = "Long approved property description. ".repeat(150);
    const disclosure = "Required disclosure language. ".repeat(130);
    const source = renderSourceForManifest(
      {
        ...commonRenderManifest,
        publicContent: {
          ...commonRenderManifest.publicContent,
          propertyDescription: description,
          disclosureBlocks: [disclosure],
        },
      },
      "pdf",
    );

    expect(source.output).toEqual({
      format: "pdf",
      pageSize: "letter",
      printBackground: true,
    });
    expect(source.html.match(/class="pdf-page"/gu)?.length).toBeGreaterThan(4);
    expect(source.html).toContain("Property details continued");
    expect(source.html).toContain("Required disclosure 1 continued");
    expect(source.html).not.toContain("https://");
    expect(source.html.replaceAll(/<[^>]+>/gu, "")).toContain(description.slice(0, 500));
    expect(source.html.replaceAll(/<[^>]+>/gu, "")).toContain(disclosure.slice(-500));
  });

  it("limits creative output to the approved Meta sizes and blocks unreadable copy", () => {
    const square = renderSourceForManifest(commonRenderManifest, "meta-square");
    const story = renderSourceForManifest(commonRenderManifest, "meta-story");
    expect(square.output).toEqual({ format: "png", width: 1080, height: 1080 });
    expect(story.output).toEqual({ format: "png", width: 1080, height: 1920 });
    expect(square.html).toContain("safe-zone");
    expect(square.html).toContain("font-size:28px");
    expect(story.html).toContain("font-size:32px");

    expect(() =>
      renderSourceForManifest(
        {
          ...commonRenderManifest,
          publicContent: {
            ...commonRenderManifest.publicContent,
            headline: "A".repeat(101),
          },
        },
        "meta-square",
      ),
    ).toThrow("readable safe-zone budget");
  });

  it("applies manifest-configured focal points and format-specific safe text zones", () => {
    const manifest = {
      ...commonRenderManifest,
      assets: [
        {
          ...commonRenderManifest.assets[0]!,
          focalPoint: { x: 0.27, y: 0.68 },
        },
      ],
      creativeSafeZones: {
        metaSquare: { top: 0.04, right: 0.07, bottom: 0.08, left: 0.09 },
        metaStory: { top: 0.06, right: 0.1, bottom: 0.14, left: 0.11 },
      },
    };
    const square = renderSourceForManifest(manifest, "meta-square");
    const story = renderSourceForManifest(manifest, "meta-story");

    expect(square.html).toContain("object-position:27% 68%");
    expect(square.html).toContain("padding:43px 76px 86px 97px");
    expect(square.html).toContain('data-safe-zone="4%,7%,8%,9%"');
    expect(story.html).toContain("object-position:27% 68%");
    expect(story.html).toContain("padding:115px 108px 269px 119px");
    expect(story.html).toContain('data-safe-zone="6%,10%,14%,11%"');

    expect(() =>
      renderSourceForManifest(
        {
          ...manifest,
          assets: [{ ...manifest.assets[0]!, focalPoint: { x: 1.01, y: 0.5 } }],
        },
        "meta-square",
      ),
    ).toThrow();
    expect(() =>
      renderSourceForManifest(
        {
          ...manifest,
          creativeSafeZones: {
            ...manifest.creativeSafeZones,
            metaSquare: { top: 0.3, right: 0.07, bottom: 0.3, left: 0.09 },
          },
        },
        "meta-square",
      ),
    ).toThrow("retain at least half of the output height");
  });

  it("enforces the approved image dimensions at the renderer boundary", async () => {
    const browser = {
      render: vi.fn(async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        mimeType: "image/png" as const,
        width: 1080,
        height: 1080,
      })),
    };
    const storage = {
      store: vi.fn(async () => "locations/location_01TenantA/immutable/meta-square.png"),
    };
    const records = await renderArtifactBatch(
      {
        manifest: commonRenderManifest,
        artifactTypes: ["meta-square"],
        createdAt: new Date("2026-07-21T12:00:00.000Z"),
      },
      { browser, storage },
    );
    expect(records[0]).toMatchObject({
      artifactType: "meta-square",
      mimeType: "image/png",
      width: 1080,
      height: 1080,
    });

    browser.render.mockResolvedValueOnce({
      bytes: new Uint8Array([1]),
      mimeType: "image/png",
      width: 1079,
      height: 1080,
    });
    await expect(
      renderArtifactBatch(
        {
          manifest: commonRenderManifest,
          artifactTypes: ["meta-square"],
          createdAt: new Date("2026-07-21T12:00:00.000Z"),
        },
        { browser, storage },
      ),
    ).rejects.toThrow("approved dimensions");
  });

  it("checks native keyboard semantics, headings, labels, alt text, focus and contrast tokens", () => {
    const source = renderSourceForManifest(commonRenderManifest, "public-page-projection");
    expect(source.html).toContain("<h1>");
    expect(source.html).toContain("<h2");
    expect(source.html).toContain("aria-label=");
    expect(source.html).toContain("alt=");
    expect(source.html).toContain('<a class="cta"');
    expect(source.html).toContain("a:focus-visible");
    expect(source.html).toContain("background:#fff;color:#172033");
    expect(source.html).toContain("background:#0b4f6c;color:#fff");
  });

  it("defines measurable server-response and LCP asset budgets", () => {
    expect(publicCampaignPerformanceBudget).toEqual({
      publicPageServerResponseMsP95: 300,
      largestContentfulAssetBytes: 750_000,
    });
  });
});

describe("PRD-001d upload normalization and withdrawal", () => {
  it("uses the production decoder to auto-orient, strip metadata and re-encode trusted bytes", async () => {
    const source = await sharp({
      create: {
        width: 400,
        height: 600,
        channels: 3,
        background: "#12556f",
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const sourceMetadata = await sharp(source).metadata();
    expect(sourceMetadata.exif).toBeDefined();

    const [normalized] = await normalizeUploadedImages(
      {
        schemaVersion: 1,
        locationRef: "location_01TenantA",
        files: [
          {
            assetRef: "asset_01Production",
            bytes: new Uint8Array(source),
            declaredMimeType: "image/jpeg",
          },
        ],
      },
      new SharpImageNormalizationAdapter(),
    );

    expect(normalized).toMatchObject({
      mimeType: "image/jpeg",
      width: 600,
      height: 400,
      metadataRetained: false,
    });
    const outputMetadata = await sharp(normalized?.bytes).metadata();
    expect(outputMetadata.orientation).toBeUndefined();
    expect(outputMetadata.exif).toBeUndefined();
    expect(outputMetadata.icc).toBeUndefined();
    expect(outputMetadata.xmp).toBeUndefined();
  });

  it("rejects decoded content that does not match its declared MIME type", async () => {
    const jpeg = await sharp({
      create: { width: 400, height: 400, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();

    await expect(
      normalizeUploadedImages(
        {
          schemaVersion: 1,
          locationRef: "location_01TenantA",
          files: [
            {
              assetRef: "asset_01Mismatch",
              bytes: new Uint8Array(jpeg),
              declaredMimeType: "image/png",
            },
          ],
        },
        new SharpImageNormalizationAdapter(),
      ),
    ).rejects.toThrow("does not match decoded content");
  });

  it("decodes, re-encodes, auto-orients and strips metadata before accepting image bytes", async () => {
    const outputBytes = new Uint8Array([9, 8, 7, 6]);
    const port: ImageNormalizationPort = {
      decodeAndReencode: vi.fn(async () => ({
        bytes: outputBytes,
        mimeType: "image/jpeg",
        width: 1600,
        height: 900,
        frameCount: 1,
        metadataRetained: false,
      })),
    };
    const normalized = await normalizeUploadedImages(
      {
        schemaVersion: 1,
        locationRef: "location_01TenantA",
        files: [
          {
            assetRef: "asset_01Upload",
            bytes: new Uint8Array([1, 2, 3]),
            declaredMimeType: "image/jpeg",
          },
        ],
      },
      port,
    );

    expect(port.decodeAndReencode).toHaveBeenCalledWith(
      expect.objectContaining({ autoOrient: true, stripMetadata: true, preserveAnimation: false }),
    );
    expect(normalized[0]).toMatchObject({
      mimeType: "image/jpeg",
      width: 1600,
      height: 900,
      metadataRetained: false,
    });
    expect(normalized[0]?.sha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("enforces MIME, byte, decoded pixel and count limits", async () => {
    const validFile = {
      assetRef: "asset_01Upload",
      bytes: new Uint8Array([1]),
      declaredMimeType: "image/jpeg",
    };
    const port: ImageNormalizationPort = {
      decodeAndReencode: vi.fn(async () => ({
        bytes: new Uint8Array([2]),
        mimeType: "image/jpeg",
        width: 399,
        height: 900,
        frameCount: 1,
        metadataRetained: false,
      })),
    };
    await expect(
      normalizeUploadedImages(
        { schemaVersion: 1, locationRef: "location_01TenantA", files: [validFile] },
        port,
      ),
    ).rejects.toThrow();
    await expect(
      normalizeUploadedImages(
        {
          schemaVersion: 1,
          locationRef: "location_01TenantA",
          files: Array.from({ length: 21 }, (_, index) => ({
            ...validFile,
            assetRef: `asset_${String(index).padStart(2, "0")}Upload`,
          })),
        },
        port,
      ),
    ).rejects.toThrow();
    await expect(
      normalizeUploadedImages(
        {
          schemaVersion: 1,
          locationRef: "location_01TenantA",
          files: [{ ...validFile, declaredMimeType: "image/svg+xml" }],
        },
        port,
      ),
    ).rejects.toThrow();
  });

  it("withdraws publication and appends an immutable projection snapshot in one port call", async () => {
    const port: ProjectionWithdrawalAuditPort = {
      withdrawAndAppendAudit: vi.fn(async () => undefined),
    };
    const record = await withdrawProjectionWithAudit(
      projection,
      "operator_01Approved",
      new Date("2026-07-21T18:00:00.000Z"),
      port,
    );

    expect(record).toMatchObject({
      publicCampaignId: projection.publicCampaignId,
      campaignVersionRef: projection.campaignVersionRef,
      actorRef: "operator_01Approved",
      projection,
      withdrawnAt: "2026-07-21T18:00:00.000Z",
    });
    expect(port.withdrawAndAppendAudit).toHaveBeenCalledOnce();
  });
});
