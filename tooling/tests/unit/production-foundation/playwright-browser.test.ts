import { createHash } from "node:crypto";

import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const browserState = vi.hoisted(() => ({
  requestedUrls: [] as string[],
  screenshotFailuresRemaining: 0,
  images: [] as unknown[],
  launch: vi.fn(),
  fulfill: vi.fn(),
  abort: vi.fn(),
  closeContext: vi.fn(),
  closeBrowser: vi.fn(),
  emulateMedia: vi.fn(),
}));

vi.mock("@playwright/test", () => ({
  chromium: {
    launch: browserState.launch.mockImplementation(async () => {
      let routeHandler: ((route: Readonly<Record<string, unknown>>) => Promise<void>) | undefined;
      const page = {
        goto: vi.fn(async (url: string) => {
          if (routeHandler === undefined) throw new Error("Expected a registered route handler");
          for (const requestUrl of [url, ...browserState.requestedUrls]) {
            const parsed = new URL(requestUrl);
            const document = parsed.pathname === "/document";
            await routeHandler({
              request: () => ({
                url: () => requestUrl,
                method: () => "GET",
                resourceType: () => (document ? "document" : "image"),
              }),
              fulfill: browserState.fulfill,
              abort: browserState.abort,
            });
          }
        }),
        waitForFunction: vi.fn(async () => undefined),
        locator: vi.fn(() => ({
          evaluateAll: vi.fn(async (callback: (images: unknown[]) => Promise<void>) =>
            callback(browserState.images),
          ),
        })),
        screenshot: vi.fn(async () => {
          if (browserState.screenshotFailuresRemaining > 0) {
            browserState.screenshotFailuresRemaining -= 1;
            const error = new Error("page.screenshot timed out");
            error.name = "TimeoutError";
            throw error;
          }
          return new Uint8Array([1, 2, 3]);
        }),
        emulateMedia: browserState.emulateMedia,
      };
      return {
        newContext: vi.fn(async () => ({
          route: vi.fn(async (_pattern: string, handler: typeof routeHandler) => {
            routeHandler = handler;
          }),
          newPage: vi.fn(async () => page),
          close: browserState.closeContext,
        })),
        close: browserState.closeBrowser,
      };
    }),
  },
}));

import {
  PlaywrightBrowserAdapter,
  type PaidAdRenderSourceDocument,
} from "../../../../packages/rendering/src/index.js";
import { commonRenderManifest } from "../../fixtures/prd001d-render-manifests.js";

const sha = (value: Uint8Array): string => createHash("sha256").update(value).digest("hex");

async function paidSource() {
  const bytes = new Uint8Array(
    await sharp({ create: { width: 32, height: 32, channels: 3, background: "#25a34a" } })
      .png()
      .toBuffer(),
  );
  const checksum = sha(bytes);
  const asset = {
    assetRef: "asset_01PaidProperty",
    sha256: checksum,
    mimeType: "image/png" as const,
    width: 32,
    height: 32,
    focalPoint: { x: 0.5, y: 0.5 },
    approvalStatus: "approved" as const,
  };
  const source = {
    artifactType: "meta-square" as const,
    locationRef: "location_01PaidUnit",
    campaignRef: "campaign_01PaidUnit",
    campaignVersionRef: "version_01PaidUnit",
    projectionHash: "a".repeat(64),
    templateId: "open-house-boost-paid-ad" as const,
    templateVersion: "2.0.0",
    approvalPreviewRef: "preview_01PaidUnit",
    assetManifest: {
      schemaVersion: 1 as const,
      assetManifestRef: "assetmanifest_01PaidUnit",
      campaignVersionRef: "version_01PaidUnit",
      paidAdProjectionHash: "a".repeat(64),
      identityAssets: [],
      propertyAssets: [asset],
      creativeSafeZones: {
        metaSquare: { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 },
        metaStory: { top: 0.05, right: 0.05, bottom: 0.1, left: 0.05 },
      },
      manifestHash: "b".repeat(64),
    },
    html: `<img src="/media/${asset.assetRef}/${asset.sha256}">`,
    viewport: { width: 1080, height: 1080 },
    inputMimeType: "text/html" as const,
    output: { format: "png" as const, width: 1080, height: 1080 },
    responseHeaders: { "content-security-policy": "default-src 'none'; img-src 'self'" },
    networkPolicy: "deny-all" as const,
    sourceHash: "c".repeat(64),
  } satisfies PaidAdRenderSourceDocument;
  return { bytes, asset, source };
}

function decodedImage(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    decode: vi.fn(async () => undefined),
    complete: true,
    naturalWidth: 32,
    naturalHeight: 32,
    ...overrides,
  };
}

describe("paid-only Playwright browser branches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserState.requestedUrls = [];
    browserState.screenshotFailuresRemaining = 0;
    browserState.images = [];
  });

  it("rejects mismatched artifact types and network policy before launching", async () => {
    const { source } = await paidSource();
    const adapter = new PlaywrightBrowserAdapter();
    await expect(
      adapter.render({
        kind: "paid_ad",
        paidAdContext: {
          locationRef: source.locationRef,
          campaignRef: source.campaignRef,
          campaignVersionRef: source.campaignVersionRef,
          projectionHash: source.projectionHash,
        },
        artifactType: "meta-story",
        source,
        networkPolicy: "deny-all",
      }),
    ).rejects.toThrow("matching artifact type");
    await expect(
      adapter.render({
        kind: "paid_ad",
        paidAdContext: {
          locationRef: source.locationRef,
          campaignRef: source.campaignRef,
          campaignVersionRef: source.campaignVersionRef,
          projectionHash: source.projectionHash,
        },
        artifactType: "meta-square",
        source,
        networkPolicy: "allow" as "deny-all",
      }),
    ).rejects.toThrow("denied network policy");
    expect(browserState.launch).not.toHaveBeenCalled();
  });

  it("loads exact paid assets, validates decoded images, and retries one timeout", async () => {
    const { bytes, asset, source } = await paidSource();
    browserState.requestedUrls = [`https://render.invalid/media/${asset.assetRef}/${asset.sha256}`];
    browserState.images = [decodedImage()];
    browserState.screenshotFailuresRemaining = 1;
    const load = vi.fn(async () => bytes);
    const output = await new PlaywrightBrowserAdapter({ load }).render({
      kind: "paid_ad",
      paidAdContext: {
        locationRef: source.locationRef,
        campaignRef: source.campaignRef,
        campaignVersionRef: source.campaignVersionRef,
        projectionHash: source.projectionHash,
      },
      artifactType: "meta-square",
      source,
      networkPolicy: "deny-all",
    });
    expect(output).toMatchObject({ mimeType: "image/png", width: 1080, height: 1080 });
    expect(load).toHaveBeenCalledTimes(2);
    expect(browserState.launch).toHaveBeenCalledTimes(2);
    expect(browserState.fulfill).toHaveBeenCalled();
    expect(browserState.closeContext).toHaveBeenCalledTimes(2);
    expect(browserState.closeBrowser).toHaveBeenCalledTimes(2);
  });

  it("fails closed for unknown routes, absent loaders, and invalid image elements", async () => {
    const { bytes, asset, source } = await paidSource();
    const paidInput = {
      kind: "paid_ad" as const,
      paidAdContext: {
        locationRef: source.locationRef,
        campaignRef: source.campaignRef,
        campaignVersionRef: source.campaignVersionRef,
        projectionHash: source.projectionHash,
      },
      artifactType: "meta-square" as const,
      source,
      networkPolicy: "deny-all" as const,
    };

    browserState.requestedUrls = [`https://render.invalid/media/${asset.assetRef}/${asset.sha256}`];
    await expect(new PlaywrightBrowserAdapter().render(paidInput)).rejects.toThrow(
      "blocked an unapproved network request",
    );

    browserState.requestedUrls = ["https://attacker.invalid/private.png"];
    await expect(
      new PlaywrightBrowserAdapter({ load: async () => bytes }).render(paidInput),
    ).rejects.toThrow("blocked an unapproved network request");

    browserState.requestedUrls = [];
    browserState.images = [{}];
    await expect(
      new PlaywrightBrowserAdapter({ load: async () => bytes }).render(paidInput),
    ).rejects.toThrow("non-image element");

    browserState.images = [decodedImage({ naturalWidth: 0 })];
    await expect(
      new PlaywrightBrowserAdapter({ load: async () => bytes }).render(paidInput),
    ).rejects.toThrow("did not decode");
  });

  it("uses collateral assets and full-page mode for captureRaster", async () => {
    const source = {
      artifactType: "public-page-projection" as const,
      html: "<!doctype html><html><body>Collateral</body></html>",
      viewport: { width: 800, height: 600 },
      inputMimeType: "text/html" as const,
      output: { format: "html" as const },
      responseHeaders: {},
      networkPolicy: "deny-all" as const,
    };
    const output = await new PlaywrightBrowserAdapter().captureRaster(
      commonRenderManifest,
      source,
      { width: 640, height: 480 },
    );
    expect(output).toEqual(new Uint8Array([1, 2, 3]));
    expect(browserState.launch).toHaveBeenCalledOnce();
  });
});
