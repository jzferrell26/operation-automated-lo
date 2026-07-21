import { createHash } from "node:crypto";

import { chromium, type Page, type Route } from "@playwright/test";
import type { ArtifactType, RenderManifest } from "@oalo/contracts";

import { inspectPdfBinary, PdfBinaryInspectionSchema } from "./render-evidence.js";
import type { BrowserOutput, DeterministicBrowserPort } from "./production-rendering.js";
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

const ScreenshotTimeoutMilliseconds = 15_000;
const ScreenshotAttemptLimit = 2;

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

  async render(
    input: Readonly<{
      manifest: RenderManifest;
      artifactType: ArtifactType;
      source: RenderSourceDocument;
      networkPolicy: "deny-all";
    }>,
  ): Promise<BrowserOutput> {
    if (input.networkPolicy !== "deny-all" || input.artifactType !== input.source.artifactType) {
      throw new Error(
        "Browser rendering requires a matching artifact type and denied network policy",
      );
    }
    if (input.source.output.format !== "html" && input.source.output.format !== "pdf") {
      return {
        bytes: await this.captureScreenshot(
          input.manifest,
          input.source,
          input.source.viewport,
          false,
        ),
        mimeType: "image/png",
        width: input.source.output.width,
        height: input.source.output.height,
      };
    }
    const prepared = await this.preparePage(input.manifest, input.source);
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
    return this.captureScreenshot(manifest, source, viewport, true);
  }

  private async captureScreenshot(
    manifest: RenderManifest,
    source: RenderSourceDocument,
    viewport: Readonly<{ width: number; height: number }>,
    fullPage: boolean,
  ): Promise<Uint8Array> {
    let lastFailure: unknown;
    for (let attempt = 1; attempt <= ScreenshotAttemptLimit; attempt += 1) {
      const prepared = await this.preparePage(manifest, source, viewport);
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
    manifest: RenderManifest,
    source: RenderSourceDocument,
    viewport = source.viewport,
  ): Promise<PreparedPage> {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport });
    let routeFailure: string | undefined;
    await context.route("**/*", async (route) => {
      try {
        await this.fulfillApprovedRoute(route, manifest, source);
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
    manifest: RenderManifest,
    source: RenderSourceDocument,
  ): Promise<void> {
    const requestUrl = new URL(route.request().url());
    if (
      requestUrl.origin === "https://render.invalid" &&
      requestUrl.pathname === "/document" &&
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
    const asset = manifest.assets.find(
      (candidate) =>
        requestUrl.origin === "https://render.invalid" &&
        requestUrl.pathname ===
          `/media/${encodeURIComponent(candidate.assetRef)}/${candidate.sha256}`,
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
    await route.fulfill({ body: Buffer.from(bytes), contentType: asset.mimeType, status: 200 });
  }
}
