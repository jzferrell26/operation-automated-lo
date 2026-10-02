import { randomUUID } from "node:crypto";

import {
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import type { AdsLibraryEntry, CampaignVersion, PreflightResult } from "@oalo/contracts";

import {
  ADS_LIBRARY_SAMPLES_FLAG,
  loadAdsLibrary,
} from "../features/ads-library/server/catalog-loader.js";
import {
  buildLibraryAdManifest,
  type LibraryAdManifestInput,
} from "../features/ads-library/server/library-ad-manifest.js";
import {
  LIBRARY_AD_RULESET_VERSION_REF,
  libraryAdPreflightRules,
} from "../features/ads-library/server/library-ad-ruleset.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";

/**
 * Test support for PRD-009c: saving a library-ad version through the application layer, the way
 * 009d's save will, so the approval route can be proven against it before that save exists.
 *
 * It is shared by the filesystem unit suite and the real-Postgres route suite, which differ only in
 * the environment they pass. It reads the sample catalog under its own guard-passing environment,
 * because a test needs a real catalog entry to build from even when the approval it then makes runs
 * with samples off.
 */

export const SAMPLES_ON_ENVIRONMENT: Readonly<Record<string, string>> = Object.freeze({
  OALO_ENVIRONMENT: "local",
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

export async function sampleEntry(id: string, version: number): Promise<AdsLibraryEntry> {
  const library = await loadAdsLibrary({ environment: SAMPLES_ON_ENVIRONMENT });
  const found = library.find(id, version);
  if (found === undefined) throw new Error(`No sample ${id} v${String(version)} in the catalog`);
  return found.entry;
}

export interface LibraryAdDraftRequest {
  readonly principal: Readonly<AuthenticatedPrincipal>;
  readonly environment: unknown;
  readonly entry: AdsLibraryEntry;
  readonly headline?: string;
  readonly brandName?: string;
}

export interface SavedLibraryAdDraft {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
  readonly rowVersion: number;
}

export function libraryAdManifestInput(
  entry: AdsLibraryEntry,
  overrides: Readonly<{ headline?: string; brandName?: string }> = {},
): LibraryAdManifestInput {
  return {
    entry,
    words: {
      headline: overrides.headline ?? entry.defaults.headline,
      primaryText: entry.defaults.primaryText,
    },
    brand: {
      name: overrides.brandName ?? "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
      disclosureLine: "Equal Housing Opportunity.",
      leadFormWording:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
    },
    schedule: { startsAt: null, endsAt: "2099-12-31T23:59:00.000Z" },
    places: { states: ["TX"], cities: ["Austin, TX"] },
    budget: { dailyBudgetMinor: 2_500, totalBudgetMinor: 35_000 },
    routing: { mappingVersionRef: "routingmapping_local001", validationStatus: "valid" },
  };
}

/** Builds, checks, and saves one library-ad version for `principal`, through the persistence adapter. */
export async function saveLibraryAdDraft(
  request: LibraryAdDraftRequest,
): Promise<SavedLibraryAdDraft> {
  const suffix = randomUUID().replaceAll("-", "");
  const adapter = createCampaignPersistenceAdapter(
    request.principal,
    request.environment,
    `correlation_libraryad_${suffix.slice(0, 16)}`,
  );
  const createdAt = new Date();
  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: request.principal.locationRef,
        campaignRef: `campaign_${suffix}`,
        campaignVersionRef: `campaignversion_${suffix}`,
        inputVersions: {
          blueprintVersionRef: "blueprint_libraryAd001",
          brandProfileVersionRef: "brandprofile_local001",
          complianceProfileVersionRef: "complianceprofile_local001",
          partnerProfileVersionRef: "partnerprofile_none001",
          routingProfileVersionRef: "routingprofile_local001",
          rulesetVersionRef: LIBRARY_AD_RULESET_VERSION_REF,
        },
        manifest: buildLibraryAdManifest(
          libraryAdManifestInput(request.entry, {
            ...(request.headline === undefined ? {} : { headline: request.headline }),
            ...(request.brandName === undefined ? {} : { brandName: request.brandName }),
          }),
        ),
        createdBy: request.principal.actorRef,
      },
    },
    adapter.versionRepository,
  );
  const preflight = runCampaignPreflight(version, libraryAdPreflightRules(createdAt));
  const record = await adapter.persistDraft(version, preflight);
  return Object.freeze({ version, preflight, rowVersion: record.rowVersion });
}

/** The browser's approval payload for a saved draft, field for field. */
export function libraryAdApprovalPayload(
  draft: SavedLibraryAdDraft,
  decision: "approved" | "rejected" = "approved",
) {
  return {
    campaignRef: draft.version.campaignRef,
    decision,
    expectedCampaignVersionRef: draft.version.campaignVersionRef,
    expectedManifestHash: draft.version.manifestHash,
    expectedPreflightResultHash: draft.preflight.resultHash,
    expectedRowVersion: draft.rowVersion,
  };
}
