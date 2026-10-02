import { randomUUID } from "node:crypto";

import {
  CampaignResourceNotAccessibleError,
  assertMayExecuteCampaignMutation,
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignVersionRepository,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import {
  AdPlacesInputSchema,
  AdsLibraryAdIdSchema,
  AdsLibraryVersionSchema,
  OpaqueReferenceSchema,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";
import { z } from "zod";

import {
  loadAdsLibrary,
  type LoadedAdsLibrary,
} from "../features/ads-library/server/catalog-loader.js";
import { buildLibraryAdManifest } from "../features/ads-library/server/library-ad-manifest.js";
import {
  LIBRARY_AD_RULESET_VERSION_REF,
  libraryAdPreflightRules,
  libraryAdRuleContext,
} from "../features/ads-library/server/library-ad-ruleset.js";
import { readSavedAdBrand, type SavedAdBrand } from "./ad-brand-read.js";
import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";

/**
 * PRD-009d D1, D3 to D6, and 009D-AC-011, 020, 021, 024. "Save and check": one library-ad version,
 * saved and checked.
 *
 * The request carries only what the person chose on step 2: which ad (by id and version), the
 * edited headline and primary text, the end date, the budgets, the places, and, for a new version,
 * the campaign it belongs to. It is `.strict()`, so a brand, a title, a company, an NMLS number, a
 * colour, a disclosure, a consent, or a lead form field is refused with 400 before anything is
 * stored: those are read here, on the server, from the person's saved Brand (D3, M-1). The ad is
 * resolved from the catalog by id and current version, and the campaign under the session's own
 * workspace, so neither can be named into existence by a request.
 */

/** The request limits are wider than any ad's editable limits, so an over-long word is stored and then sent back with a plain fix by `WORDS_TOO_LONG`. */
export const LIBRARY_AD_REQUEST_LIMITS = Object.freeze({ headline: 120, primaryText: 600 });

export const LibraryAdSaveRequestSchema = z
  .object({
    adId: AdsLibraryAdIdSchema,
    adVersion: AdsLibraryVersionSchema,
    campaignRef: OpaqueReferenceSchema.optional(),
    headline: z.string().trim().min(1).max(LIBRARY_AD_REQUEST_LIMITS.headline),
    primaryText: z.string().trim().min(1).max(LIBRARY_AD_REQUEST_LIMITS.primaryText),
    endsOn: z.iso.date(),
    dailyBudgetDollars: z.number().finite().min(5).max(1_000),
    totalBudgetDollars: z.number().finite().min(5).max(5_000),
    places: AdPlacesInputSchema,
  })
  .strict();
export type LibraryAdSaveRequest = z.input<typeof LibraryAdSaveRequestSchema>;

/** The ad a request named is not one a person can set up today: unknown, replaced, or retired. */
export class LibraryAdNotAvailableError extends Error {
  public constructor() {
    super("The chosen library ad is not an active, current entry in the catalog.");
    this.name = "LibraryAdNotAvailableError";
  }
}

export interface LibraryAdSaveDependencies {
  readonly versionRepository: CampaignVersionRepository;
  readonly readRepository: CampaignWorkspaceReadRepository;
  readonly loadLibrary?: () => Promise<LoadedAdsLibrary>;
  readonly readBrand?: () => Promise<SavedAdBrand>;
  readonly now?: () => Date;
}

/**
 * 009D-AC-021. The input references a library-ad version records. The brand reference is derived
 * from the saved brand's revisions; the partner reference is a fixed "no partner" value, because a
 * library ad carries no Realtor (compliance control 9). The compliance and routing references stay
 * constants: no compliance profile or routing mapping record exists yet to derive them from.
 */
function inputVersions(brandProfileVersionRef: string) {
  return {
    blueprintVersionRef: "blueprint_libraryAd001",
    brandProfileVersionRef,
    // No compliance profile record exists yet; this constant names the one ruleset in force.
    complianceProfileVersionRef: "complianceprofile_local001",
    partnerProfileVersionRef: "partnerprofile_none001",
    // No routing mapping record exists yet; HighLevel is not connected (PRD-009 Non-Goals).
    routingProfileVersionRef: "routingprofile_local001",
    rulesetVersionRef: LIBRARY_AD_RULESET_VERSION_REF,
  };
}

function minor(dollarsValue: number): number {
  return Math.round(dollarsValue * 100);
}

export interface SavedLibraryAdVersion {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
}

export async function saveLibraryAdVersion(
  untrustedInput: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  dependencies: LibraryAdSaveDependencies,
): Promise<SavedLibraryAdVersion> {
  const mode = authenticatedWorkspaceMode(environment);
  if (principal.authenticationMode === "local_synthetic" && mode !== "synthetic") {
    throw new UnauthenticatedPrincipalError();
  }
  assertMayExecuteCampaignMutation(principal);
  const input = LibraryAdSaveRequestSchema.parse(untrustedInput);

  const library = await (dependencies.loadLibrary ?? (() => loadAdsLibrary({ environment })))();
  const found = library.find(input.adId, input.adVersion);
  const standing = library.standingOf({ id: input.adId, version: input.adVersion });
  if (
    found === undefined ||
    standing === undefined ||
    found.entry.status !== "active" ||
    standing.highestVersion !== input.adVersion
  ) {
    throw new LibraryAdNotAvailableError();
  }

  let campaignRef: string;
  if (input.campaignRef === undefined) {
    campaignRef = `campaign_${randomUUID().replaceAll("-", "")}`;
  } else {
    // 009D-AC-020. A new version of an existing campaign, read under the session's workspace: a
    // reference from another workspace reads as no campaign at all, the same answer as an unknown
    // one, and an open house campaign saved before PRD-009 takes no library-ad version.
    const existing = await dependencies.readRepository.getByCampaignRef(input.campaignRef);
    if (existing === undefined || existing.version.manifest.blueprintId !== "library-ad") {
      throw new CampaignResourceNotAccessibleError();
    }
    campaignRef = existing.version.campaignRef;
  }

  const brand = await (
    dependencies.readBrand ?? (() => readSavedAdBrand(principal, environment))
  )();
  const createdAt = (dependencies.now ?? (() => new Date()))();
  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef,
        campaignVersionRef: `campaignversion_${randomUUID().replaceAll("-", "")}`,
        inputVersions: inputVersions(brand.brandProfileVersionRef),
        manifest: buildLibraryAdManifest({
          entry: found.entry,
          words: { headline: input.headline, primaryText: input.primaryText },
          brand: {
            ...brand.band,
            leadFormWording: brand.leadFormWording,
          },
          schedule: { startsAt: null, endsAt: `${input.endsOn}T23:59:59.000Z` },
          places: input.places,
          budget: {
            dailyBudgetMinor: minor(input.dailyBudgetDollars),
            totalBudgetMinor: minor(input.totalBudgetDollars),
          },
          routing: { mappingVersionRef: "routingmapping_local001", validationStatus: "valid" },
        }),
        createdBy: principal.actorRef,
      },
    },
    dependencies.versionRepository,
  );
  const preflight = runCampaignPreflight(
    version,
    libraryAdPreflightRules(createdAt, libraryAdRuleContext(found.entry, brand.partnerNames)),
  );
  return Object.freeze({ version, preflight });
}
