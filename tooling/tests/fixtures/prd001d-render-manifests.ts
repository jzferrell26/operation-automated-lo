import type { RenderManifest } from "@oalo/contracts";

const sha = (character: string): string => character.repeat(64);

export const commonRenderManifest: RenderManifest = {
  schemaVersion: 1,
  manifestRef: "manifest_01Golden",
  locationRef: "location_01TenantA",
  campaignRef: "campaign_01OpenHouse",
  campaignVersionRef: "version_01Approved",
  blueprintVersionRef: "blueprint_01Approved",
  consentDisclosureVersion: "disclosure_01Approved",
  profileVersions: {
    brand: "brand_01Approved",
    compliance: "compliance_01Approved",
    partner: "partner_01Approved",
    routing: "routing_01Approved",
  },
  renderer: { id: "oalo-playwright", version: "1.0.0" },
  browser: { id: "chromium", version: "140.0.0" },
  template: { id: "open-house-boost", version: "1.0.0" },
  fonts: [{ family: "Inter", version: "4.1", sha256: sha("f") }],
  creativeSafeZones: {
    metaSquare: { top: 0.05, right: 0.06, bottom: 0.05, left: 0.06 },
    metaStory: { top: 0.05, right: 0.08, bottom: 0.1, left: 0.08 },
  },
  publicContent: {
    headline: "Tour 123 Main Street",
    propertyAddress: "123 Main Street, Orlando, Florida 32801",
    propertyDescription: "A bright, fixture-backed home ready for its open house.",
    openHouseLabel: "Saturday, 1 PM to 3 PM",
    loanOfficerDisplayName: "Alex Morgan",
    realtorDisplayName: "Taylor Reed",
    disclosureBlocks: ["Equal Housing Opportunity."],
    callToActionLabel: "View the open house",
    destinationPath: "/c/campaign-public-01",
  },
  assets: [
    {
      assetRef: "asset_01Exterior",
      sha256: sha("a"),
      mimeType: "image/jpeg",
      width: 1600,
      height: 900,
      focalPoint: { x: 0.5, y: 0.5 },
      approvalStatus: "approved",
    },
  ],
};

export const renderingGoldenFixtures = Object.freeze({
  common: commonRenderManifest,
  longText: {
    ...commonRenderManifest,
    manifestRef: "manifest_02LongText",
    publicContent: {
      ...commonRenderManifest.publicContent,
      headline: "A thoughtfully restored home with room for work, rest, and gathering",
      propertyAddress:
        "12345 Extremely Long Historic Boulevard, Building Seven, Residence 1204, Orlando, Florida 32801",
      propertyDescription: "Long property narrative with verified facts and amenities. ".repeat(
        120,
      ),
      loanOfficerDisplayName: "Alexandria Morgan-Santiago",
      realtorDisplayName: "Taylor Reed-Washington",
      disclosureBlocks: ["Long required disclosure statement. ".repeat(90)],
    },
  },
  missingPhoto: {
    ...commonRenderManifest,
    manifestRef: "manifest_03MissingPhoto",
    assets: [],
  },
  portraitPhoto: {
    ...commonRenderManifest,
    manifestRef: "manifest_04PortraitPhoto",
    assets: [
      {
        ...commonRenderManifest.assets[0]!,
        assetRef: "asset_02Portrait",
        width: 900,
        height: 1600,
        focalPoint: { x: 0.5, y: 0.35 },
      },
    ],
  },
  multiDisclosure: {
    ...commonRenderManifest,
    manifestRef: "manifest_05MultiDisclosure",
    publicContent: {
      ...commonRenderManifest.publicContent,
      disclosureBlocks: [
        "Equal Housing Opportunity.",
        "Programs and rates are subject to change without notice.",
        "This is not a commitment to lend. Terms and conditions apply.",
      ],
    },
  },
} satisfies Readonly<Record<string, RenderManifest>>);
