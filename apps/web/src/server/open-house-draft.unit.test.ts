import { describe, expect, it } from "vitest";

import { compileOpenHouseDraft } from "./open-house-draft.js";

const base = {
  address: "123 Main Street, Dallas",
  stateCode: "TX",
  propertyDescription: "A fully synthetic property description used for contract testing.",
  openHouseStartsAt: "2026-10-01T18:00:00.000Z",
  openHouseEndsAt: "2026-10-01T20:00:00.000Z",
  realtorDisplayName: "Jordan Smith",
  headline: "Tour this home this weekend",
  body: "Join us for the open house and explore the property in person.",
  callToAction: "Get open house details",
  disclosureText: "Equal Housing Opportunity. Additional lender disclosures apply.",
  consentText: "By submitting, you agree to be contacted about this property.",
  region: "Dallas-Fort Worth",
  dailyBudgetDollars: 25,
  totalBudgetDollars: 125,
  propertyPermissionConfirmed: true,
  realtorPermissionConfirmed: true,
};

describe("open house draft compiler", () => {
  it("builds a frozen production-contract version and passes deterministic preflight", async () => {
    const result = await compileOpenHouseDraft(base, {
      OALO_ENVIRONMENT: "local",
      OALO_PROVIDER_MODE: "stub",
      OALO_SYNTHETIC_DATA_ONLY: "true",
    });
    expect(result.version.manifest.blueprintId).toBe("open-house-boost");
    expect(result.version.manifest.meta.specialAdCategory).toBe("HOUSING");
    expect(result.preflight.blocking).toBe(false);
  });

  it("uses the real preflight rules to block missing attestations", async () => {
    const result = await compileOpenHouseDraft(
      { ...base, propertyPermissionConfirmed: false, realtorPermissionConfirmed: false },
      {
        OALO_ENVIRONMENT: "local",
        OALO_PROVIDER_MODE: "stub",
        OALO_SYNTHETIC_DATA_ONLY: "true",
      },
    );
    expect(result.preflight.blocking).toBe(true);
    expect(result.preflight.findings.map((item) => item.ruleCode)).toEqual(
      expect.arrayContaining(["PROPERTY_PERMISSION_REQUIRED", "PARTNER_PERMISSION_REQUIRED"]),
    );
  });
});
