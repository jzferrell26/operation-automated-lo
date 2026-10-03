import { createHash } from "node:crypto";

import { createCampaignVersion, type CampaignVersionRepository } from "@oalo/application";
import type { CampaignInputVersions, CampaignVersion, PreflightRules } from "@oalo/contracts";

/**
 * A library-ad manifest written out by hand, field for field, so the contract tests do not depend
 * on the builder they are meant to check. `libraryAdManifestInput` takes the handful of values a
 * test needs to vary and returns a fresh object.
 */

export const TALL_DIGEST = "1".repeat(64);
export const SQUARE_DIGEST = "2".repeat(64);

export function imageRef(id: string, version: number, shape: string, sha256: string): string {
  const digest = createHash("sha256")
    .update(`${id}:${String(version)}:${shape}:${sha256}`)
    .digest("hex");
  return `libimg_${digest.slice(0, 40)}`;
}

export interface LibraryAdVariation {
  readonly id?: string;
  readonly version?: number;
  readonly headline?: string;
  readonly body?: string;
  readonly disclosureText?: string;
  readonly tallSha256?: string;
  readonly squareSha256?: string;
  readonly advertiserName?: string;
  readonly startsAt?: string | null;
  readonly endsAt?: string;
  readonly cities?: readonly string[];
}

export function libraryAdManifestInput(variation: LibraryAdVariation = {}) {
  const id = variation.id ?? "sample-first-home";
  const version = variation.version ?? 1;
  const tallSha256 = variation.tallSha256 ?? TALL_DIGEST;
  const squareSha256 = variation.squareSha256 ?? SQUARE_DIGEST;
  return {
    schemaVersion: 1 as const,
    blueprintId: "library-ad" as const,
    libraryAd: { id, version },
    content: {
      headline: variation.headline ?? "Buying your first home? Start with a plan.",
      body: variation.body ?? "I help first-time buyers understand every step of the way.",
      callToAction: "LEARN_MORE" as const,
      disclosureText: variation.disclosureText ?? "Equal Housing Opportunity.",
      consentText:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images: [
      {
        shape: "tall" as const,
        assetRef: imageRef(id, version, "tall", tallSha256),
        approvalStatus: "approved" as const,
        width: 1_080,
        height: 1_080,
        altText: "A house drawn in simple shapes under a large mark",
        contentSha256: tallSha256,
      },
      {
        shape: "square" as const,
        assetRef: imageRef(id, version, "square", squareSha256),
        approvalStatus: "approved" as const,
        width: 1_080,
        height: 842,
        altText: "A house drawn in simple shapes under a large mark",
        contentSha256: squareSha256,
      },
    ],
    advertiser: {
      name: variation.advertiserName ?? "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
    },
    schedule: {
      startsAt: variation.startsAt === undefined ? null : variation.startsAt,
      endsAt: variation.endsAt ?? "2026-10-15T23:59:00.000Z",
    },
    meta: {
      enabled: true,
      specialAdCategory: "HOUSING" as const,
      platform: "meta" as const,
      placements: ["facebook_feed"] as ["facebook_feed"],
      targeting: {
        country: "US" as const,
        regions: ["TX"],
        cities: [...(variation.cities ?? ["Austin, TX"])],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: 2_500,
      totalBudgetMinor: 35_000,
    },
    routing: { mappingVersionRef: "routingmapping_local001", validationStatus: "valid" as const },
  };
}

export const LIBRARY_AD_INPUT_VERSIONS: CampaignInputVersions = {
  blueprintVersionRef: "blueprint_libraryAd001",
  brandProfileVersionRef: "brandprofile_local001",
  complianceProfileVersionRef: "complianceprofile_local001",
  partnerProfileVersionRef: "partnerprofile_none001",
  routingProfileVersionRef: "routingprofile_local001",
  rulesetVersionRef: "ruleset_libraryAd001",
};

export function memoryVersionRepository(): CampaignVersionRepository {
  return {
    async run(work) {
      return work({
        async getByCampaignVersionRef() {
          return undefined;
        },
        async getLatestVersionNo() {
          return 0;
        },
        async append() {
          return undefined;
        },
      });
    },
  };
}

export async function libraryAdVersion(
  variation: LibraryAdVariation = {},
  refs: Readonly<{ campaignRef?: string; campaignVersionRef?: string; locationRef?: string }> = {},
): Promise<CampaignVersion> {
  return createCampaignVersion(
    {
      createdAt: new Date("2026-10-01T16:00:00.000Z"),
      version: {
        schemaVersion: 1,
        locationRef: refs.locationRef ?? "location_01TenantA",
        campaignRef: refs.campaignRef ?? "campaign_01LibraryAd",
        campaignVersionRef: refs.campaignVersionRef ?? "campaignversion_01LibraryAd",
        inputVersions: LIBRARY_AD_INPUT_VERSIONS,
        manifest: libraryAdManifestInput(variation),
        createdBy: "user_01Creator",
      },
    },
    memoryVersionRepository(),
  );
}

export function libraryAdRulesFor(evaluatedAt = "2026-10-01T16:00:00.000Z"): PreflightRules {
  return {
    schemaVersion: 1,
    rulesetVersionRef: LIBRARY_AD_INPUT_VERSIONS.rulesetVersionRef,
    evaluatedAt,
    minimumImageWidth: 1_080,
    minimumImageHeight: 842,
    earliestStartAt: evaluatedAt,
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
    // PRD-009d D5: the library-ad ruleset checks with the ad's word limits, the person's saved
    // partners, and whether the ad was retired before the check ran.
    libraryAd: {
      headlineMaxLength: 60,
      primaryTextMaxLength: 300,
      partnerNames: [],
      retiredOn: null,
    },
  };
}
