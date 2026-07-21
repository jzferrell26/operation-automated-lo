import { z } from "zod";

const ReferenceSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const ProviderIdSchema = z.string().trim().min(1).max(300);

export const PublicLeadSubmissionSchema = z
  .object({
    givenName: z.string().trim().min(1).max(100),
    familyName: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().min(7).max(40).optional(),
    consent: z
      .object({
        disclosureHash: Sha256Schema,
        disclosureVisible: z.literal(true),
        initialCheckboxState: z.literal(false),
        userInitiated: z.literal(true),
        emailSelected: z.boolean(),
        smsSelected: z.boolean(),
        phoneSelected: z.boolean(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.email === undefined && value.phone === undefined) {
      context.addIssue({ code: "custom", message: "email or phone is required" });
    }
    if (value.consent.emailSelected && value.email === undefined) {
      context.addIssue({ code: "custom", message: "email consent requires an email" });
    }
    if ((value.consent.smsSelected || value.consent.phoneSelected) && value.phone === undefined) {
      context.addIssue({ code: "custom", message: "phone consent requires a phone" });
    }
  });
export type PublicLeadSubmission = z.infer<typeof PublicLeadSubmissionSchema>;

export const CampaignLeadAuthoritySchema = z
  .object({
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    state: z.literal("published"),
    approved: z.literal(true),
    active: z.literal(true),
    leadPathStatus: z.enum(["passed", "authorized_exception"]),
    leadPathExceptionReason: z.string().trim().min(1).max(2_000).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.leadPathStatus === "authorized_exception" &&
      value.leadPathExceptionReason === undefined
    ) {
      context.addIssue({ code: "custom", message: "authorized exception requires a reason" });
    }
  });
export type CampaignLeadAuthority = z.infer<typeof CampaignLeadAuthoritySchema>;

export const ConsentReceiptSchema = z
  .object({
    receiptRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    disclosureHash: Sha256Schema,
    channels: z.array(z.enum(["email", "sms", "phone"])).max(3),
    destinations: z
      .array(
        z
          .object({
            channel: z.enum(["email", "sms", "phone"]),
            encryptedDestinationRef: ReferenceSchema,
          })
          .strict(),
      )
      .max(3),
    submittedAt: z.iso.datetime({ offset: true }),
    safeRequestMetadata: z
      .object({
        ipRiskBucket: z.enum(["low", "medium", "high"]),
        userAgentFamily: z.string().trim().min(1).max(100),
        synthetic: z.boolean(),
      })
      .strict(),
  })
  .strict();
export type ConsentReceipt = z.infer<typeof ConsentReceiptSchema>;

export const LeadRoutingMappingsSchema = z
  .object({
    pipelineProviderId: ProviderIdSchema,
    stageProviderId: ProviderIdSchema,
    ownerProviderId: ProviderIdSchema.optional(),
    workflowProviderId: ProviderIdSchema.optional(),
    campaignTag: z.string().regex(/^oalo:campaign:[a-zA-Z0-9_-]{1,120}$/u),
  })
  .strict();
export type LeadRoutingMappings = z.infer<typeof LeadRoutingMappingsSchema>;

export const LeadRoutingCommandSchema = z
  .object({
    commandRef: ReferenceSchema,
    idempotencyRef: ReferenceSchema,
    correlationRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    receiptRef: ReferenceSchema,
    encryptedPayloadRef: ReferenceSchema,
    attributionKey: ReferenceSchema,
    mappings: LeadRoutingMappingsSchema,
    synthetic: z.boolean(),
  })
  .strict();
export type LeadRoutingCommand = z.infer<typeof LeadRoutingCommandSchema>;

export const PrivateLeadPayloadSchema = z
  .object({
    givenName: z.string().trim().min(1).max(100),
    familyName: z.string().trim().min(1).max(100),
    normalizedEmail: z.email().max(320).optional(),
    normalizedPhone: z
      .string()
      .regex(/^\+[1-9]\d{6,14}$/u)
      .optional(),
    consentChannels: z.array(z.enum(["email", "sms", "phone"])).max(3),
  })
  .strict();
export type PrivateLeadPayload = z.infer<typeof PrivateLeadPayloadSchema>;

export const LeadRoutingResultSchema = z
  .object({
    commandRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    contactProviderId: ProviderIdSchema,
    opportunityProviderId: ProviderIdSchema,
    tagApplied: z.boolean(),
    ownerApplied: z.boolean(),
    workflowEnrollment: z.enum([
      "enrolled",
      "skipped_not_configured",
      "skipped_dnd",
      "skipped_policy",
    ]),
    synthetic: z.boolean(),
    completedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type LeadRoutingResult = z.infer<typeof LeadRoutingResultSchema>;

export const AttributionMilestoneSchema = z.enum([
  "lead",
  "opportunity",
  "appointment",
  "application",
  "funded",
  "closed",
]);
export type AttributionMilestone = z.infer<typeof AttributionMilestoneSchema>;

export const AttributionEventSchema = z
  .object({
    eventRef: ReferenceSchema,
    sourceEventRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    campaignRef: ReferenceSchema,
    campaignVersionRef: ReferenceSchema,
    contactProviderId: ProviderIdSchema,
    opportunityProviderId: ProviderIdSchema.optional(),
    milestone: AttributionMilestoneSchema,
    provenance: z.enum(["observed", "inferred", "manually_confirmed"]),
    observedAt: z.iso.datetime({ offset: true }),
    recordedAt: z.iso.datetime({ offset: true }),
    synthetic: z.boolean(),
  })
  .strict();
export type AttributionEvent = z.infer<typeof AttributionEventSchema>;
