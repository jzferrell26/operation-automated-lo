import { libraryAdRefusalFor, recordedLibraryAdOf } from "@oalo/application";
import { describe, expect, it } from "vitest";

import type { LoadedAdsLibrary } from "../features/ads-library/server/catalog-loader.js";
import {
  APPROVER,
  CREATOR,
  OWNER,
  libraryCampaign,
  sampleLibrary,
  type LibraryCampaignOptions,
} from "./campaign-page.test-support.js";
import { reviewDataOf } from "./launch-an-ad.js";

/**
 * QA-06, 009C-AC-008. What step 3 of "Launch an ad" is handed about the saved version's library ad.
 * Whether the version can still be approved is the approval command's own rule
 * (`libraryAdRefusalFor`), asked here against the repository's sample library, so a version whose ad
 * was replaced or retired reaches step 3 saying so, and step 3 never offers a decision the command
 * would refuse.
 */

async function reviewOf(
  options: LibraryCampaignOptions,
  overrides: Partial<Pick<LoadedAdsLibrary, "standingOf">> = {},
  principal = OWNER,
) {
  const real = await sampleLibrary();
  const library: LoadedAdsLibrary = { ...real, ...overrides };
  const { record } = await libraryCampaign(options);
  const { manifest } = record.version;
  if (manifest.blueprintId !== "library-ad") throw new Error("Expected a library-ad version.");
  const loaded = real.find(manifest.libraryAd.id, manifest.libraryAd.version);
  if (loaded === undefined) throw new Error("The sample library has no such ad.");
  return {
    review: reviewDataOf(record, manifest, loaded, library, principal),
    manifest,
    library,
  };
}

describe("step 3's data for a library ad the command still accepts", () => {
  it("has no refusal for the newest version of an active ad, and nothing to move to", async () => {
    const { review } = await reviewOf({ adId: "sample-first-home", adVersion: 2 });

    expect(review.adRefusal).toBeUndefined();
    expect(review.retiredOn).toBeNull();
    expect(review.newerVersion).toBeUndefined();
    expect(review.canApprove).toBe(true);
  });
});

describe("step 3's data for a library ad the command refuses (QA-06)", () => {
  it("says a version of a replaced ad is replaced, and carries the offer to move to the newer one", async () => {
    const { review } = await reviewOf({ adId: "sample-first-home", adVersion: 1 });

    expect(review.adRefusal).toBe("replaced");
    expect(review.retiredOn).toBeNull();
    expect(review.newerVersion).toMatchObject({
      campaignRef: "campaign_01LibraryPage",
      fromVersion: 1,
      toVersion: 2,
      undecided: true,
    });
  });

  it("offers the move only to somebody who can save a campaign version", async () => {
    const options = { adId: "sample-first-home", adVersion: 1 } as const;

    expect((await reviewOf(options, {}, OWNER)).review.canMakeNewVersion).toBe(true);
    expect((await reviewOf(options, {}, CREATOR)).review.canMakeNewVersion).toBe(true);
    expect((await reviewOf(options, {}, APPROVER)).review.canMakeNewVersion).toBe(false);
  });

  it("says a version of a retired ad is retired, with the day the library took it out", async () => {
    const { review } = await reviewOf({ adId: "sample-spring-search", adVersion: 1 });

    expect(review.adRefusal).toBe("retired");
    expect(review.retiredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(review.newerVersion).toBeUndefined();
  });

  it("says a version whose pictures changed in the library is art changed", async () => {
    const real = await sampleLibrary();
    const { review } = await reviewOf(
      { adId: "sample-first-home", adVersion: 2 },
      {
        standingOf: (ad) => {
          const standing = real.standingOf(ad);
          return standing === undefined ? undefined : { ...standing, tallSha256: "f".repeat(64) };
        },
      },
    );

    expect(review.adRefusal).toBe("art_changed");
    expect(review.newerVersion).toBeUndefined();
  });

  it("says a version whose ad the catalog does not hold is missing", async () => {
    const { review } = await reviewOf(
      { adId: "sample-first-home", adVersion: 2 },
      { standingOf: () => undefined },
    );

    expect(review.adRefusal).toBe("missing");
  });

  it("gives, for every case, the answer of the one rule the command calls", async () => {
    const cases: readonly [
      LibraryCampaignOptions,
      Partial<Pick<LoadedAdsLibrary, "standingOf">>,
    ][] = [
      [{ adId: "sample-first-home", adVersion: 2 }, {}],
      [{ adId: "sample-first-home", adVersion: 1 }, {}],
      [{ adId: "sample-spring-search", adVersion: 1 }, {}],
      [{ adId: "sample-first-home", adVersion: 2 }, { standingOf: () => undefined }],
    ];
    for (const [options, overrides] of cases) {
      const { review, manifest, library } = await reviewOf(options, overrides);
      expect(review.adRefusal, JSON.stringify(options)).toBe(
        libraryAdRefusalFor(recordedLibraryAdOf(manifest), library.standingOf(manifest.libraryAd)),
      );
    }
  });
});
