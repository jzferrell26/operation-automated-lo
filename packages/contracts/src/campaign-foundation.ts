import { z } from "zod";

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
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

export const CampaignManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    blueprintId: z.literal("open-house-boost"),
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
      .min(1)
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

export const PreflightRulesSchema = z
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

export const ApprovalSnapshotSchema = z
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
  })
  .strict();
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
