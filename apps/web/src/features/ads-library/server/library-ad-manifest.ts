import { libraryAdImageRef } from "@oalo/application";
import {
  ADS_LIBRARY_ART_SIZES,
  LibraryAdCampaignManifestSchema,
  type AdsLibraryEntry,
  type LibraryAdCampaignManifest,
} from "@oalo/contracts";

/**
 * PRD-009c D5, 009C-AC-006. The pure builder of a library-ad manifest.
 *
 * It reads nothing, writes nothing, and takes no clock or random value: the same input always
 * builds the same manifest. Each image's `contentSha256` is copied from the catalog entry, so the
 * manifest hash, and with it an approval, covers the exact art bytes, the edited words, and the
 * brand. The words and brand values are passed in by the save (009d), which reads the brand from
 * the person's saved Brand on the server; nothing about a Realtor or a brokerage has a place to go.
 */

export interface LibraryAdManifestInput {
  readonly entry: AdsLibraryEntry;
  readonly words: Readonly<{ headline: string; primaryText: string }>;
  readonly brand: Readonly<{
    name: string;
    title: string;
    company: string;
    nmls: string;
    companyNmls: string;
    colorPresetId: string;
    disclosureLine: string;
    leadFormWording: string;
  }>;
  readonly schedule: Readonly<{ startsAt: string | null; endsAt: string }>;
  readonly places: Readonly<{ states: readonly string[]; cities: readonly string[] }>;
  readonly budget: Readonly<{ dailyBudgetMinor: number; totalBudgetMinor: number }>;
  readonly routing: Readonly<{
    mappingVersionRef: string;
    validationStatus: "valid" | "missing" | "stale";
  }>;
}

function image(entry: AdsLibraryEntry, shape: "tall" | "square") {
  const sha256 = entry.images[shape].sha256;
  return {
    shape,
    assetRef: libraryAdImageRef(entry.id, entry.version, shape, sha256),
    approvalStatus: "approved" as const,
    width: ADS_LIBRARY_ART_SIZES[shape].width,
    height: ADS_LIBRARY_ART_SIZES[shape].height,
    altText: entry.images.alt,
    contentSha256: sha256,
  };
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

export function buildLibraryAdManifest(
  input: LibraryAdManifestInput,
): Readonly<LibraryAdCampaignManifest> {
  const { entry } = input;
  return deepFreeze(
    LibraryAdCampaignManifestSchema.parse({
      schemaVersion: 1,
      blueprintId: "library-ad",
      libraryAd: { id: entry.id, version: entry.version },
      content: {
        headline: input.words.headline,
        body: input.words.primaryText,
        callToAction: entry.callToAction,
        disclosureText: input.brand.disclosureLine,
        consentText: input.brand.leadFormWording,
        claims: [],
        mergeTokens: [],
        financingTerms: [],
      },
      images: [image(entry, "tall"), image(entry, "square")],
      advertiser: {
        name: input.brand.name,
        title: input.brand.title,
        company: input.brand.company,
        nmls: input.brand.nmls,
        companyNmls: input.brand.companyNmls,
        colorPresetId: input.brand.colorPresetId,
      },
      schedule: { startsAt: input.schedule.startsAt, endsAt: input.schedule.endsAt },
      meta: {
        enabled: true,
        specialAdCategory: entry.specialAdCategory,
        platform: "meta",
        placements: ["facebook_feed"],
        targeting: {
          country: "US",
          regions: [...input.places.states],
          cities: [...input.places.cities],
          zipCodes: [],
          customAudienceRefs: [],
          protectedDimensions: [],
        },
        dailyBudgetMinor: input.budget.dailyBudgetMinor,
        totalBudgetMinor: input.budget.totalBudgetMinor,
      },
      routing: {
        mappingVersionRef: input.routing.mappingVersionRef,
        validationStatus: input.routing.validationStatus,
      },
    }),
  );
}
