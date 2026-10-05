import { z } from "zod";
import { OpaqueReferenceSchema } from "./campaign-foundation.js";

export const PROPERTY_PACKAGE_TEMPLATE_VERSION = "1.0.0";
export const PROPERTY_PACKAGE_MAX_BYTES = 1_500_000;
const HashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const outputEvidence = {
  sha256: HashSchema,
  byteSize: z.number().int().positive().max(PROPERTY_PACKAGE_MAX_BYTES),
};

/** Sealed private review outputs, not a publication or an approval record. */
export const PropertyCampaignPackageSchema = z
  .object({
    schemaVersion: z.literal(1),
    packageRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    sourceManifestHash: HashSchema,
    sourceVersionNo: z.number().int().positive(),
    templateVersion: z.literal(PROPERTY_PACKAGE_TEMPLATE_VERSION),
    generatedAt: z.iso.datetime({ offset: true }),
    generatedBy: OpaqueReferenceSchema,
    reviewOnly: z.literal(true),
    qrDestination: z.url().max(1500),
    outputs: z
      .object({
        page: z
          .object({
            ...outputEvidence,
            mimeType: z.literal("text/html"),
            content: z.string().min(1).max(100_000),
          })
          .strict(),
        flyer: z
          .object({
            ...outputEvidence,
            mimeType: z.literal("application/pdf"),
            base64: z
              .string()
              .min(8)
              .max(1_200_000)
              .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u),
            pageCount: z.number().int().min(1).max(12),
          })
          .strict(),
        qr: z
          .object({
            ...outputEvidence,
            mimeType: z.literal("image/svg+xml"),
            content: z.string().min(1).max(200_000),
          })
          .strict(),
        copy: z
          .object({
            ...outputEvidence,
            mimeType: z.literal("text/plain"),
            content: z.string().min(1).max(24_000),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export type PropertyCampaignPackage = z.infer<typeof PropertyCampaignPackageSchema>;
export const PropertyPackageOutputSchema = z.enum(["page", "flyer", "qr", "copy"]);
export type PropertyPackageOutput = z.infer<typeof PropertyPackageOutputSchema>;
export const PropertyPackageRequestSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    sourceManifestHash: HashSchema,
  })
  .strict();
export type PropertyPackageRequest = z.infer<typeof PropertyPackageRequestSchema>;

export const PropertyPackageSummarySchema = PropertyCampaignPackageSchema.pick({
  packageRef: true,
  campaignRef: true,
  campaignVersionRef: true,
  sourceManifestHash: true,
  sourceVersionNo: true,
  templateVersion: true,
  generatedAt: true,
  reviewOnly: true,
})
  .extend({
    pageCount: z.number().int().positive(),
    hashes: z
      .object({ page: HashSchema, flyer: HashSchema, qr: HashSchema, copy: HashSchema })
      .strict(),
  })
  .strict();
export type PropertyPackageSummary = z.infer<typeof PropertyPackageSummarySchema>;
export const PropertyPackageResponseSchema = z
  .object({
    package: PropertyPackageSummarySchema,
    providerPublicationAuthorized: z.literal(false),
  })
  .strict();
