import type { LibraryAdCampaignManifest } from "@oalo/contracts";
import { describe, expect, it } from "vitest";

import {
  buildLibraryAdManifest,
  type LibraryAdManifestInput,
} from "./server/library-ad-manifest.js";
import {
  ADS_LIBRARY_SAMPLES_FLAG,
  loadAdsLibrary,
  type LoadedAdsLibrary,
} from "./server/catalog-loader.js";
import { libraryAdManifestInput, sampleEntry } from "../../server/library-ad-test-support.js";
import { newerVersionOffer, type NewerVersionLibrary } from "./newer-version.js";

/**
 * PRD-009c D4, 009C-AC-009: when "Use the new version" is offered, and what it would save.
 *
 * The sample catalog has the cases: `sample-first-home` has version 1 (replaced) and version 2
 * (active); `sample-spring-search` was retired at its one version; every other ad has one active
 * version.
 */

const SAMPLES = { OALO_ENVIRONMENT: "local", [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" } as const;

async function library(): Promise<LoadedAdsLibrary> {
  return loadAdsLibrary({ environment: SAMPLES });
}

async function manifestOn(
  id: string,
  version: number,
  change: Partial<LibraryAdManifestInput> = {},
): Promise<LibraryAdCampaignManifest> {
  return buildLibraryAdManifest({
    ...libraryAdManifestInput(await sampleEntry(id, version), { headline: "My own headline" }),
    ...change,
  });
}

const CAMPAIGN = "campaign_0123456789abcdef0123456789abcdef";

describe("newerVersionOffer", () => {
  it("offers the newer version of an ad to a version saved on the older one, with the newer words and the old budget, dates, and area", async () => {
    const manifest = await manifestOn("sample-first-home", 1, {
      budget: { dailyBudgetMinor: 4_000, totalBudgetMinor: 60_000 },
      schedule: { startsAt: null, endsAt: "2099-03-04T23:59:59.000Z" },
      places: { states: ["TX", "OK"], cities: ["Austin, TX"] },
    });
    const newest = (await sampleEntry("sample-first-home", 2)).defaults;

    const offer = newerVersionOffer({
      campaignRef: CAMPAIGN,
      manifest,
      decided: false,
      library: await library(),
    });

    expect(offer).toEqual({
      campaignRef: CAMPAIGN,
      ad: { id: "sample-first-home", name: "Sample: First home, start here" },
      fromVersion: 1,
      toVersion: 2,
      newWords: { headline: newest.headline, primaryText: newest.primaryText },
      kept: {
        dailyBudgetDollars: 40,
        totalBudgetDollars: 600,
        endsOn: "2099-03-04",
        places: ["TX", "OK", "Austin, TX"],
      },
      undecided: true,
    });
    // The person's own words are never carried over: that is what "Use the new version" replaces.
    expect(JSON.stringify(offer)).not.toContain("My own headline");
  });

  it("still names the newer version for a version somebody decided on, but marks it as decided", async () => {
    const offer = newerVersionOffer({
      campaignRef: CAMPAIGN,
      manifest: await manifestOn("sample-first-home", 1),
      decided: true,
      library: await library(),
    });
    expect(offer?.toVersion).toBe(2);
    expect(offer?.undecided).toBe(false);
  });

  it.each([
    ["is already on the newest version", "sample-first-home", 2],
    ["is on an ad with only one version", "sample-pre-approval", 1],
    ["is on an ad that was retired", "sample-spring-search", 1],
  ] as const)("offers nothing to a version that %s", async (_label, id, version) => {
    expect(
      newerVersionOffer({
        campaignRef: CAMPAIGN,
        manifest: await manifestOn(id, version),
        decided: false,
        library: await library(),
      }),
    ).toBeUndefined();
  });

  it("offers nothing when the ad is not in the library at all", async () => {
    const manifest = await manifestOn("sample-first-home", 1);
    const empty: NewerVersionLibrary = { find: () => undefined, standingOf: () => undefined };
    expect(
      newerVersionOffer({ campaignRef: CAMPAIGN, manifest, decided: false, library: empty }),
    ).toBeUndefined();
  });

  it("offers nothing when the newest version of the ad was retired, which has its own notice", async () => {
    const real = await library();
    const retiredNewest: NewerVersionLibrary = {
      find: (id, version) => real.find(id, version),
      standingOf: (ad) => {
        const standing = real.standingOf(ad);
        return standing === undefined ? undefined : { ...standing, highestStatus: "retired" };
      },
    };
    expect(
      newerVersionOffer({
        campaignRef: CAMPAIGN,
        manifest: await manifestOn("sample-first-home", 1),
        decided: false,
        library: retiredNewest,
      }),
    ).toBeUndefined();
  });

  it("carries display and carry-over values only: no compliance note, approval block, or art digest", async () => {
    const offer = newerVersionOffer({
      campaignRef: CAMPAIGN,
      manifest: await manifestOn("sample-first-home", 1),
      decided: false,
      library: await library(),
    });
    expect(JSON.stringify(offer)).not.toMatch(
      /compliance|approvedBy|requiredOnAd|sha256|blockedInWords/iu,
    );
  });
});
