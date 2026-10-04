import {
  CAMPAIGN_MUTATION_ROLES,
  campaignMayBeApprovedBy,
  libraryAdRefusalFor,
  recordedLibraryAdOf,
  rulesetRuleCodes,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceReadRecord,
} from "@oalo/application";
import type { LibraryAdCampaignManifest } from "@oalo/contracts";

import { RULE_PLAIN_NAMES } from "../copy/launch-messages.js";
import { APPROVAL_ROLE_LABELS } from "../copy/user-language.js";
import { newerVersionOffer } from "../features/ads-library/newer-version.js";
import {
  loadAdsLibrary,
  type LoadedAdsLibrary,
  type LoadedAdsLibraryEntry,
} from "../features/ads-library/server/catalog-loader.js";
import type { LaunchCampaignPrefill } from "../features/campaigns/components/launch-flow.js";
import type { LaunchReviewData } from "../features/campaigns/components/launch-review.js";
import {
  parseLaunchAddress,
  type LaunchAdCard,
  type LaunchAddress,
  type LaunchBand,
} from "../features/campaigns/launch-model.js";
import { DEFAULT_AD_BRAND } from "../features/workspace/ad-brand.js";
import { readSavedAdBrand } from "./ad-brand-read.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { WorkspacePreferenceError } from "./workspace-preferences.js";

/**
 * PRD-009d D1, D2, D8 and 009D-AC-001, 011, 014, 020. What `/marketing/campaigns/new` is handed.
 *
 * The address is parsed into typed values and anything else is ignored (D1). The library is the
 * catalog's active entries at their highest version, as display fields only (009C-AC-013). The band
 * is the signed-in person's own saved Brand, read here under their workspace. A campaign named in
 * the address is read under the session's workspace too: one from another workspace, or one that
 * is not a library ad, reads as no campaign, and the address falls back to its default.
 */

export interface LaunchPageData {
  readonly address: LaunchAddress;
  readonly cards: readonly LaunchAdCard[];
  readonly advertiser: LaunchBand;
  readonly today: string;
  readonly rememberedPlaces: readonly string[];
  readonly campaign?: LaunchCampaignPrefill | undefined;
  readonly review?: LaunchReviewData | undefined;
}

/** The band a person with no saved Brand sees: the placeholder, with the default disclosure line. */
export const PLACEHOLDER_BAND: LaunchBand = Object.freeze({
  name: "",
  title: "",
  company: "",
  nmls: "",
  companyNmls: "",
  colorPresetId: DEFAULT_AD_BRAND.colorPresetId,
  disclosureLine: DEFAULT_AD_BRAND.disclosureLine,
});

function utcToday(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function cardOf(loaded: LoadedAdsLibraryEntry): LaunchAdCard {
  const { entry } = loaded;
  return Object.freeze({
    id: entry.id,
    version: entry.version,
    topic: entry.topic,
    name: entry.name,
    headline: entry.defaults.headline,
    primaryText: entry.defaults.primaryText,
    headlineMaxLength: entry.editable.headline.maxLength,
    primaryTextMaxLength: entry.editable.primaryText.maxLength,
    callToAction: entry.callToAction,
    alt: entry.images.alt,
    art: Object.freeze({ tall: loaded.art.tall.url, square: loaded.art.square.url }),
    approvedOn: entry.approval.approvedOn,
    sample: entry.sample,
  });
}

/** D2: the cards step 1 and the library show, retired and replaced ads left out (009C-AC-008). */
export function activeLibraryCards(library: LoadedAdsLibrary): readonly LaunchAdCard[] {
  return Object.freeze(
    library.entries
      .filter((loaded) => {
        const standing = library.standingOf(loaded.entry);
        return (
          loaded.entry.status === "active" && standing?.highestVersion === loaded.entry.version
        );
      })
      .map(cardOf),
  );
}

function libraryAdManifest(
  record: CampaignWorkspaceReadRecord | undefined,
): LibraryAdCampaignManifest | undefined {
  const manifest = record?.version.manifest;
  return manifest?.blueprintId === "library-ad" ? manifest : undefined;
}

function placesOf(manifest: LibraryAdCampaignManifest): readonly string[] {
  return [...manifest.meta.targeting.regions, ...manifest.meta.targeting.cities];
}

/** D4: the area a person used last is prefilled on their next campaign; the first time it is empty. */
export function rememberedPlacesFor(
  records: readonly CampaignWorkspaceReadRecord[],
  actorRef: string,
): readonly string[] {
  const latest = [...records]
    .filter((record) => record.version.createdBy === actorRef)
    .sort((left, right) => right.version.createdAt.localeCompare(left.version.createdAt))
    .map(libraryAdManifest)
    .find((manifest) => manifest !== undefined);
  return latest === undefined ? Object.freeze([]) : Object.freeze(placesOf(latest));
}

function bandOf(manifest: LibraryAdCampaignManifest): LaunchBand {
  return Object.freeze({
    name: manifest.advertiser.name,
    title: manifest.advertiser.title,
    company: manifest.advertiser.company,
    nmls: manifest.advertiser.nmls,
    companyNmls: manifest.advertiser.companyNmls,
    colorPresetId: manifest.advertiser.colorPresetId,
    disclosureLine: manifest.content.disclosureText,
  });
}

/**
 * 009D-AC-014. The checks count: rules run is the length of the registry entry for the stored
 * ruleset reference, and rules passed is that number minus the distinct rule codes in the stored
 * findings. Neither number is typed by hand or stored.
 */
export function checksOf(record: CampaignWorkspaceReadRecord): LaunchReviewData["checks"] {
  const registered = rulesetRuleCodes(record.preflight.rulesetVersionRef) ?? [];
  const found = new Set(record.preflight.findings.map((finding) => finding.ruleCode));
  const failed = registered.filter((code) => found.has(code));
  return Object.freeze({
    run: registered.length,
    passed: registered.length - failed.length,
    blocking: record.preflight.blocking,
    rules: Object.freeze(
      registered.map((code) =>
        Object.freeze({
          code,
          name: RULE_PLAIN_NAMES[code],
          passed: !found.has(code),
        }),
      ),
    ),
    findings: Object.freeze(
      record.preflight.findings
        .filter((finding) => finding.severity === "blocking")
        .map((finding) =>
          Object.freeze({
            ruleCode: finding.ruleCode,
            affected: finding.affected,
            remediation: finding.remediation,
          }),
        ),
    ),
  });
}

export function reviewDataOf(
  record: CampaignWorkspaceReadRecord,
  manifest: LibraryAdCampaignManifest,
  loaded: LoadedAdsLibraryEntry,
  library: LoadedAdsLibrary,
  principal: Readonly<AuthenticatedPrincipal>,
): LaunchReviewData {
  const standing = library.standingOf(manifest.libraryAd);
  const highest =
    standing === undefined
      ? undefined
      : library.find(manifest.libraryAd.id, standing.highestVersion);
  // QA-06. Whether this version's ad can still be approved is the approval command's own rule, so
  // step 3 never offers Approve for a version the command would refuse.
  const adRefusal = libraryAdRefusalFor(recordedLibraryAdOf(manifest), standing);
  const retiredOn =
    adRefusal === "retired"
      ? (highest?.entry.retired?.on ?? loaded.entry.retired?.on ?? null)
      : null;
  const newerVersion =
    adRefusal === "replaced"
      ? newerVersionOffer({
          campaignRef: record.version.campaignRef,
          manifest,
          decided: record.approval !== undefined,
          library,
        })
      : undefined;
  const approval = record.approval;
  return Object.freeze({
    campaignRef: record.version.campaignRef,
    campaignVersionRef: record.version.campaignVersionRef,
    versionNo: record.version.versionNo,
    manifestHash: record.version.manifestHash,
    preflightResultHash: record.preflight.resultHash,
    rowVersion: record.rowVersion,
    state: record.state,
    detailHref: `/marketing/campaigns/${record.version.campaignRef}`,
    canApprove: campaignMayBeApprovedBy(principal, record),
    decision:
      approval === undefined
        ? undefined
        : Object.freeze({
            decision: approval.decision,
            approver:
              approval.snapshot.approverDisplayName ?? APPROVAL_ROLE_LABELS[approval.actorRole],
            decidedAt: approval.decidedAt,
          }),
    ad: Object.freeze({
      id: manifest.libraryAd.id,
      version: manifest.libraryAd.version,
      name: loaded.entry.name,
      topic: loaded.entry.topic,
      alt: loaded.entry.images.alt,
      art: Object.freeze({ tall: loaded.art.tall.url, square: loaded.art.square.url }),
      sample: loaded.entry.sample,
      callToAction: manifest.content.callToAction,
      defaults: Object.freeze({ ...loaded.entry.defaults }),
    }),
    retiredOn,
    adRefusal,
    newerVersion,
    canMakeNewVersion: (CAMPAIGN_MUTATION_ROLES as readonly string[]).includes(principal.role),
    words: Object.freeze({
      headline: manifest.content.headline,
      primaryText: manifest.content.body,
    }),
    advertiser: bandOf(manifest),
    budget: Object.freeze({
      dailyDollars: manifest.meta.dailyBudgetMinor / 100,
      totalDollars: manifest.meta.totalBudgetMinor / 100,
    }),
    endsOn: manifest.schedule.endsAt.slice(0, 10),
    places: Object.freeze({
      states: Object.freeze([...manifest.meta.targeting.regions]),
      cities: Object.freeze([...manifest.meta.targeting.cities]),
    }),
    checks: checksOf(record),
  });
}

function prefillOf(
  manifest: LibraryAdCampaignManifest,
  campaignRef: string,
): LaunchCampaignPrefill {
  return Object.freeze({
    campaignRef,
    adId: manifest.libraryAd.id,
    prefill: Object.freeze({
      headline: manifest.content.headline,
      primaryText: manifest.content.body,
      dailyBudgetDollars: manifest.meta.dailyBudgetMinor / 100,
      totalBudgetDollars: manifest.meta.totalBudgetMinor / 100,
      endsOn: manifest.schedule.endsAt.slice(0, 10),
      places: Object.freeze(placesOf(manifest)),
    }),
  });
}

async function advertiserFor(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<LaunchBand> {
  try {
    return (await readSavedAdBrand(principal, environment)).band;
  } catch (error) {
    // Support cannot open personal Brand; it sees the placeholder band and creates nothing.
    if (error instanceof WorkspacePreferenceError) return PLACEHOLDER_BAND;
    throw error;
  }
}

export async function loadLaunchPage(
  principal: Readonly<AuthenticatedPrincipal>,
  search: Readonly<Record<string, string | readonly string[] | undefined>>,
  environment: unknown,
  now: Date = new Date(),
): Promise<LaunchPageData> {
  const parsed = parseLaunchAddress(search);
  const library = await loadAdsLibrary({ environment });
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const [advertiser, records] = await Promise.all([
    advertiserFor(principal, environment),
    adapter.readRepository.listForLocation(),
  ]);
  const record =
    parsed.campaign === undefined
      ? undefined
      : await adapter.readRepository.getByCampaignRef(parsed.campaign);
  const manifest = libraryAdManifest(record);
  const loaded =
    manifest === undefined
      ? undefined
      : library.find(manifest.libraryAd.id, manifest.libraryAd.version);
  const known = record !== undefined && manifest !== undefined && loaded !== undefined;
  const address: LaunchAddress = known ? parsed : { ...parsed, campaign: undefined };
  const base = {
    cards: activeLibraryCards(library),
    advertiser,
    today: utcToday(now),
    rememberedPlaces: rememberedPlacesFor(records, principal.actorRef),
  };
  if (!known) {
    return Object.freeze({
      ...base,
      address: { ...address, step: address.step === 3 ? 1 : address.step },
    });
  }
  if (address.step === 3) {
    return Object.freeze({
      ...base,
      address,
      review: reviewDataOf(record, manifest, loaded, library, principal),
    });
  }
  return Object.freeze({
    ...base,
    address,
    campaign: prefillOf(manifest, record.version.campaignRef),
  });
}

export type LaunchPageRead =
  Readonly<{ authenticated: false }> | Readonly<{ authenticated: true; data: LaunchPageData }>;

/** The page's read: an unauthenticated request is not an empty library, so it is said apart. */
export async function readLaunchPageForRequest(
  request: Request,
  search: Readonly<Record<string, string | readonly string[] | undefined>>,
  environment: unknown = process.env,
): Promise<LaunchPageRead> {
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) return { authenticated: false };
    throw error;
  }
  return { authenticated: true, data: await loadLaunchPage(principal, search, environment) };
}

/**
 * The dashboard preview has no session and runs with `OALO_ENVIRONMENT: "preview"`, so its library
 * is the real one, which is empty (009c D3): step 1 says so, and nothing can be saved there.
 */
export async function loadPreviewLaunchPage(
  search: Readonly<Record<string, string | readonly string[] | undefined>>,
  environment: unknown = process.env,
  now: Date = new Date(),
): Promise<LaunchPageData> {
  const library = await loadAdsLibrary({ environment });
  return Object.freeze({
    address: { ...parseLaunchAddress(search), step: 1 as const, campaign: undefined },
    cards: activeLibraryCards(library),
    advertiser: PLACEHOLDER_BAND,
    today: utcToday(now),
    rememberedPlaces: Object.freeze([]),
  });
}
