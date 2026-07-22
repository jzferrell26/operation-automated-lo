import { z } from "zod";

import { deepFreeze, type DeepReadonly } from "../../ui-foundation/model/synthetic-ui.js";

const isoTimestamp = z.string().datetime({ offset: true });
const date = z.string().date();

const metricSchema = z
  .object({
    id: z.enum(["spend", "leads", "cost_per_lead", "appointments", "applications", "funded"]),
    label: z.string().min(1),
    value: z.string().min(1).nullable(),
    source: z.string().min(1),
    lastUpdatedAt: isoTimestamp,
  })
  .strict();

const authorizedTargetSchema = z
  .object({
    state: z.literal("authorized"),
    label: z.string().min(1),
    href: z.string().startsWith("/"),
    authority: z.string().min(1),
  })
  .strict();

const unavailableTargetSchema = z
  .object({
    state: z.literal("unavailable"),
    label: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

const campaignSchema = z
  .object({
    id: z.string().startsWith("synthetic-campaign-"),
    title: z.string().min(1),
    realtor: z.string().min(1),
    property: z.string().min(1),
    status: z.enum(["draft", "approved", "live", "completed"]),
    currentVersion: z.number().int().positive(),
    approvers: z.array(z.string().min(1)).min(1),
    publishedAt: isoTimestamp.nullable(),
    budget: z.string().min(1),
    eventDate: date,
    generationDate: date,
    publishDate: date.nullable(),
    excludedTestLeads: z.number().int().nonnegative(),
    metrics: z.array(metricSchema).length(6),
    package: z
      .object({
        page: z.string().min(1),
        pdf: z.string().min(1),
        qrDestination: z.string().min(1),
        creative: z.string().min(1),
        emailPackage: z.string().min(1),
        smsPackage: z.string().min(1),
        approval: z.string().min(1),
        metaState: z.string().min(1),
        leadCount: z.number().int().nonnegative(),
        ghlOutcomeSummary: z.string().min(1),
      })
      .strict(),
    targets: z.array(
      z.discriminatedUnion("state", [authorizedTargetSchema, unavailableTargetSchema]),
    ),
  })
  .strict();

const exceptionSchema = z
  .object({
    kind: z.enum([
      "token_failed",
      "meta_disconnected",
      "ad_disapproved",
      "reporting_stale",
      "lead_route_failed",
      "mapping_missing",
      "approval_aged",
      "reconciliation_gap",
    ]),
    code: z.string().startsWith("SYN_"),
    explanation: z.string().min(1),
    lastAttempt: isoTimestamp,
    correlationId: z.string().startsWith("syn-correlation-"),
    nextAction: z.string().min(1),
  })
  .strict();

export const blueprintDimensionOptions = [
  { key: "blueprintVersion", label: "Blueprint version" },
  { key: "offer", label: "Offer" },
  { key: "creativeVersion", label: "Creative version" },
  { key: "geographyClass", label: "Geography class" },
  { key: "budgetBand", label: "Budget band" },
  { key: "landingPageVersion", label: "Landing-page version" },
] as const;

const blueprintObservationSchema = z
  .object({
    id: z.string().startsWith("synthetic-blueprint-observation-"),
    blueprintVersion: z.string().min(1),
    offer: z.string().min(1),
    creativeVersion: z.string().min(1),
    geographyClass: z.string().min(1),
    budgetBand: z.string().min(1),
    landingPageVersion: z.string().min(1),
    sampleSize: z.number().int().positive(),
    privacyBuckets: z.array(z.string().startsWith("synthetic-privacy-bucket-")).min(1),
    leads: z.number().int().nonnegative(),
    appointments: z.number().int().nonnegative(),
    source: z.string().min(1),
    lastUpdatedAt: isoTimestamp,
  })
  .strict();

const cohortMilestoneLabels = [
  "Purchase",
  "Install",
  "Setup",
  "First generation",
  "First approval",
  "First publish",
  "First lead",
  "First appointment or application",
  "Support time",
  "Continuation",
  "Permission preflight",
  "Routing verification",
  "Meta verification",
  "Synthetic lead pass",
  "Launch Ready",
  "Blocker code",
  "Time to readiness",
] as const;

const cohortMilestoneSchema = z
  .object({
    label: z.enum(cohortMilestoneLabels),
    state: z.enum(["completed", "observed", "pending", "blocked"]),
    source: z.string().min(1),
    observedAt: isoTimestamp.nullable(),
    value: z.string().min(1).nullable(),
  })
  .strict()
  .refine((milestone) => milestone.observedAt !== null || milestone.value !== null, {
    message: "A cohort milestone requires timestamp or value evidence.",
  });

const cohortSchema = z
  .object({
    milestones: z.array(cohortMilestoneSchema).length(cohortMilestoneLabels.length),
    gateSummary: z.string().min(1),
  })
  .strict()
  .superRefine((cohort, context) => {
    const labels = new Set(cohort.milestones.map((milestone) => milestone.label));
    for (const label of cohortMilestoneLabels) {
      if (!labels.has(label)) {
        context.addIssue({ code: "custom", message: `Missing cohort milestone: ${label}` });
      }
    }
  });

const realtorAuditEventSchema = z.enum([
  "Invitation",
  "Acceptance",
  "Session",
  "Approval",
  "Download",
  "Share",
  "Revocation",
]);

const realtorAuditRecordSchema = z
  .object({
    id: z.string().startsWith("synthetic-realtor-audit-"),
    event: realtorAuditEventSchema,
    state: z.literal("recorded"),
    source: z.string().min(1),
    occurredAt: isoTimestamp,
  })
  .strict();

const projectionSchema = z
  .object({
    campaigns: z.array(campaignSchema).min(2),
    exceptions: z.array(exceptionSchema).length(8),
    blueprintLearning: z
      .object({
        dimensions: z.tuple([
          z.literal("Blueprint version"),
          z.literal("Offer"),
          z.literal("Creative version"),
          z.literal("Geography class"),
          z.literal("Budget band"),
          z.literal("Landing-page version"),
        ]),
        sampleSize: z.number().int().positive(),
        minimumSampleSize: z.number().int().positive(),
        minimumTenantCount: z.number().int().min(2),
        observations: z.array(blueprintObservationSchema).min(2),
        lowVolumeSuppressed: z.literal(true),
        containsTenantIdentity: z.literal(false),
        canMutateCampaigns: z.literal(false),
      })
      .strict(),
    cohort: cohortSchema,
    realtor: z
      .object({
        identity: z.string().min(1),
        assignmentSource: z.string().min(1),
        campaignTitle: z.string().min(1),
        status: z.string().min(1),
        approvalRequest: z.string().min(1),
        approvedArtifacts: z
          .array(z.object({ label: z.string().min(1), href: z.string().startsWith("/") }).strict())
          .min(1),
        sharingActions: z.tuple([
          z
            .object({
              id: z.literal("share-approved-link"),
              label: z.literal("Stage approved link share"),
              event: z.literal("Share"),
              target: z.string().min(1),
            })
            .strict(),
          z
            .object({
              id: z.literal("download-approved-creative"),
              label: z.literal("Stage approved creative download"),
              event: z.literal("Download"),
              target: z.string().min(1),
            })
            .strict(),
        ]),
        aggregateCountsEnabled: z.literal(false),
        minimumDataRule: z.number().int().positive(),
        auditHistory: z.array(realtorAuditRecordSchema).min(1),
        excludedData: z.tuple([
          z.literal("GHL contacts"),
          z.literal("Borrower details"),
          z.literal("Opportunity notes"),
          z.literal("Other Realtors and campaigns"),
          z.literal("Credentials and support data"),
          z.literal("Cross-tenant benchmarks"),
        ]),
      })
      .strict(),
  })
  .strict();

const commonMetricEvidence = {
  source: "Synthetic normalized campaign reporting projection",
  lastUpdatedAt: "2026-07-21T14:30:00.000Z",
} as const;

const rawProjection: unknown = {
  campaigns: [
    {
      id: "synthetic-campaign-cedar",
      title: "Cedar Street Open House Boost",
      realtor: "Jordan Lee",
      property: "214 Cedar Street",
      status: "live",
      currentVersion: 3,
      approvers: ["Synthetic Compliance Approver"],
      publishedAt: "2026-07-21T13:30:00.000Z",
      budget: "USD 25 daily",
      eventDate: "2026-07-27",
      generationDate: "2026-07-20",
      publishDate: "2026-07-21",
      excludedTestLeads: 2,
      metrics: [
        { id: "spend", label: "Spend", value: "USD 74.25", ...commonMetricEvidence },
        { id: "leads", label: "Leads", value: "12", ...commonMetricEvidence },
        { id: "cost_per_lead", label: "Cost per lead", value: "USD 6.19", ...commonMetricEvidence },
        { id: "appointments", label: "Appointments", value: "4", ...commonMetricEvidence },
        { id: "applications", label: "Applications", value: "3", ...commonMetricEvidence },
        { id: "funded", label: "Funded or closed", value: null, ...commonMetricEvidence },
      ],
      package: {
        page: "Approved page v3",
        pdf: "Approved PDF v3",
        qrDestination: "Approved public page v3",
        creative: "Feed and Story creative v3",
        emailPackage: "Email package v4",
        smsPackage: "SMS package v4",
        approval: "Campaign version 3 approved",
        metaState: "Connected, synthetic read-back current",
        leadCount: 12,
        ghlOutcomeSummary: "4 appointments, 3 applications, funded outcome unavailable",
      },
      targets: [
        {
          state: "authorized",
          label: "Public page",
          href: "/public/synthetic-open-house-v3",
          authority: "Approved public projection",
        },
        {
          state: "authorized",
          label: "Artifact",
          href: "/synthetic-assets/open-house-feed-v3.svg",
          authority: "Authorized immutable artifact",
        },
        {
          state: "authorized",
          label: "Provider entity",
          href: "/reports#provider-entity",
          authority: "Synthetic provider read permission",
        },
        {
          state: "authorized",
          label: "GHL contact",
          href: "/reports#ghl-contact",
          authority: "Synthetic location contact permission",
        },
        {
          state: "unavailable",
          label: "GHL opportunity",
          reason: "Current synthetic role lacks opportunity-detail permission.",
        },
      ],
    },
    {
      id: "synthetic-campaign-lake",
      title: "Lakeview Buyer Seminar",
      realtor: "Morgan Diaz",
      property: "88 Lakeview Avenue",
      status: "completed",
      currentVersion: 2,
      approvers: ["Synthetic Location Owner"],
      publishedAt: "2026-06-11T15:00:00.000Z",
      budget: "USD 18 daily",
      eventDate: "2026-06-15",
      generationDate: "2026-06-08",
      publishDate: "2026-06-11",
      excludedTestLeads: 1,
      metrics: [
        { id: "spend", label: "Spend", value: "USD 92.00", ...commonMetricEvidence },
        { id: "leads", label: "Leads", value: "9", ...commonMetricEvidence },
        {
          id: "cost_per_lead",
          label: "Cost per lead",
          value: "USD 10.22",
          ...commonMetricEvidence,
        },
        { id: "appointments", label: "Appointments", value: "2", ...commonMetricEvidence },
        { id: "applications", label: "Applications", value: "1", ...commonMetricEvidence },
        { id: "funded", label: "Funded or closed", value: "1", ...commonMetricEvidence },
      ],
      package: {
        page: "Approved page v2",
        pdf: "Approved PDF v2",
        qrDestination: "Approved public page v2",
        creative: "Feed creative v2",
        emailPackage: "Email package v2",
        smsPackage: "SMS package v2",
        approval: "Campaign version 2 approved",
        metaState: "Completed, synthetic provider state current",
        leadCount: 9,
        ghlOutcomeSummary: "2 appointments, 1 application, 1 funded outcome",
      },
      targets: [
        {
          state: "authorized",
          label: "Public page",
          href: "/public/synthetic-open-house-v3",
          authority: "Approved public projection",
        },
        {
          state: "unavailable",
          label: "Artifact",
          reason: "Artifact permission is unavailable for this synthetic role.",
        },
        {
          state: "unavailable",
          label: "Provider entity",
          reason: "Provider entity is unavailable after completion.",
        },
        {
          state: "unavailable",
          label: "GHL contact",
          reason: "Contact-level data is not permitted in this projection.",
        },
        {
          state: "unavailable",
          label: "GHL opportunity",
          reason: "Opportunity-level data is not permitted in this projection.",
        },
      ],
    },
  ],
  exceptions: [
    [
      "token_failed",
      "SYN_TOKEN_FAILED",
      "HighLevel token requires reconnect.",
      "Reconnect HighLevel",
    ],
    [
      "meta_disconnected",
      "SYN_META_DISCONNECTED",
      "Meta asset connection is unavailable.",
      "Reconnect the Meta asset",
    ],
    [
      "ad_disapproved",
      "SYN_AD_DISAPPROVED",
      "The synthetic ad read-back is disapproved.",
      "Review provider policy evidence",
    ],
    [
      "reporting_stale",
      "SYN_REPORTING_STALE",
      "Reporting evidence is outside freshness policy.",
      "Refresh reporting evidence",
    ],
    [
      "lead_route_failed",
      "SYN_LEAD_ROUTE_FAILED",
      "A synthetic lead route did not complete.",
      "Reconcile the lead route",
    ],
    [
      "mapping_missing",
      "SYN_MAPPING_MISSING",
      "A required routing mapping is missing.",
      "Open routing settings",
    ],
    [
      "approval_aged",
      "SYN_APPROVAL_AGED",
      "Approval evidence is older than policy permits.",
      "Request current approval",
    ],
    [
      "reconciliation_gap",
      "SYN_RECONCILIATION_GAP",
      "Provider and product evidence disagree.",
      "Run reconciliation",
    ],
  ].map(([kind, code, explanation, nextAction], index) => ({
    kind,
    code,
    explanation,
    lastAttempt: `2026-07-21T14:${String(10 + index).padStart(2, "0")}:00.000Z`,
    correlationId: `syn-correlation-report-${String(index + 1).padStart(2, "0")}`,
    nextAction,
  })),
  blueprintLearning: {
    dimensions: [
      "Blueprint version",
      "Offer",
      "Creative version",
      "Geography class",
      "Budget band",
      "Landing-page version",
    ],
    sampleSize: 33,
    minimumSampleSize: 20,
    minimumTenantCount: 2,
    observations: [
      {
        id: "synthetic-blueprint-observation-01",
        blueprintVersion: "Open House v3",
        offer: "Open house",
        creativeVersion: "Creative v3",
        geographyClass: "Metro",
        budgetBand: "USD 20-29 daily",
        landingPageVersion: "Landing page v3",
        sampleSize: 12,
        privacyBuckets: ["synthetic-privacy-bucket-01"],
        leads: 6,
        appointments: 2,
        source: "Synthetic normalized non-PII blueprint observations",
        lastUpdatedAt: "2026-07-21T14:30:00.000Z",
      },
      {
        id: "synthetic-blueprint-observation-02",
        blueprintVersion: "Open House v3",
        offer: "Open house",
        creativeVersion: "Creative v4",
        geographyClass: "Suburban",
        budgetBand: "USD 20-29 daily",
        landingPageVersion: "Landing page v3",
        sampleSize: 13,
        privacyBuckets: ["synthetic-privacy-bucket-02"],
        leads: 8,
        appointments: 3,
        source: "Synthetic normalized non-PII blueprint observations",
        lastUpdatedAt: "2026-07-21T14:32:00.000Z",
      },
      {
        id: "synthetic-blueprint-observation-03",
        blueprintVersion: "Seminar v2",
        offer: "Buyer seminar",
        creativeVersion: "Creative v2",
        geographyClass: "Metro",
        budgetBand: "USD 10-19 daily",
        landingPageVersion: "Landing page v2",
        sampleSize: 8,
        privacyBuckets: ["synthetic-privacy-bucket-03"],
        leads: 3,
        appointments: 1,
        source: "Synthetic normalized non-PII blueprint observations",
        lastUpdatedAt: "2026-07-21T14:35:00.000Z",
      },
    ],
    lowVolumeSuppressed: true,
    containsTenantIdentity: false,
    canMutateCampaigns: false,
  },
  cohort: {
    milestones: [
      ["Purchase", "completed", "2026-07-01T14:00:00.000Z", null],
      ["Install", "completed", "2026-07-01T15:00:00.000Z", null],
      ["Setup", "completed", "2026-07-02T16:00:00.000Z", null],
      ["First generation", "completed", "2026-07-03T17:00:00.000Z", null],
      ["First approval", "completed", "2026-07-04T18:00:00.000Z", null],
      ["First publish", "completed", "2026-07-05T19:00:00.000Z", null],
      ["First lead", "observed", "2026-07-06T20:00:00.000Z", "Synthetic test lead"],
      [
        "First appointment or application",
        "observed",
        "2026-07-07T21:00:00.000Z",
        "Synthetic appointment",
      ],
      ["Support time", "observed", null, "25 minutes staged locally, no saved record"],
      ["Continuation", "pending", null, "Not yet observed in the synthetic window"],
      ["Permission preflight", "completed", "2026-07-03T16:00:00.000Z", null],
      ["Routing verification", "completed", "2026-07-03T16:30:00.000Z", null],
      ["Meta verification", "blocked", null, "Live controlled-account read-back required"],
      ["Synthetic lead pass", "completed", "2026-07-06T20:00:00.000Z", null],
      ["Launch Ready", "blocked", null, "External live readiness is not claimed"],
      ["Blocker code", "blocked", null, "SYN_LIVE_VERIFICATION_REQUIRED"],
      ["Time to readiness", "pending", null, "Unavailable until Launch Ready"],
    ].map(([label, state, observedAt, value]) => ({
      label,
      state,
      source: "Synthetic founding-cohort event projection",
      observedAt,
      value,
    })),
    gateSummary:
      "Synthetic milestones provide repository evidence for PRD-001 gates. Live readiness remains blocked.",
  },
  realtor: {
    identity: "Jordan Lee",
    assignmentSource: "Explicit synthetic partner and campaign assignment",
    campaignTitle: "Cedar Street Open House Boost",
    status: "Live",
    approvalRequest: "Campaign version 3 approved",
    approvedArtifacts: [
      { label: "Public page v3", href: "/public/synthetic-open-house-v3" },
      { label: "Feed creative v3", href: "/synthetic-assets/open-house-feed-v3.svg" },
    ],
    sharingActions: [
      {
        id: "share-approved-link",
        label: "Stage approved link share",
        event: "Share",
        target: "Public page v3",
      },
      {
        id: "download-approved-creative",
        label: "Stage approved creative download",
        event: "Download",
        target: "Feed creative v3",
      },
    ],
    aggregateCountsEnabled: false,
    minimumDataRule: 10,
    auditHistory: [
      ["01", "Invitation", "2026-07-01T14:05:00.000Z"],
      ["02", "Acceptance", "2026-07-01T14:10:00.000Z"],
      ["03", "Session", "2026-07-01T14:15:00.000Z"],
      ["04", "Approval", "2026-07-04T18:00:00.000Z"],
      ["05", "Revocation", "2026-07-10T18:00:00.000Z"],
    ].map(([ordinal, event, occurredAt]) => ({
      id: `synthetic-realtor-audit-${ordinal}`,
      event,
      state: "recorded",
      source: "Synthetic Realtor lifecycle audit projection",
      occurredAt,
    })),
    excludedData: [
      "GHL contacts",
      "Borrower details",
      "Opportunity notes",
      "Other Realtors and campaigns",
      "Credentials and support data",
      "Cross-tenant benchmarks",
    ],
  },
};

export type ReportingAcceptanceProjection = z.infer<typeof projectionSchema>;
export type ReportingCampaign = ReportingAcceptanceProjection["campaigns"][number];
export type BlueprintDimension = (typeof blueprintDimensionOptions)[number]["key"];
export type RealtorAuditEvent = z.infer<typeof realtorAuditEventSchema>;
export type RealtorSharingAction =
  ReportingAcceptanceProjection["realtor"]["sharingActions"][number];

export type BlueprintGroupResult = Readonly<{
  dimension: BlueprintDimension;
  dimensionLabel: string;
  value: string;
  state: "available" | "suppressed";
  sampleSize: number;
  privacyBucketCount: number;
  leads: number | null;
  appointments: number | null;
  source: string;
  lastUpdatedAt: string;
}>;

let cachedProjection: DeepReadonly<ReportingAcceptanceProjection> | undefined;

export function loadReportingAcceptanceProjection(): DeepReadonly<ReportingAcceptanceProjection> {
  cachedProjection ??= deepFreeze(projectionSchema.parse(rawProjection));
  return cachedProjection;
}

export function filterReportingCampaigns(
  campaigns: readonly DeepReadonly<ReportingCampaign>[],
  filters: Readonly<{
    query: string;
    realtor: string;
    property: string;
    status: string;
    eventDate: string;
    generationDate: string;
    publishDate: string;
  }>,
): readonly DeepReadonly<ReportingCampaign>[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return campaigns.filter(
    (campaign) =>
      (query.length === 0 || campaign.title.toLocaleLowerCase().includes(query)) &&
      (filters.realtor.length === 0 || campaign.realtor === filters.realtor) &&
      (filters.property.length === 0 || campaign.property === filters.property) &&
      (filters.status.length === 0 || campaign.status === filters.status) &&
      (filters.eventDate.length === 0 || campaign.eventDate === filters.eventDate) &&
      (filters.generationDate.length === 0 || campaign.generationDate === filters.generationDate) &&
      (filters.publishDate.length === 0 || campaign.publishDate === filters.publishDate),
  );
}

export function groupBlueprintLearning(
  learning: DeepReadonly<ReportingAcceptanceProjection["blueprintLearning"]>,
  dimension: BlueprintDimension,
): readonly BlueprintGroupResult[] {
  const aggregates = new Map<
    string,
    {
      sampleSize: number;
      privacyBuckets: Set<string>;
      leads: number;
      appointments: number;
      source: string;
      lastUpdatedAt: string;
    }
  >();

  for (const observation of learning.observations) {
    const value = observation[dimension];
    const aggregate = aggregates.get(value) ?? {
      sampleSize: 0,
      privacyBuckets: new Set<string>(),
      leads: 0,
      appointments: 0,
      source: observation.source,
      lastUpdatedAt: observation.lastUpdatedAt,
    };
    aggregate.sampleSize += observation.sampleSize;
    aggregate.leads += observation.leads;
    aggregate.appointments += observation.appointments;
    for (const privacyBucket of observation.privacyBuckets) {
      aggregate.privacyBuckets.add(privacyBucket);
    }
    if (observation.lastUpdatedAt > aggregate.lastUpdatedAt) {
      aggregate.lastUpdatedAt = observation.lastUpdatedAt;
    }
    aggregates.set(value, aggregate);
  }

  const dimensionLabel = blueprintDimensionOptions.find(
    (option) => option.key === dimension,
  )?.label;
  if (!dimensionLabel) throw new Error(`Unsupported blueprint dimension: ${dimension}`);

  return [...aggregates.entries()]
    .map(([value, aggregate]) => {
      const isAvailable =
        aggregate.sampleSize >= learning.minimumSampleSize &&
        aggregate.privacyBuckets.size >= learning.minimumTenantCount;
      return {
        dimension,
        dimensionLabel,
        value,
        state: isAvailable ? "available" : "suppressed",
        sampleSize: aggregate.sampleSize,
        privacyBucketCount: aggregate.privacyBuckets.size,
        leads: isAvailable ? aggregate.leads : null,
        appointments: isAvailable ? aggregate.appointments : null,
        source: aggregate.source,
        lastUpdatedAt: aggregate.lastUpdatedAt,
      } satisfies BlueprintGroupResult;
    })
    .sort((left, right) => left.value.localeCompare(right.value));
}
