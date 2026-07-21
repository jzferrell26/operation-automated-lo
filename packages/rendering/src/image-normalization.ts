import { createHash } from "node:crypto";

import { z } from "zod";

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
      .refine((value) => value.byteLength > 0 && value.byteLength <= 25 * 1024 * 1024, {
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
