import { inflateSync } from "node:zlib";
import sharp from "sharp";
import {
  PDFDocument,
  PDFArray,
  PDFDict,
  PDFHexString,
  PDFName,
  PDFNumber,
  PDFParser,
  PDFRawStream,
  PDFRef,
  PDFString,
  type PDFObject,
} from "pdf-lib";
import type { FinancingReleaseRenderInput } from "@oalo/application";
import {
  FinancingOutputError,
  outputAssert,
  outputRows,
  outputSections,
  validateFinancingOutputInput,
  outputDigest,
  type PublicOutputAsset,
} from "./financing-release-html.js";

const name = (value: string) => PDFName.of(value);
const MAX_STREAM = 8 * 1024 * 1024;
const normalized = (value: string) => value.normalize("NFC").replace(/\s+/gu, "");
/** pdf-lib 1.17.1's name decoder omits lowercase hex escapes and its dictionary Map
 * discards duplicate keys. Preflight syntax through an instance-local parser before
 * either lossy operation. Our actual Chromium subset needs no escaped names or object
 * streams. Strings and bounded, length-delimited binary streams remain parser-owned. */
class QualifiedFinancingPdfParser extends PDFParser {
  private depth = 0;
  private tokens = 0;
  private readonly dictionaries: { depth: number; keys: Set<string> }[] = [];
  override parseObject(): PDFObject {
    outputAssert(++this.depth <= 64 && ++this.tokens <= 200000, "LIMIT");
    try {
      return super.parseObject();
    } finally {
      this.depth--;
    }
  }
  protected override parseName(): PDFName {
    const start = this.bytes.offset(),
      parsed = super.parseName(),
      raw = this.bytes.slice(start, this.bytes.offset());
    outputAssert(raw.length <= 1024 && ++this.tokens <= 200000, "LIMIT");
    outputAssert(!raw.includes(0x23));
    const dictionary = this.dictionaries.at(-1);
    if (dictionary?.depth === this.depth) {
      const key = parsed.asString();
      outputAssert(!dictionary.keys.has(key));
      dictionary.keys.add(key);
    }
    return parsed;
  }
  protected override parseDict(): PDFDict {
    this.dictionaries.push({ depth: this.depth, keys: new Set() });
    try {
      return super.parseDict();
    } finally {
      this.dictionaries.pop();
    }
  }
  protected override parseDictOrStream() {
    const object = super.parseDictOrStream();
    const dictionary = object instanceof PDFDict ? object : object.dict;
    const type = dictionary.get(name("Type"));
    if (!(object instanceof PDFDict)) outputAssert(type === undefined || type instanceof PDFName);
    outputAssert(type !== name("ObjStm") && type !== name("XRef"));
    return object;
  }
  protected override findEndOfStreamFallback(): number {
    // Inexact/indirect lengths and damaged delimiters are outside the producer subset.
    throw new FinancingOutputError("PARITY");
  }
}
function streamBytes(stream: PDFRawStream, maximum = MAX_STREAM): Uint8Array {
  const filter = stream.dict.lookup(name("Filter"));
  outputAssert(
    !stream.dict.has(name("DecodeParms")) &&
      (!(filter instanceof PDFName) || filter.asString() === "/FlateDecode"),
  );
  outputAssert(filter === undefined || filter instanceof PDFName);
  try {
    const bytes = filter
      ? inflateSync(stream.contents, { maxOutputLength: maximum })
      : stream.contents;
    outputAssert(bytes.length <= maximum, "LIMIT");
    return bytes;
  } catch (error) {
    if (error instanceof FinancingOutputError) throw error;
    throw new FinancingOutputError("PARITY");
  }
}
function unicode(hex: string): string {
  outputAssert(hex.length % 4 === 0 && /^[0-9a-f]*$/iu.test(hex));
  return Array.from({ length: hex.length / 4 }, (_, i) =>
    String.fromCharCode(Number.parseInt(hex.slice(i * 4, i * 4 + 4), 16)),
  ).join("");
}
/** Finite Chromium Type0/Type3 CMaps only. Unsupported structures fail closed. */
function glyphMap(stream: PDFRawStream): Map<string, string> {
  const body = Buffer.from(streamBytes(stream)).toString("latin1"),
    result = new Map<string, string>();
  for (const block of body.matchAll(/beginbfchar([\s\S]*?)endbfchar/gu)) {
    for (const pair of block[1]!.matchAll(/<([0-9a-f]{2}|[0-9a-f]{4})>\s*<([0-9a-f]+)>/giu))
      result.set(pair[1]!.toUpperCase(), unicode(pair[2]!));
  }
  for (const block of body.matchAll(/beginbfrange([\s\S]*?)endbfrange/gu)) {
    for (const range of block[1]!.matchAll(
      /<([0-9a-f]{2}|[0-9a-f]{4})>\s*<([0-9a-f]{2}|[0-9a-f]{4})>\s*(<([0-9a-f]{4})>|\[([^\]]+)\])/giu,
    )) {
      const first = Number.parseInt(range[1]!, 16),
        last = Number.parseInt(range[2]!, 16);
      outputAssert(last >= first && last - first <= 4096);
      const values = range[5]
        ? [...range[5].matchAll(/<([0-9a-f]+)>/giu)].map((x) => unicode(x[1]!))
        : null;
      outputAssert(values === null || values.length === last - first + 1);
      for (let glyph = first; glyph <= last; glyph++)
        result.set(
          glyph.toString(16).toUpperCase().padStart(range[1]!.length, "0"),
          values
            ? values[glyph - first]!
            : String.fromCharCode(Number.parseInt(range[4]!, 16) + glyph - first),
        );
    }
  }
  outputAssert(result.size > 0 && result.size <= 10000);
  return result;
}
export interface FinancingPdfInspection {
  readonly pageCount: number;
  readonly text: string;
  readonly links: readonly string[];
  readonly imageCount: number;
}
/** Scan actual object dictionaries, including inline descendants. /S also denotes ordinary
 * structure types, so only typed actions and action-bearing /A or /PA values enter this policy.
 * No action chain or extra action behavior is part of this renderer's qualified PDF subset. */
function assertInertPdfObjectGraph(
  pdf: PDFDocument,
  objects: readonly (readonly [PDFRef, PDFObject])[],
): string[] {
  const visited = new WeakSet<PDFObject>(),
    actions = new WeakSet<PDFDict>(),
    links = new Set<string>();
  const pending: { value: PDFObject; depth: number }[] = objects.map(([, value]) => ({
    value,
    depth: 0,
  }));
  let inspected = 0;
  function action(raw: PDFObject | undefined) {
    outputAssert(raw instanceof PDFDict);
    if (actions.has(raw)) return;
    actions.add(raw);
    outputAssert(raw.keys().every((key) => ["/Type", "/S", "/URI"].includes(key.asString())));
    const type = raw.lookup(name("Type")),
      kind = raw.lookup(name("S")),
      uri = raw.lookup(name("URI"));
    outputAssert(type === undefined || (type instanceof PDFName && type.asString() === "/Action"));
    outputAssert(
      kind instanceof PDFName &&
        kind.asString() === "/URI" &&
        (uri instanceof PDFString || uri instanceof PDFHexString),
    );
    const destination = uri.decodeText();
    outputAssert(
      destination.length <= 2000 &&
        /^https:\/\/[^/@#?]+\/p\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu.test(
          destination,
        ),
    );
    links.add(destination);
  }
  while (pending.length) {
    const item = pending.pop()!;
    const value = item.value instanceof PDFRef ? pdf.context.lookup(item.value) : item.value;
    outputAssert(value !== undefined);
    if (visited.has(value)) continue;
    outputAssert(item.depth <= 64 && ++inspected <= 200000, "LIMIT");
    visited.add(value);
    const dictionary =
      value instanceof PDFRawStream ? value.dict : value instanceof PDFDict ? value : undefined;
    if (dictionary) {
      outputAssert(
        ![
          "OpenAction",
          "AA",
          "AcroForm",
          "JavaScript",
          "JS",
          "EmbeddedFiles",
          "RichMediaContent",
          "Launch",
          "PresSteps",
        ].some((key) => dictionary.has(name(key))),
      );
      const type = dictionary.lookup(name("Type"));
      if (type instanceof PDFName && type.asString() === "/Action") action(dictionary);
      for (const [key, child] of dictionary.entries()) {
        const resolved = child instanceof PDFRef ? pdf.context.lookup(child) : child;
        outputAssert(resolved !== undefined);
        if (
          ["/A", "/PA"].includes(key.asString()) &&
          resolved instanceof PDFDict &&
          resolved.has(name("S"))
        )
          action(resolved);
        pending.push({ value: child, depth: item.depth + 1 });
      }
    } else if (value instanceof PDFArray) {
      for (const child of value.asArray()) pending.push({ value: child, depth: item.depth + 1 });
    }
    outputAssert(pending.length <= 200000, "LIMIT");
  }
  return [...links];
}
/** Inspect real parsed page streams and annotations, never metadata containing a request echo. */
export async function inspectFinancingReleasePdf(
  bytes: Uint8Array,
): Promise<FinancingPdfInspection> {
  outputAssert(bytes.byteLength > 0 && bytes.byteLength <= 20_971_520, "LIMIT");
  const binary = Buffer.from(bytes).toString("latin1");
  outputAssert(
    binary.startsWith("%PDF-") &&
      /%%EOF\s*$/u.test(binary) &&
      !/\/(?:Encrypt|ObjStm)\b/u.test(binary),
  );
  let pdf: PDFDocument;
  try {
    await new QualifiedFinancingPdfParser(bytes, 100, true).parseDocument();
    pdf = await PDFDocument.load(bytes, {
      updateMetadata: false,
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    });
  } catch {
    throw new FinancingOutputError("PARITY");
  }
  outputAssert(!pdf.isEncrypted && pdf.getPageCount() > 0 && pdf.getPageCount() <= 64, "LIMIT");
  const objects = pdf.context.enumerateIndirectObjects();
  outputAssert(objects.length <= 20000, "LIMIT");
  const links = assertInertPdfObjectGraph(pdf, objects),
    texts: string[] = [];
  let imageCount = 0,
    totalDecoded = 0;
  for (const [, object] of objects) {
    const dict =
      object instanceof PDFRawStream ? object.dict : object instanceof PDFDict ? object : null;
    if (!dict) continue;
    const subtype = dict.lookup(name("Subtype"));
    if (subtype instanceof PDFName && subtype.asString() === "/Image") imageCount++;
  }
  for (const page of pdf.getPages()) {
    for (const reference of page.node.Annots()?.asArray() ?? []) {
      const annotation = pdf.context.lookup(reference);
      outputAssert(annotation instanceof PDFDict);
      const subtype = annotation.lookup(name("Subtype"));
      outputAssert(subtype instanceof PDFName && subtype.asString() === "/Link");
      const action = annotation.lookup(name("A"));
      outputAssert(action instanceof PDFDict);
      const actionKind = action.lookup(name("S"));
      outputAssert(actionKind instanceof PDFName && actionKind.asString() === "/URI");
      const uri = action.lookup(name("URI"));
      outputAssert(uri instanceof PDFString || uri instanceof PDFHexString);
    }
    const resources = page.node.Resources();
    outputAssert(resources instanceof PDFDict);
    const fonts = resources.lookup(name("Font"));
    outputAssert(fonts instanceof PDFDict);
    const maps = new Map<string, Map<string, string>>();
    for (const [fontName, ref] of fonts.entries()) {
      const font = pdf.context.lookup(ref);
      outputAssert(font instanceof PDFDict);
      const fontType = font.lookup(name("Subtype"));
      outputAssert(
        fontType instanceof PDFName && ["/Type0", "/Type3"].includes(fontType.asString()),
      );
      const cmap = font.lookup(name("ToUnicode"));
      outputAssert(cmap instanceof PDFRawStream);
      maps.set(fontName.asString(), glyphMap(cmap));
    }
    const content = page.node.Contents();
    const streams: (PDFObject | undefined)[] =
      content instanceof PDFArray
        ? content.asArray().map((x) => pdf.context.lookup(x))
        : content
          ? [content]
          : [];
    outputAssert(streams.length > 0 && streams.length <= 128);
    let font: string | undefined;
    for (const item of streams) {
      outputAssert(item instanceof PDFRawStream);
      const decoded = streamBytes(item);
      totalDecoded += decoded.length;
      outputAssert(totalDecoded <= 32 * 1024 * 1024, "LIMIT");
      const operators = Buffer.from(decoded).toString("latin1");
      outputAssert(!/\([^)]*\)\s*(?:Tj|'|")/u.test(operators));
      for (const token of operators.matchAll(
        /(\/[A-Za-z0-9]+)\s+[\d.]+\s+Tf|<([0-9a-f]+)>\s*Tj|\[([^\]]*)\]\s*TJ/giu,
      )) {
        if (token[1]) {
          font = token[1];
          continue;
        }
        outputAssert(font && maps.has(font));
        const chunks = token[2]
          ? [token[2]]
          : [...token[3]!.matchAll(/<([0-9a-f]+)>/giu)].map((x) => x[1]!);
        outputAssert(chunks.length > 0);
        for (const chunk of chunks) {
          const width = maps.get(font)!.keys().next().value?.length;
          outputAssert(width === 2 || width === 4);
          outputAssert(chunk.length % width === 0);
          let value = "";
          for (let i = 0; i < chunk.length; i += width) {
            const glyph = maps.get(font)!.get(chunk.slice(i, i + width).toUpperCase());
            outputAssert(glyph !== undefined);
            value += glyph;
          }
          texts.push(value);
        }
      }
    }
  }
  outputAssert(texts.length > 0);
  return { pageCount: pdf.getPageCount(), text: texts.join(""), links, imageCount };
}
export async function assertFinancingPdfParity(
  input: FinancingReleaseRenderInput,
  bytes: Uint8Array,
): Promise<void> {
  validateFinancingOutputInput(input);
  const actual = await inspectFinancingReleasePdf(bytes),
    text = normalized(actual.text);
  outputAssert(
    actual.links.length > 0 && actual.links.every((link) => link === input.canonicalUrl),
  );
  for (const field of outputSections(input)) outputAssert(text.includes(normalized(field.text)));
  for (const group of outputRows(input)) {
    outputAssert(text.includes(normalized(group.title)));
    for (const row of group.rows)
      outputAssert(text.includes(normalized(`${row.label}${row.values.join("")}`)));
  }
}

/** Inspect drawn image XObjects in their actual page paint order. Comparing only a request's
 * hashes, the count of images, or unreferenced image objects would miss substitutions. */
export async function assertFinancingPdfImages(
  bytes: Uint8Array,
  assets: readonly PublicOutputAsset[],
): Promise<void> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const painted: string[] = [];
  let totalPixels = 0;
  async function imageHash(image: PDFRawStream): Promise<string> {
    const width = image.dict.lookup(name("Width")),
      height = image.dict.lookup(name("Height")),
      depth = image.dict.lookup(name("BitsPerComponent"));
    outputAssert(
      width instanceof PDFNumber &&
        height instanceof PDFNumber &&
        depth instanceof PDFNumber &&
        depth.asNumber() === 8,
      "MEDIA",
    );
    const w = width.asNumber(),
      h = height.asNumber();
    totalPixels += w * h;
    outputAssert(
      Number.isInteger(w) &&
        Number.isInteger(h) &&
        w > 0 &&
        h > 0 &&
        w * h <= 12_000_000 &&
        totalPixels <= 120_000_000,
      "LIMIT",
    );
    const filter = image.dict.lookup(name("Filter"));
    let rgb: Uint8Array;
    if (filter instanceof PDFName && filter.asString() === "/DCTDecode") {
      rgb = new Uint8Array(
        await sharp(Buffer.from(image.contents), {
          limitInputPixels: 12_000_000,
          failOn: "warning",
        })
          .removeAlpha()
          .toColourspace("srgb")
          .raw()
          .toBuffer(),
      );
    } else {
      const space = image.dict.lookup(name("ColorSpace"));
      let channels: number;
      if (space instanceof PDFName && ["/DeviceRGB", "/DeviceGray"].includes(space.asString()))
        channels = space.asString() === "/DeviceRGB" ? 3 : 1;
      else {
        outputAssert(
          space instanceof PDFArray &&
            space.size() === 2 &&
            space.lookup(0, PDFName).asString() === "/ICCBased",
          "MEDIA",
        );
        const profile = space.lookup(1);
        outputAssert(
          profile instanceof PDFRawStream &&
            profile.dict.lookup(name("N"), PDFNumber).asNumber() === 3 &&
            outputDigest(streamBytes(profile)) ===
              "d9f822e8083f2f4d1c91e887454be5f75e8c7144b2853408f361e3c4a7a6b36d",
          "MEDIA",
        );
        channels = 3;
      }
      const raw = streamBytes(image, 48_000_000);
      outputAssert(raw.length === w * h * channels, "MEDIA");
      rgb = new Uint8Array(w * h * 3);
      for (let pixel = 0; pixel < w * h; pixel++)
        for (let c = 0; c < 3; c++)
          rgb[pixel * 3 + c] = raw[pixel * channels + (channels === 1 ? 0 : c)]!;
      const mask = image.dict.lookup(name("SMask"));
      if (mask !== undefined) {
        outputAssert(mask instanceof PDFRawStream, "MEDIA");
        const alpha = streamBytes(mask, 12_000_000);
        outputAssert(alpha.length === w * h, "MEDIA");
        for (let pixel = 0; pixel < w * h; pixel++)
          for (let c = 0; c < 3; c++)
            rgb[pixel * 3 + c] = Math.round(
              (rgb[pixel * 3 + c]! * alpha[pixel]!) / 255 + 255 - alpha[pixel]!,
            );
      }
    }
    return `${w}:${h}:${outputDigest(rgb)}`;
  }
  async function visit(content: PDFRawStream, resources: PDFDict, level: number): Promise<void> {
    outputAssert(level <= 8, "LIMIT");
    const text = Buffer.from(streamBytes(content)).toString("latin1");
    for (const match of text.matchAll(/\/([A-Za-z0-9]+)\s+Do\b/gu)) {
      const objects = resources.lookup(name("XObject"));
      outputAssert(objects instanceof PDFDict, "MEDIA");
      const object = objects.lookup(name(match[1]!));
      outputAssert(object instanceof PDFRawStream, "MEDIA");
      const subtype = object.dict.lookup(name("Subtype"));
      outputAssert(subtype instanceof PDFName, "MEDIA");
      if (subtype.asString() === "/Image") painted.push(await imageHash(object));
      else {
        outputAssert(subtype.asString() === "/Form", "MEDIA");
        const nested = object.dict.lookup(name("Resources"));
        outputAssert(nested instanceof PDFDict, "MEDIA");
        await visit(object, nested, level + 1);
      }
      outputAssert(painted.length <= 10, "LIMIT");
    }
  }
  for (const page of pdf.getPages()) {
    const content = page.node.Contents(),
      resources = page.node.Resources();
    outputAssert(resources instanceof PDFDict);
    const streams =
      content instanceof PDFArray
        ? content.asArray().map((x) => pdf.context.lookup(x))
        : content
          ? [content]
          : [];
    for (const stream of streams) {
      outputAssert(stream instanceof PDFRawStream);
      await visit(stream, resources, 0);
    }
  }
  const expected: string[] = [];
  const ordered = [
    ...assets.filter((a) => a.authorization.purpose === "property"),
    ...assets.filter((a) => a.authorization.purpose.startsWith("partner-")),
    ...assets.filter((a) => a.authorization.purpose.startsWith("lender-")),
  ];
  for (const asset of ordered) {
    const raw = await sharp(Buffer.from(asset.bytes), {
      limitInputPixels: 12_000_000,
      failOn: "warning",
    })
      .flatten({ background: "#fff" })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer();
    expected.push(`${asset.width}:${asset.height}:${outputDigest(raw)}`);
  }
  outputAssert(JSON.stringify(painted) === JSON.stringify(expected), "MEDIA");
}
