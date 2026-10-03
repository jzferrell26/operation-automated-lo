import { describe, expect, it } from "vitest";

import { canonicalCampaignHash, libraryAdImageRef, runCampaignPreflight } from "@oalo/application";
import {
  ADS_LIBRARY_ART_SIZES,
  LibraryAdCampaignManifestSchema,
  adsLibraryCatalogSchema,
  type AdsLibraryEntry,
} from "@oalo/contracts";
import { evaluateCampaignPreflight } from "@oalo/domain";

import sampleCatalog from "../../../../apps/web/src/fixtures/ads-library/sample-catalog.json" with { type: "json" };
import {
  buildLibraryAdManifest,
  type LibraryAdManifestInput,
} from "../../../../apps/web/src/features/ads-library/server/library-ad-manifest.js";
import {
  LIBRARY_AD_MINIMUM_IMAGE,
  LIBRARY_AD_RULESET_VERSION_REF,
  libraryAdPreflightRules,
  libraryAdRuleContext,
} from "../../../../apps/web/src/features/ads-library/server/library-ad-ruleset.js";

import { LIBRARY_AD_INPUT_VERSIONS, libraryAdVersion } from "./library-ad-fixtures.js";

/**
 * PRD-009c D5 and D6, 009C-AC-006 (the builder half). A pure builder turns a catalog entry, the
 * edited words, the brand, the schedule, the area, and the budgets into a library-ad manifest. It
 * copies each art file's digest from the catalog, so the manifest hash covers the pixels, and the
 * library-ad ruleset accepts the library's own art, which the open house minimum would refuse.
 */

const entries: readonly AdsLibraryEntry[] = adsLibraryCatalogSchema("sample").parse(sampleCatalog);

function entry(id: string, version: number): AdsLibraryEntry {
  const found = entries.find((item) => item.id === id && item.version === version);
  if (found === undefined) throw new Error(`No sample ${id} v${String(version)}`);
  return found;
}

function input(overrides: Partial<LibraryAdManifestInput> = {}): LibraryAdManifestInput {
  return {
    entry: entry("sample-first-home", 2),
    words: {
      headline: "Thinking about your first home? Start here.",
      primaryText: "Send me a message.",
    },
    brand: {
      name: "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
      disclosureLine: "Equal Housing Opportunity.",
      leadFormWording:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
    },
    schedule: { startsAt: null, endsAt: "2026-10-15T23:59:00.000Z" },
    places: { states: ["TX"], cities: ["Austin, TX"] },
    budget: { dailyBudgetMinor: 2_500, totalBudgetMinor: 35_000 },
    routing: { mappingVersionRef: "routingmapping_local001", validationStatus: "valid" },
    ...overrides,
  };
}

describe("the library-ad manifest builder (009C-AC-006)", () => {
  it("builds a manifest the library-ad contract accepts, with every part in its place", () => {
    const manifest = buildLibraryAdManifest(input());
    expect(LibraryAdCampaignManifestSchema.parse(manifest)).toEqual(manifest);
    expect(manifest.libraryAd).toEqual({ id: "sample-first-home", version: 2 });
    expect(manifest.content).toEqual({
      headline: "Thinking about your first home? Start here.",
      body: "Send me a message.",
      callToAction: "LEARN_MORE",
      disclosureText: "Equal Housing Opportunity.",
      consentText:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    });
    expect(manifest.advertiser).toEqual({
      name: "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
    });
    expect(manifest.meta).toEqual({
      enabled: true,
      specialAdCategory: "HOUSING",
      platform: "meta",
      placements: ["facebook_feed"],
      targeting: {
        country: "US",
        regions: ["TX"],
        cities: ["Austin, TX"],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: 2_500,
      totalBudgetMinor: 35_000,
    });
    expect(manifest.schedule).toEqual({ startsAt: null, endsAt: "2026-10-15T23:59:00.000Z" });
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it("copies each art file's digest and exact size from the catalog, with a derived reference", () => {
    const source = entry("sample-first-home", 2);
    const [tall, square] = buildLibraryAdManifest(input()).images;
    expect(tall).toEqual({
      shape: "tall",
      assetRef: libraryAdImageRef("sample-first-home", 2, "tall", source.images.tall.sha256),
      approvalStatus: "approved",
      width: ADS_LIBRARY_ART_SIZES.tall.width,
      height: ADS_LIBRARY_ART_SIZES.tall.height,
      altText: source.images.alt,
      contentSha256: source.images.tall.sha256,
    });
    expect(square).toMatchObject({
      shape: "square",
      contentSha256: source.images.square.sha256,
      width: 1_080,
      height: 842,
    });
  });

  it("is pure: the same input gives the same manifest, and a different art digest a different hash", () => {
    expect(buildLibraryAdManifest(input())).toEqual(buildLibraryAdManifest(input()));
    const base = canonicalCampaignHash(buildLibraryAdManifest(input()));
    const source = entry("sample-first-home", 2);
    const otherArt = {
      ...source,
      images: { ...source.images, square: { ...source.images.square, sha256: "9".repeat(64) } },
    };
    expect(canonicalCampaignHash(buildLibraryAdManifest(input({ entry: otherArt })))).not.toBe(
      base,
    );
    expect(
      canonicalCampaignHash(
        buildLibraryAdManifest(input({ entry: entry("sample-first-home", 1) })),
      ),
    ).not.toBe(base);
    expect(
      canonicalCampaignHash(
        buildLibraryAdManifest(input({ brand: { ...input().brand, name: "Alex M. Morgan" } })),
      ),
    ).not.toBe(base);
  });

  it("carries the library's call to action and no Realtor, partner, or property field", () => {
    const manifest = buildLibraryAdManifest(input());
    expect(Object.keys(manifest).sort()).toEqual(
      [
        "advertiser",
        "blueprintId",
        "content",
        "images",
        "libraryAd",
        "meta",
        "routing",
        "schedule",
        "schemaVersion",
      ].sort(),
    );
    expect(manifest.content.callToAction).toBe(entry("sample-first-home", 2).callToAction);
  });
});

describe("the library-ad ruleset (D6)", () => {
  it("sets its own image minimum to the library's smallest art, 1080 by 842", () => {
    expect(LIBRARY_AD_MINIMUM_IMAGE).toEqual({ width: 1_080, height: 842 });
    const rules = libraryAdPreflightRules(
      new Date("2026-10-01T16:00:00.000Z"),
      libraryAdRuleContext(entry("sample-first-home", 2), []),
    );
    expect(rules.rulesetVersionRef).toBe(LIBRARY_AD_RULESET_VERSION_REF);
    expect(LIBRARY_AD_INPUT_VERSIONS.rulesetVersionRef).toBe(LIBRARY_AD_RULESET_VERSION_REF);
    expect(rules.minimumImageWidth).toBe(1_080);
    expect(rules.minimumImageHeight).toBe(842);
    expect(rules.allowsFinancingTerms).toBe(false);
    expect(rules.allowedClaims).toEqual([]);
  });

  it("passes the library's own art, which the open house minimum of 1200 by 630 refuses", async () => {
    const manifest = buildLibraryAdManifest(input());
    const rules = libraryAdPreflightRules(
      new Date("2026-10-01T16:00:00.000Z"),
      libraryAdRuleContext(entry("sample-first-home", 2), []),
    );
    expect(evaluateCampaignPreflight(manifest, rules).map((item) => item.ruleCode)).toEqual([]);
    expect(
      evaluateCampaignPreflight(manifest, {
        ...rules,
        minimumImageWidth: 1_200,
        minimumImageHeight: 630,
      }).map((item) => item.ruleCode),
    ).toEqual(["IMAGE_QUALITY_LOW"]);
    const version = await libraryAdVersion();
    expect(runCampaignPreflight(version, rules).blocking).toBe(false);
  });
});
