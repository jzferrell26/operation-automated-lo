import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLocalSyntheticPrincipal } from "../../server/authenticated-principal.js";
import { createTemporaryCampaignStore } from "../../server/campaign-command-test-support.js";
import { createCampaignPersistenceAdapter } from "../../server/campaign-persistence-runtime.js";
import { LibraryAdNotAvailableError, saveLibraryAdVersion } from "../../server/library-ad-save.js";
import { sampleEntry, saveLibraryAdDraft } from "../../server/library-ad-test-support.js";
import { ADS_LIBRARY_SAMPLES_FLAG, loadAdsLibrary } from "./server/catalog-loader.js";
import { newerVersionOffer, newVersionRequest } from "./newer-version.js";

/**
 * PRD-009c D4, 009C-AC-009: what "Use the new version" saves, proven against the real save
 * ("Save and check") and the real offer, in the filesystem store the local demo uses. The
 * real-Postgres counterpart is `use-new-version.postgres.test.ts`.
 *
 * A campaign is saved while its ad is still current (the first version of `sample-first-home`, which
 * the catalog has since replaced with version 2). The offer is built from what was stored, and the
 * request the component sends is built from the offer, field for field.
 */

const store = createTemporaryCampaignStore("oalo-newer-version-");
const principal = createLocalSyntheticPrincipal();

beforeEach(async () => {
  await store.enter();
});
afterEach(async () => {
  await store.restore();
});

function environment() {
  return { ...store.env(), [ADS_LIBRARY_SAMPLES_FLAG]: "enabled" };
}

async function saveOnOlderVersion() {
  const draft = await saveLibraryAdDraft({
    principal,
    environment: environment(),
    entry: await sampleEntry("sample-first-home", 1),
    headline: "My own headline",
  });
  const adapter = createCampaignPersistenceAdapter(principal, environment());
  const record = await adapter.readRepository.getByCampaignRef(draft.version.campaignRef);
  if (record === undefined || record.version.manifest.blueprintId !== "library-ad") {
    throw new Error("The draft was not stored as a library ad");
  }
  return { draft, adapter, record, manifest: record.version.manifest };
}

describe("Use the new version, against the real save", () => {
  it("appends version 2 to the same campaign, on the newer ad version, with the newer words and the old budget, dates, and area", async () => {
    const { adapter, record, manifest } = await saveOnOlderVersion();
    const library = await loadAdsLibrary({ environment: environment() });
    const offer = newerVersionOffer({
      campaignRef: record.version.campaignRef,
      manifest,
      decided: record.approval !== undefined,
      library,
    });
    if (offer === undefined) throw new Error("The older version was not offered the newer one");
    expect(offer.undecided).toBe(true);

    const saved = await saveLibraryAdVersion(newVersionRequest(offer), principal, environment(), {
      versionRepository: adapter.versionRepository,
      readRepository: adapter.readRepository,
      loadLibrary: () => Promise.resolve(library),
    });
    await adapter.persistDraft(saved.version, saved.preflight);

    expect(saved.version.campaignRef).toBe(record.version.campaignRef);
    expect(saved.version.versionNo).toBe(record.version.versionNo + 1);
    const next = saved.version.manifest;
    if (next.blueprintId !== "library-ad") throw new Error("Expected a library ad");
    expect(next.libraryAd).toEqual({ id: "sample-first-home", version: 2 });
    const newest = (await sampleEntry("sample-first-home", 2)).defaults;
    expect(next.content.headline).toBe(newest.headline);
    expect(next.content.body).toBe(newest.primaryText);
    expect(next.meta.dailyBudgetMinor).toBe(manifest.meta.dailyBudgetMinor);
    expect(next.meta.totalBudgetMinor).toBe(manifest.meta.totalBudgetMinor);
    expect(next.schedule.endsAt.slice(0, 10)).toBe(manifest.schedule.endsAt.slice(0, 10));
    expect(next.meta.targeting.regions).toEqual(manifest.meta.targeting.regions);
    expect(next.meta.targeting.cities).toEqual(manifest.meta.targeting.cities);
    // The art digests are the newer version's, so an approval of this version covers those pixels.
    expect(saved.version.manifestHash).not.toBe(record.version.manifestHash);

    const stored = await adapter.readRepository.getByCampaignRef(record.version.campaignRef);
    expect(stored?.version.versionNo).toBe(saved.version.versionNo);
    expect(stored?.approval).toBeUndefined();
  });

  it("is refused for the older ad version, so the only way onto the newer one is a new campaign version", async () => {
    const { adapter, record } = await saveOnOlderVersion();

    await expect(
      saveLibraryAdVersion(
        {
          adId: "sample-first-home",
          adVersion: 1,
          campaignRef: record.version.campaignRef,
          headline: "Thinking about your first home? Start here.",
          primaryText: "I walk first-time buyers through each step. Send me a message.",
          endsOn: "2099-03-04",
          dailyBudgetDollars: 25,
          totalBudgetDollars: 350,
          places: ["TX"],
        },
        principal,
        environment(),
        {
          versionRepository: adapter.versionRepository,
          readRepository: adapter.readRepository,
        },
      ),
    ).rejects.toBeInstanceOf(LibraryAdNotAvailableError);
  });
});
