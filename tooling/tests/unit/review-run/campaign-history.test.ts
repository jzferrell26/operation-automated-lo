import { describe, expect, it } from "vitest";

import { createCampaignVersion, runCampaignPreflight } from "@oalo/application";
import {
  ADS_LIBRARY_SAMPLE_ID_PREFIX,
  CampaignVersionSchema,
  LibraryAdCampaignManifestSchema,
  formatActorRef,
  formatLocationRef,
  type AdsLibraryEntry,
} from "@oalo/contracts";

import {
  HISTORY_LABELS,
  REPLACED_SAMPLE,
  RETIRED_SAMPLE,
  SAVED_ON,
  buildCampaignHistory,
  readSampleCatalog,
  type CampaignHistoryInput,
} from "../../../../tests/browser/review/helpers/campaign-history.js";
import {
  LIBRARY_AD_INPUT_VERSIONS,
  libraryAdManifestInput,
  memoryVersionRepository,
} from "../ads-library/library-ad-fixtures.js";

/**
 * PRD-009g, 009G-AC-002. The campaigns the review run stores for the states a person cannot make
 * (`tests/browser/review/helpers/campaign-history.ts`): what is built, with no database.
 *
 * The harness that writes them (`seedReviewAccountCampaigns`) runs each through the product's own
 * `createCampaignVersion` and `runCampaignPreflight`, so the same two functions run here against an
 * in-memory repository: a seed that the product would refuse, or whose check does not pass, fails
 * here and not in the middle of a browser run.
 */

const ACCOUNT = Object.freeze({
  locationRef: formatLocationRef("4f6a1c2e-0000-4000-8000-000000000001"),
  actorRef: formatActorRef("4f6a1c2e-0000-4000-8000-000000000011"),
});

/** The brand, budget, area, and dates of a campaign the account saved through the product. */
const TEMPLATE = Object.freeze({
  inputVersions: { ...LIBRARY_AD_INPUT_VERSIONS, brandProfileVersionRef: "brandprofile_saved001" },
  manifest: LibraryAdCampaignManifestSchema.parse({
    ...libraryAdManifestInput({ endsAt: "2026-10-16T23:59:59.000Z", cities: ["Austin, TX"] }),
    advertiser: {
      name: "Dana Reyes",
      title: "Loan officer",
      company: "Northgate Lending",
      nmls: "1234567",
      companyNmls: "7654321",
      colorPresetId: "navy",
    },
  }),
});

function sequentialSuffixes(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return next.toString(16).padStart(32, "0");
  };
}

function history(overrides: Partial<CampaignHistoryInput> = {}) {
  return buildCampaignHistory({
    account: ACCOUNT,
    template: TEMPLATE,
    suffix: sequentialSuffixes(),
    ...overrides,
  });
}

function bySeedLabel(label: string) {
  const seed = history().find((candidate) => candidate.label === label);
  if (seed === undefined) throw new Error(`No ${label} seed`);
  return seed;
}

const catalog = readSampleCatalog();

function entryOf(wanted: Readonly<{ id: string; version: number }>): AdsLibraryEntry {
  const found = catalog.find((e) => e.id === wanted.id && e.version === wanted.version);
  if (found === undefined) throw new Error(`No sample ${wanted.id} v${String(wanted.version)}`);
  return found;
}

describe("the sample catalog already holds the states the history needs (009C-AC-004)", () => {
  it("has a retired ad and a replaced version, so no catalog entry is added for the review run", () => {
    expect(entryOf(RETIRED_SAMPLE).status).toBe("retired");
    expect(entryOf(RETIRED_SAMPLE).retired?.on).toBe("2026-09-30");
    expect(entryOf(REPLACED_SAMPLE).status).toBe("replaced");
    const newer = catalog.filter((e) => e.id === REPLACED_SAMPLE.id && e.version > 1);
    expect(newer.map((e) => e.status)).toEqual(["active"]);
  });

  it("uses only sample entries, which are served only under the local guard", () => {
    for (const wanted of [RETIRED_SAMPLE, REPLACED_SAMPLE]) {
      const entry = entryOf(wanted);
      expect(entry.sample).toBe(true);
      expect(entry.id.startsWith(ADS_LIBRARY_SAMPLE_ID_PREFIX)).toBe(true);
    }
  });
});

describe("the campaigns the review run stores (009G-AC-002)", () => {
  it("builds three, oldest first: saved before PRD-009, a replaced version, a retired ad", () => {
    expect(history().map((seed) => seed.label)).toEqual([
      HISTORY_LABELS.earlierFlow,
      HISTORY_LABELS.newerVersion,
      HISTORY_LABELS.adRetired,
    ]);
  });

  it("names the account's workspace and person on every version, and gives each its own references", () => {
    const seeds = history();
    for (const seed of seeds) {
      expect(seed.version.locationRef).toBe(ACCOUNT.locationRef);
      expect(seed.version.createdBy).toBe(ACCOUNT.actorRef);
    }
    expect(new Set(seeds.map((seed) => seed.version.campaignRef)).size).toBe(3);
    expect(new Set(seeds.map((seed) => seed.version.campaignVersionRef)).size).toBe(3);
  });

  it("is accepted by the product's own version and check functions, and every check passes", async () => {
    for (const seed of history()) {
      const stored = await createCampaignVersion(
        { createdAt: new Date(seed.createdAt), version: seed.version },
        memoryVersionRepository(),
      );
      expect(CampaignVersionSchema.parse(stored)).toEqual(stored);
      expect(stored.versionNo).toBe(1);

      const preflight = runCampaignPreflight(stored, seed.rules);
      expect(preflight.findings, seed.label).toEqual([]);
      expect(preflight.blocking, seed.label).toBe(false);
      expect(preflight.rulesetVersionRef).toBe(stored.inputVersions.rulesetVersionRef);
    }
  });

  it("stores each time before the thing that makes its state, so it is a true record", () => {
    expect(SAVED_ON.earlierFlow < "2026-10-01").toBe(true);
    const retiredOn = entryOf(RETIRED_SAMPLE).retired?.on ?? "";
    expect(SAVED_ON.adRetired.slice(0, 10) < retiredOn).toBe(true);
    expect(SAVED_ON.adRetired.slice(0, 10) > entryOf(RETIRED_SAMPLE).approval.approvedOn).toBe(
      true,
    );
    const newestApprovedOn = entryOf({ id: REPLACED_SAMPLE.id, version: 2 }).approval.approvedOn;
    expect(SAVED_ON.newerVersion.slice(0, 10) < newestApprovedOn).toBe(true);
    expect(SAVED_ON.newerVersion.slice(0, 10) > entryOf(REPLACED_SAMPLE).approval.approvedOn).toBe(
      true,
    );
    for (const label of Object.values(HISTORY_LABELS)) {
      expect(bySeedLabel(label).createdAt).toBe(
        {
          [HISTORY_LABELS.earlierFlow]: SAVED_ON.earlierFlow,
          [HISTORY_LABELS.newerVersion]: SAVED_ON.newerVersion,
          [HISTORY_LABELS.adRetired]: SAVED_ON.adRetired,
        }[label],
      );
    }
  });
});

describe("a campaign for an ad retired since", () => {
  const seed = bySeedLabel(HISTORY_LABELS.adRetired);
  const manifest = LibraryAdCampaignManifestSchema.parse(seed.version.manifest);

  it("is made from the retired sample ad, with the library's own words and art", () => {
    const entry = entryOf(RETIRED_SAMPLE);
    expect(manifest.libraryAd).toEqual(RETIRED_SAMPLE);
    expect(manifest.content.headline).toBe(entry.defaults.headline);
    expect(manifest.content.body).toBe(entry.defaults.primaryText);
    expect(manifest.images[0].contentSha256).toBe(entry.images.tall.sha256);
    expect(manifest.images[1].contentSha256).toBe(entry.images.square.sha256);
  });

  it("was checked as it was when it was saved: the ad was current, so retirement is not a finding", () => {
    expect(seed.rules).toMatchObject({ libraryAd: { retiredOn: null } });
  });
});

describe("a campaign for a version a newer version has replaced", () => {
  const seed = bySeedLabel(HISTORY_LABELS.newerVersion);
  const manifest = LibraryAdCampaignManifestSchema.parse(seed.version.manifest);

  it("is made from version 1, whose own words are not the newest version's", () => {
    expect(manifest.libraryAd).toEqual(REPLACED_SAMPLE);
    expect(manifest.content.headline).toBe(entryOf(REPLACED_SAMPLE).defaults.headline);
    expect(manifest.content.headline).not.toBe(
      entryOf({ id: REPLACED_SAMPLE.id, version: 2 }).defaults.headline,
    );
  });

  it("was checked as it was when it was saved, while its version was the newest", () => {
    expect(seed.rules).toMatchObject({ libraryAd: { retiredOn: null } });
  });
});

describe("a campaign saved before PRD-009", () => {
  const seed = bySeedLabel(HISTORY_LABELS.earlierFlow);

  it("is an open house version with no library ad and no photograph", () => {
    expect(seed.version.manifest.blueprintId).toBe("open-house-boost");
    expect(seed.version.manifest).not.toHaveProperty("libraryAd");
    if (seed.version.manifest.blueprintId !== "open-house-boost") throw new Error("not open house");
    expect(seed.version.manifest.images).toEqual([]);
    expect(seed.version.inputVersions.rulesetVersionRef).toBe(seed.rules.rulesetVersionRef);
  });

  it("has an open house far enough ahead that its check stays ready", () => {
    if (seed.version.manifest.blueprintId !== "open-house-boost") throw new Error("not open house");
    expect(seed.version.manifest.property.openHouseStartsAt > "2029").toBe(true);
  });
});

describe("what a stored campaign takes from the account's own campaign", () => {
  it("copies the brand, budget, area, dates, and routing of the template, and none of its words", () => {
    for (const label of [HISTORY_LABELS.newerVersion, HISTORY_LABELS.adRetired]) {
      const seed = bySeedLabel(label);
      const manifest = LibraryAdCampaignManifestSchema.parse(seed.version.manifest);
      const frozen = TEMPLATE.manifest;
      expect(manifest.advertiser, label).toEqual(frozen.advertiser);
      expect(manifest.content.disclosureText, label).toBe(frozen.content.disclosureText);
      expect(manifest.content.consentText, label).toBe(frozen.content.consentText);
      expect(manifest.schedule, label).toEqual(frozen.schedule);
      expect(manifest.meta.targeting, label).toEqual(frozen.meta.targeting);
      expect(manifest.meta.dailyBudgetMinor, label).toBe(frozen.meta.dailyBudgetMinor);
      expect(manifest.meta.totalBudgetMinor, label).toBe(frozen.meta.totalBudgetMinor);
      expect(manifest.routing, label).toEqual(frozen.routing);
      expect(seed.version.inputVersions, label).toEqual(TEMPLATE.inputVersions);
    }
  });

  it("refuses a catalog that lacks the ad, rather than building something else", () => {
    expect(() => history({ catalog: catalog.filter((e) => e.id !== RETIRED_SAMPLE.id) })).toThrow(
      /no sample-spring-search version 1/u,
    );
  });
});
