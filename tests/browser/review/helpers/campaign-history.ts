import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { AdsLibraryEntry, OpenHouseCampaignManifest } from "@oalo/contracts";

import { buildLibraryAdManifest } from "../../../../apps/web/src/features/ads-library/server/library-ad-manifest.js";
import {
  libraryAdPreflightRules,
  libraryAdRuleContext,
} from "../../../../apps/web/src/features/ads-library/server/library-ad-ruleset.js";
import { adsLibraryCatalogSchema } from "../../../../packages/contracts/src/ads-library.js";
import type {
  ReviewAccount,
  ReviewCampaignSeed,
  ReviewCampaignTemplate,
} from "../../../../packages/db/test/route-seeding-bridge.js";

/**
 * PRD-009g, 009G-AC-002. The campaigns a person can no longer make, built the way the product
 * built them when they could.
 *
 * Three states of the campaign page and of step 3 cannot be reached by using the product, because
 * the product never saves a version against an ad the library has moved on from (009D-AC-011) and
 * the flow that made an open house campaign is gone:
 *
 * - `ad-retired`: a campaign nobody has decided on, made from an ad the library has since retired.
 *   The sample catalog holds one, `sample-spring-search` version 1, retired on 2026-09-30.
 * - `newer-version`: a campaign made from version 1 of an ad whose version 2 has replaced it, which
 *   is `sample-first-home` in the sample catalog.
 * - `earlier-flow`: a campaign saved before PRD-009, an open house version.
 *
 * Nothing here is a new fact about the catalog. The retired ad and the replaced version are entries
 * the sample catalog already has (its tests pin that they exist), so the catalog, its lock, and its
 * art are untouched and the samples are still served only under the local guard (009C-AC-004). What
 * is built is the stored side: each campaign's manifest comes from the product's own builder, and
 * its check from the product's own ruleset, run as it was run when the ad was current
 * (`retiredOn: null`), exactly as `apps/web/src/server/library-ad-test-support.ts` stores a draft.
 * Writing them is `seedReviewAccountCampaigns` in `packages/db/test/campaign-integration-support.mjs`,
 * which refuses to run outside the review run's database.
 *
 * The brand, budget, area, dates, and routing are the ones the account's own saved campaign has
 * (`template`), so a seeded campaign reads as the same person's, and the page does not add a
 * "Brand changed" notice to a state that is about something else.
 *
 * This file only builds. It opens no connection and imports nothing that needs the built database
 * package, so a unit test can run it (`tooling/tests/unit/review-run/campaign-history.test.ts`).
 */

export const HISTORY_LABELS = Object.freeze({
  earlierFlow: "earlier-flow",
  newerVersion: "newer-version",
  adRetired: "ad-retired",
} as const);

export type HistoryLabel = (typeof HISTORY_LABELS)[keyof typeof HISTORY_LABELS];

/**
 * When each version was "saved". Each is before the thing that makes its state, so the stored
 * version is a true record of its time: the ad was current, the newer version did not exist yet, the
 * flow was still there. The dates are fixed, not read from a clock, and the pages print them inside
 * `time` elements, which the review run paints over.
 */
export const SAVED_ON = Object.freeze({
  /** Before PRD-009 began (2026-10-01). */
  earlierFlow: "2026-07-20T15:00:00.000Z",
  /** After `sample-first-home` version 1 was approved (2026-09-01), before version 2 (2026-09-28). */
  newerVersion: "2026-09-10T15:00:00.000Z",
  /** After `sample-spring-search` was approved (2026-09-05), before it was retired (2026-09-30). */
  adRetired: "2026-09-20T15:00:00.000Z",
});

export const RETIRED_SAMPLE = Object.freeze({ id: "sample-spring-search", version: 1 });
export const REPLACED_SAMPLE = Object.freeze({ id: "sample-first-home", version: 1 });

const SAMPLE_CATALOG_PATH = fileURLToPath(
  new URL("../../../../apps/web/src/fixtures/ads-library/sample-catalog.json", import.meta.url),
);

/** The sample catalog, parsed by the catalog's own schema, so an entry that drifted fails here. */
export function readSampleCatalog(): readonly AdsLibraryEntry[] {
  return adsLibraryCatalogSchema("sample").parse(
    JSON.parse(readFileSync(SAMPLE_CATALOG_PATH, "utf8")),
  );
}

function entryOf(
  catalog: readonly AdsLibraryEntry[],
  wanted: Readonly<{ id: string; version: number }>,
): AdsLibraryEntry {
  const found = catalog.find((entry) => entry.id === wanted.id && entry.version === wanted.version);
  if (found === undefined) {
    throw new Error(`The sample catalog has no ${wanted.id} version ${String(wanted.version)}`);
  }
  return found;
}

function freshSuffix(): string {
  return randomUUID().replaceAll("-", "");
}

export type CampaignHistoryInput = Readonly<{
  account: Pick<ReviewAccount, "locationRef" | "actorRef">;
  template: ReviewCampaignTemplate;
  catalog?: readonly AdsLibraryEntry[];
  /** 32 lowercase hexadecimal characters, new every call; a test passes its own. */
  suffix?: () => string;
}>;

/**
 * A library-ad version of `entry` saved by the account's person with the library's own words and
 * the brand, budget, area, dates, and routing of `template`, checked as it was when it was saved.
 */
function libraryAdSeed(
  input: CampaignHistoryInput,
  label: HistoryLabel,
  entry: AdsLibraryEntry,
  savedOn: string,
): ReviewCampaignSeed {
  const frozen = input.template.manifest;
  const id = (input.suffix ?? freshSuffix)();
  return {
    label,
    createdAt: savedOn,
    version: {
      schemaVersion: 1,
      locationRef: input.account.locationRef,
      campaignRef: `campaign_${id}`,
      campaignVersionRef: `campaignversion_${id}`,
      inputVersions: input.template.inputVersions,
      manifest: buildLibraryAdManifest({
        entry,
        words: { headline: entry.defaults.headline, primaryText: entry.defaults.primaryText },
        brand: {
          name: frozen.advertiser.name,
          title: frozen.advertiser.title,
          company: frozen.advertiser.company,
          nmls: frozen.advertiser.nmls,
          companyNmls: frozen.advertiser.companyNmls,
          colorPresetId: frozen.advertiser.colorPresetId,
          disclosureLine: frozen.content.disclosureText,
          leadFormWording: frozen.content.consentText,
        },
        schedule: frozen.schedule,
        places: {
          states: frozen.meta.targeting.regions,
          cities: frozen.meta.targeting.cities,
        },
        budget: {
          dailyBudgetMinor: frozen.meta.dailyBudgetMinor,
          totalBudgetMinor: frozen.meta.totalBudgetMinor,
        },
        routing: frozen.routing,
      }),
      createdBy: input.account.actorRef,
    },
    // The check runs as it did when the version was saved, while its ad was current. An ad retired
    // since is what the page and step 3 read from the catalog today, and is not this check's finding.
    rules: libraryAdPreflightRules(new Date(savedOn), {
      ...libraryAdRuleContext(entry, []),
      retiredOn: null,
    }),
  };
}

const EARLIER_FLOW_RULESET = "ruleset_openHouseFounding001";

/**
 * An open house campaign as the flow PRD-009 replaced saved it: the same words as
 * `apps/web/src/server/campaign-command-test-support.ts` uses for it, a date far from today so the
 * check stays ready, and no photograph, because that flow had no photo intake (008B D1).
 */
function earlierFlowSeed(input: CampaignHistoryInput): ReviewCampaignSeed {
  const id = (input.suffix ?? freshSuffix)();
  const ref = (prefix: string): string => `${prefix}_${id}`;
  const manifest: OpenHouseCampaignManifest = {
    schemaVersion: 1,
    blueprintId: "open-house-boost",
    property: {
      address: "48 Cedar Street, Austin",
      description: "A three-bedroom home near the park.",
      openHouseStartsAt: "2030-06-12T18:00:00.000Z",
      openHouseEndsAt: "2030-06-12T20:00:00.000Z",
      stateCode: "TX",
      permissionConfirmed: true,
    },
    content: {
      headline: "Tour this home this weekend",
      callToAction: "Get open house details",
      disclosureText: "Equal Housing Opportunity. Additional lender disclosures apply.",
      consentText: "By submitting, you agree to be contacted about this property.",
      body: "Join us for the open house and explore the property in person.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images: [],
    partner: { realtorDisplayName: "Priya Nadeem", permissionConfirmed: true },
    artifacts: {
      pageVersionRef: ref("pageversion"),
      pdfVersionRef: ref("pdfversion"),
      creativeVersionRef: ref("creativeversion"),
      copyVersionRef: ref("copyversion"),
      emailPackageVersionRef: ref("emailpackageversion"),
      smsPackageVersionRef: ref("smspackageversion"),
      disclosureVersionRef: ref("disclosureversion"),
      formVersionRef: ref("formversion"),
      destinationVersionRef: ref("destinationversion"),
      qrDestinationVersionRef: ref("qrdestinationversion"),
    },
    meta: {
      enabled: true,
      specialAdCategory: "HOUSING",
      platform: "meta",
      targeting: {
        country: "US",
        regions: ["Austin metro"],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: 2_500,
      totalBudgetMinor: 12_500,
    },
    routing: { mappingVersionRef: "routingmapping_local001", validationStatus: "valid" },
  };
  return {
    label: HISTORY_LABELS.earlierFlow,
    createdAt: SAVED_ON.earlierFlow,
    version: {
      schemaVersion: 1,
      locationRef: input.account.locationRef,
      campaignRef: ref("campaign"),
      campaignVersionRef: ref("campaignversion"),
      inputVersions: {
        blueprintVersionRef: "blueprint_openHouseBoost001",
        brandProfileVersionRef: "brandprofile_local001",
        complianceProfileVersionRef: "complianceprofile_local001",
        partnerProfileVersionRef: "partnerprofile_local001",
        routingProfileVersionRef: "routingprofile_local001",
        rulesetVersionRef: EARLIER_FLOW_RULESET,
      },
      manifest,
      createdBy: input.account.actorRef,
    },
    rules: {
      schemaVersion: 1,
      rulesetVersionRef: EARLIER_FLOW_RULESET,
      evaluatedAt: SAVED_ON.earlierFlow,
      minimumImageWidth: 1_200,
      minimumImageHeight: 630,
      earliestStartAt: SAVED_ON.earlierFlow,
      allowedMergeTokens: [],
      bannedPhrases: ["guaranteed approval", "no credit check"],
      allowedClaims: [],
      allowsFinancingTerms: false,
      minimumDailyBudgetMinor: 500,
      maximumDailyBudgetMinor: 100_000,
      maximumTotalBudgetMinor: 500_000,
      warnings: [],
    },
  };
}

/**
 * The three campaigns, oldest first, which is the order they are stored in and so the reverse of the
 * order the Campaigns list shows them in.
 */
export function buildCampaignHistory(input: CampaignHistoryInput): readonly ReviewCampaignSeed[] {
  const catalog = input.catalog ?? readSampleCatalog();
  return [
    earlierFlowSeed(input),
    libraryAdSeed(
      input,
      HISTORY_LABELS.newerVersion,
      entryOf(catalog, REPLACED_SAMPLE),
      SAVED_ON.newerVersion,
    ),
    libraryAdSeed(
      input,
      HISTORY_LABELS.adRetired,
      entryOf(catalog, RETIRED_SAMPLE),
      SAVED_ON.adRetired,
    ),
  ];
}
