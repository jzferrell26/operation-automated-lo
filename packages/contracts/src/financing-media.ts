import { z } from "zod";
import { FinancingMoneySchema } from "./financing-comparison.js";

// Keep this leaf independent of campaign-foundation: its v2 manifest imports media.
// Same opaque-reference constraint as the existing campaign contract, without defaults.
const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
export const FINANCING_MEDIA_MAX_BYTES = 2_097_152;
export const FinancingMediaRefSchema = z.string().regex(/^media_[a-f0-9]{32}$/u);
export const FinancingImageMimeSchema = z.enum(["image/jpeg", "image/png"]);
export const FinancingRightsBasisSchema = z.enum(["owned", "licensed", "permission"]);
export const FinancingMediaRightsSchema = z
  .object({
    schemaVersion: z.literal(1),
    basis: FinancingRightsBasisSchema,
    confirmed: z.literal(true),
    attestedBy: OpaqueReferenceSchema,
    attestedAt: z.iso.datetime({ offset: true }),
    scope: z.literal("tenant-private-financing"),
  })
  .strict();
const Hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const FinancingMediaAltTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      Array.from(value).every((character) => {
        const point = character.codePointAt(0) ?? 0;
        return !(
          point < 32 ||
          (point >= 127 && point <= 159) ||
          (point >= 0x202a && point <= 0x202e) ||
          (point >= 0x2066 && point <= 0x2069)
        );
      }),
    "Use printable text.",
  );
const mediaFields = {
  mediaRef: FinancingMediaRefSchema,
  sha256: Hash,
  mimeType: FinancingImageMimeSchema,
  byteSize: z.number().int().min(1).max(FINANCING_MEDIA_MAX_BYTES),
  width: z.number().int().min(400).max(6000),
  height: z.number().int().min(400).max(6000),
  normalizationVersion: z.literal("1.0.0"),
  metadataRetained: z.literal(false),
  rights: FinancingMediaRightsSchema,
};
export const FinancingMediaSnapshotSchema = z
  .object({ ...mediaFields, altText: FinancingMediaAltTextSchema })
  .strict()
  .refine((value) => value.width * value.height <= 12_000_000);
export const FinancingMediaRecordSchema = z
  .object({
    ...mediaFields,
    locationRef: OpaqueReferenceSchema,
    createdBy: OpaqueReferenceSchema,
    requestId: z.uuid(),
    requestHash: Hash,
    sourceSha256: Hash,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (value) =>
      value.width * value.height <= 12_000_000 &&
      value.rights.attestedBy === value.createdBy &&
      value.rights.attestedAt === value.createdAt,
  );
export const FinancingMediaRevocationSchema = z
  .object({
    mediaRef: FinancingMediaRefSchema,
    revokedBy: OpaqueReferenceSchema,
    revokedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export const FinancingPropertyFactsSchema = z
  .object({
    listPriceMinor: FinancingMoneySchema.refine((value) => value > 0).nullable(),
    bedrooms: z.number().int().min(0).max(100).nullable(),
    bathroomsHundredths: z.number().int().min(0).max(10000).nullable(),
    floorAreaSqFt: z.number().int().min(1).max(1_000_000).nullable(),
    confirmed: z.literal(true),
  })
  .strict();
export const FinancingPropertyMediaSchema = z
  .array(FinancingMediaSnapshotSchema)
  .max(6)
  .refine((value) => new Set(value.map((item) => item.mediaRef)).size === value.length)
  .refine((value) => value.reduce((sum, item) => sum + item.byteSize, 0) <= 12_582_912);
export type FinancingImageMime = z.infer<typeof FinancingImageMimeSchema>;
export type FinancingRightsBasis = z.infer<typeof FinancingRightsBasisSchema>;
export type FinancingMediaRights = z.infer<typeof FinancingMediaRightsSchema>;
export type FinancingMediaRecord = z.infer<typeof FinancingMediaRecordSchema>;
export type FinancingMediaSnapshot = z.infer<typeof FinancingMediaSnapshotSchema>;
export type FinancingMediaRevocation = z.infer<typeof FinancingMediaRevocationSchema>;
export type FinancingPropertyFacts = z.infer<typeof FinancingPropertyFactsSchema>;
