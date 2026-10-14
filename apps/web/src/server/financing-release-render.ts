import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Page } from "@playwright/test";
import sharp from "sharp";
import { raceWithAbort } from "@oalo/config";
import {
  canonicalCampaignHash as hash,
  type FinancingReleasePorts,
  type FinancingReleaseRenderInput,
} from "@oalo/application";
import {
  FinancingPublicMediaAuthorizationSchema,
  type FinancingReleaseAuthority,
} from "@oalo/contracts";
import {
  FINANCING_PUBLIC_FONT_HASH,
  FINANCING_PUBLIC_RENDERER,
  FinancingOutputError,
  financingReleaseHtml,
  outputAssert,
  outputDigest,
  outputRows,
  outputSections,
  publicMediaRef,
  validateFinancingOutputInput,
  type PublicOutputAsset,
} from "./financing-release-html.js";
import {
  assertFinancingPdfParity,
  assertFinancingPdfImages,
  inspectFinancingReleasePdf,
} from "./financing-release-pdf.js";

type MediaAuthorization = FinancingReleaseAuthority["mediaAuthorizations"][number];
let activeBrowsers = 0;
/** Decode the exact persisted bytes without transforming the approved image underneath its hash. */
export async function assertPublicFinancingNormalizedMedia(
  raw: MediaAuthorization,
  bytes: Uint8Array,
): Promise<Readonly<{ width: number; height: number }>> {
  const asset = FinancingPublicMediaAuthorizationSchema.parse(raw);
  outputAssert(
    asset.scope === "public-financing" &&
      asset.normalizationVersion === "1.0.0" &&
      asset.authority.contentHash === asset.sha256 &&
      asset.authority.channels.includes("site") &&
      asset.authority.channels.includes("pdf") &&
      bytes.byteLength === asset.byteSize &&
      outputDigest(bytes) === asset.sha256,
    "MEDIA",
  );
  try {
    const processor = sharp(Buffer.from(bytes), {
        animated: false,
        failOn: "warning",
        limitInputPixels: 12_000_000,
        pages: 1,
        unlimited: false,
      }),
      metadata = await processor.metadata();
    outputAssert(
      metadata.format === (asset.mimeType === "image/png" ? "png" : "jpeg") &&
        (metadata.pages ?? 1) === 1 &&
        metadata.width &&
        metadata.height &&
        metadata.width >= 400 &&
        metadata.height >= 400 &&
        metadata.width <= 6000 &&
        metadata.height <= 6000 &&
        !metadata.exif &&
        !metadata.icc &&
        !metadata.xmp &&
        !metadata.iptc &&
        !metadata.orientation,
      "MEDIA",
    );
    const pixels = await processor.raw().toBuffer();
    outputAssert(pixels.byteLength > 0 && pixels.byteLength <= 48_000_000, "MEDIA");
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    if (error instanceof FinancingOutputError) throw error;
    throw new FinancingOutputError("MEDIA");
  }
}
async function withOutputPage<T>(
  input: FinancingReleaseRenderInput,
  html: string,
  headers: Readonly<Record<string, string>>,
  assets: readonly PublicOutputAsset[],
  work: (page: Page) => Promise<T>,
): Promise<T> {
  outputAssert(activeBrowsers < 2, "LIMIT");
  activeBrowsers++;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true, timeout: 15000 });
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: {
        width: input.presentation.financing.scenarios.length > 3 ? 1056 : 816,
        height: 1056,
      },
      deviceScaleFactor: 1,
    });
    let denied = false;
    await context.route("**/*", async (route) => {
      const url = route.request().url(),
        req = route.request();
      if (
        url === input.canonicalUrl &&
        req.method() === "GET" &&
        req.resourceType() === "document"
      ) {
        await route.fulfill({ status: 200, contentType: "text/html", headers, body: html });
        return;
      }
      const asset = assets.find((a) => url === `${input.canonicalUrl}/media/${a.publicRef}`);
      if (asset && req.method() === "GET" && req.resourceType() === "image") {
        await route.fulfill({
          status: 200,
          body: Buffer.from(asset.bytes),
          contentType: asset.authorization.mimeType,
          headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" },
        });
        return;
      }
      denied = true;
      await route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(input.canonicalUrl, { waitUntil: "load", timeout: 15000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (const img of document.images) {
        await img.decode();
        if (img.naturalWidth === 0) throw new Error("Image failed");
      }
    });
    outputAssert(!denied, "MEDIA");
    const result = await work(page);
    outputAssert(!denied, "MEDIA");
    return result;
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      activeBrowsers--;
    }
  }
}
export interface PublicFinancingOutputDependencies {
  readonly readMedia: FinancingReleasePorts["readMedia"];
  /** Tests may provide the exact repository font bytes. Any substitution is rejected. */
  readonly fontBytes?: Uint8Array;
}
/** Concrete renderer and real-output extraction ports. No storage or source admission is inferred. */
export function createPublicFinancingOutputRenderer(
  dependencies: PublicFinancingOutputDependencies,
): Pick<FinancingReleasePorts, "render" | "assertOutputParity" | "assertNormalizedMedia"> {
  async function materialize(raw: FinancingReleaseRenderInput) {
    const input = validateFinancingOutputInput(raw),
      assets: PublicOutputAsset[] = [];
    const manifest = input.source.sourceVersion.manifest;
    const font =
      dependencies.fontBytes ??
      new Uint8Array(
        await readFile(
          resolve(
            process.cwd(),
            process.cwd().endsWith("web")
              ? "public/fonts/webinar/AutomatedLOWebinarInter.ttf"
              : "apps/web/public/fonts/webinar/AutomatedLOWebinarInter.ttf",
          ),
        ),
      );
    outputAssert(outputDigest(font) === FINANCING_PUBLIC_FONT_HASH, "INVALID");
    let total = 0;
    for (const [index, authorization] of input.source.authority.mediaAuthorizations.entries()) {
      const bytes = await dependencies.readMedia(authorization),
        dimensions = await assertPublicFinancingNormalizedMedia(authorization, bytes);
      total += bytes.byteLength;
      outputAssert(total <= 20_971_520, "LIMIT");
      const property =
        manifest.schemaVersion === 2
          ? manifest.property.media.find((a) => a.mediaRef === authorization.assetRef)
          : undefined;
      if (authorization.purpose === "property")
        outputAssert(
          property && property.width === dimensions.width && property.height === dimensions.height,
          "MEDIA",
        );
      assets.push({
        authorization,
        bytes,
        publicRef: publicMediaRef(input, index),
        alt:
          property?.altText ??
          `${authorization.purpose.startsWith("lender-") ? input.presentation.identities.lender.name : input.presentation.identities.realtor.name} ${authorization.purpose.endsWith("logo") ? "logo" : "headshot"}`,
        ...dimensions,
      });
    }
    return { input, assets, font };
  }
  return Object.freeze({
    async assertNormalizedMedia(asset, bytes) {
      await assertPublicFinancingNormalizedMedia(asset, bytes);
    },
    async render(raw) {
      const { input, assets, font } = await materialize(raw),
        source = financingReleaseHtml(input, assets, font);
      const pdf = await withOutputPage(
        input,
        source.html,
        source.headers,
        assets,
        async (page) =>
          new Uint8Array(
            await raceWithAbort(
              page.pdf({
                format: "Letter",
                preferCSSPageSize: true,
                printBackground: true,
                tagged: true,
                outline: false,
              }),
              AbortSignal.timeout(15000),
            ),
          ),
      );
      await inspectFinancingReleasePdf(pdf);
      return (
        [
          { kind: "site", mimeType: "text/html", bytes: new TextEncoder().encode(source.html) },
          { kind: "pdf", mimeType: "application/pdf", bytes: pdf },
        ] as const
      ).map((output) => ({
        ...output,
        artifactRef: `artifact_${outputDigest(`${hash(input)}:${output.kind}:${FINANCING_PUBLIC_RENDERER}`).slice(0, 32)}`,
        rendererVersion: FINANCING_PUBLIC_RENDERER,
        bindingHash: hash(input),
      }));
    },
    async assertOutputParity(raw, kind, bytes) {
      const { input, assets, font } = await materialize(raw);
      if (kind === "pdf") {
        await assertFinancingPdfParity(input, bytes);
        await assertFinancingPdfImages(bytes, assets);
        const source = financingReleaseHtml(input, assets, font);
        const visible = await withOutputPage(
          input,
          source.html,
          source.headers,
          assets,
          async (page) => {
            await page.emulateMedia({ media: "print" });
            return page.locator("body").innerText();
          },
        );
        const inspection = await inspectFinancingReleasePdf(bytes),
          extracted = inspection.text;
        // Chromium can paint multi-column blocks in visual order rather than DOM order.
        // Exact field/row checks above retain meaning; the glyph inventory also refuses
        // unexplained additional or omitted text without pretending to verify layout.
        const compact = (value: string) => value.normalize("NFC").replace(/\s+/gu, "");
        const heading = compact(
          `Compare your options${input.presentation.financing.scenarios.map((s) => s.label).join("")}`,
        );
        const repeats = compact(extracted).split(heading).length - 1;
        outputAssert(repeats >= 3 && repeats <= 3 + inspection.pageCount);
        const glyphs = (value: string) =>
          Array.from(compact(value).replaceAll(heading, "")).toSorted().join("");
        outputAssert(glyphs(extracted) === glyphs(visible));
        return;
      }
      outputAssert(bytes.byteLength <= 2_097_152, "LIMIT");
      const html = new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        source = financingReleaseHtml(input, assets, font);
      // Strong structural equality complements actual DOM extraction. Extra nodes, altered CSS,
      // links, image substitutions and injected active content cannot hide behind matching rows.
      outputAssert(html === source.html);
      await withOutputPage(input, html, source.headers, assets, async (page) => {
        const actual = await page.evaluate(() => ({
          fields: Array.from(document.querySelectorAll("[data-field]")).map((el) => ({
            key: el.getAttribute("data-field"),
            text: el.textContent ?? "",
          })),
          rows: Array.from(document.querySelectorAll("[data-row]")).map((el) =>
            Array.from(el.children).map((c) => c.textContent ?? ""),
          ),
          canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href,
          selectedConsent:
            document.querySelector<HTMLInputElement>('input[name="consent"]')?.checked,
          font: document.fonts.check("16px PublicInter"),
        }));
        outputAssert(
          hash(actual.fields.toSorted((a, b) => (a.key ?? "").localeCompare(b.key ?? ""))) ===
            hash(outputSections(input).toSorted((a, b) => a.key.localeCompare(b.key))) &&
            hash(actual.rows) ===
              hash(outputRows(input).flatMap((g) => g.rows.map((r) => [r.label, ...r.values]))) &&
            actual.canonical === input.canonicalUrl &&
            actual.selectedConsent === false &&
            actual.font,
        );
      });
    },
  });
}
