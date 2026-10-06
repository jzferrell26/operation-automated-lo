import { z } from "zod";
import {
  FinancingIdentitySchema,
  FinancingInputSchema,
  FinancingResultsSchema,
} from "./financing-comparison.js";

import {
  AdsLibraryAdIdSchema,
  AdsLibraryCallToActionSchema,
  AdsLibraryVersionSchema,
} from "./ads-library.js";

export const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
export const CorrelationReferenceSchema = OpaqueReferenceSchema;
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const VersionSchema = z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/u);
const HttpsUrlSchema = z.url({ protocol: /^https$/u });

const ApprovalRoleSchema = z.enum([
  "location_admin",
  "approver",
  "realtor_approver",
  "lender_approver",
]);

const ContactInformationSchema = z
  .object({
    phone: z.string().trim().min(1).max(80).optional(),
    email: z.email().max(320).optional(),
    websiteUrl: HttpsUrlSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.phone !== undefined || value.email !== undefined || value.websiteUrl !== undefined,
    { message: "Contact information must contain at least one approved channel" },
  );

const BrandIdentitySchema = z
  .object({
    displayName: z.string().trim().min(1).max(300),
    logoAssetRef: OpaqueReferenceSchema.optional(),
    imageAssetRef: OpaqueReferenceSchema.optional(),
    contactInformation: ContactInformationSchema.optional(),
  })
  .strict();

const ProjectionTemplateSchema = z.object({ version: VersionSchema }).strict();

const CollateralProjectionContentSchema = z
  .object({
    headline: z.string().trim().min(1).max(500),
    propertyAddress: z.string().trim().min(1).max(1_000),
    propertyDescription: z.string().trim().min(1).max(10_000),
    openHouseLabel: z.string().trim().min(1).max(500),
    loanOfficerIdentity: BrandIdentitySchema,
    realtorIdentity: BrandIdentitySchema,
    disclosureBlocks: z.array(z.string().trim().min(1).max(20_000)).min(1).max(12),
    callToActionLabel: z.string().trim().min(1).max(160),
    destinationPath: z.string().regex(/^\/c\/[A-Za-z0-9_-]+$/u),
  })
  .strict();

export const CollateralProjectionInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectionRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    template: ProjectionTemplateSchema.extend({
      id: z.literal("open-house-boost-collateral"),
    }).strict(),
    content: CollateralProjectionContentSchema,
    approvalSummary: z
      .object({
        approvalSummaryRef: OpaqueReferenceSchema,
        scope: z.literal("collateral"),
        previewRef: OpaqueReferenceSchema,
        requiredApproverRoles: z.array(ApprovalRoleSchema).min(1).max(4),
      })
      .strict(),
  })
  .strict();
export type CollateralProjectionInput = z.infer<typeof CollateralProjectionInputSchema>;

export const CollateralProjectionSchema = CollateralProjectionInputSchema.extend({
  projectionHash: Sha256Schema,
  approvalSummary: CollateralProjectionInputSchema.shape.approvalSummary
    .extend({ projectionHash: Sha256Schema })
    .strict(),
}).strict();
export type CollateralProjection = z.infer<typeof CollateralProjectionSchema>;

const PaidAdAdvertiserIdentitySchema = BrandIdentitySchema.extend({
  kind: z.enum(["loan_officer", "lender"]),
}).strict();

const PaidAdApprovalRoleSchema = z.enum(["location_admin", "approver", "lender_approver"]);

export const PaidAdProjectionInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectionRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    template: ProjectionTemplateSchema.extend({
      id: z.literal("open-house-boost-paid-ad"),
    }).strict(),
    advertiserIdentity: PaidAdAdvertiserIdentitySchema,
    copy: z
      .object({
        primaryText: z.string().trim().min(1).max(5_000),
        headline: z.string().trim().min(1).max(500),
        description: z.string().trim().min(1).max(1_000),
      })
      .strict(),
    creative: z
      .object({
        headline: z.string().trim().min(1).max(500),
        body: z.string().trim().min(1).max(5_000),
        callToActionLabel: z.string().trim().min(1).max(160),
        propertyImageAssetRefs: z.array(OpaqueReferenceSchema).min(1).max(20),
        identityAssetRefs: z.array(OpaqueReferenceSchema).max(4),
        disclosureBlocks: z.array(z.string().trim().min(1).max(20_000)).min(1).max(12),
      })
      .strict(),
    leadForm: z
      .object({
        headline: z.string().trim().min(1).max(500),
        description: z.string().trim().min(1).max(5_000),
        callToActionLabel: z.string().trim().min(1).max(160),
        privacyPolicyUrl: HttpsUrlSchema,
      })
      .strict(),
    approvalSummary: z
      .object({
        approvalSummaryRef: OpaqueReferenceSchema,
        scope: z.literal("paid_ad"),
        previewRef: OpaqueReferenceSchema,
        requiredApproverRoles: z.array(PaidAdApprovalRoleSchema).min(1).max(3),
      })
      .strict(),
  })
  .strict();
export type PaidAdProjectionInput = z.infer<typeof PaidAdProjectionInputSchema>;

export const PaidAdProjectionSchema = PaidAdProjectionInputSchema.extend({
  projectionHash: Sha256Schema,
  approvalSummary: PaidAdProjectionInputSchema.shape.approvalSummary
    .extend({ projectionHash: Sha256Schema })
    .strict(),
}).strict();
export type PaidAdProjection = z.infer<typeof PaidAdProjectionSchema>;

export const PaidAdBrandBoundaryRulesSchema = z
  .object({
    rulesetVersionRef: OpaqueReferenceSchema,
    realtorIdentityValues: z.array(z.string().trim().min(1).max(500)).min(1).max(100),
    brokerageMarks: z.array(z.string().trim().min(1).max(300)).max(50),
    coBrandPhrases: z.array(z.string().trim().min(1).max(300)).max(50),
    prohibitedContactValues: z.array(z.string().trim().min(1).max(500)).max(50),
    realtorAssetRefs: z.array(OpaqueReferenceSchema).max(50),
    allowedPaidAdIdentityAssetRefs: z.array(OpaqueReferenceSchema).max(50),
    allowedPropertyImageAssetRefs: z.array(OpaqueReferenceSchema).min(1).max(100),
  })
  .strict();
export type PaidAdBrandBoundaryRules = z.infer<typeof PaidAdBrandBoundaryRulesSchema>;

export const PaidAdBrandPreflightEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    campaignVersionRef: OpaqueReferenceSchema,
    collateralProjectionHash: Sha256Schema,
    paidAdProjectionHash: Sha256Schema,
    rulesetVersionRef: OpaqueReferenceSchema,
    brandBoundaryRulesHash: Sha256Schema,
    blocking: z.literal(false),
    resultHash: Sha256Schema,
  })
  .strict();
export type PaidAdBrandPreflightEvidence = z.infer<typeof PaidAdBrandPreflightEvidenceSchema>;

export const ProjectionApprovalDecisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    approvalRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    scope: z.enum(["collateral", "paid_ad"]),
    projectionHash: Sha256Schema,
    previewRef: OpaqueReferenceSchema,
    actorRef: OpaqueReferenceSchema,
    actorKind: z.literal("human"),
    actorRole: ApprovalRoleSchema,
    decidedAt: z.iso.datetime({ offset: true }),
    ipAuditHash: Sha256Schema,
    decision: z.enum(["approved", "rejected"]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.scope === "paid_ad" && value.actorRole === "realtor_approver") {
      context.addIssue({
        code: "custom",
        path: ["actorRole"],
        message: "Realtor approval is limited to co-branded collateral",
      });
    }
  });
export type ProjectionApprovalDecision = z.infer<typeof ProjectionApprovalDecisionSchema>;

export const CampaignStateSchema = z.enum([
  "draft",
  "generated",
  "preflight_failed",
  "awaiting_approval",
  "approved",
  "publishing",
  "live",
  "paused",
  "completed",
  "archived",
]);
export type CampaignState = z.infer<typeof CampaignStateSchema>;

export const CampaignInputVersionsSchema = z
  .object({
    blueprintVersionRef: OpaqueReferenceSchema,
    brandProfileVersionRef: OpaqueReferenceSchema,
    complianceProfileVersionRef: OpaqueReferenceSchema,
    partnerProfileVersionRef: OpaqueReferenceSchema,
    routingProfileVersionRef: OpaqueReferenceSchema,
    rulesetVersionRef: OpaqueReferenceSchema,
  })
  .strict();
export type CampaignInputVersions = z.infer<typeof CampaignInputVersionsSchema>;

/**
 * PRD-010, REC-002/004/006. Frozen preparation evidence, not proof of rendered artifacts or launch.
 * Optional only on the enclosing legacy manifest so saved pre-recovery versions remain unchanged.
 */
export const PropertyCampaignPreparationSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("draft"),
    requestHash: Sha256Schema,
    brand: z
      .object({
        name: z.string().trim().min(1).max(120),
        title: z.string().trim().max(60),
        company: z.string().trim().min(1).max(160),
        nmls: z.string().regex(/^\d{4,12}$/u),
        companyNmls: z.string().regex(/^\d{4,12}$/u),
        colorPresetId: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/u),
      })
      .strict(),
    partnerRecordId: z.uuid(),
    partnerCompany: z.string().trim().min(2).max(160),
  })
  .strict();

export const OpenHouseCampaignManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    blueprintId: z.literal("open-house-boost"),
    preparation: PropertyCampaignPreparationSchema.optional(),
    property: z
      .object({
        address: z.string().trim().min(1).max(1_000),
        description: z.string().trim().min(1).max(10_000),
        openHouseStartsAt: z.iso.datetime({ offset: true }),
        openHouseEndsAt: z.iso.datetime({ offset: true }),
        stateCode: z.string().regex(/^[A-Z]{2}$/u),
        permissionConfirmed: z.boolean(),
      })
      .strict(),
    content: z
      .object({
        headline: z.string().trim().min(1).max(500),
        callToAction: z.string().trim().min(1).max(160),
        disclosureText: z.string().trim().max(20_000),
        consentText: z.string().trim().max(20_000),
        body: z.string().trim().min(1).max(20_000),
        claims: z.array(z.string().trim().min(1).max(500)).max(30),
        mergeTokens: z.array(z.string().regex(/^\{\{[a-z][a-z0-9_]*\}\}$/u)).max(30),
        financingTerms: z.array(z.string().trim().min(1).max(500)).max(20),
      })
      .strict(),
    images: z
      .array(
        z
          .object({
            assetRef: OpaqueReferenceSchema,
            approvalStatus: z.enum(["approved", "pending", "rejected", "quarantined"]),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            altText: z.string().trim().max(500),
          })
          .strict(),
      )
      // PRD-008b D1. A version records the images a person supplied, and Open House Boost has no
      // photo intake yet, so none is a true record. Preflight checks each image that is present.
      .max(20),
    partner: z
      .object({
        realtorDisplayName: z.string().trim().min(1).max(300),
        permissionConfirmed: z.boolean(),
      })
      .strict(),
    artifacts: z
      .object({
        pageVersionRef: OpaqueReferenceSchema,
        pdfVersionRef: OpaqueReferenceSchema,
        creativeVersionRef: OpaqueReferenceSchema,
        copyVersionRef: OpaqueReferenceSchema,
        emailPackageVersionRef: OpaqueReferenceSchema,
        smsPackageVersionRef: OpaqueReferenceSchema,
        disclosureVersionRef: OpaqueReferenceSchema,
        formVersionRef: OpaqueReferenceSchema,
        destinationVersionRef: OpaqueReferenceSchema,
        qrDestinationVersionRef: OpaqueReferenceSchema,
      })
      .strict(),
    meta: z
      .object({
        enabled: z.boolean(),
        specialAdCategory: z.enum(["HOUSING", "NONE"]),
        platform: z.enum(["meta", "google", "linkedin"]),
        targeting: z
          .object({
            country: z.string().regex(/^[A-Z]{2}$/u),
            regions: z.array(z.string().trim().min(1).max(100)).max(50),
            zipCodes: z.array(z.string().trim().min(1).max(20)).max(100),
            customAudienceRefs: z.array(OpaqueReferenceSchema).max(20),
            protectedDimensions: z.array(z.string().trim().min(1).max(100)).max(20),
          })
          .strict(),
        dailyBudgetMinor: z.number().int().nonnegative(),
        totalBudgetMinor: z.number().int().nonnegative(),
      })
      .strict(),
    routing: z
      .object({
        mappingVersionRef: OpaqueReferenceSchema,
        validationStatus: z.enum(["valid", "missing", "stale"]),
      })
      .strict(),
  })
  .strict();
export type OpenHouseCampaignManifest = z.infer<typeof OpenHouseCampaignManifestSchema>;

/**
 * PRD-009c D5. The art of one library ad as a campaign version records it. The reference is
 * `libimg_` and 40 hexadecimal characters derived from the ad, its version, the shape, and the file
 * digest, and `contentSha256` is the catalog's digest of the bytes, so the manifest hash, and with it
 * an approval, covers the exact pixels.
 */
function libraryAdImageSchema<Shape extends "tall" | "square">(shape: Shape) {
  return z
    .object({
      shape: z.literal(shape),
      assetRef: OpaqueReferenceSchema.regex(/^libimg_[a-f0-9]{40}$/u),
      approvalStatus: z.literal("approved"),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      altText: z.string().trim().min(10).max(200),
      contentSha256: Sha256Schema,
    })
    .strict();
}

/**
 * PRD-009c D5. The second blueprint: one ad from the curated library, with the loan officer's edited
 * words, their frozen brand, the run dates, the places, and the budgets.
 *
 * It has no `partner`, no `property`, and no key that can hold a Realtor or brokerage identity, so
 * compliance control 9 holds by structure (009C-AC-006 walks every key). The fixed parts are fixed
 * here rather than in a check: Housing, the Facebook feed, and empty ZIP, audience, and
 * protected-dimension lists. `headline` and `body` are capped at the request limits (120 and 600)
 * rather than the ad's editable limits, so an over-long version is stored and then refused by the
 * domain's word-length check with a plain fix (009d D5).
 */
export const LibraryAdCampaignManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    blueprintId: z.literal("library-ad"),
    libraryAd: z
      .object({
        id: AdsLibraryAdIdSchema,
        version: AdsLibraryVersionSchema,
      })
      .strict(),
    content: z
      .object({
        headline: z.string().trim().min(1).max(120),
        body: z.string().trim().min(1).max(600),
        callToAction: AdsLibraryCallToActionSchema,
        disclosureText: z.string().trim().max(120),
        consentText: z.string().trim().max(300),
        claims: z.array(z.string()).max(0),
        mergeTokens: z.array(z.string()).max(0),
        financingTerms: z.array(z.string()).max(0),
      })
      .strict(),
    images: z.tuple([libraryAdImageSchema("tall"), libraryAdImageSchema("square")]),
    advertiser: z
      .object({
        name: z.string().trim().max(120),
        title: z.string().trim().max(60),
        company: z.string().trim().max(160),
        nmls: z.string().regex(/^\d{0,12}$/u),
        companyNmls: z.string().regex(/^\d{0,12}$/u),
        colorPresetId: z.string().regex(/^[a-z][a-z0-9-]{1,31}$/u),
      })
      .strict(),
    schedule: z
      .object({
        startsAt: z.iso.datetime({ offset: true }).nullable(),
        endsAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
    meta: z
      .object({
        enabled: z.boolean(),
        specialAdCategory: z.literal("HOUSING"),
        platform: z.literal("meta"),
        placements: z.tuple([z.literal("facebook_feed")]),
        targeting: z
          .object({
            country: z.literal("US"),
            regions: z.array(z.string().regex(/^[A-Z]{2}$/u)).max(5),
            cities: z.array(z.string().regex(/^[A-Za-z][A-Za-z .'-]{1,59}, [A-Z]{2}$/u)).max(10),
            zipCodes: z.array(z.string()).max(0),
            customAudienceRefs: z.array(OpaqueReferenceSchema).max(0),
            protectedDimensions: z.array(z.string()).max(0),
          })
          .strict(),
        dailyBudgetMinor: z.number().int().nonnegative(),
        totalBudgetMinor: z.number().int().nonnegative(),
      })
      .strict(),
    routing: OpenHouseCampaignManifestSchema.shape.routing,
  })
  .strict();
export type LibraryAdCampaignManifest = z.infer<typeof LibraryAdCampaignManifestSchema>;

/**
 * PRD-009c D5. The manifest is a union on `blueprintId`. `open-house-boost` is unchanged, so every
 * stored version parses to the same value and keeps its hash; the database stores any JSON object
 * (`20260915180000_campaign_activation.sql`, `jsonb_typeof(manifest) = 'object'`), so no migration.
 */
/** Private fixed-purchase comparison: no fictitious event times or paid-ad configuration. */
export const FinancingCampaignManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    blueprintId: z.literal("financing-comparison"),
    templateVersion: z.literal("1.0.0"),
    preparation: PropertyCampaignPreparationSchema,
    property: OpenHouseCampaignManifestSchema.shape.property.omit({
      openHouseStartsAt: true,
      openHouseEndsAt: true,
    }),
    partner: OpenHouseCampaignManifestSchema.shape.partner,
    identities: z
      .object({ lender: FinancingIdentitySchema, realtor: FinancingIdentitySchema })
      .strict(),
    financing: FinancingInputSchema,
    calculated: FinancingResultsSchema,
    reviewOnly: z.literal(true),
    content: OpenHouseCampaignManifestSchema.shape.content,
    images: OpenHouseCampaignManifestSchema.shape.images.max(0),
    meta: OpenHouseCampaignManifestSchema.shape.meta.extend({
      enabled: z.literal(false),
      dailyBudgetMinor: z.literal(0),
      totalBudgetMinor: z.literal(0),
    }),
    routing: OpenHouseCampaignManifestSchema.shape.routing.extend({
      validationStatus: z.literal("missing"),
    }),
  })
  .strict();
export type FinancingCampaignManifest = z.infer<typeof FinancingCampaignManifestSchema>;

export const CampaignManifestSchema = z.discriminatedUnion("blueprintId", [
  OpenHouseCampaignManifestSchema,
  LibraryAdCampaignManifestSchema,
  FinancingCampaignManifestSchema,
]);
export type CampaignManifest = z.infer<typeof CampaignManifestSchema>;

export const CampaignVersionSchema = z
  .object({
    schemaVersion: z.literal(1),
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    versionNo: z.number().int().positive(),
    sourceCampaignRef: OpaqueReferenceSchema.optional(),
    inputVersions: CampaignInputVersionsSchema,
    manifest: CampaignManifestSchema,
    manifestHash: Sha256Schema,
    createdBy: OpaqueReferenceSchema,
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type CampaignVersion = z.infer<typeof CampaignVersionSchema>;

export const CampaignVersionInputSchema = CampaignVersionSchema.omit({
  versionNo: true,
  manifestHash: true,
  createdAt: true,
});
export type CampaignVersionInput = z.infer<typeof CampaignVersionInputSchema>;

const SharedPreflightRulesSchema = z
  .object({
    schemaVersion: z.literal(1),
    rulesetVersionRef: OpaqueReferenceSchema,
    evaluatedAt: z.iso.datetime({ offset: true }),
    minimumImageWidth: z.number().int().min(400).max(10_000),
    minimumImageHeight: z.number().int().min(400).max(10_000),
    earliestStartAt: z.iso.datetime({ offset: true }),
    allowedMergeTokens: z.array(z.string().regex(/^\{\{[a-z][a-z0-9_]*\}\}$/u)).max(100),
    bannedPhrases: z.array(z.string().trim().min(1).max(500)).max(100),
    allowedClaims: z.array(z.string().trim().min(1).max(500)).max(100),
    allowsFinancingTerms: z.boolean(),
    minimumDailyBudgetMinor: z.number().int().nonnegative(),
    maximumDailyBudgetMinor: z.number().int().positive(),
    maximumTotalBudgetMinor: z.number().int().positive(),
    warnings: z
      .array(
        z
          .object({
            ruleCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/u),
            description: z.string().trim().min(1).max(1_000),
            affected: z.string().trim().min(1).max(300),
            remediation: z.string().trim().min(1).max(1_000),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();

/**
 * PRD-009d D5. What the library-ad ruleset needs to know about one check beyond the shared values:
 * the ad's own word limits (`WORDS_TOO_LONG`), the person's saved Realtor partners' names and
 * companies (`WORDS_CO_BRAND`), and whether the ad was retired before the check ran
 * (`LIBRARY_AD_RETIRED`). It is present exactly when the rules are the library-ad ruleset's, which
 * is why the rules are a union rather than one object with an optional block: an open house check
 * cannot carry it, and the domain refuses to check a library ad without it.
 */
export const LibraryAdRuleContextSchema = z
  .object({
    headlineMaxLength: z.number().int().min(1).max(60),
    primaryTextMaxLength: z.number().int().min(1).max(300),
    partnerNames: z.array(z.string().trim().min(1).max(160)).max(50),
    retiredOn: z.iso.date().nullable(),
  })
  .strict();
export type LibraryAdRuleContext = z.infer<typeof LibraryAdRuleContextSchema>;

export const PreflightRulesSchema = z.union([
  SharedPreflightRulesSchema,
  SharedPreflightRulesSchema.extend({ libraryAd: LibraryAdRuleContextSchema }).strict(),
]);
export type PreflightRules = z.infer<typeof PreflightRulesSchema>;

export const PreflightFindingSchema = z
  .object({
    severity: z.enum(["blocking", "warning"]),
    ruleCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,63}$/u),
    description: z.string().trim().min(1).max(1_000),
    affected: z.string().trim().min(1).max(300),
    remediation: z.string().trim().min(1).max(1_000),
  })
  .strict();
export type PreflightFinding = z.infer<typeof PreflightFindingSchema>;

export const PreflightResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    manifestHash: Sha256Schema,
    inputVersions: CampaignInputVersionsSchema,
    rulesetVersionRef: OpaqueReferenceSchema,
    findings: z.array(PreflightFindingSchema).max(100),
    blocking: z.boolean(),
    resultHash: Sha256Schema,
    evaluatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type PreflightResult = z.infer<typeof PreflightResultSchema>;

/**
 * PRD-009e D2 (009E-AC-004) records the decider's own session display name here. Both snapshot
 * variants accept it; it is never read from a request.
 */
const ApproverDisplayNameSchema = z.string().trim().min(1).max(200);

export const OpenHouseApprovalSnapshotSchema = z
  .object({
    pageVersionRef: OpaqueReferenceSchema,
    pdfVersionRef: OpaqueReferenceSchema,
    creativeVersionRef: OpaqueReferenceSchema,
    copyVersionRef: OpaqueReferenceSchema,
    emailPackageVersionRef: OpaqueReferenceSchema,
    smsPackageVersionRef: OpaqueReferenceSchema,
    disclosureVersionRef: OpaqueReferenceSchema,
    targetingHash: Sha256Schema,
    budgetHash: Sha256Schema,
    datesHash: Sha256Schema,
    formVersionRef: OpaqueReferenceSchema,
    destinationVersionRef: OpaqueReferenceSchema,
    approverDisplayName: ApproverDisplayNameSchema.optional(),
  })
  .strict();
export type OpenHouseApprovalSnapshot = z.infer<typeof OpenHouseApprovalSnapshotSchema>;

/**
 * PRD-009c D5, 009C-AC-015. What an approval of a library-ad version names: the ad and its
 * version, both art digests, and references derived from the art, the words, and the disclosure
 * line, plus the targeting, budget, and run-date hashes. No field is a reference minted per draft,
 * so two drafts with the same content name the same thing.
 */
export const LibraryAdApprovalSnapshotSchema = z
  .object({
    blueprintId: z.literal("library-ad"),
    libraryAdId: AdsLibraryAdIdSchema,
    libraryAdVersion: AdsLibraryVersionSchema,
    tallSha256: Sha256Schema,
    squareSha256: Sha256Schema,
    creativeVersionRef: z.string().regex(/^libcreative_[a-f0-9]{40}$/u),
    copyVersionRef: z.string().regex(/^libcopy_[a-f0-9]{40}$/u),
    disclosureVersionRef: z.string().regex(/^libdisclosure_[a-f0-9]{40}$/u),
    targetingHash: Sha256Schema,
    budgetHash: Sha256Schema,
    datesHash: Sha256Schema,
    approverDisplayName: ApproverDisplayNameSchema.optional(),
  })
  .strict();
export type LibraryAdApprovalSnapshot = z.infer<typeof LibraryAdApprovalSnapshotSchema>;

export const ApprovalSnapshotSchema = z.union([
  OpenHouseApprovalSnapshotSchema,
  LibraryAdApprovalSnapshotSchema,
]);
export type ApprovalSnapshot = z.infer<typeof ApprovalSnapshotSchema>;

export const ApprovalDecisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    approvalRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    manifestHash: Sha256Schema,
    preflightResultHash: Sha256Schema,
    actorRef: OpaqueReferenceSchema,
    actorKind: z.literal("human"),
    actorRole: z.enum(["location_admin", "approver", "realtor_approver", "lender_approver"]),
    decidedAt: z.iso.datetime({ offset: true }),
    ipAuditHash: Sha256Schema,
    decision: z.enum(["approved", "rejected"]),
    snapshot: ApprovalSnapshotSchema,
  })
  .strict();
export type ApprovalDecision = z.infer<typeof ApprovalDecisionSchema>;

export const ApprovalLinkClaimsSchema = z
  .object({
    schemaVersion: z.literal(1),
    linkRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    purpose: z.literal("campaign-approval"),
    approverRole: z.enum(["approver", "realtor_approver", "lender_approver"]),
    expiresAt: z.iso.datetime({ offset: true }),
    redeemedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
export type ApprovalLinkClaims = z.infer<typeof ApprovalLinkClaimsSchema>;

export const CampaignEventSchema = z
  .object({
    schemaVersion: z.literal(1),
    eventRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    fromState: CampaignStateSchema,
    toState: CampaignStateSchema,
    actorRef: OpaqueReferenceSchema,
    occurredAt: z.iso.datetime({ offset: true }),
    correlationRef: OpaqueReferenceSchema,
  })
  .strict();
export type CampaignEvent = z.infer<typeof CampaignEventSchema>;

export const GenerationRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    generationRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    promptSnapshotHash: Sha256Schema,
    modelPolicyRef: OpaqueReferenceSchema,
    promptPolicyRef: OpaqueReferenceSchema,
    providerRequestRef: OpaqueReferenceSchema,
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    acceptedOutputHash: Sha256Schema.optional(),
    result: z.enum(["usable", "rejected"]),
    planAllowanceConsumed: z.boolean(),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((record, issue) => {
    const usable = record.result === "usable";
    if (
      usable !== record.planAllowanceConsumed ||
      usable !== (record.acceptedOutputHash !== undefined)
    ) {
      issue.addIssue({
        code: "custom",
        message: "Only usable accepted generations consume allowance and carry an output hash",
      });
    }
  });
export type GenerationRecord = z.infer<typeof GenerationRecordSchema>;
