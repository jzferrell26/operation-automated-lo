import { z } from "zod";

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const VersionSchema = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/u);

export const ArtifactTypeSchema = z.enum([
  "public-page-projection",
  "pdf",
  "qr",
  "meta-square",
  "meta-story",
]);

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const RenderManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    manifestRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    blueprintVersionRef: OpaqueReferenceSchema,
    profileVersions: z
      .object({
        brand: OpaqueReferenceSchema,
        compliance: OpaqueReferenceSchema,
        partner: OpaqueReferenceSchema,
        routing: OpaqueReferenceSchema,
      })
      .strict(),
    renderer: z.object({ id: z.literal("oalo-playwright"), version: VersionSchema }).strict(),
    browser: z.object({ id: z.literal("chromium"), version: z.string().min(1).max(40) }).strict(),
    template: z.object({ id: z.literal("open-house-boost"), version: VersionSchema }).strict(),
    fonts: z
      .array(
        z
          .object({
            family: z.string().trim().min(1).max(80),
            version: z.string().trim().min(1).max(40),
            sha256: Sha256Schema,
          })
          .strict(),
      )
      .min(1)
      .max(8),
    publicContent: z
      .object({
        headline: z.string().min(1).max(500),
        propertyAddress: z.string().min(1).max(1_000),
        propertyDescription: z.string().min(1).max(10_000),
        openHouseLabel: z.string().min(1).max(500),
        loanOfficerDisplayName: z.string().min(1).max(300),
        realtorDisplayName: z.string().min(1).max(300),
        disclosureBlocks: z.array(z.string().min(1).max(20_000)).min(1).max(12),
        callToActionLabel: z.string().min(1).max(160),
        destinationPath: z.string().regex(/^\/c\/[A-Za-z0-9_-]+$/u),
      })
      .strict(),
    assets: z
      .array(
        z
          .object({
            assetRef: OpaqueReferenceSchema,
            sha256: Sha256Schema,
            mimeType: z.enum(["image/jpeg", "image/png"]),
            width: z.number().int().min(400).max(10_000),
            height: z.number().int().min(400).max(10_000),
            approvalStatus: z.literal("approved"),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export type RenderManifest = z.infer<typeof RenderManifestSchema>;

export const ArtifactRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    artifactRef: OpaqueReferenceSchema,
    artifactType: ArtifactTypeSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    manifestRef: OpaqueReferenceSchema,
    blueprintVersionRef: OpaqueReferenceSchema,
    profileVersions: RenderManifestSchema.shape.profileVersions,
    rendererVersion: VersionSchema,
    browserVersion: z.string().min(1).max(40),
    templateVersion: VersionSchema,
    fontHashes: z.array(Sha256Schema).min(1).max(8),
    sha256: Sha256Schema,
    mimeType: z.enum(["text/html", "application/pdf", "image/png", "image/jpeg"]),
    byteSize: z
      .number()
      .int()
      .positive()
      .max(100 * 1024 * 1024),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    pageCount: z.number().int().positive().optional(),
    storageKey: z.string().min(1).max(1_024),
    status: z.literal("ready"),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type ArtifactRecord = z.infer<typeof ArtifactRecordSchema>;

export const PublishedCampaignProjectionSchema = z
  .object({
    schemaVersion: z.literal(1),
    publicCampaignId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/u),
    campaignVersionRef: OpaqueReferenceSchema,
    headline: z.string().min(1).max(500),
    propertyAddress: z.string().min(1).max(1_000),
    propertyDescription: z.string().min(1).max(10_000),
    openHouseLabel: z.string().min(1).max(500),
    loanOfficerDisplayName: z.string().min(1).max(300),
    realtorDisplayName: z.string().min(1).max(300),
    disclosureBlocks: z.array(z.string().min(1).max(20_000)).min(1).max(12),
    callToActionLabel: z.string().min(1).max(160),
    artifactUrls: z.partialRecord(ArtifactTypeSchema, z.url({ protocol: /^https$/u })),
    consentDisclosureVersion: OpaqueReferenceSchema,
    activeFrom: z.iso.datetime({ offset: true }),
    activeUntil: z.iso.datetime({ offset: true }),
  })
  .strict();

export type PublishedCampaignProjection = z.infer<typeof PublishedCampaignProjectionSchema>;

export const StorageTransferRequestSchema = z
  .object({
    schemaVersion: z.literal(1),
    direction: z.enum(["upload", "download"]),
    visibility: z.literal("private"),
    locationRef: OpaqueReferenceSchema,
    objectKey: z.string().min(1).max(1_024),
    contentType: z.enum(["image/jpeg", "image/png", "application/pdf"]),
    maximumBytes: z
      .number()
      .int()
      .positive()
      .max(25 * 1024 * 1024),
    expectedSha256: Sha256Schema,
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type StorageTransferRequest = z.infer<typeof StorageTransferRequestSchema>;
