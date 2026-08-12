import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  campaignProjectionHash,
  runPaidAdBrandPreflight,
} from "../../../../packages/application/src/index.js";
import { PaidAdProjectionInputSchema } from "../../../../packages/contracts/src/index.js";

import {
  normalizeUploadedImages,
  NodeQrEncoderAdapter,
  PdfBinaryInspectionSchema,
  approvedCampaignLink,
  encodeApprovedCampaignQr,
  inspectPdfBinary,
  publicCampaignPerformanceBudget,
  paidAdRenderAssetManifestHash,
  renderPaidAdCreativeSource,
  renderArtifactBatch,
  renderSourceForManifest,
  resolveApprovedCampaignLink,
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

const sha = (character: string): string => character.repeat(64);

const paidAdProjectionInput = {
  schemaVersion: 1 as const,
  projectionRef: "projection_01PaidAd",
  locationRef: commonRenderManifest.locationRef,
  campaignRef: commonRenderManifest.campaignRef,
  campaignVersionRef: commonRenderManifest.campaignVersionRef,
  template: { id: "open-house-boost-paid-ad" as const, version: "2.0.0" },
  advertiserIdentity: {
    kind: "lender" as const,
    displayName: "Acme Home Lending",
    logoAssetRef: "asset_01LenderLogo",
    contactInformation: { websiteUrl: "https://lender.example/open-house" },
  },
  copy: {
    primaryText: "Explore a home and connect with a licensed lender.",
    headline: "Tour 123 Main Street",
    description: "Open house details and financing guidance.",
  },
  creative: {
    headline: "Tour 123 Main Street",
    body: "Open Saturday from 1 PM to 3 PM.",
    callToActionLabel: "Learn more",
    propertyImageAssetRefs: ["asset_01Exterior"],
    identityAssetRefs: ["asset_01LenderLogo"],
    disclosureBlocks: ["Equal Housing Opportunity."],
  },
  leadForm: {
    headline: "Request open house details",
    description: "A licensed lender will follow up.",
    callToActionLabel: "Request details",
    privacyPolicyUrl: "https://lender.example/privacy",
  },
  approvalSummary: {
    approvalSummaryRef: "summary_01PaidAd",
    scope: "paid_ad" as const,
    previewRef: "preview_01PaidAd",
    requiredApproverRoles: ["lender_approver" as const],
  },
};

const collateralProjectionInput = {
  schemaVersion: 1 as const,
  projectionRef: "projection_01Collateral",
  locationRef: commonRenderManifest.locationRef,
  campaignRef: commonRenderManifest.campaignRef,
  campaignVersionRef: commonRenderManifest.campaignVersionRef,
  template: { id: "open-house-boost-collateral" as const, version: "1.0.0" },
  content: {
    headline: commonRenderManifest.publicContent.headline,
    propertyAddress: commonRenderManifest.publicContent.propertyAddress,
    propertyDescription: commonRenderManifest.publicContent.propertyDescription,
    openHouseLabel: commonRenderManifest.publicContent.openHouseLabel,
    loanOfficerIdentity: { displayName: commonRenderManifest.publicContent.loanOfficerDisplayName },
    realtorIdentity: {
      displayName: commonRenderManifest.publicContent.realtorDisplayName,
      logoAssetRef: "asset_01RealtorLogo",
      imageAssetRef: "asset_01RealtorPhoto",
      contactInformation: { email: "taylor@brokerage.example" },
    },
    disclosureBlocks: commonRenderManifest.publicContent.disclosureBlocks,
    callToActionLabel: commonRenderManifest.publicContent.callToActionLabel,
    destinationPath: commonRenderManifest.publicContent.destinationPath,
  },
  approvalSummary: {
    approvalSummaryRef: "summary_01Collateral",
    scope: "collateral" as const,
    previewRef: "preview_01Collateral",
    requiredApproverRoles: ["realtor_approver" as const, "lender_approver" as const],
  },
};

const paidAdRules = {
  rulesetVersionRef: "ruleset_01PaidAdBrand",
  realtorIdentityValues: [commonRenderManifest.publicContent.realtorDisplayName],
  brokerageMarks: ["Reed Realty", "Summit Realty"],
  coBrandPhrases: ["in partnership with", "Acme Home Lending and Summit Realty"],
  prohibitedContactValues: ["taylor@brokerage.example"],
  realtorAssetRefs: ["asset_01RealtorLogo", "asset_01RealtorPhoto"],
  allowedPaidAdIdentityAssetRefs: ["asset_01LenderLogo"],
  allowedPropertyImageAssetRefs: ["asset_01Exterior"],
};

function projectionWithHash<T extends Readonly<{ approvalSummary: object }>>(input: T) {
  const projectionHash = campaignProjectionHash(input);
  return {
    ...input,
    projectionHash,
    approvalSummary: { ...input.approvalSummary, projectionHash },
  };
}

function paidAdAuthorization(
  untrustedPaidAdInput: unknown = paidAdProjectionInput,
  callerRules: typeof paidAdRules = paidAdRules,
) {
  const paidAdInput = PaidAdProjectionInputSchema.parse(untrustedPaidAdInput);
  const projections = {
    collateral: projectionWithHash(collateralProjectionInput),
    paidAd: projectionWithHash(paidAdInput),
  };
  const result = runPaidAdBrandPreflight(projections, callerRules);
  const trustedResult = runPaidAdBrandPreflight(projections, paidAdRules);
  const evidence = {
    schemaVersion: 1 as const,
    campaignVersionRef: result.campaignVersionRef,
    collateralProjectionHash: result.collateralProjectionHash,
    paidAdProjectionHash: result.paidAdProjectionHash,
    rulesetVersionRef: result.rulesetVersionRef,
    brandBoundaryRulesHash: result.brandBoundaryRulesHash,
    blocking: false as const,
    resultHash: result.resultHash,
  };
  const assetManifestInput = {
    schemaVersion: 1 as const,
    assetManifestRef: "assetmanifest_01PaidAd",
    campaignVersionRef: projections.paidAd.campaignVersionRef,
    paidAdProjectionHash: projections.paidAd.projectionHash,
    identityAssets: [
      {
        assetRef: "asset_01LenderLogo",
        sha256: sha("c"),
        mimeType: "image/png" as const,
        width: 320,
        height: 120,
        focalPoint: { x: 0.5, y: 0.5 },
        approvalStatus: "approved" as const,
      },
    ],
    propertyAssets: [
      {
        assetRef: "asset_01Exterior",
        sha256: sha("b"),
        mimeType: "image/jpeg" as const,
        width: 1600,
        height: 900,
        focalPoint: { x: 0.27, y: 0.68 },
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
  return {
    paidAdProjection: projections.paidAd,
    evidence,
    brandAuthority: {
      assertAuthorized(actual: unknown) {
        const expected = {
          campaignVersionRef: trustedResult.campaignVersionRef,
          collateralProjectionHash: trustedResult.collateralProjectionHash,
          paidAdProjectionHash: trustedResult.paidAdProjectionHash,
          rulesetVersionRef: trustedResult.rulesetVersionRef,
          brandBoundaryRulesHash: trustedResult.brandBoundaryRulesHash,
          preflightResultHash: trustedResult.resultHash,
        };
        if (trustedResult.blocking || JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error("Stored paid-ad brand attestation does not authorize rendering");
        }
      },
    },
    assetAuthority: {
      resolveAuthorizedManifest: vi.fn(async () => assetManifest),
    },
    assetManifestForTest: assetManifest,
  };
}

describe("PRD-001d safe campaign rendering", () => {
  it("renders Meta creative only from a lender-branded paid-ad projection", async () => {
    const authorization = paidAdAuthorization();
    const square = await renderPaidAdCreativeSource(authorization, "meta-square");
    const story = await renderPaidAdCreativeSource(authorization, "meta-story");
    expect(square.viewport).toEqual({ width: 1080, height: 1080 });
    expect(story.viewport).toEqual({ width: 1080, height: 1920 });
    expect(square).toMatchObject({
      projectionHash: authorization.paidAdProjection.projectionHash,
      templateId: "open-house-boost-paid-ad",
      templateVersion: "2.0.0",
      approvalPreviewRef: "preview_01PaidAd",
      networkPolicy: "deny-all",
    });
    expect(square.html).toContain("Acme Home Lending");
    expect(square.html).toContain('data-projection-scope="paid_ad"');
    expect(square.html).toContain('<img class="property-image"');
    expect(square.html).toContain('<img class="identity-image"');
    expect(square.html).toContain("object-fit:cover");
    expect(square.html).toContain("object-position:27% 68%");
    expect(square.html).toContain('data-safe-zone="4%,7%,8%,9%"');
    expect(story.html).toContain('data-safe-zone="6%,10%,14%,11%"');
    expect(square.responseHeaders["content-security-policy"]).toContain("img-src 'self'");
    expect(square.responseHeaders["content-security-policy"]).toContain("script-src 'none'");
    expect(square.responseHeaders["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(square.responseHeaders["content-security-policy"]).not.toContain("unsafe-eval");
    expect(authorization.assetAuthority.resolveAuthorizedManifest).toHaveBeenCalledWith({
      campaignVersionRef: authorization.paidAdProjection.campaignVersionRef,
      paidAdProjectionHash: authorization.paidAdProjection.projectionHash,
      collateralProjectionHash: authorization.evidence.collateralProjectionHash,
      brandBoundaryRulesHash: authorization.evidence.brandBoundaryRulesHash,
      preflightResultHash: authorization.evidence.resultHash,
      identityAssetRefs: ["asset_01LenderLogo"],
      propertyImageAssetRefs: ["asset_01Exterior"],
    });
    expect(square.html).not.toContain(commonRenderManifest.publicContent.realtorDisplayName);
    expect(square.html).not.toContain("brokerage");
    expect(square.sourceHash).toMatch(/^[a-f0-9]{64}$/u);
    await expect(renderPaidAdCreativeSource(paidAdAuthorization(), "meta-square")).resolves.toEqual(
      square,
    );
  });

  it("fails closed when collateral or Realtor identity is supplied to paid-ad rendering", async () => {
    await expect(
      renderPaidAdCreativeSource(
        {
          paidAdProjection: commonRenderManifest,
          evidence: {},
          brandAuthority: { assertAuthorized: vi.fn() },
          assetAuthority: { resolveAuthorizedManifest: vi.fn() },
        },
        "meta-square",
      ),
    ).rejects.toThrow();
    for (const contaminated of [
      {
        ...paidAdProjectionInput,
        advertiserIdentity: {
          ...paidAdProjectionInput.advertiserIdentity,
          displayName: "Taylor Reed",
        },
      },
      {
        ...paidAdProjectionInput,
        advertiserIdentity: {
          ...paidAdProjectionInput.advertiserIdentity,
          logoAssetRef: "asset_01RealtorLogo",
          contactInformation: { email: "taylor@brokerage.example" },
        },
      },
      {
        ...paidAdProjectionInput,
        copy: { ...paidAdProjectionInput.copy, primaryText: "Meet Taylor-Reed" },
        creative: {
          ...paidAdProjectionInput.creative,
          identityAssetRefs: ["asset_01RealtorPhoto"],
        },
        leadForm: {
          ...paidAdProjectionInput.leadForm,
          description: "Contact Taylor Reed at the open house",
        },
      },
    ]) {
      const authorization = paidAdAuthorization(contaminated);
      await expect(renderPaidAdCreativeSource(authorization, "meta-square")).rejects.toThrow(
        "brand attestation",
      );
    }
  });

  it("rejects fully rebound weak-rule brokerage and dual-brand render evidence", async () => {
    const contaminated = {
      ...paidAdProjectionInput,
      copy: {
        ...paidAdProjectionInput.copy,
        primaryText: "Summit Realty presents this home",
      },
      creative: {
        ...paidAdProjectionInput.creative,
        body: "An Acme Home Lending and Summit Realty experience",
      },
    };
    const weakenedRules = {
      ...paidAdRules,
      brokerageMarks: [],
      coBrandPhrases: [],
    };
    const reboundAuthorization = paidAdAuthorization(contaminated, weakenedRules);
    await expect(renderPaidAdCreativeSource(reboundAuthorization, "meta-square")).rejects.toThrow(
      "Stored paid-ad brand attestation",
    );
    const browser = { render: vi.fn() };
    const storage = { store: vi.fn() };
    await expect(
      renderArtifactBatch(
        {
          manifest: commonRenderManifest,
          artifactTypes: ["meta-square"],
          paidAdAuthorization: reboundAuthorization,
          createdAt: new Date("2026-07-21T12:00:00.000Z"),
        },
        { browser, storage },
      ),
    ).rejects.toThrow("Stored paid-ad brand attestation");
    expect(browser.render).not.toHaveBeenCalled();
    expect(storage.store).not.toHaveBeenCalled();
  });

  it("fails closed for missing, extra, unknown, or tampered paid-only assets", async () => {
    const clean = paidAdAuthorization();
    const manifest = clean.assetManifestForTest;
    const withCurrentHash = (changed: Omit<typeof manifest, "manifestHash">): typeof manifest => ({
      ...changed,
      manifestHash: paidAdRenderAssetManifestHash(changed),
    });
    const { manifestHash: _manifestHash, ...manifestInput } = manifest;
    for (const rejectedManifest of [
      withCurrentHash({ ...manifestInput, identityAssets: [] }),
      withCurrentHash({
        ...manifestInput,
        identityAssets: [
          ...manifest.identityAssets,
          {
            assetRef: "asset_01UnknownLogo",
            sha256: sha("d"),
            mimeType: "image/png",
            width: 200,
            height: 80,
            focalPoint: { x: 0.5, y: 0.5 },
            approvalStatus: "approved",
          },
        ],
      }),
      { ...manifest, propertyAssets: [] },
      { ...manifest, manifestHash: sha("f") },
    ]) {
      await expect(
        renderPaidAdCreativeSource(
          {
            ...clean,
            assetAuthority: { resolveAuthorizedManifest: async () => rejectedManifest },
          },
          "meta-square",
        ),
      ).rejects.toThrow();
    }
  });

  it("awaits both paid-ad authorities and fails closed on asynchronous rejection", async () => {
    const brandRejected = paidAdAuthorization();
    const brandAssetAuthority = brandRejected.assetAuthority.resolveAuthorizedManifest;
    await expect(
      renderPaidAdCreativeSource(
        {
          ...brandRejected,
          brandAuthority: {
            async assertAuthorized() {
              await Promise.resolve();
              throw new Error("stored brand authority rejected");
            },
          },
        },
        "meta-square",
      ),
    ).rejects.toThrow("stored brand authority rejected");
    expect(brandAssetAuthority).not.toHaveBeenCalled();

    const assetRejected = paidAdAuthorization();
    await expect(
      renderPaidAdCreativeSource(
        {
          ...assetRejected,
          assetAuthority: {
            async resolveAuthorizedManifest() {
              await Promise.resolve();
              throw new Error("stored asset authority rejected");
            },
          },
        },
        "meta-square",
      ),
    ).rejects.toThrow("stored asset authority rejected");
  });

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

  it("binds an encoded QR and resolver to the exact approved campaign version", () => {
    const link = approvedCampaignLink(commonRenderManifest);
    const qr = encodeApprovedCampaignQr(commonRenderManifest, new NodeQrEncoderAdapter());
    expect(resolveApprovedCampaignLink(commonRenderManifest, qr.payload)).toEqual(link);
    expect(qr.svg).toContain('shape-rendering="crispEdges"');
    expect(qr.svg.match(/h1v1h-1z/gu)?.length).toBeGreaterThan(100);
    expect(qr.sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(() =>
      resolveApprovedCampaignLink(
        commonRenderManifest,
        qr.payload.replace("v=version_01Approved", "v=version_02Other"),
      ),
    ).toThrow("approved campaign version");
  });

  it("inspects tagged, self-contained PDF binaries before acceptance", () => {
    const bytes = new TextEncoder().encode(
      "%PDF-1.7\n1 0 obj<</Type/Page>>endobj\n2 0 obj<</StructTreeRoot 3 0 R/MarkInfo<</Marked true>>/Lang(en-US)>>endobj\n%%EOF\n",
    );
    expect(PdfBinaryInspectionSchema.parse(inspectPdfBinary(bytes))).toMatchObject({
      pageCount: 1,
      hasRemoteRuntimeDependency: false,
    });
    expect(
      inspectPdfBinary(new TextEncoder().encode("%PDF-1.7\n/URI(https://bad.invalid)\n%%EOF")),
    ).toMatchObject({
      hasRemoteRuntimeDependency: true,
    });
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
      render: vi.fn(async (_input: unknown) => ({
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
        paidAdAuthorization: paidAdAuthorization(),
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
    const productionBrowserInput = browser.render.mock.calls[0]?.[0] as
      | Readonly<{
          kind: string;
          source: Readonly<{ html: string }> & Record<string, unknown>;
        }>
      | undefined;
    const productionSource = (
      productionBrowserInput as
        Readonly<{ source: Readonly<{ html: string }> & Record<string, unknown> }> | undefined
    )?.source;
    expect(productionBrowserInput?.kind).toBe("paid_ad");
    expect(productionBrowserInput).not.toHaveProperty("manifest");
    const fullBrowserInput = JSON.stringify(productionBrowserInput);
    expect(fullBrowserInput).not.toContain(commonRenderManifest.manifestRef);
    expect(fullBrowserInput).not.toContain(commonRenderManifest.profileVersions.partner);
    expect(fullBrowserInput).not.toContain(commonRenderManifest.publicContent.realtorDisplayName);
    expect(fullBrowserInput).not.toContain(commonRenderManifest.assets[0]!.sha256);
    expect(fullBrowserInput).not.toContain("asset_01RealtorLogo");
    expect(fullBrowserInput).not.toContain("asset_01RealtorPhoto");
    expect(fullBrowserInput).toContain("asset_01LenderLogo");
    expect(fullBrowserInput).toContain("asset_01Exterior");
    expect(productionSource).toBeDefined();
    if (productionSource === undefined) throw new Error("Production renderer was not called");
    expect(productionSource.html).toContain("Acme Home Lending");
    expect(productionSource.html).not.toContain(
      commonRenderManifest.publicContent.realtorDisplayName,
    );
    expect(productionSource).toMatchObject({
      artifactType: "meta-square",
      templateId: "open-house-boost-paid-ad",
      approvalPreviewRef: "preview_01PaidAd",
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
    ).rejects.toThrow("separate authorized paid-ad projection");

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
          paidAdAuthorization: paidAdAuthorization(),
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
