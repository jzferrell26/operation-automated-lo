import { crc32 } from "node:zlib";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { inspectAdsLibraryArt } from "../../../../apps/web/src/features/ads-library/server/art-file.js";

/**
 * PRD-009c D1 and 009C-AC-002. Art is judged by its bytes: the type by its magic bytes, the size by
 * its own header, and any EXIF, XMP, IPTC, or PNG text metadata is reported so a test can refuse it.
 */

async function png(width = 40, height = 30): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#2f6fed" } })
    .png()
    .toBuffer();
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, checksum]);
}

/** Inserts a chunk right after IHDR, which is where an editor would put a text chunk. */
function withChunk(source: Buffer, type: string, data: Buffer): Buffer {
  const afterHeader = 8 + 4 + 4 + 13 + 4;
  return Buffer.concat([
    source.subarray(0, afterHeader),
    chunk(type, data),
    source.subarray(afterHeader),
  ]);
}

describe("ads library art inspection", () => {
  it("reads a PNG's type and size from its own header and finds no metadata", async () => {
    expect(inspectAdsLibraryArt(await png(40, 30))).toEqual({
      ok: true,
      type: "png",
      width: 40,
      height: 30,
      metadata: [],
    });
  });

  it("reads a JPEG's type and size and finds no metadata in a stripped file", async () => {
    const jpeg = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#fff" } })
      .jpeg()
      .toBuffer();
    expect(inspectAdsLibraryArt(jpeg)).toEqual({
      ok: true,
      type: "jpeg",
      width: 64,
      height: 48,
      metadata: [],
    });
  });

  it("reports EXIF in a JPEG and text, XMP, and EXIF chunks in a PNG", async () => {
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#fff" } })
      .jpeg()
      .withExif({ IFD0: { Copyright: "Somebody" } })
      .toBuffer();
    const jpegResult = inspectAdsLibraryArt(jpeg);
    expect(jpegResult.ok && jpegResult.metadata).toContain("APP1");

    const source = await png();
    const text = inspectAdsLibraryArt(withChunk(source, "tEXt", Buffer.from("Author\0Somebody")));
    expect(text.ok && text.metadata).toEqual(["tEXt"]);
    const xmp = inspectAdsLibraryArt(
      withChunk(source, "iTXt", Buffer.from("XML:com.adobe.xmp\0\0\0\0\0<x/>")),
    );
    expect(xmp.ok && xmp.metadata).toEqual(["iTXt"]);
    const exif = inspectAdsLibraryArt(withChunk(source, "eXIf", Buffer.from("MM\0*")));
    expect(exif.ok && exif.metadata).toEqual(["eXIf"]);
    const time = inspectAdsLibraryArt(withChunk(source, "tIME", Buffer.alloc(7)));
    expect(time.ok && time.metadata).toEqual(["tIME"]);
  });

  it("refuses SVG, GIF, WebP, text, and truncated or malformed files", async () => {
    const source = await png();
    for (const [label, bytes] of [
      ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
      ["xml svg", Buffer.from('<?xml version="1.0"?><svg/>')],
      ["gif", Buffer.from("GIF89a\u0001\u0000\u0001\u0000", "latin1")],
      ["webp", Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ", "latin1")],
      ["empty", Buffer.alloc(0)],
      ["truncated png", source.subarray(0, 20)],
      ["png without end", source.subarray(0, source.length - 12)],
      [
        "corrupted chunk length",
        Buffer.concat([source.subarray(0, 8), Buffer.from([0xff, 0xff, 0xff, 0xff])]),
      ],
      ["jpeg with no frame", Buffer.from([0xff, 0xd8, 0xff, 0xd9])],
    ] as const) {
      expect(inspectAdsLibraryArt(bytes).ok, label).toBe(false);
    }
  });
});
