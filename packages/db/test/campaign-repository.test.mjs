import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CampaignManifestSchema } from "@oalo/contracts";

import { CampaignPersistenceError, campaignVersionContracts } from "../dist/index.js";

const now = new Date("2026-07-21T16:00:00.000Z");
const manifest = CampaignManifestSchema.parse({
  schemaVersion: 1,
  blueprintId: "open-house-boost",
  property: {
    address: "123 Main Street",
    description: "A fixture-backed property.",
    openHouseStartsAt: "2026-07-25T18:00:00.000Z",
    openHouseEndsAt: "2026-07-25T20:00:00.000Z",
    stateCode: "TX",
    permissionConfirmed: true,
  },
  content: {
    headline: "Tour 123 Main Street",
    callToAction: "View the open house",
    disclosureText: "Equal Housing Opportunity.",
    consentText: "By submitting, you consent to contact.",
    body: "Join the open house.",
    claims: ["Open house information is subject to change."],
    mergeTokens: [],
    financingTerms: [],
  },
  images: [
    {
      assetRef: "asset_01Exterior",
      approvalStatus: "approved",
      width: 1_600,
      height: 900,
      altText: "Exterior of 123 Main Street",
    },
  ],
  partner: { realtorDisplayName: "Taylor Reed", permissionConfirmed: true },
  artifacts: {
    pageVersionRef: "page_01Approved",
    pdfVersionRef: "pdf_01Approved",
    creativeVersionRef: "creative_01Approved",
    copyVersionRef: "copy_01Approved",
    emailPackageVersionRef: "email_01Approved",
    smsPackageVersionRef: "sms_01Approved",
    disclosureVersionRef: "disclosure_01Approved",
    formVersionRef: "form_01Approved",
    destinationVersionRef: "destination_01Approved",
    qrDestinationVersionRef: "destination_01Approved",
  },
  meta: {
    enabled: true,
    specialAdCategory: "HOUSING",
    platform: "meta",
    targeting: {
      country: "US",
      regions: ["Texas"],
      zipCodes: [],
      customAudienceRefs: [],
      protectedDimensions: [],
    },
    dailyBudgetMinor: 2_000,
    totalBudgetMinor: 10_000,
  },
  routing: { mappingVersionRef: "mapping_01Routing", validationStatus: "valid" },
});

const versionRow = Object.freeze({
  location_ref: "location_01TenantA",
  campaign_ref: "campaign_01OpenHouse",
  campaign_version_ref: "version_01Campaign",
  version_no: 1,
  source_campaign_ref: null,
  input_versions: Object.freeze({
    blueprintVersionRef: "blueprint_01OpenHouse",
    brandProfileVersionRef: "profile_01Brand",
    complianceProfileVersionRef: "profile_01Compliance",
    partnerProfileVersionRef: "profile_01Partner",
    routingProfileVersionRef: "profile_01Routing",
    rulesetVersionRef: "ruleset_01Policy",
  }),
  manifest,
  manifest_hash: "a".repeat(64),
  created_by_actor_ref: "user_01Creator",
  created_at: now,
});

describe("campaign persistence SQL contracts", () => {
  it("decodes a complete campaign version row", () => {
    assert.deepEqual(campaignVersionContracts.selectVersionContract.decode(versionRow), {
      schemaVersion: 1,
      locationRef: "location_01TenantA",
      campaignRef: "campaign_01OpenHouse",
      campaignVersionRef: "version_01Campaign",
      versionNo: 1,
      inputVersions: versionRow.input_versions,
      manifest,
      manifestHash: "a".repeat(64),
      createdBy: "user_01Creator",
      createdAt: now.toISOString(),
    });
  });

  it("fails closed when a required version field is absent", () => {
    const { campaign_ref: _omitted, ...missing } = versionRow;
    assert.throws(
      () => campaignVersionContracts.selectVersionContract.decode(missing),
      (error) => error instanceof CampaignPersistenceError && error.code === "CAMPAIGN_ROW_INVALID",
    );
  });

  it("decodes a complete preflight row", () => {
    const row = Object.freeze({
      campaign_ref: "campaign_01OpenHouse",
      campaign_version_ref: "version_01Campaign",
      manifest_hash: "a".repeat(64),
      input_versions: versionRow.input_versions,
      ruleset_version_ref: "ruleset_01Policy",
      findings: [],
      blocking: false,
      result_hash: "c".repeat(64),
      evaluated_at: now,
    });
    assert.equal(
      campaignVersionContracts.selectPreflightContract.decode(row).resultHash,
      "c".repeat(64),
    );
  });
});
