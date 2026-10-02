import type { LibraryAdCatalogStanding } from "@oalo/application";
import type { AdsLibraryEntry, LibraryAdCampaignManifest } from "@oalo/contracts";

/**
 * PRD-009c D4 and 009C-AC-009, the part of "Use the new version" that decides when it is offered
 * and what it would save. Pure: no file system, no network, and nothing imported from the loader
 * at run time, so the client component that shows the offer can import this file's type.
 *
 * A campaign version stays on the library ad version it was saved with. When the ad has a newer
 * version, the campaign page says so for every version (a notice), and offers "Use the new version"
 * only for a version nobody has decided on: that action saves a new campaign version on the newer
 * ad version, with the newer words and the old budget, dates, and area. An approved or sent-back
 * version never changes its library ad version, because nothing ever edits a saved version; a new
 * one is appended instead.
 */

/** The part of the loaded ads library the offer reads, so a test can supply a small one. */
export interface NewerVersionLibrary {
  find(
    id: string,
    version: number,
  ): Readonly<{ entry: Pick<AdsLibraryEntry, "name" | "defaults"> }> | undefined;
  standingOf(ad: Readonly<{ id: string; version: number }>): LibraryAdCatalogStanding | undefined;
}

export interface NewerVersionOffer {
  /** The campaign the new version would join. */
  readonly campaignRef: string;
  readonly ad: Readonly<{ id: string; name: string }>;
  readonly fromVersion: number;
  readonly toVersion: number;
  /** The newer version's own words: what "Use the new version" replaces the person's words with. */
  readonly newWords: Readonly<{ headline: string; primaryText: string }>;
  /** What the new campaign version keeps from the one it replaces. */
  readonly kept: Readonly<{
    dailyBudgetDollars: number;
    totalBudgetDollars: number;
    endsOn: string;
    places: readonly string[];
  }>;
  /** True when no approval decision is recorded on the version, which is what allows the action. */
  readonly undecided: boolean;
}

export interface NewerVersionInput {
  readonly campaignRef: string;
  readonly manifest: LibraryAdCampaignManifest;
  /** A decision (an approval or a send back) is recorded on this campaign version. */
  readonly decided: boolean;
  readonly library: NewerVersionLibrary;
}

/**
 * The offer for one campaign version, or `undefined` when its ad has no newer version to move to:
 * the version is already the newest, the ad is not in the library any more, or the ad's newest
 * version was retired (that campaign gets the retired notice and "Choose another ad" instead).
 */
export function newerVersionOffer(input: NewerVersionInput): NewerVersionOffer | undefined {
  const { manifest, library } = input;
  const standing = library.standingOf(manifest.libraryAd);
  if (standing === undefined) return undefined;
  if (standing.highestVersion <= manifest.libraryAd.version) return undefined;
  if (standing.highestStatus !== "active") return undefined;
  const newest = library.find(manifest.libraryAd.id, standing.highestVersion);
  if (newest === undefined) return undefined;
  return Object.freeze({
    campaignRef: input.campaignRef,
    ad: Object.freeze({ id: manifest.libraryAd.id, name: newest.entry.name }),
    fromVersion: manifest.libraryAd.version,
    toVersion: standing.highestVersion,
    newWords: Object.freeze({
      headline: newest.entry.defaults.headline,
      primaryText: newest.entry.defaults.primaryText,
    }),
    kept: Object.freeze({
      dailyBudgetDollars: manifest.meta.dailyBudgetMinor / 100,
      totalBudgetDollars: manifest.meta.totalBudgetMinor / 100,
      endsOn: manifest.schedule.endsAt.slice(0, 10),
      places: Object.freeze([
        ...manifest.meta.targeting.regions,
        ...manifest.meta.targeting.cities,
      ]),
    }),
    undecided: !input.decided,
  });
}

/**
 * The body "Use the new version" posts to the save route (`POST /api/campaigns/preflight`): the newer
 * ad version, the campaign it joins, the newer words, and the budget, end date, and places the
 * earlier version had. It carries nothing about the brand, which the server reads from saved Brand.
 */
export function newVersionRequest(offer: NewerVersionOffer) {
  return {
    adId: offer.ad.id,
    adVersion: offer.toVersion,
    campaignRef: offer.campaignRef,
    headline: offer.newWords.headline,
    primaryText: offer.newWords.primaryText,
    endsOn: offer.kept.endsOn,
    dailyBudgetDollars: offer.kept.dailyBudgetDollars,
    totalBudgetDollars: offer.kept.totalBudgetDollars,
    places: [...offer.kept.places],
  };
}
