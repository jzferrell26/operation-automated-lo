import {
  BlueprintAggregateSchema,
  CampaignReportingRecordSchema,
  CohortEventSchema,
  CollaboratorAuditEventSchema,
  RealtorCampaignProjectionSchema,
  ReportingExceptionSchema,
  type BlueprintAggregate,
  type BlueprintDimensions,
  type BlueprintObservation,
  type CampaignReportingRecord,
  type CohortEvent,
  type CohortEventName,
  type CollaboratorAuditEvent,
  type LocationAuthorization,
  type RealtorCampaignAssignment,
  type RealtorCampaignProjection,
  type ReportingException,
  type ReportingMetric,
  type ReportingMetricSource,
} from "@oalo/contracts";

export class ReportingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReportingError";
  }
}

export const REPORTING_METRIC_DEFINITIONS = Object.freeze({
  spendCents: "Provider-reported ad spend in minor currency units.",
  leads: "Accepted non-test lead submissions attributed to the campaign.",
  costPerLeadCents: "Spend divided by accepted non-test leads, unavailable when either is missing.",
  appointments: "Current GHL appointments attributed to the campaign.",
  applications: "Current GHL application-stage outcomes attributed to the campaign.",
  fundedOrClosed: "Current GHL funded or closed outcomes attributed to the campaign.",
});

interface RawMetric {
  readonly value: number | null;
  readonly source: ReportingMetricSource;
  readonly updatedAt: string | null;
}

export interface CampaignReportingInput extends Omit<
  CampaignReportingRecord,
  "metrics" | "excludedTestLeadCount"
> {
  readonly rawMetrics: {
    readonly spendCents: RawMetric;
    readonly totalLeads: RawMetric;
    readonly testLeads: number;
    readonly appointments: RawMetric;
    readonly applications: RawMetric;
    readonly fundedOrClosed: RawMetric;
  };
}

function metric(value: number | null, input: RawMetric): ReportingMetric {
  return { value, source: input.source, updatedAt: input.updatedAt };
}

export function buildCampaignReportingRecord(
  input: CampaignReportingInput,
): CampaignReportingRecord {
  if (!Number.isInteger(input.rawMetrics.testLeads) || input.rawMetrics.testLeads < 0) {
    throw new ReportingError("Test lead count must be a non-negative integer");
  }
  const totalLeads = input.rawMetrics.totalLeads.value;
  if (totalLeads !== null && input.rawMetrics.testLeads > totalLeads) {
    throw new ReportingError("Test lead count cannot exceed total leads");
  }
  const leads = totalLeads === null ? null : totalLeads - input.rawMetrics.testLeads;
  const spend = input.rawMetrics.spendCents.value;
  const costPerLead = spend === null || leads === null || leads === 0 ? null : spend / leads;
  const { rawMetrics, ...campaign } = input;
  return CampaignReportingRecordSchema.parse({
    ...campaign,
    metrics: {
      spendCents: metric(spend, rawMetrics.spendCents),
      leads: metric(leads, rawMetrics.totalLeads),
      costPerLeadCents: metric(costPerLead, {
        source: rawMetrics.spendCents.source,
        updatedAt: rawMetrics.spendCents.updatedAt,
        value: costPerLead,
      }),
      appointments: metric(rawMetrics.appointments.value, rawMetrics.appointments),
      applications: metric(rawMetrics.applications.value, rawMetrics.applications),
      fundedOrClosed: metric(rawMetrics.fundedOrClosed.value, rawMetrics.fundedOrClosed),
    },
    excludedTestLeadCount: rawMetrics.testLeads,
  });
}

export interface CampaignHistoryFilter {
  readonly tenantRef: string;
  readonly realtorRef?: string;
  readonly propertyRef?: string;
  readonly status?: CampaignReportingRecord["status"];
  readonly eventFrom?: string;
  readonly eventTo?: string;
  readonly generatedFrom?: string;
  readonly generatedTo?: string;
  readonly publishedFrom?: string;
  readonly publishedTo?: string;
  readonly search?: string;
}

function within(value: string | null, from?: string, to?: string): boolean {
  if (from === undefined && to === undefined) return true;
  if (value === null) return false;
  const timestamp = Date.parse(value);
  return (
    (from === undefined || timestamp >= Date.parse(from)) &&
    (to === undefined || timestamp <= Date.parse(to))
  );
}

export function filterCampaignHistory(
  records: readonly CampaignReportingRecord[],
  filter: CampaignHistoryFilter,
): CampaignReportingRecord[] {
  const search = filter.search?.trim().toLocaleLowerCase();
  return records.filter(
    (record) =>
      record.tenantRef === filter.tenantRef &&
      (filter.realtorRef === undefined || record.realtorRef === filter.realtorRef) &&
      (filter.propertyRef === undefined || record.propertyRef === filter.propertyRef) &&
      (filter.status === undefined || record.status === filter.status) &&
      within(record.eventAt, filter.eventFrom, filter.eventTo) &&
      within(record.generatedAt, filter.generatedFrom, filter.generatedTo) &&
      within(record.publishedAt, filter.publishedFrom, filter.publishedTo) &&
      (search === undefined || record.campaignRef.toLocaleLowerCase().includes(search)),
  );
}

const exceptionExplanations: Readonly<Record<ReportingException["code"], string>> = {
  token_expired: "The provider connection has expired.",
  token_failed: "The provider connection could not be verified.",
  meta_disconnected: "The selected advertising asset is disconnected.",
  ad_disapproved: "An advertising provider rejected the campaign.",
  reporting_stale: "Reporting data is older than the allowed freshness window.",
  lead_route_failed: "A lead could not be delivered through the approved route.",
  mapping_missing: "A required provider mapping is unavailable.",
  approval_stale: "The approval is older than the current campaign inputs.",
  reconciliation_gap: "Provider state does not match the local expected state.",
};

export function createReportingException(
  input: Omit<ReportingException, "explanation">,
): ReportingException {
  return ReportingExceptionSchema.parse({
    ...input,
    explanation: exceptionExplanations[input.code],
  });
}

export function buildSafeSupportNotification(exception: ReportingException): Readonly<{
  code: ReportingException["code"];
  locationRef: string;
  campaignRef: string | null;
  correlationRef: string;
  nextAction: string;
}> {
  const parsed = ReportingExceptionSchema.parse(exception);
  return Object.freeze({
    code: parsed.code,
    locationRef: parsed.locationRef,
    campaignRef: parsed.campaignRef,
    correlationRef: parsed.correlationRef,
    nextAction: parsed.nextAction,
  });
}

function dimensionsKey(dimensions: BlueprintDimensions): string {
  return [
    dimensions.blueprintVersion,
    dimensions.offer,
    dimensions.creativeVersion,
    dimensions.geographyClass,
    dimensions.budgetBand,
    dimensions.landingPageVersion,
  ].join("\u001f");
}

export function aggregateBlueprintMetrics(
  observations: readonly BlueprintObservation[],
  minimumSampleSize: number,
): BlueprintAggregate[] {
  if (!Number.isInteger(minimumSampleSize) || minimumSampleSize < 2) {
    throw new ReportingError("Cross-tenant minimum sample size must be an integer of at least two");
  }
  const groups = new Map<
    string,
    {
      dimensions: BlueprintDimensions;
      tenantRefs: Set<string>;
      sampleSize: number;
      spendCents: number;
      leads: number;
      appointments: number;
      fundedOrClosed: number;
    }
  >();
  for (const observation of observations) {
    if (observation.isTest) continue;
    const key = dimensionsKey(observation.dimensions);
    const group = groups.get(key) ?? {
      dimensions: observation.dimensions,
      tenantRefs: new Set<string>(),
      sampleSize: 0,
      spendCents: 0,
      leads: 0,
      appointments: 0,
      fundedOrClosed: 0,
    };
    group.tenantRefs.add(observation.tenantRef);
    group.sampleSize += 1;
    group.spendCents += observation.spendCents;
    group.leads += observation.leads;
    group.appointments += observation.appointments;
    group.fundedOrClosed += observation.fundedOrClosed;
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((group) => group.sampleSize >= minimumSampleSize && group.tenantRefs.size >= 2)
    .map((group) =>
      BlueprintAggregateSchema.parse({
        dimensions: group.dimensions,
        sampleSize: group.sampleSize,
        tenantCount: group.tenantRefs.size,
        spendCents: group.spendCents,
        leads: group.leads,
        appointments: group.appointments,
        fundedOrClosed: group.fundedOrClosed,
      }),
    );
}

export interface CohortSummary {
  readonly eventCounts: Readonly<Record<CohortEventName, number>>;
  readonly blockerCounts: Readonly<Record<string, number>>;
  readonly supportMinutes: number;
  readonly readinessMinutes: readonly number[];
}

const cohortEventNames = CohortEventSchema.shape.name.options;

export function summarizeCohortEvents(events: readonly CohortEvent[]): CohortSummary {
  const eventCounts = Object.fromEntries(cohortEventNames.map((name) => [name, 0])) as Record<
    CohortEventName,
    number
  >;
  const blockerCounts: Record<string, number> = {};
  const purchasedAt = new Map<string, number>();
  const readinessMinutes: number[] = [];
  let supportMinutes = 0;
  for (const unsafeEvent of events) {
    const event = CohortEventSchema.parse(unsafeEvent);
    eventCounts[event.name] += 1;
    const locationKey = `${event.tenantRef}:${event.locationRef}`;
    if (event.name === "purchased" && !purchasedAt.has(locationKey)) {
      purchasedAt.set(locationKey, Date.parse(event.occurredAt));
    }
    if (event.name === "launch_ready") {
      const start = purchasedAt.get(locationKey);
      if (start !== undefined)
        readinessMinutes.push((Date.parse(event.occurredAt) - start) / 60_000);
    }
    if (event.blockerCode !== null) {
      blockerCounts[event.blockerCode] = (blockerCounts[event.blockerCode] ?? 0) + 1;
    }
    if (event.name === "support_time_recorded" && event.durationMinutes !== null) {
      supportMinutes += event.durationMinutes;
    }
  }
  return { eventCounts, blockerCounts, supportMinutes, readinessMinutes };
}

export function authorizeAgencyPortfolio(
  agencyRef: string,
  requestedLocationRefs: readonly string[],
  authorizations: readonly LocationAuthorization[],
): Readonly<{ enabled: boolean; locationRefs: readonly string[] }> {
  const uniqueRequested = [...new Set(requestedLocationRefs)];
  if (uniqueRequested.length === 0) return Object.freeze({ enabled: false, locationRefs: [] });
  const permitted = new Set(
    authorizations
      .filter(
        (item) =>
          item.agencyRef === agencyRef &&
          item.appInstalled &&
          item.agencyInstallationAuthorized &&
          item.roleAuthorized,
      )
      .map((item) => item.locationRef),
  );
  const enabled = uniqueRequested.every((locationRef) => permitted.has(locationRef));
  return Object.freeze({ enabled, locationRefs: enabled ? uniqueRequested : [] });
}

export interface ReportingTargetAuthorization {
  readonly actorTenantRef: string;
  readonly actorLocationRefs: readonly string[];
  readonly record: CampaignReportingRecord;
  readonly providerPermission: boolean;
}

export function canOpenReportingTarget(input: ReportingTargetAuthorization): boolean {
  return (
    input.providerPermission &&
    input.actorTenantRef === input.record.tenantRef &&
    input.actorLocationRefs.includes(input.record.locationRef)
  );
}

export function projectRealtorCampaigns(
  realtorRef: string,
  records: readonly CampaignReportingRecord[],
  assignments: readonly RealtorCampaignAssignment[],
  tenantAllowsAggregateCounts: boolean,
): RealtorCampaignProjection[] {
  const assignmentByCampaign = new Map(
    assignments
      .filter((assignment) => assignment.realtorRef === realtorRef)
      .map((assignment) => [assignment.campaignRef, assignment]),
  );
  return records.flatMap((record) => {
    const assignment = assignmentByCampaign.get(record.campaignRef);
    if (assignment === undefined || record.realtorRef !== realtorRef) return [];
    const countsAllowed = tenantAllowsAggregateCounts && assignment.aggregateCountsEnabled;
    const leads = record.metrics.leads.value;
    const appointments = record.metrics.appointments.value;
    return [
      RealtorCampaignProjectionSchema.parse({
        campaignRef: record.campaignRef,
        partnerRecordRef: assignment.partnerRecordRef,
        status: record.status,
        approvalRef: record.approvalRef,
        approvedArtifactRefs:
          record.status === "approved" || record.status === "published"
            ? [
                record.artifactRefs.page,
                record.artifactRefs.pdf,
                ...record.artifactRefs.creative,
              ].filter((value): value is string => value !== null)
            : [],
        aggregateLeads:
          countsAllowed && leads !== null && leads >= assignment.minimumAggregateCount
            ? leads
            : null,
        aggregateAppointments:
          countsAllowed && appointments !== null && appointments >= assignment.minimumAggregateCount
            ? appointments
            : null,
      }),
    ];
  });
}

export interface CollaboratorAuditPort {
  append(event: CollaboratorAuditEvent): Promise<void>;
}

export async function recordCollaboratorAuditEvent(
  event: CollaboratorAuditEvent,
  port: CollaboratorAuditPort,
): Promise<void> {
  await port.append(CollaboratorAuditEventSchema.parse(event));
}
