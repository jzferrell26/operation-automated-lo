import { REPORTING_METRIC_KEYS, buildCampaignReportingRecord } from "@oalo/application";
import { CampaignReportingRecordSchema, ReportingExceptionSchema } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

import { findVocabularyHits } from "./forbidden-vocabulary.js";
import {
  REPORTING_EXCEPTION_EXPLANATIONS,
  REPORTING_METRIC_DEFINITIONS,
} from "./reporting-messages.js";

/**
 * PRD-008c 008C-AC-005, the half a source scan cannot prove.
 *
 * The forbidden-vocabulary guard reads `reporting-messages.ts` like any other copy file and would
 * catch a banned word in a sentence that is written there. What it cannot catch is a sentence that
 * is missing: a reporting exception code with no entry is not a forbidden string, it is an empty
 * one. `reporting.ts` in the application layer now returns the code and no English, so these cases
 * pin that every code and every figure it can name has words, and that none of the words is one the
 * contract bans.
 */

describe("the reporting exception sentences", () => {
  it("names every code the shared contract allows, and no other", () => {
    expect(Object.keys(REPORTING_EXCEPTION_EXPLANATIONS).toSorted()).toEqual(
      [...ReportingExceptionSchema.shape.code.options].toSorted(),
    );
  });

  it("reads in the contract's voice and fits where an explanation is stored", () => {
    for (const [code, sentence] of Object.entries(REPORTING_EXCEPTION_EXPLANATIONS)) {
      expect(findVocabularyHits(sentence), `${code} reads "${sentence}"`).toEqual([]);
      expect(sentence, code).not.toContain("_");
      expect(sentence, code).toMatch(/\.$/u);
      expect(ReportingExceptionSchema.shape.explanation.safeParse(sentence).success, code).toBe(
        true,
      );
    }
  });

  it("tells the person what to do, not only what went wrong", () => {
    for (const [code, sentence] of Object.entries(REPORTING_EXCEPTION_EXPLANATIONS)) {
      expect(sentence.split(/(?<=\.)\s+/u).length, code).toBeGreaterThanOrEqual(2);
    }
  });
});

/**
 * Findings S1, S2, and S3 of the 2026-10-01 writing review, which no screen reads yet and which
 * have to be right before one does.
 *
 * "Check your routing settings" sent a loan officer to the one page they can find under that name,
 * "Follow-up routing". That page holds valuations, homeowner contact lookup, and report handoff,
 * and has no lead routing on it, so the pointer led nowhere. "Approve the new version." was
 * addressed to every reader, though only an approver or the workspace owner can approve, and a
 * campaign creator who read it was told to do something they cannot do.
 */
describe("the exception sentences that send a person somewhere or tell them to act", () => {
  it("point at no routing settings, because the page called routing has no lead routing on it", () => {
    for (const [code, sentence] of Object.entries(REPORTING_EXCEPTION_EXPLANATIONS)) {
      expect(sentence, code).not.toMatch(/routing settings/iu);
    }
  });

  it("sends a lead that could not be delivered to support", () => {
    expect(REPORTING_EXCEPTION_EXPLANATIONS.lead_route_failed).toBe(
      "A new lead couldn't be sent to the right person. Contact support so we can look into it.",
    );
  });

  it("sends a missing mapping to support, with no example the code does not give", () => {
    const sentence = REPORTING_EXCEPTION_EXPLANATIONS.mapping_missing;

    expect(sentence).toBe(
      "This campaign is missing something it needs from HighLevel. Contact support so we can look into it.",
    );
    expect(sentence).not.toMatch(/pipeline|calendar/iu);
  });

  it("does not tell a reader who cannot approve to approve", () => {
    expect(REPORTING_EXCEPTION_EXPLANATIONS.approval_stale).toBe(
      "This campaign changed after it was approved, so the approval no longer covers it. Approve the new version, or ask an approver to.",
    );
  });
});

describe("the reporting figure definitions", () => {
  it("names every figure a campaign's reporting record carries, in the order a screen lists them", () => {
    expect(Object.keys(CampaignReportingRecordSchema.shape.metrics.shape)).toEqual([
      ...REPORTING_METRIC_KEYS,
    ]);
    expect(Object.keys(REPORTING_METRIC_DEFINITIONS)).toEqual([...REPORTING_METRIC_KEYS]);
  });

  it("carries no forbidden word and no stored token", () => {
    for (const [key, definition] of Object.entries(REPORTING_METRIC_DEFINITIONS)) {
      expect(findVocabularyHits(definition), `${key} reads "${definition}"`).toEqual([]);
      expect(definition, key).not.toContain("_");
    }
  });
});

/**
 * Finding S4 of the 2026-10-01 writing review. The cost per lead definition said the figure "stays
 * blank until both numbers are available", but `buildCampaignReportingRecord` leaves it blank when
 * leads is zero even though spend and the lead count both exist. With $50 spent and no leads the
 * sentence was true and the figure was still blank. These cases read the real behavior, so the
 * sentence is held to what the code does rather than to what its author remembered.
 */
describe("the cost per lead definition", () => {
  const NOW = "2026-07-21T20:00:00.000Z";

  function costPerLead(spend: number | null, totalLeads: number | null, testLeads = 0) {
    return buildCampaignReportingRecord({
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
      publishedAt: NOW,
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
        spendCents: { value: spend, source: "meta", updatedAt: NOW },
        totalLeads: { value: totalLeads, source: "application", updatedAt: NOW },
        testLeads,
        appointments: { value: 0, source: "ghl", updatedAt: NOW },
        applications: { value: 0, source: "ghl", updatedAt: NOW },
        fundedOrClosed: { value: 0, source: "ghl", updatedAt: NOW },
      },
    }).metrics.costPerLeadCents.value;
  }

  it("is blank when there is no spend figure, no lead count, or no lead, and not otherwise", () => {
    expect(costPerLead(5_000, 0)).toBeNull();
    expect(costPerLead(5_000, 4, 4)).toBeNull();
    expect(costPerLead(null, 3)).toBeNull();
    expect(costPerLead(5_000, null)).toBeNull();
    expect(costPerLead(5_000, 4)).toBe(1_250);
    expect(costPerLead(0, 2)).toBe(0);
  });

  it("says it stays blank until the spend is known and there is at least one lead", () => {
    const definition = REPORTING_METRIC_DEFINITIONS.costPerLeadCents;

    expect(definition).toBe(
      "What each lead cost, worked out as spend divided by leads. It stays blank until the spend is known and there is at least one lead.",
    );
    expect(definition).not.toMatch(/both numbers/iu);
  });
});
