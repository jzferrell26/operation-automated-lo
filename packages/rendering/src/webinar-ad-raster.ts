import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";

import { WebinarAdCampaignManifestSchema, type WebinarAdCampaignManifest } from "@oalo/contracts";
import sharp from "sharp";
import { z } from "zod";

/** Recipe changes require a new version. Frozen byte evidence additionally guards platform drift. */
export const WEBINAR_AD_RENDERER_VERSION = "1.0.0";
export const WEBINAR_AD_FONT_SHA256 =
  "f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947";
export const WEBINAR_AD_GLYPHS_SHA256 =
  "30678790e49b55a9e323cba9d40c184c14ff73449d2a77f288a310f546e9d996";
const runtime = Object.freeze({
  sharp: "0.35.5",
  vips: "8.18.7",
  pango: "1.58.2",
  harfbuzz: "14.5.0",
  freetype: "2.14.3",
});
const presets = Object.freeze({
  navy: "#1F3A5F",
  forest: "#1F5A3D",
  teal: "#0E5E6F",
  plum: "#5E2B6E",
  brick: "#9A3412",
  slate: "#334155",
});
const inputSchema = WebinarAdCampaignManifestSchema.pick({ template: true, advertiser: true })
  .extend({ disclosureText: WebinarAdCampaignManifestSchema.shape.content.shape.disclosureText })
  .strict();
export type WebinarAdRasterInput = z.infer<typeof inputSchema>;
export interface WebinarAdRasterAssets {
  readonly tall: Uint8Array;
  readonly square: Uint8Array;
  readonly fontFile: string;
  readonly glyphRanges: readonly (readonly [number, number])[];
}
export interface WebinarAdRasterOutput {
  readonly shape: "tall" | "square";
  readonly rendererVersion: string;
  readonly contentSha256: string;
  readonly width: 1080;
  readonly height: 1350 | 1080;
  readonly byteLength: number;
  readonly bytes: Uint8Array;
}
export class WebinarAdRasterError extends Error {
  constructor(
    readonly code:
      | "WEBINAR_ART_INVALID"
      | "WEBINAR_BRAND_DOES_NOT_FIT"
      | "WEBINAR_RENDER_UNAVAILABLE"
      | "WEBINAR_RENDER_BUSY"
      | "WEBINAR_RASTER_CHANGED",
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = "WebinarAdRasterError";
  }
}
export function webinarRasterSha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function buffer(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const pixelChunks = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
const colorChunks = new Set(["gAMA", "cHRM", "sRGB", "sBIT", "pHYs", "bKGD"]);
function chunks(bytes: Uint8Array): ReadonlyArray<Readonly<{ type: string; bytes: Buffer }>> {
  const data = buffer(bytes);
  if (!data.subarray(0, 8).equals(signature)) throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  const result = [];
  let offset = 8;
  while (offset + 12 <= data.length) {
    const length = data.readUInt32BE(offset);
    const next = offset + 12 + length;
    const type = data.toString("ascii", offset + 4, offset + 8);
    if (
      next > data.length ||
      !/^[A-Za-z]{4}$/u.test(type) ||
      (!result.length && (type !== "IHDR" || length !== 13))
    )
      throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
    result.push({ type, bytes: data.subarray(offset, next) });
    if (type === "IEND") {
      if (length !== 0 || next !== data.length)
        throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
      return result;
    }
    offset = next;
  }
  throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
}
/** Validate encoded structure and fully decode. No metadata or trailing payload is accepted. */
export async function verifyWebinarPanel(
  bytes: Uint8Array,
  sha256: string,
  height: 1080 | 842,
): Promise<void> {
  if (!bytes.byteLength || bytes.byteLength > 1024 * 1024 || webinarRasterSha256(bytes) !== sha256)
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  if (chunks(bytes).some(({ type }) => !pixelChunks.has(type) && !colorChunks.has(type)))
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  const image = sharp(buffer(bytes), {
    failOn: "warning",
    limitInputPixels: 1080 * 1080,
    animated: false,
  });
  const meta = await image.metadata();
  if (
    meta.format !== "png" ||
    meta.width !== 1080 ||
    meta.height !== height ||
    (meta.pages ?? 1) !== 1 ||
    meta.exif ||
    meta.icc ||
    meta.xmp ||
    meta.iptc
  )
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  await image.raw().toBuffer();
}
function escape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
interface TextBlock {
  readonly bytes: Buffer;
  readonly width: number;
  readonly height: number;
}
async function textBlock(
  value: string,
  size: number,
  width: number,
  fontFile: string,
  bold = false,
  color = "#061E35",
): Promise<TextBlock> {
  const rendered = await sharp({
    text: {
      text: `<span fallback="false" foreground="${color}" weight="${bold ? 700 : 400}">${escape(value)}</span>`,
      font: `AutomatedLOWebinarInter ${size}`,
      fontfile: fontFile,
      width,
      wrap: "word-char",
      align: "left",
      dpi: 72,
      rgba: true,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { bytes: rendered.data, width: rendered.info.width, height: rendered.info.height };
}
async function renderFooter(
  input: WebinarAdRasterInput,
  assets: WebinarAdRasterAssets,
  height: number,
): Promise<Buffer> {
  const advertiser = input.advertiser;
  const color = presets[advertiser.colorPresetId as keyof typeof presets];
  if (
    !color ||
    !advertiser.name ||
    !advertiser.company ||
    !advertiser.nmls ||
    !advertiser.companyNmls ||
    !input.disclosureText
  )
    throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  const values = [advertiser.name, advertiser.title, advertiser.company, input.disclosureText];
  for (const value of values) {
    if (
      /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}<>]/u.test(value) ||
      [...value].some(
        (character) =>
          !assets.glyphRanges.some(
            ([low, high]) => character.codePointAt(0)! >= low && character.codePointAt(0)! <= high,
          ),
      )
    )
      throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
  }
  const initials = advertiser.name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => [...word][0]?.toLocaleUpperCase("en") ?? "")
    .join("");
  // A fixed readable floor, complete identity and disclosures, never clamp or ellipsize.
  for (const nameSize of [42, 38, 34, 30, 28, 26, 24]) {
    const detailSize = Math.max(22, nameSize - 12);
    const name = await textBlock(advertiser.name, nameSize, 470, assets.fontFile, true);
    const detail = await textBlock(
      [advertiser.title, `NMLS ${advertiser.nmls}`].filter(Boolean).join(", "),
      detailSize,
      470,
      assets.fontFile,
    );
    const company = await textBlock(advertiser.company, detailSize, 340, assets.fontFile, true);
    const companyNmls = await textBlock(`NMLS ${advertiser.companyNmls}`, 22, 340, assets.fontFile);
    const disclosure = await textBlock(input.disclosureText, 24, 1004, assets.fontFile);
    const rowHeight = Math.max(
      88,
      name.height + 8 + detail.height,
      company.height + 8 + companyNmls.height,
    );
    if (
      rowHeight + disclosure.height + 12 + 52 > height ||
      [name, detail, company, companyNmls, disclosure].some((block) => block.width > 1004)
    )
      continue;
    const letter = await textBlock(initials, 40, 80, assets.fontFile, true, "#FFFFFF");
    if (letter.width > 80 || letter.height > 80)
      throw new WebinarAdRasterError("WEBINAR_BRAND_DOES_NOT_FIT");
    const tileSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88"><rect width="88" height="88" rx="15" fill="${color}"/></svg>`,
    );
    return sharp({ create: { width: 1080, height, channels: 4, background: "#FFFFFF" } })
      .composite([
        {
          input: await sharp({ create: { width: 1080, height: 8, channels: 4, background: color } })
            .png()
            .toBuffer(),
          top: 0,
          left: 0,
        },
        { input: tileSvg, top: 30, left: 38 },
        {
          input: letter.bytes,
          top: 30 + Math.floor((88 - letter.height) / 2),
          left: 38 + Math.floor((88 - letter.width) / 2),
        },
        { input: name.bytes, top: 30, left: 150 },
        { input: detail.bytes, top: 30 + name.height + 8, left: 150 },
        { input: company.bytes, top: 30, left: 1042 - company.width },
        { input: companyNmls.bytes, top: 30 + company.height + 8, left: 1042 - companyNmls.width },
        { input: disclosure.bytes, top: height - 22 - disclosure.height, left: 38 },
      ])
      .png()
      .toBuffer();
  }
  throw new WebinarAdRasterError("WEBINAR_BRAND_DOES_NOT_FIT");
}

// Fail fast instead of accumulating unbounded native render jobs in the process.
let inFlight = 0;
export async function renderWebinarAdRasters(
  inputValue: unknown,
  assets: WebinarAdRasterAssets,
): Promise<readonly [WebinarAdRasterOutput, WebinarAdRasterOutput]> {
  if (inFlight >= 2) throw new WebinarAdRasterError("WEBINAR_RENDER_BUSY");
  inFlight += 1;
  try {
    const input = inputSchema.parse(inputValue);
    if (
      !isAbsolute(assets.fontFile) ||
      webinarRasterSha256(await readFile(assets.fontFile)) !== WEBINAR_AD_FONT_SHA256 ||
      webinarRasterSha256(
        Buffer.from(
          `[\n${assets.glyphRanges.map((row) => `  ${JSON.stringify(row).replaceAll(",", ", ")}`).join(",\n")}\n]\n`,
        ),
      ) !== WEBINAR_AD_GLYPHS_SHA256 ||
      Object.entries(runtime).some(
        ([key, expected]) => Reflect.get(sharp.versions, key) !== expected,
      )
    )
      throw new WebinarAdRasterError("WEBINAR_RENDER_UNAVAILABLE");
    await verifyWebinarPanel(assets.tall, input.template.tallSha256, 1080);
    await verifyWebinarPanel(assets.square, input.template.squareSha256, 842);
    const results: WebinarAdRasterOutput[] = [];
    for (const shape of ["tall", "square"] as const) {
      const panelHeight = shape === "tall" ? 1080 : 842;
      const height = shape === "tall" ? 1350 : 1080;
      const footer = await renderFooter(input, assets, height - panelHeight);
      const encoded = await sharp({
        create: { width: 1080, height, channels: 4, background: "#FFFFFF" },
      })
        .composite([
          { input: buffer(assets[shape]), left: 0, top: 0 },
          { input: footer, left: 0, top: panelHeight },
        ])
        .png({ compressionLevel: 9, adaptiveFiltering: false, palette: false })
        .toBuffer();
      const bytes = Buffer.concat([
        signature,
        ...chunks(encoded)
          .filter(({ type }) => pixelChunks.has(type))
          .map((chunk) => chunk.bytes),
      ]);
      if (bytes.byteLength > 2 * 1024 * 1024) throw new WebinarAdRasterError("WEBINAR_ART_INVALID");
      results.push(
        Object.freeze({
          shape,
          rendererVersion: WEBINAR_AD_RENDERER_VERSION,
          contentSha256: webinarRasterSha256(bytes),
          width: 1080,
          height,
          byteLength: bytes.byteLength,
          bytes,
        }),
      );
    }
    return Object.freeze([results[0]!, results[1]!] as const);
  } catch (error) {
    if (error instanceof WebinarAdRasterError) throw error;
    throw new WebinarAdRasterError("WEBINAR_RENDER_UNAVAILABLE", { cause: error });
  } finally {
    inFlight -= 1;
  }
}
export function verifyFrozenWebinarRaster(
  output: WebinarAdRasterOutput,
  expected: WebinarAdCampaignManifest["images"][number],
): void {
  if (
    output.shape !== expected.shape ||
    output.rendererVersion !== expected.rendererVersion ||
    output.contentSha256 !== expected.contentSha256 ||
    output.width !== expected.width ||
    output.height !== expected.height ||
    output.byteLength !== expected.byteLength ||
    output.bytes.byteLength !== expected.byteLength ||
    webinarRasterSha256(output.bytes) !== expected.contentSha256
  )
    throw new WebinarAdRasterError("WEBINAR_RASTER_CHANGED");
}
