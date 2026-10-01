import { describe, expect, it } from "vitest";

import { CampaignManifestSchema } from "@oalo/contracts";

/**
 * PRD-008b D1, 008B-AC-009. What a campaign version's `images` may be.
 *
 * Open House Boost has no photo intake, so a version saved now records no image, and the schema
 * lost its `.min(1)` to let that be a true record. Removing a lower bound is the kind of change
 * that quietly loosens more than it meant to, so this pins the whole shape: an empty list is
 * accepted, a list with up to twenty well-formed images is accepted, and everything else about the
 * field is still refused. The key is still required, because an absent list is not the same fact as
 * an empty one.
 */

const IMAGE = {
  assetRef: "asset_01Exterior",
  approvalStatus: "approved",
  width: 1_600,
  height: 900,
  altText: "Exterior of 123 Main Street",
} as const;

function manifestWith(images: unknown): Record<string, unknown> {
  return {
    schemaVersion: 1,
    blueprintId: "open-house-boost",
    property: {
      address: "123 Main Street",
      description: "A property used to pin the manifest contract.",
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
      body: "Join us for an open house.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images,
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
  };
}

function accepts(images: unknown): boolean {
  return CampaignManifestSchema.safeParse(manifestWith(images)).success;
}

describe("the images a campaign version records", () => {
  it("accepts none, because a version records only what a person supplied", () => {
    expect(accepts([])).toBe(true);
    expect(CampaignManifestSchema.parse(manifestWith([])).images).toEqual([]);
  });

  it("accepts well-formed images, up to twenty of them", () => {
    expect(accepts([IMAGE])).toBe(true);
    expect(accepts(Array.from({ length: 20 }, () => IMAGE))).toBe(true);
  });

  it("refuses more than twenty", () => {
    expect(accepts(Array.from({ length: 21 }, () => IMAGE))).toBe(false);
  });

  it("still requires the key: an absent list is not an empty one", () => {
    const { images: _images, ...withoutImages } = manifestWith([]);

    expect(CampaignManifestSchema.safeParse(withoutImages).success).toBe(false);
    expect(accepts(undefined)).toBe(false);
  });

  it.each([
    ["null", null],
    ["an object", { 0: IMAGE }],
    ["a string", "asset_01Exterior"],
    ["a number", 1],
    ["a single image that is not in a list", IMAGE],
  ])("refuses %s in place of a list", (_what, value) => {
    expect(accepts(value)).toBe(false);
  });

  it.each([
    ["an image with no asset reference", { ...IMAGE, assetRef: undefined }],
    [
      "an asset reference that is not an opaque reference",
      { ...IMAGE, assetRef: "not a reference" },
    ],
    ["an approval status the product does not have", { ...IMAGE, approvalStatus: "ready" }],
    ["a zero width", { ...IMAGE, width: 0 }],
    ["a fractional height", { ...IMAGE, height: 900.5 }],
    ["a negative width", { ...IMAGE, width: -1 }],
    ["alt text over 500 characters", { ...IMAGE, altText: "a".repeat(501) }],
    ["a null item", null],
    ["a string item", "asset_01Exterior"],
    ["an item with a key the schema does not name", { ...IMAGE, caption: "Front of the house" }],
  ])("refuses a list holding %s", (_what, item) => {
    expect(accepts([IMAGE, item])).toBe(false);
  });

  it("refuses a well-formed image when another item beside it is malformed", () => {
    expect(accepts([IMAGE, {}])).toBe(false);
  });
});
