import { createHash } from "node:crypto";

import { chromium, type Page, type Route } from "@playwright/test";
import type { PaidAdRenderAsset, RenderManifest } from "@oalo/contracts";
import sharp from "sharp";

import { inspectPdfBinary, PdfBinaryInspectionSchema } from "./render-evidence.js";
import type {
  BrowserOutput,
  DeterministicBrowserPort,
  DeterministicBrowserRenderInput,
} from "./production-rendering.js";
import type { RenderSourceDocument } from "./campaign-render-sources.js";

export interface ApprovedRenderAssetLoaderPort {
  load(
    input: Readonly<{
      assetRef: string;
      sha256: string;
      mimeType: "image/jpeg" | "image/png";
    }>,
  ): Promise<Uint8Array>;
}

interface PreparedPage {
  readonly page: Page;
  readonly close: () => Promise<void>;
}

type ApprovedBrowserAsset = RenderManifest["assets"][number] | PaidAdRenderAsset;

const ScreenshotTimeoutMilliseconds = 15_000;
const ScreenshotAttemptLimit = 2;
const MaximumApprovedAssetBytes = 25 * 1024 * 1024;
const MaximumDecodedAssetBytes = 40 * 1024 * 1024;
const MaximumDecodedAssetPixels = MaximumDecodedAssetBytes / 4;

function expectedSharpFormat(mimeType: ApprovedBrowserAsset["mimeType"]): "jpeg" | "png" {
  return mimeType === "image/jpeg" ? "jpeg" : "png";
}

async function assertSafeApprovedAssetBytes(
  bytes: Uint8Array,
  asset: ApprovedBrowserAsset,
): Promise<void> {
  if (bytes.byteLength === 0 || bytes.byteLength > MaximumApprovedAssetBytes) {
    throw new Error("Approved render asset bytes exceed the encoded size limit");
  }
  const source = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const image = sharp(source, {
    animated: false,
    failOn: "warning",
    limitInputPixels: MaximumDecodedAssetPixels,
    pages: 1,
    unlimited: false,
  });
  const metadata = await image.metadata();
  if (
    metadata.format !== expectedSharpFormat(asset.mimeType) ||
    metadata.width !== asset.width ||
    metadata.height !== asset.height ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error("Approved render asset metadata does not match the paid-only manifest");
  }
  const decoded = await image.raw().toBuffer();
  if (decoded.byteLength === 0 || decoded.byteLength > MaximumDecodedAssetBytes) {
    throw new Error("Approved render asset exceeds the decoded size limit");
  }
}

function isRetryableScreenshotFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.message.includes("Page.captureScreenshot") ||
    error.message.startsWith("page.screenshot")
  );
}

export class PlaywrightBrowserAdapter implements DeterministicBrowserPort {
  constructor(private readonly assetLoader?: ApprovedRenderAssetLoaderPort) {}

  async render(input: Readonly<DeterministicBrowserRenderInput>): Promise<BrowserOutput> {
    if (input.networkPolicy !== "deny-all" || input.artifactType !== input.source.artifactType) {
      throw new Error(
        "Browser rendering requires a matching artifact type and denied network policy",
      );
    }
    if (input.source.output.format !== "html" && input.source.output.format !== "pdf") {
      return {
        bytes: await this.captureScreenshot(
          input.kind === "collateral"
            ? input.manifest.assets
            : [
                ...input.source.assetManifest.identityAssets,
                ...input.source.assetManifest.propertyAssets,
              ],
          input.source,
          input.source.viewport,
          false,
        ),
        mimeType: "image/png",
        width: input.source.output.width,
        height: input.source.output.height,
      };
    }
    const prepared = await this.preparePage(
      input.kind === "collateral"
        ? input.manifest.assets
        : [
            ...input.source.assetManifest.identityAssets,
            ...input.source.assetManifest.propertyAssets,
          ],
      input.source,
    );
    try {
      if (input.source.output.format === "html") {
        return {
          bytes: new TextEncoder().encode(input.source.html),
          mimeType: "text/html",
        };
      }
      if (input.source.output.format === "pdf") {
        const bytes = new Uint8Array(
          await prepared.page.pdf({
            format: "Letter",
            outline: true,
            preferCSSPageSize: true,
            printBackground: true,
            tagged: true,
          }),
        );
        const inspection = PdfBinaryInspectionSchema.parse(inspectPdfBinary(bytes));
        return {
          bytes,
          mimeType: "application/pdf",
          pageCount: inspection.pageCount,
        };
      }
      throw new Error("Unsupported browser rendering output format");
    } finally {
      await prepared.close();
    }
  }

  async captureRaster(
    manifest: RenderManifest,
    source: RenderSourceDocument,
    viewport: Readonly<{ width: number; height: number }>,
  ): Promise<Uint8Array> {
    return this.captureScreenshot(manifest.assets, source, viewport, true);
  }

  private async captureScreenshot(
    approvedAssets: readonly ApprovedBrowserAsset[],
    source: RenderSourceDocument,
    viewport: Readonly<{ width: number; height: number }>,
    fullPage: boolean,
  ): Promise<Uint8Array> {
    let lastFailure: unknown;
    for (let attempt = 1; attempt <= ScreenshotAttemptLimit; attempt += 1) {
      const prepared = await this.preparePage(approvedAssets, source, viewport);
      try {
        if (source.output.format === "pdf") {
          await prepared.page.emulateMedia({ media: "print" });
        }
        return new Uint8Array(
          await prepared.page.screenshot({
            animations: "disabled",
            caret: "hide",
            fullPage,
            scale: "css",
            timeout: ScreenshotTimeoutMilliseconds,
            type: "png",
          }),
        );
      } catch (error) {
        lastFailure = error;
        if (!isRetryableScreenshotFailure(error) || attempt === ScreenshotAttemptLimit) throw error;
      } finally {
        await prepared.close();
      }
    }
    throw lastFailure;
  }

  private async preparePage(
    approvedAssets: readonly ApprovedBrowserAsset[],
    source: RenderSourceDocument,
    viewport = source.viewport,
  ): Promise<PreparedPage> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport });
    let routeFailure: string | undefined;
    await context.route("**/*", async (route) => {
      try {
        await this.fulfillApprovedRoute(route, approvedAssets, source);
      } catch (error) {
        routeFailure = error instanceof Error ? error.message : "Unknown render route failure";
        await route.abort("blockedbyclient");
      }
    });
    const page = await context.newPage();
    try {
      await page.goto("https://render.invalid/document", { waitUntil: "load" });
      await page.waitForFunction("document.fonts.status === 'loaded'");
      if (routeFailure !== undefined) throw new Error(routeFailure);
      await page.locator("img").evaluateAll(async (images) => {
        await Promise.all(
          images.map(async (image) => {
            if (
              !("decode" in image) ||
              typeof image.decode !== "function" ||
              !("complete" in image) ||
              !("naturalWidth" in image) ||
              !("naturalHeight" in image)
            ) {
              throw new Error("Approved render image selector returned a non-image element");
            }
            await image.decode();
            if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
              throw new Error("Approved render image did not decode");
            }
          }),
        );
      });
      if (routeFailure !== undefined) throw new Error(routeFailure);
    } catch (error) {
      await context.close();
      await browser.close();
      throw error;
    }
    return {
      page,
      close: async () => {
        await context.close();
        await browser.close();
      },
    };
  }

  private async fulfillApprovedRoute(
    route: Route,
    approvedAssets: readonly ApprovedBrowserAsset[],
    source: RenderSourceDocument,
  ): Promise<void> {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.origin === "https://render.invalid" &&
      requestUrl.pathname === "/document" &&
      requestUrl.search === "" &&
      route.request().method() === "GET" &&
      route.request().resourceType() === "document"
    ) {
      await route.fulfill({
        body: source.html,
        contentType: source.inputMimeType,
        headers: source.responseHeaders,
        status: 200,
      });
      return;
    }
    const asset = approvedAssets.find(
      (candidate) =>
        requestUrl.origin === "https://render.invalid" &&
        requestUrl.search === "" &&
        requestUrl.pathname ===
          `/media/${encodeURIComponent(candidate.assetRef)}/${candidate.sha256}` &&
        route.request().method() === "GET" &&
        route.request().resourceType() === "image",
    );
    if (asset === undefined || this.assetLoader === undefined) {
      throw new Error(
        `Renderer blocked an unapproved network request: ${requestUrl.origin}${requestUrl.pathname}`,
      );
    }
    const bytes = await this.assetLoader.load({
      assetRef: asset.assetRef,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
    });
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    if (actualSha256 !== asset.sha256) {
      throw new Error("Approved render asset bytes do not match the manifest checksum");
    }
    await assertSafeApprovedAssetBytes(bytes, asset);
    await route.fulfill({
      body: Buffer.from(bytes),
      contentType: asset.mimeType,
      headers: {
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
      status: 200,
    });
  }
}
