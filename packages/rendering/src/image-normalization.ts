import { createHash } from "node:crypto";

import sharp, { type Metadata } from "sharp";
import { z } from "zod";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_INPUT_PIXELS = 100_000_000;

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);

const UploadFileSchema = z
  .object({
    assetRef: OpaqueReferenceSchema,
    bytes: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength > 0 && value.byteLength <= MAX_UPLOAD_BYTES, {
        message: "Upload must be between one byte and 25 MiB",
      }),
    declaredMimeType: z.enum(["image/jpeg", "image/png"]),
  })
  .strict();

const UploadBatchSchema = z
  .object({
    schemaVersion: z.literal(1),
    locationRef: OpaqueReferenceSchema,
    files: z.array(UploadFileSchema).min(1).max(20),
  })
  .strict();

const DecodedImageSchema = z
  .object({
    bytes: z
      .instanceof(Uint8Array)
      .refine((value) => value.byteLength > 0 && value.byteLength <= 25 * 1024 * 1024),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    width: z.number().int().min(400).max(10_000),
    height: z.number().int().min(400).max(10_000),
    frameCount: z.literal(1),
    metadataRetained: z.literal(false),
  })
  .strict();

export interface ImageNormalizationPort {
  decodeAndReencode(
    input: Readonly<{
      bytes: Uint8Array;
      declaredMimeType: "image/jpeg" | "image/png";
      autoOrient: true;
      stripMetadata: true;
      preserveAnimation: false;
    }>,
  ): Promise<unknown>;
}

export interface NormalizedImage {
  readonly assetRef: string;
  readonly bytes: Uint8Array;
  readonly mimeType: "image/jpeg" | "image/png";
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly metadataRetained: false;
}

function formatMimeType(format: string | undefined): "image/jpeg" | "image/png" {
  if (format === "jpeg") {
    return "image/jpeg";
  }
  if (format === "png") {
    return "image/png";
  }
  throw new Error("Only decoded JPEG and PNG images are supported");
}

function containsRetainedMetadata(metadata: Metadata): boolean {
  return Boolean(
    metadata.exif ?? metadata.icc ?? metadata.iptc ?? metadata.xmp ?? metadata.tifftagPhotoshop,
  );
}

export class SharpImageNormalizationAdapter implements ImageNormalizationPort {
  async decodeAndReencode(
    input: Readonly<{
      bytes: Uint8Array;
      declaredMimeType: "image/jpeg" | "image/png";
      autoOrient: true;
      stripMetadata: true;
      preserveAnimation: false;
    }>,
  ): Promise<unknown> {
    const sourceBytes = Buffer.from(
      input.bytes.buffer,
      input.bytes.byteOffset,
      input.bytes.byteLength,
    );
    const processor = sharp(sourceBytes, {
      animated: false,
      autoOrient: input.autoOrient,
      failOn: "warning",
      limitInputPixels: MAX_INPUT_PIXELS,
      pages: 1,
      unlimited: false,
    });
    const sourceMetadata = await processor.metadata();
    const decodedMimeType = formatMimeType(sourceMetadata.format);
    if (decodedMimeType !== input.declaredMimeType) {
      throw new Error("Declared image MIME type does not match decoded content");
    }
    if ((sourceMetadata.pages ?? 1) !== 1) {
      throw new Error("Animated and multi-page images are not supported");
    }
    if (
      sourceMetadata.width === undefined ||
      sourceMetadata.height === undefined ||
      sourceMetadata.width > 10_000 ||
      sourceMetadata.height > 10_000
    ) {
      throw new Error("Decoded image dimensions are missing or exceed the approved limit");
    }

    const encoded =
      decodedMimeType === "image/jpeg"
        ? processor.jpeg({ mozjpeg: true, quality: 90 })
        : processor.png({ adaptiveFiltering: true, compressionLevel: 9 });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    if (data.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("Normalized image exceeds the 25 MiB output limit");
    }

    const outputMetadata = await sharp(data, {
      failOn: "warning",
      limitInputPixels: MAX_INPUT_PIXELS,
      pages: 1,
      unlimited: false,
    }).metadata();
    if (containsRetainedMetadata(outputMetadata)) {
      throw new Error("Normalized image retained disallowed metadata");
    }

    return {
      bytes: new Uint8Array(data),
      mimeType: formatMimeType(info.format),
      width: info.width,
      height: info.height,
      frameCount: 1,
      metadataRetained: false,
    };
  }
}

export async function normalizeUploadedImages(
  input: unknown,
  port: ImageNormalizationPort,
): Promise<readonly NormalizedImage[]> {
  const batch = UploadBatchSchema.parse(input);
  const normalized: NormalizedImage[] = [];
  for (const file of batch.files) {
    const decoded = DecodedImageSchema.parse(
      await port.decodeAndReencode({
        bytes: file.bytes,
        declaredMimeType: file.declaredMimeType,
        autoOrient: true,
        stripMetadata: true,
        preserveAnimation: false,
      }),
    );
    normalized.push(
      Object.freeze({
        assetRef: file.assetRef,
        bytes: decoded.bytes,
        mimeType: decoded.mimeType,
        width: decoded.width,
        height: decoded.height,
        sha256: createHash("sha256").update(decoded.bytes).digest("hex"),
        metadataRetained: decoded.metadataRetained,
      }),
    );
  }
  return Object.freeze(normalized);
}
