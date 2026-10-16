import { z } from "zod";
import { CampaignVersionSchema, OpaqueReferenceSchema } from "./campaign-foundation.js";
import {
  FINANCING_CALCULATION_VERSION,
  FinancingIdentitySchema,
  FinancingInputSchema,
  FinancingResultsSchema,
  FinancingScenarioSchema,
} from "./financing-comparison.js";
import { FinancingPropertyFactsSchema } from "./financing-media.js";

const Ref = OpaqueReferenceSchema;
const Hash = z.string().regex(/^[a-f0-9]{64}$/u);
const Instant = z.iso.datetime({ offset: true });
const Text = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) =>
      Array.from(value).every((character) => {
        const point = character.codePointAt(0)!;
        return (
          point >= 32 &&
          !(point >= 127 && point <= 159) &&
          !(point >= 0x202a && point <= 0x202e) &&
          !(point >= 0x2066 && point <= 0x2069)
        );
      }),
    );
const Https = z
  .url({ protocol: /^https$/u })
  .max(2000)
  .refine((value) => /^https:\/\/[^/@#?]+(?:\/[^#]*)?$/u.test(value));
export const FINANCING_INQUIRY_POLICY_VERSION = "native-inquiry-30-days-v1" as const;
export const FinancingReleasePrincipalSchema = z
  .object({ locationRef: Ref, actorRef: Ref })
  .strict();
export const FinancingReleaseChannelSchema = z.enum(["site", "pdf", "qr-flyer"]);

/** Private immutable authority records. These are server-resolved, never request attestations. */
export const FinancingReleaseEvidenceSchema = z
  .object({
    recordRef: Ref,
    revisionRef: Ref,
    locationRef: Ref,
    contentHash: Hash,
    verificationRef: Ref,
    verifiedBy: Ref,
    verifiedAt: Instant,
    issuedAt: Instant,
    expiresAt: Instant,
    revokedAt: Instant.nullable(),
    channels: z.array(FinancingReleaseChannelSchema).min(1).max(3),
  })
  .strict()
  .refine(
    (value) =>
      Date.parse(value.expiresAt) > Date.parse(value.issuedAt) &&
      new Set(value.channels).size === value.channels.length,
  );
export const FinancingReleaseQuoteEvidenceSchema = z
  .object({
    scenarioId: z.uuid(),
    scenarioInputHash: Hash,
    permittedAssumptionsHash: Hash,
    authority: FinancingReleaseEvidenceSchema,
  })
  .strict();
export const FinancingPublicMediaAuthorizationSchema = z
  .object({
    assetRef: Ref,
    sha256: Hash,
    byteSize: z.number().int().positive().max(2_097_152),
    mimeType: z.enum(["image/png", "image/jpeg"]),
    normalizationVersion: Text(80),
    purpose: z.enum([
      "property",
      "lender-logo",
      "lender-headshot",
      "partner-logo",
      "partner-headshot",
    ]),
    basis: z.enum(["owned", "licensed", "permission"]),
    attestedBy: Ref,
    attestedAt: Instant,
    scope: z.literal("public-financing"),
    authority: FinancingReleaseEvidenceSchema,
  })
  .strict();
export const FinancingReleaseIdentityChoiceSchema = z
  .object({
    versionRef: Ref,
    identityHash: Hash,
    textOnly: z.boolean(),
    assetRefs: z.array(Ref).max(2),
    authority: FinancingReleaseEvidenceSchema,
  })
  .strict()
  .refine((value) => (value.textOnly ? value.assetRefs.length === 0 : value.assetRefs.length > 0));
export const FinancingReleaseAuthoritySchema = z
  .object({
    propertyVersionRef: Ref,
    propertyAuthority: FinancingReleaseEvidenceSchema,
    partnerVersionRef: Ref,
    lenderIdentityVersionRef: Ref,
    partnerIdentity: FinancingReleaseIdentityChoiceSchema,
    lenderIdentity: FinancingReleaseIdentityChoiceSchema,
    presetVersionRef: Ref,
    presetHash: Hash,
    presetInputHash: Hash,
    preset: FinancingReleaseEvidenceSchema,
    quoteEvidence: z.array(FinancingReleaseQuoteEvidenceSchema).min(1).max(5),
    disclosureVersionRef: Ref,
    disclosureHash: Hash,
    disclosureText: Text(20_000),
    disclosure: FinancingReleaseEvidenceSchema,
    mediaAuthorizations: z.array(FinancingPublicMediaAuthorizationSchema).max(10),
    templateVersionRef: Ref,
    templateHash: Hash,
    templateEntitlementRef: Ref,
    template: FinancingReleaseEvidenceSchema,
    routingProfileVersionRef: Ref,
    highlevelLocationRef: Ref,
    routing: FinancingReleaseEvidenceSchema,
    consentVersionRef: Ref,
    consentHash: Hash,
    consentText: Text(20_000),
    consent: FinancingReleaseEvidenceSchema,
    privacyUrl: Https,
    inquiryPolicyVersion: z.literal(FINANCING_INQUIRY_POLICY_VERSION),
    origin: z
      .object({
        canonicalOrigin: Https,
        bindingRef: Ref,
        authority: FinancingReleaseEvidenceSchema,
      })
      .strict()
      .refine((value) => /^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/u.test(value.canonicalOrigin)),
  })
  .strict();
export const FinancingReleaseResolvedSourceSchema = z
  .object({
    sourceVersion: CampaignVersionSchema,
    authority: FinancingReleaseAuthoritySchema,
  })
  .strict();

export const FinancingReleasePrepareRequestSchema = z
  .object({
    requestId: z.uuid(),
    campaignRef: Ref,
    campaignVersionRef: Ref,
    propertyVersionRef: Ref,
    partnerVersionRef: Ref,
    lenderIdentityVersionRef: Ref,
    presetVersionRef: Ref,
    disclosureVersionRef: Ref,
    templateVersionRef: Ref,
    routingProfileVersionRef: Ref,
    consentVersionRef: Ref,
    expectedEvidenceHash: Hash,
  })
  .strict();
export const FinancingReleaseTransitionRequestSchema = z
  .object({
    requestId: z.uuid(),
    releaseRef: Ref,
    expectedRevision: z.number().int().positive(),
    expectedBundleHash: Hash,
    expectedEvidenceHash: Hash,
  })
  .strict();
export const FinancingReleaseOutputSealSchema = z
  .object({
    kind: z.enum(["site", "pdf"]),
    mimeType: z.enum(["text/html", "application/pdf"]),
    byteSize: z.number().int().positive().max(20_971_520),
    sha256: Hash,
    artifactRef: Ref,
    rendererVersion: Text(80),
  })
  .strict()
  .refine((value) =>
    value.kind === "site"
      ? value.mimeType === "text/html" && value.byteSize <= 2_097_152
      : value.mimeType === "application/pdf",
  );
/** Anonymous allowlist. It has no internal references, evidence records or private storage keys. */
export const FinancingPublicPresentationSchema = z
  .object({
    address: Text(1000),
    description: Text(10_000),
    stateCode: z.string().regex(/^[A-Z]{2}$/u),
    facts: FinancingPropertyFactsSchema.omit({ confirmed: true }).nullable(),
    identities: z
      .object({ lender: FinancingIdentitySchema, realtor: FinancingIdentitySchema })
      .strict(),
    financing: z
      .object({
        ...FinancingInputSchema.shape,
        scenarios: z
          .array(
            z
              .object({
                ...FinancingScenarioSchema.shape,
                quote: z
                  .object({
                    noteRateMilliPercent:
                      FinancingScenarioSchema.shape.quote.shape.noteRateMilliPercent,
                    aprMilliPercent: FinancingScenarioSchema.shape.quote.shape.aprMilliPercent,
                    quotedAt: Instant,
                    expiresAt: Instant,
                  })
                  .strict(),
              })
              .strict(),
          )
          .min(1)
          .max(5),
      })
      .strict(),
    calculated: FinancingResultsSchema,
    disclosureText: Text(20_000),
    consentText: Text(20_000),
    privacyUrl: Https,
    issuedAt: Instant,
    validUntil: Instant,
    estimateNotice: Text(1000),
  })
  .strict();
export const FinancingReleaseSnapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseRef: Ref,
    locationRef: Ref,
    actorRef: Ref,
    campaignRef: Ref,
    campaignVersionRef: Ref,
    manifestHash: Hash,
    propertyVersionRef: Ref,
    partnerVersionRef: Ref,
    lenderIdentityVersionRef: Ref,
    presetVersionRef: Ref,
    presetHash: Hash,
    quoteEvidence: z.array(FinancingReleaseQuoteEvidenceSchema).min(1).max(5),
    disclosureVersionRef: Ref,
    disclosureHash: Hash,
    mediaAuthorizations: z.array(FinancingPublicMediaAuthorizationSchema).max(10),
    calculationVersion: z.literal(FINANCING_CALCULATION_VERSION),
    calculatedHash: Hash,
    templateVersionRef: Ref,
    templateHash: Hash,
    templateEntitlementRef: Ref,
    routingProfileVersionRef: Ref,
    consentVersionRef: Ref,
    privacyUrl: Https,
    authority: FinancingReleaseAuthoritySchema,
    evidenceHash: Hash,
    outputSeals: z
      .tuple([FinancingReleaseOutputSealSchema, FinancingReleaseOutputSealSchema])
      .refine(
        (value) =>
          value[0].kind === "site" &&
          value[1].kind === "pdf" &&
          value[0].artifactRef !== value[1].artifactRef,
      ),
    presentation: FinancingPublicPresentationSchema,
    publicationId: z.uuid(),
    canonicalUrl: Https,
    bundleHash: Hash,
    preparedAt: Instant,
    validUntil: Instant,
  })
  .strict()
  .superRefine((value, context) => {
    const authority = value.authority;
    const keys = [
      "propertyVersionRef",
      "partnerVersionRef",
      "lenderIdentityVersionRef",
      "presetVersionRef",
      "presetHash",
      "disclosureVersionRef",
      "disclosureHash",
      "templateVersionRef",
      "templateHash",
      "templateEntitlementRef",
      "routingProfileVersionRef",
      "consentVersionRef",
      "privacyUrl",
    ] as const;
    if (
      keys.some((key) => value[key] !== authority[key]) ||
      JSON.stringify(value.quoteEvidence) !== JSON.stringify(authority.quoteEvidence) ||
      JSON.stringify(value.mediaAuthorizations) !== JSON.stringify(authority.mediaAuthorizations) ||
      value.presentation.privacyUrl !== value.privacyUrl ||
      value.presentation.disclosureText !== authority.disclosureText ||
      value.presentation.consentText !== authority.consentText ||
      value.presentation.issuedAt !== value.preparedAt ||
      value.presentation.validUntil !== value.validUntil ||
      Date.parse(value.validUntil) <= Date.parse(value.preparedAt) ||
      value.canonicalUrl !== `${authority.origin.canonicalOrigin}/p/${value.publicationId}`
    )
      context.addIssue({
        code: "custom",
        message: "Release fields must match the exact authority and presentation.",
      });
  });
export const FinancingReleaseApprovalSchema = z
  .object({
    releaseRef: Ref,
    bundleHash: Hash,
    evidenceHash: Hash,
    outputSealsHash: Hash,
    approvedBy: Ref,
    approvedAt: Instant,
  })
  .strict();
export const FinancingReleaseRecordSchema = z
  .object({
    snapshot: FinancingReleaseSnapshotSchema,
    revision: z.number().int().positive(),
    state: z.enum(["prepared", "approved", "published", "rejected", "revoked"]),
    approval: FinancingReleaseApprovalSchema.nullable(),
    publishedAt: Instant.nullable(),
    revokedAt: Instant.nullable(),
    revokedBy: Ref.nullable(),
  })
  .strict()
  .refine(
    (value) =>
      ((value.state !== "approved" && value.state !== "published") || value.approval !== null) &&
      ((value.state !== "prepared" && value.state !== "rejected") || value.approval === null) &&
      (value.state !== "published" || value.publishedAt !== null) &&
      (value.approval === null ||
        (Date.parse(value.approval.approvedAt) >= Date.parse(value.snapshot.preparedAt) &&
          Date.parse(value.approval.approvedAt) < Date.parse(value.snapshot.validUntil))) &&
      (value.state === "revoked"
        ? value.revokedAt !== null && value.revokedBy !== null
        : value.revokedAt === null && value.revokedBy === null),
  );
export const FinancingReleaseInquiryRequestSchema = z
  .object({
    requestId: z.uuid(),
    firstName: Text(100),
    email: z.string().trim().toLowerCase().pipe(z.email().max(200)),
    honeypot: z.literal(""),
    consent: z.literal(true),
    intent: z.enum(["property-information", "financing-review"]),
  })
  .strict();
export const FinancingInquiryReceiptSchema = z
  .object({
    inquiryId: z.uuid(),
    publicationId: z.uuid(),
    requestId: z.uuid(),
    acceptedAt: Instant,
    expiresAt: Instant,
    deliveryState: z.enum([
      "pending",
      "in_progress",
      "delivered",
      "failed",
      "uncertain",
      "blocked",
    ]),
  })
  .strict();
export type FinancingReleasePrincipal = z.infer<typeof FinancingReleasePrincipalSchema>;
export type FinancingReleaseEvidence = z.infer<typeof FinancingReleaseEvidenceSchema>;
export type FinancingReleaseAuthority = z.infer<typeof FinancingReleaseAuthoritySchema>;
export type FinancingReleaseResolvedSource = z.infer<typeof FinancingReleaseResolvedSourceSchema>;
export type FinancingReleasePrepareRequest = z.infer<typeof FinancingReleasePrepareRequestSchema>;
export type FinancingReleaseTransitionRequest = z.infer<
  typeof FinancingReleaseTransitionRequestSchema
>;
export type FinancingReleaseOutputSeal = z.infer<typeof FinancingReleaseOutputSealSchema>;
export type FinancingReleaseSnapshot = z.infer<typeof FinancingReleaseSnapshotSchema>;
export type FinancingReleaseRecord = z.infer<typeof FinancingReleaseRecordSchema>;
export type FinancingReleaseInquiryRequest = z.infer<typeof FinancingReleaseInquiryRequestSchema>;
export type FinancingInquiryReceipt = z.infer<typeof FinancingInquiryReceiptSchema>;
