import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CampaignPersistenceError, campaignVersionContracts } from "../dist/index.js";
import { campaignManifestFixture } from "./campaign-manifest-fixture.mjs";

const now = new Date("2026-07-21T16:00:00.000Z");
const manifest = campaignManifestFixture;

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
