/**
 * PRD-009c D1. What an ads library art file is, judged from its bytes alone.
 *
 * The type is decided by the magic bytes, never the file name, so an SVG (or anything else) renamed
 * `.png` is refused. The pixel size is read from the file's own header. Every chunk or segment that
 * can carry EXIF, XMP, IPTC, an ICC profile, a timestamp, or free text is reported, so the schema
 * test (009C-AC-002) can refuse art that would publish a camera, a location, or an author's name
 * from a public repository.
 *
 * Pure: it parses a byte array and touches no file system.
 */

export type AdsLibraryArtType = "png" | "jpeg";

export type AdsLibraryArtInspection =
  | Readonly<{
      ok: true;
      type: AdsLibraryArtType;
      width: number;
      height: number;
      /** Chunk types (PNG) or segment names (JPEG) that carry metadata, in file order. */
      metadata: readonly string[];
    }>
  | Readonly<{ ok: false; reason: string }>;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** Chunks that carry pixels or colour handling and nothing about a person or a device. */
const PNG_ALLOWED_CHUNKS: ReadonlySet<string> = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "sBIT",
  "pHYs",
  "bKGD",
]);

function refused(reason: string): AdsLibraryArtInspection {
  return Object.freeze({ ok: false, reason });
}

function startsWith(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] ?? 0) * 0x1000000 +
      ((bytes[offset + 1] ?? 0) << 16) +
      ((bytes[offset + 2] ?? 0) << 8) +
      (bytes[offset + 3] ?? 0)) >>>
    0
  );
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] ?? 0) << 8) + (bytes[offset + 1] ?? 0);
}

function inspectPng(bytes: Uint8Array): AdsLibraryArtInspection {
  let offset: number = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let sawHeader = false;
  const metadata: string[] = [];
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const next = dataStart + length + 4;
    if (!/^[A-Za-z]{4}$/u.test(type) || next > bytes.length) {
      return refused("A PNG chunk is malformed or runs past the end of the file");
    }
    if (!sawHeader) {
      if (type !== "IHDR" || length !== 13) return refused("A PNG must start with its header");
      width = readUint32(bytes, dataStart);
      height = readUint32(bytes, dataStart + 4);
      sawHeader = true;
    }
    if (!PNG_ALLOWED_CHUNKS.has(type)) metadata.push(type);
    if (type === "IEND") {
      return Object.freeze({
        ok: true,
        type: "png",
        width,
        height,
        metadata: Object.freeze(metadata),
      });
    }
    offset = next;
  }
  return refused("A PNG must end with its end chunk");
}

/** SOF0 to SOF15, without DHT (C4), JPG (C8), and DAC (CC), which share the range. */
function isStartOfFrame(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
}

/** APP0 is JFIF and APP14 is Adobe's colour transform; every other application segment and COM can carry metadata. */
function jpegMetadataName(marker: number): string | undefined {
  if (marker === 0xfe) return "COM";
  if (marker >= 0xe0 && marker <= 0xef && marker !== 0xe0 && marker !== 0xee) {
    return `APP${String(marker - 0xe0)}`;
  }
  return undefined;
}

function inspectJpeg(bytes: Uint8Array): AdsLibraryArtInspection {
  let offset = 2;
  let width = 0;
  let height = 0;
  const metadata: string[] = [];
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return refused("A JPEG segment is malformed");
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break;
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2;
      continue;
    }
    const length = readUint16(bytes, offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) {
      return refused("A JPEG segment runs past the end of the file");
    }
    if (isStartOfFrame(marker)) {
      height = readUint16(bytes, offset + 5);
      width = readUint16(bytes, offset + 7);
    }
    const name = jpegMetadataName(marker);
    if (name !== undefined) metadata.push(name);
    offset += 2 + length;
  }
  if (width === 0 || height === 0) return refused("A JPEG must carry a frame header");
  return Object.freeze({
    ok: true,
    type: "jpeg",
    width,
    height,
    metadata: Object.freeze(metadata),
  });
}

export function inspectAdsLibraryArt(bytes: Uint8Array): AdsLibraryArtInspection {
  if (startsWith(bytes, PNG_SIGNATURE)) return inspectPng(bytes);
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return inspectJpeg(bytes);
  return refused("Only PNG and JPEG art is accepted, decided by the file's own bytes");
}

export function contentTypeForArt(type: AdsLibraryArtType): "image/png" | "image/jpeg" {
  return type === "png" ? "image/png" : "image/jpeg";
}
