import { describe, expect, it, vi } from "vitest";

import {
  REPORTING_METRIC_DEFINITIONS,
  ReportingError,
  aggregateBlueprintMetrics,
  authorizeAgencyPortfolio,
  buildCampaignReportingRecord,
  buildSafeSupportNotification,
  canOpenReportingTarget,
  createReportingException,
  filterCampaignHistory,
  projectRealtorCampaigns,
  recordCollaboratorAuditEvent,
  summarizeCohortEvents,
  type CampaignReportingInput,
} from "@oalo/application";
import type {
  BlueprintDimensions,
  BlueprintObservation,
  CampaignReportingRecord,
  CohortEvent,
  CollaboratorAuditEvent,
  LocationAuthorization,
  RealtorCampaignAssignment,
} from "@oalo/contracts";

const now = "2026-07-21T20:00:00.000Z";

function reportingInput(overrides: Partial<CampaignReportingInput> = {}): CampaignReportingInput {
  return {
    tenantRef: "tenant_01Alpha",
    locationRef: "location_01Alpha",
    campaignRef: "campaign_01Alpha",
    currentVersion: 2,
    status: "published",
    approverRefs: ["operator_01Alpha"],
    realtorRef: "realtor_01Alpha",
    propertyRef: "property_01Alpha",
    eventAt: "2026-07-22T20:00:00.000Z",
    generatedAt: "2026-07-20T20:00:00.000Z",
    publishedAt: now,
    budgetCents: 25_000,
    artifactRefs: {
      page: "artifact_page_01",
      pdf: "artifact_pdf_01",
      qrDestination: "destination_qr_01",
      creative: ["artifact_creative_01"],
      emailPackage: "artifact_email_01",
      smsPackage: "artifact_sms_01",
    },
    approvalRef: "approval_01Alpha",
    metaEntityRef: "meta_ad_01Alpha",
    rawMetrics: {
      spendCents: { value: 800, source: "meta", updatedAt: now },
      totalLeads: { value: 10, source: "application", updatedAt: now },
      testLeads: 2,
      appointments: { value: 4, source: "ghl", updatedAt: now },
      applications: { value: 3, source: "ghl", updatedAt: now },
      fundedOrClosed: { value: 1, source: "ghl", updatedAt: now },
    },
    ...overrides,
  };
}

function record(overrides: Partial<CampaignReportingInput> = {}): CampaignReportingRecord {
  return buildCampaignReportingRecord(reportingInput(overrides));
}

describe("campaign reporting", () => {
  it("documents metrics, excludes test leads, derives CPL, and preserves source freshness", () => {
    const result = record();
    expect(Object.keys(REPORTING_METRIC_DEFINITIONS)).toEqual([
      "spendCents",
      "leads",
      "costPerLeadCents",
      "appointments",
      "applications",
      "fundedOrClosed",
    ]);
    expect(result.metrics).toMatchObject({
      spendCents: { value: 800, source: "meta", updatedAt: now },
      leads: { value: 8, source: "application", updatedAt: now },
      costPerLeadCents: { value: 100, source: "meta", updatedAt: now },
    });
    expect(result.excludedTestLeadCount).toBe(2);
  });

  it("keeps missing or denominator-free metrics unavailable instead of zero", () => {
    const missingSpend = record({
      rawMetrics: {
        ...reportingInput().rawMetrics,
        spendCents: { value: null, source: "meta", updatedAt: null },
      },
    });
    const missingLeads = record({
      rawMetrics: {
        ...reportingInput().rawMetrics,
        totalLeads: { value: null, source: "application", updatedAt: null },
        testLeads: 0,
      },
    });
    const zeroLeads = record({
      rawMetrics: {
        ...reportingInput().rawMetrics,
        totalLeads: { value: 0, source: "application", updatedAt: now },
        testLeads: 0,
      },
    });
    expect(missingSpend.metrics.costPerLeadCents.value).toBeNull();
    expect(missingLeads.metrics.leads.value).toBeNull();
    expect(missingLeads.metrics.costPerLeadCents.value).toBeNull();
    expect(zeroLeads.metrics.costPerLeadCents.value).toBeNull();
  });

  it.each([-1, 0.5])("rejects invalid test-lead count %s", (testLeads) => {
    expect(() => record({ rawMetrics: { ...reportingInput().rawMetrics, testLeads } })).toThrow(
      ReportingError,
    );
  });

  it("rejects a test-lead count greater than provider total", () => {
    expect(() =>
      record({
        rawMetrics: {
          ...reportingInput().rawMetrics,
          totalLeads: { value: 1, source: "application", updatedAt: now },
          testLeads: 2,
        },
      }),
    ).toThrow("cannot exceed");
  });

  it("filters tenant history across supported dimensions and date ranges", () => {
    const matching = record();
    const other = record({ campaignRef: "campaign_02Other", propertyRef: "property_02Other" });
    const filter = {
      tenantRef: matching.tenantRef,
      realtorRef: "realtor_01Alpha",
      propertyRef: "property_01Alpha",
      status: matching.status,
      eventFrom: "2026-07-22T00:00:00.000Z",
      eventTo: "2026-07-23T00:00:00.000Z",
      generatedFrom: "2026-07-20T00:00:00.000Z",
      generatedTo: "2026-07-21T00:00:00.000Z",
      publishedFrom: "2026-07-21T00:00:00.000Z",
      publishedTo: "2026-07-22T00:00:00.000Z",
      search: "  01ALPHA ",
    } as const;
    expect(filterCampaignHistory([matching, other], filter)).toEqual([matching]);
    expect(filterCampaignHistory([matching], { tenantRef: "tenant_02Other" })).toEqual([]);
    expect(filterCampaignHistory([matching], { tenantRef: matching.tenantRef })).toEqual([
      matching,
    ]);
  });

  it("rejects null or out-of-range dates when a date filter is active", () => {
    const noDates = record({ eventAt: null, publishedAt: null });
    expect(
      filterCampaignHistory([noDates], {
        tenantRef: noDates.tenantRef,
        eventFrom: now,
      }),
    ).toEqual([]);
    expect(
      filterCampaignHistory([record()], {
        tenantRef: "tenant_01Alpha",
        publishedFrom: "2026-07-22T00:00:00.000Z",
      }),
    ).toEqual([]);
    expect(
      filterCampaignHistory([record()], {
        tenantRef: "tenant_01Alpha",
        publishedTo: "2026-07-20T00:00:00.000Z",
      }),
    ).toEqual([]);
  });

  it("creates stable safe exceptions and strips narrative data from notifications", () => {
    const exception = createReportingException({
      exceptionRef: "exception_01Alpha",
      tenantRef: "tenant_01Alpha",
      locationRef: "location_01Alpha",
      campaignRef: "campaign_01Alpha",
      code: "lead_route_failed",
      lastAttemptAt: now,
      correlationRef: "correlation_01Alpha",
      nextAction: "retry_lead_route",
    });
    expect(exception.explanation).toBe("A lead could not be delivered through the approved route.");
    expect(buildSafeSupportNotification(exception)).toEqual({
      code: "lead_route_failed",
      locationRef: "location_01Alpha",
      campaignRef: "campaign_01Alpha",
      correlationRef: "correlation_01Alpha",
      nextAction: "retry_lead_route",
    });
    expect(buildSafeSupportNotification(exception)).not.toHaveProperty("tenantRef");
    expect(buildSafeSupportNotification(exception)).not.toHaveProperty("explanation");
  });
});

const dimensions: BlueprintDimensions = {
  blueprintVersion: "blueprint-v1",
  offer: "open-house",
  creativeVersion: "creative-v2",
  geographyClass: "suburban",
  budgetBand: "medium",
  landingPageVersion: "landing-v3",
};

function observation(
  tenantRef: string,
  campaignRef: string,
  overrides: Partial<BlueprintObservation> = {},
): BlueprintObservation {
  return {
    tenantRef,
    campaignRef,
    dimensions,
    spendCents: 100,
    leads: 2,
    appointments: 1,
    fundedOrClosed: 0,
    isTest: false,
    ...overrides,
  };
}

describe("portfolio aggregation", () => {
  it.each([1, 2.5])("rejects unsafe minimum sample size %s", (minimum) => {
    expect(() => aggregateBlueprintMetrics([], minimum)).toThrow(ReportingError);
  });

  it("suppresses test, low-volume, and single-tenant groups while omitting tenant identity", () => {
    const output = aggregateBlueprintMetrics(
      [
        observation("tenant_01Alpha", "campaign_01Alpha"),
        observation("tenant_02Beta", "campaign_02Beta", { leads: 3, fundedOrClosed: 1 }),
        observation("tenant_03Gamma", "campaign_03Gamma", { isTest: true }),
        observation("tenant_01Alpha", "campaign_04Alpha", {
          dimensions: { ...dimensions, offer: "single-tenant" },
        }),
        observation("tenant_01Alpha", "campaign_05Alpha", {
          dimensions: { ...dimensions, offer: "single-tenant" },
        }),
      ],
      2,
    );
    expect(output).toEqual([
      {
        dimensions,
        sampleSize: 2,
        tenantCount: 2,
        spendCents: 200,
        leads: 5,
        appointments: 2,
        fundedOrClosed: 1,
      },
    ]);
    expect(output[0]).not.toHaveProperty("tenantRef");
    expect(output[0]).not.toHaveProperty("campaignRef");
  });

  it("suppresses a multi-tenant group below the configured sample floor", () => {
    expect(
      aggregateBlueprintMetrics(
        [
          observation("tenant_01Alpha", "campaign_01Alpha"),
          observation("tenant_02Beta", "campaign_02Beta"),
        ],
        3,
      ),
    ).toEqual([]);
  });
});

function cohortEvent(
  name: CohortEvent["name"],
  occurredAt: string,
  overrides: Partial<CohortEvent> = {},
): CohortEvent {
  return {
    eventRef: `event_${name}_01`,
    tenantRef: "tenant_01Alpha",
    locationRef: "location_01Alpha",
    name,
    occurredAt,
    blockerCode: null,
    durationMinutes: null,
    ...overrides,
  };
}

describe("cohort and authorization reporting", () => {
  it("counts the full funnel, blockers, support time, and time to readiness", () => {
    const summary = summarizeCohortEvents([
      cohortEvent("purchased", "2026-07-21T20:00:00.000Z"),
      cohortEvent("purchased", "2026-07-21T20:01:00.000Z"),
      cohortEvent("setup_blocked", "2026-07-21T20:05:00.000Z", { blockerCode: "mapping_missing" }),
      cohortEvent("setup_blocked", "2026-07-21T20:06:00.000Z", { blockerCode: "mapping_missing" }),
      cohortEvent("launch_ready", "2026-07-21T20:30:00.000Z"),
      cohortEvent("support_time_recorded", "2026-07-21T20:31:00.000Z", { durationMinutes: 12 }),
      cohortEvent("support_time_recorded", "2026-07-21T20:32:00.000Z"),
    ]);
    expect(summary.eventCounts).toMatchObject({ purchased: 2, setup_blocked: 2, launch_ready: 1 });
    expect(summary.blockerCounts).toEqual({ mapping_missing: 2 });
    expect(summary.supportMinutes).toBe(12);
    expect(summary.readinessMinutes).toEqual([30]);
  });

  it("does not derive readiness time when purchase evidence is absent", () => {
    expect(summarizeCohortEvents([cohortEvent("launch_ready", now)]).readinessMinutes).toEqual([]);
  });

  it("enables agency rollup only when every requested installed location is authorized", () => {
    const authorizations: LocationAuthorization[] = [
      {
        agencyRef: "agency_01Alpha",
        locationRef: "location_01Alpha",
        appInstalled: true,
        agencyInstallationAuthorized: true,
        roleAuthorized: true,
      },
      {
        agencyRef: "agency_01Alpha",
        locationRef: "location_02Beta",
        appInstalled: false,
        agencyInstallationAuthorized: true,
        roleAuthorized: true,
      },
      {
        agencyRef: "agency_02Other",
        locationRef: "location_03Gamma",
        appInstalled: true,
        agencyInstallationAuthorized: true,
        roleAuthorized: true,
      },
      {
        agencyRef: "agency_01Alpha",
        locationRef: "location_04Delta",
        appInstalled: true,
        agencyInstallationAuthorized: false,
        roleAuthorized: true,
      },
      {
        agencyRef: "agency_01Alpha",
        locationRef: "location_05Epsilon",
        appInstalled: true,
        agencyInstallationAuthorized: true,
        roleAuthorized: false,
      },
    ];
    expect(authorizeAgencyPortfolio("agency_01Alpha", [], authorizations)).toEqual({
      enabled: false,
      locationRefs: [],
    });
    expect(
      authorizeAgencyPortfolio(
        "agency_01Alpha",
        ["location_01Alpha", "location_01Alpha"],
        authorizations,
      ),
    ).toEqual({ enabled: true, locationRefs: ["location_01Alpha"] });
    expect(
      authorizeAgencyPortfolio(
        "agency_01Alpha",
        ["location_01Alpha", "location_02Beta"],
        authorizations,
      ),
    ).toEqual({ enabled: false, locationRefs: [] });
  });

  it.each([
    [true, "tenant_01Alpha", ["location_01Alpha"], true],
    [false, "tenant_01Alpha", ["location_01Alpha"], false],
    [true, "tenant_02Other", ["location_01Alpha"], false],
    [true, "tenant_01Alpha", ["location_02Other"], false],
  ] as const)(
    "enforces target permission %s, tenant %s, and locations %j",
    (providerPermission, actorTenantRef, actorLocationRefs, expected) => {
      expect(
        canOpenReportingTarget({
          providerPermission,
          actorTenantRef,
          actorLocationRefs,
          record: record(),
        }),
      ).toBe(expected);
    },
  );
});

describe("Realtor collaborator reporting", () => {
  const assignment: RealtorCampaignAssignment = {
    realtorRef: "realtor_01Alpha",
    campaignRef: "campaign_01Alpha",
    partnerRecordRef: "partner_record_01Alpha",
    aggregateCountsEnabled: true,
    minimumAggregateCount: 3,
  };

  it("projects only assigned safe fields and approved artifacts", () => {
    const output = projectRealtorCampaigns("realtor_01Alpha", [record()], [assignment], true);
    expect(output).toEqual([
      {
        campaignRef: "campaign_01Alpha",
        partnerRecordRef: "partner_record_01Alpha",
        status: "published",
        approvalRef: "approval_01Alpha",
        approvedArtifactRefs: ["artifact_page_01", "artifact_pdf_01", "artifact_creative_01"],
        aggregateLeads: 8,
        aggregateAppointments: 4,
      },
    ]);
    expect(output[0]).not.toHaveProperty("tenantRef");
    expect(output[0]).not.toHaveProperty("metaEntityRef");
  });

  it("defaults counts off, suppresses low counts, and hides unapproved artifacts", () => {
    const low = record({
      status: "draft",
      rawMetrics: {
        ...reportingInput().rawMetrics,
        totalLeads: { value: 2, source: "application", updatedAt: now },
        testLeads: 0,
        appointments: { value: null, source: "ghl", updatedAt: null },
      },
    });
    expect(projectRealtorCampaigns("realtor_01Alpha", [low], [assignment], true)[0]).toMatchObject({
      approvedArtifactRefs: [],
      aggregateLeads: null,
      aggregateAppointments: null,
    });
    expect(
      projectRealtorCampaigns("realtor_01Alpha", [record()], [assignment], false)[0],
    ).toMatchObject({
      aggregateLeads: null,
      aggregateAppointments: null,
    });
    expect(
      projectRealtorCampaigns(
        "realtor_01Alpha",
        [record()],
        [{ ...assignment, aggregateCountsEnabled: false }],
        true,
      )[0],
    ).toMatchObject({ aggregateLeads: null, aggregateAppointments: null });
  });

  it("omits unassigned and identity-mismatched campaigns", () => {
    expect(projectRealtorCampaigns("realtor_02Other", [record()], [assignment], true)).toEqual([]);
    expect(
      projectRealtorCampaigns(
        "realtor_01Alpha",
        [record({ realtorRef: "realtor_02Other" })],
        [assignment],
        true,
      ),
    ).toEqual([]);
  });

  it("audits collaborator lifecycle events through a narrow port", async () => {
    const append = vi.fn();
    const event: CollaboratorAuditEvent = {
      eventRef: "event_collaborator_01",
      tenantRef: "tenant_01Alpha",
      realtorRef: "realtor_01Alpha",
      campaignRef: "campaign_01Alpha",
      action: "shared",
      occurredAt: now,
    };
    await recordCollaboratorAuditEvent(event, { append });
    expect(append).toHaveBeenCalledWith(event);
  });
});
