import { z } from "zod";

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const ProfileTypeSchema = z.enum(["brand", "compliance", "partner", "routing"]);
export type ProfileType = z.infer<typeof ProfileTypeSchema>;

export const ProfileFieldSchema = z.enum([
  "brand_name",
  "brand_voice",
  "brand_tone",
  "brand_pattern",
  "brand_framework",
  "signature_language",
  "banned_language",
  "logo_asset_ref",
  "license_number",
  "nmls_id",
  "lender_name",
  "disclosure_text",
  "consent_text",
  "claim_policy",
  "realtor_name",
  "realtor_contact",
  "realtor_permission",
  "property_permission",
]);
export type ProfileField = z.infer<typeof ProfileFieldSchema>;

export const ProfileValueSchema = z
  .object({
    value: z.union([
      z.string().trim().min(1).max(20_000),
      z.array(z.string().trim().min(1).max(2_000)).min(1).max(100),
    ]),
    confirmation: z.enum(["user-confirmed", "imported-unconfirmed", "model-suggested"]),
    confirmedBy: OpaqueReferenceSchema.optional(),
    confirmedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((value, issue) => {
    const hasConfirmation = value.confirmedBy !== undefined && value.confirmedAt !== undefined;
    if (value.confirmation === "user-confirmed" && !hasConfirmation) {
      issue.addIssue({
        code: "custom",
        message: "User-confirmed values require actor and time evidence",
      });
    }
    if (value.confirmation !== "user-confirmed" && hasConfirmation) {
      issue.addIssue({
        code: "custom",
        message: "Unconfirmed values cannot carry confirmation evidence",
      });
    }
  });
export type ProfileValue = z.infer<typeof ProfileValueSchema>;

export const ProviderMappingSchema = z
  .object({
    mappingType: z.enum(["pipeline", "calendar", "user", "workflow", "field", "tag"]),
    providerRef: OpaqueReferenceSchema,
    displayLabel: z.string().trim().min(1).max(160),
    validationStatus: z.enum(["valid", "missing", "stale"]),
    validatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type ProviderMapping = z.infer<typeof ProviderMappingSchema>;

export const ProfileAssetSchema = z
  .object({
    assetRef: OpaqueReferenceSchema,
    storageKey: z.string().startsWith("locations/").max(1_024),
    mimeType: z.enum(["image/jpeg", "image/png"]),
    sha256: Sha256Schema,
    byteSize: z
      .number()
      .int()
      .positive()
      .max(25 * 1024 * 1024),
    width: z.number().int().min(400).max(10_000),
    height: z.number().int().min(400).max(10_000),
    metadataStripped: z.literal(true),
    visibility: z.literal("private"),
    approvalStatus: z.enum(["pending", "approved", "rejected", "quarantined"]),
  })
  .strict();
export type ProfileAsset = z.infer<typeof ProfileAssetSchema>;

export const ProfileAttestationSchema = z
  .object({
    actorRef: OpaqueReferenceSchema,
    attestedAt: z.iso.datetime({ offset: true }),
    valuesAuthorizedAndCurrent: z.literal(true),
    understandsNotLegalApproval: z.literal(true),
  })
  .strict();

export const ProfileVersionSchema = z
  .object({
    schemaVersion: z.literal(1),
    profileVersionRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    profileType: ProfileTypeSchema,
    versionNo: z.number().int().positive(),
    values: z.partialRecord(ProfileFieldSchema, ProfileValueSchema),
    providerMappings: z.array(ProviderMappingSchema).max(50),
    assets: z.array(ProfileAssetSchema).max(20),
    attestation: ProfileAttestationSchema.optional(),
    sourceVersionRef: OpaqueReferenceSchema.optional(),
    createdBy: OpaqueReferenceSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type ProfileVersion = z.infer<typeof ProfileVersionSchema>;

export const ProfileVersionInputSchema = ProfileVersionSchema.omit({
  versionNo: true,
  createdAt: true,
});
export type ProfileVersionInput = z.infer<typeof ProfileVersionInputSchema>;

export const ProfileReadinessContextSchema = z
  .object({
    blueprint: z.literal("open-house-boost"),
    stateCode: z.string().regex(/^[A-Z]{2}$/u),
    channels: z.array(z.enum(["public-page", "pdf", "meta", "email-sms", "ghl-routing"])).min(1),
    lenderRequiredFields: z.array(ProfileFieldSchema).max(30),
    policyRequiredFields: z.array(ProfileFieldSchema).max(30),
  })
  .strict();
export type ProfileReadinessContext = z.infer<typeof ProfileReadinessContextSchema>;

export const ProfileReadinessResultSchema = z
  .object({
    ready: z.boolean(),
    missingFields: z.array(ProfileFieldSchema),
    invalidMappings: z.array(ProviderMappingSchema.shape.mappingType),
    invalidAssetRefs: z.array(OpaqueReferenceSchema),
    blockingReasons: z.array(
      z.enum(["profile-type-missing", "attestation-missing", "approved-asset-missing"]),
    ),
    legalApprovalClaimed: z.literal(false),
  })
  .strict();
export type ProfileReadinessResult = z.infer<typeof ProfileReadinessResultSchema>;

export const BrandSuggestionFieldSchema = z.enum([
  "brand_voice",
  "brand_tone",
  "brand_pattern",
  "brand_framework",
  "signature_language",
  "banned_language",
]);
export type BrandSuggestionField = z.infer<typeof BrandSuggestionFieldSchema>;

export const BrandSuggestionSchema = z
  .object({
    suggestionRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    sourceProfileVersionRef: OpaqueReferenceSchema,
    field: BrandSuggestionFieldSchema,
    suggestedValue: z.string().trim().min(1).max(5_000),
    sourceRefs: z.array(OpaqueReferenceSchema).min(1).max(20),
    confidence: z.number().min(0).max(1),
    status: z.literal("proposed"),
    modelPolicyRef: OpaqueReferenceSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type BrandSuggestion = z.infer<typeof BrandSuggestionSchema>;

export const CompiledBrandRulesSchema = z
  .object({
    schemaVersion: z.literal(1),
    locationRef: OpaqueReferenceSchema,
    profileVersionRef: OpaqueReferenceSchema,
    promptSnapshot: z.string().min(1).max(40_000),
    deterministicRules: z.array(z.string().min(1).max(5_000)).max(200),
    contentHash: Sha256Schema,
  })
  .strict();
export type CompiledBrandRules = z.infer<typeof CompiledBrandRulesSchema>;
