import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { z } from "zod";
import {
  WebinarPublisherMediaReceiptSchema,
  WebinarPublisherPublicUrlSchema,
} from "@oalo/contracts";

import { assertWebinarPublisherProjection } from "./webinar-publisher-compiler.js";

const CrcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ CrcTable[(crc ^ byte) & 0xff]!;
  return (crc ^ 0xffffffff) >>> 0;
}

export function assertWebinarPublisherMediaUrl(
  url: string,
  allowedOrigins: readonly string[],
): string {
  const parsed = new URL(WebinarPublisherPublicUrlSchema.parse(url));
  // Only provider storage domains documented for media are accepted. Caller data cannot
  // expand the host allowlist to a private network or an arbitrary fetch target.
  if (
    !allowedOrigins.includes(parsed.origin) ||
    !["storage.googleapis.com", "files.leadconnectorhq.com"].includes(parsed.hostname) ||
    !/^\/[A-Za-z0-9_./-]+$/u.test(parsed.pathname) ||
    parsed.pathname.includes("..")
  )
    throw new Error("Webinar media origin is unqualified.");
  return parsed.toString();
}

export function assertWebinarPublisherPng(
  bytes: Uint8Array,
): Readonly<{ width: number; height: number }> {
  if (bytes.length < 45 || bytes.length > 25_000_000)
    throw new Error("Webinar PNG size is invalid.");
  const buffer = Buffer.from(bytes);
  if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error("Webinar media is not PNG.");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bits = 0;
  let channels = 0;
  let ended = false;
  const idats: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    if (length > buffer.length - offset - 12)
      throw new Error("Webinar PNG chunk exceeds its boundary.");
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (
      crc32(buffer.subarray(offset + 4, offset + 8 + length)) !==
      buffer.readUInt32BE(offset + 8 + length)
    )
      throw new Error("Webinar PNG checksum is invalid.");
    if (offset === 8 && type !== "IHDR") throw new Error("Webinar PNG header is missing.");
    if (type === "IHDR") {
      if (offset !== 8 || length !== 13) throw new Error("Webinar PNG header is invalid.");
      width = buffer.readUInt32BE(offset + 8);
      height = buffer.readUInt32BE(offset + 12);
      bits = buffer[offset + 16]!;
      channels =
        ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as Record<number, number>)[buffer[offset + 17]!] ?? 0;
      if (
        width !== 1080 ||
        height !== 1080 ||
        ![1, 2, 4, 8, 16].includes(bits) ||
        channels === 0 ||
        buffer[offset + 18] !== 0 ||
        buffer[offset + 19] !== 0 ||
        buffer[offset + 20] !== 0
      )
        throw new Error("Webinar PNG format is unsupported.");
    }
    if (["acTL", "fcTL", "fdAT"].includes(type))
      throw new Error("Animated webinar PNG is prohibited.");
    if (type === "IDAT") idats.push(buffer.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === "IEND") {
      if (length !== 0) throw new Error("Webinar PNG trailer is invalid.");
      ended = true;
      break;
    }
  }
  if (!ended || offset !== buffer.length || idats.length === 0)
    throw new Error("Webinar PNG is incomplete.");
  const stride = 1 + Math.ceil((width * channels * bits) / 8);
  const pixels = inflateSync(Buffer.concat(idats), { maxOutputLength: stride * height });
  if (pixels.length !== stride * height) throw new Error("Webinar PNG raster is incomplete.");
  for (let row = 0; row < height; row++)
    if (pixels[row * stride]! > 4) throw new Error("Webinar PNG raster filter is invalid.");
  return { width, height };
}

export function verifyWebinarPublisherMedia(
  input: Readonly<{
    projection: unknown;
    bytes: Uint8Array;
    url: string;
    fileId: string;
    allowedOrigins: readonly string[];
    now: string;
    expiresAt: string;
  }>,
) {
  const projection = assertWebinarPublisherProjection(input.projection);
  const url = assertWebinarPublisherMediaUrl(input.url, input.allowedOrigins);
  const dimensions = assertWebinarPublisherPng(input.bytes);
  const digest = createHash("sha256").update(input.bytes).digest("hex");
  if (
    digest !== projection.creative.digest ||
    input.bytes.length !== projection.creative.byteLength
  )
    throw new Error("Webinar PNG differs from the reviewed raster.");
  const receipt = WebinarPublisherMediaReceiptSchema.parse({
    schemaVersion: 1,
    projectionRef: projection.projectionRef,
    projectionHash: projection.projectionHash,
    assetRef: projection.creative.assetRef,
    digest,
    ...dimensions,
    byteLength: input.bytes.length,
    fileId: input.fileId,
    url,
    observedAt: input.now,
    expiresAt: input.expiresAt,
  });
  if (Date.parse(receipt.expiresAt) < Date.parse(projection.schedule.endsAt))
    throw new Error("Webinar media delivery ends too early.");
  return receipt;
}

export function webinarPublisherMultipart(
  input: Readonly<{ bytes: Uint8Array; name: string }>,
): FormData {
  assertWebinarPublisherPng(input.bytes);
  const name = z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,120}\.png$/u)
    .parse(input.name);
  const form = new FormData();
  form.set("hosted", "false");
  form.set("name", name);
  form.set("file", new Blob([Uint8Array.from(input.bytes)], { type: "image/png" }), name);
  return form;
}
