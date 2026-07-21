import { z } from "zod";

const SafeReferenceSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[A-Za-z0-9:_-]+$/u);
const TimestampSchema = z.string().datetime({ offset: true });

export const ReportingMetricSourceSchema = z.enum(["meta", "ghl", "application"]);

export const ReportingMetricSchema = z
  .object({
    value: z.number().nonnegative().nullable(),
    source: ReportingMetricSourceSchema,
    updatedAt: TimestampSchema.nullable(),
  })
  .strict();

export const CampaignReportingRecordSchema = z
  .object({
    tenantRef: SafeReferenceSchema,
    locationRef: SafeReferenceSchema,
    campaignRef: SafeReferenceSchema,
    currentVersion: z.number().int().positive(),
    status: z.enum([
      "draft",
      "awaiting_approval",
      "approved",
      "publishing",
      "published",
      "attention_required",
      "withdrawn",
    ]),
    approverRefs: z.array(SafeReferenceSchema).max(20),
    realtorRef: SafeReferenceSchema.nullable(),
    propertyRef: SafeReferenceSchema.nullable(),
    eventAt: TimestampSchema.nullable(),
    generatedAt: TimestampSchema,
    publishedAt: TimestampSchema.nullable(),
    budgetCents: z.number().int().nonnegative(),
    artifactRefs: z
      .object({
        page: SafeReferenceSchema.nullable(),
        pdf: SafeReferenceSchema.nullable(),
        qrDestination: SafeReferenceSchema.nullable(),
        creative: z.array(SafeReferenceSchema).max(20),
        emailPackage: SafeReferenceSchema.nullable(),
        smsPackage: SafeReferenceSchema.nullable(),
      })
      .strict(),
    approvalRef: SafeReferenceSchema.nullable(),
    metaEntityRef: SafeReferenceSchema.nullable(),
    metrics: z
      .object({
        spendCents: ReportingMetricSchema,
        leads: ReportingMetricSchema,
        costPerLeadCents: ReportingMetricSchema,
        appointments: ReportingMetricSchema,
        applications: ReportingMetricSchema,
        fundedOrClosed: ReportingMetricSchema,
      })
      .strict(),
    excludedTestLeadCount: z.number().int().nonnegative(),
  })
  .strict();

export const ReportingExceptionSchema = z
  .object({
    exceptionRef: SafeReferenceSchema,
    tenantRef: SafeReferenceSchema,
    locationRef: SafeReferenceSchema,
    campaignRef: SafeReferenceSchema.nullable(),
    code: z.enum([
      "token_expired",
      "token_failed",
      "meta_disconnected",
      "ad_disapproved",
      "reporting_stale",
      "lead_route_failed",
      "mapping_missing",
      "approval_stale",
      "reconciliation_gap",
    ]),
    explanation: z.string().min(1).max(240),
    lastAttemptAt: TimestampSchema.nullable(),
    correlationRef: SafeReferenceSchema,
    nextAction: z.string().min(1).max(160),
  })
  .strict();

export const BlueprintDimensionsSchema = z
  .object({
    blueprintVersion: z.string().min(1).max(80),
    offer: z.string().min(1).max(80),
    creativeVersion: z.string().min(1).max(80),
    geographyClass: z.string().min(1).max(80),
    budgetBand: z.string().min(1).max(80),
    landingPageVersion: z.string().min(1).max(80),
  })
  .strict();

export const BlueprintObservationSchema = z
  .object({
    tenantRef: SafeReferenceSchema,
    campaignRef: SafeReferenceSchema,
    dimensions: BlueprintDimensionsSchema,
    spendCents: z.number().int().nonnegative(),
    leads: z.number().int().nonnegative(),
    appointments: z.number().int().nonnegative(),
    fundedOrClosed: z.number().int().nonnegative(),
    isTest: z.boolean(),
  })
  .strict();

export const BlueprintAggregateSchema = z
  .object({
    dimensions: BlueprintDimensionsSchema,
    sampleSize: z.number().int().positive(),
    tenantCount: z.number().int().positive(),
    spendCents: z.number().int().nonnegative(),
    leads: z.number().int().nonnegative(),
    appointments: z.number().int().nonnegative(),
    fundedOrClosed: z.number().int().nonnegative(),
  })
  .strict();

export const CohortEventNameSchema = z.enum([
  "purchased",
  "installed",
  "setup_started",
  "setup_blocked",
  "setup_resumed",
  "setup_abandoned",
  "permission_preflight_passed",
  "routing_verified",
  "meta_verified",
  "synthetic_lead_passed",
  "launch_ready",
  "first_generation",
  "first_approval",
  "first_publish",
  "first_lead",
  "first_appointment_or_application",
  "support_time_recorded",
  "continued",
]);

export const CohortEventSchema = z
  .object({
    eventRef: SafeReferenceSchema,
    tenantRef: SafeReferenceSchema,
    locationRef: SafeReferenceSchema,
    name: CohortEventNameSchema,
    occurredAt: TimestampSchema,
    blockerCode: z.string().min(1).max(80).nullable(),
    durationMinutes: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const LocationAuthorizationSchema = z
  .object({
    agencyRef: SafeReferenceSchema,
    locationRef: SafeReferenceSchema,
    appInstalled: z.boolean(),
    agencyInstallationAuthorized: z.boolean(),
    roleAuthorized: z.boolean(),
  })
  .strict();

export const RealtorCampaignAssignmentSchema = z
  .object({
    realtorRef: SafeReferenceSchema,
    campaignRef: SafeReferenceSchema,
    partnerRecordRef: SafeReferenceSchema,
    aggregateCountsEnabled: z.boolean(),
    minimumAggregateCount: z.number().int().positive(),
  })
  .strict();

export const RealtorCampaignProjectionSchema = z
  .object({
    campaignRef: SafeReferenceSchema,
    partnerRecordRef: SafeReferenceSchema,
    status: CampaignReportingRecordSchema.shape.status,
    approvalRef: SafeReferenceSchema.nullable(),
    approvedArtifactRefs: z.array(SafeReferenceSchema),
    aggregateLeads: z.number().int().nonnegative().nullable(),
    aggregateAppointments: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const CollaboratorAuditEventSchema = z
  .object({
    eventRef: SafeReferenceSchema,
    tenantRef: SafeReferenceSchema,
    realtorRef: SafeReferenceSchema,
    campaignRef: SafeReferenceSchema.nullable(),
    action: z.enum([
      "invited",
      "accepted",
      "session_started",
      "approved",
      "downloaded",
      "shared",
      "revoked",
    ]),
    occurredAt: TimestampSchema,
  })
  .strict();

export type ReportingMetricSource = z.infer<typeof ReportingMetricSourceSchema>;
export type ReportingMetric = z.infer<typeof ReportingMetricSchema>;
export type CampaignReportingRecord = z.infer<typeof CampaignReportingRecordSchema>;
export type ReportingException = z.infer<typeof ReportingExceptionSchema>;
export type BlueprintDimensions = z.infer<typeof BlueprintDimensionsSchema>;
export type BlueprintObservation = z.infer<typeof BlueprintObservationSchema>;
export type BlueprintAggregate = z.infer<typeof BlueprintAggregateSchema>;
export type CohortEventName = z.infer<typeof CohortEventNameSchema>;
export type CohortEvent = z.infer<typeof CohortEventSchema>;
export type LocationAuthorization = z.infer<typeof LocationAuthorizationSchema>;
export type RealtorCampaignAssignment = z.infer<typeof RealtorCampaignAssignmentSchema>;
export type RealtorCampaignProjection = z.infer<typeof RealtorCampaignProjectionSchema>;
export type CollaboratorAuditEvent = z.infer<typeof CollaboratorAuditEventSchema>;
