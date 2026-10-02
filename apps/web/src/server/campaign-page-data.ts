import {
  CAMPAIGN_MUTATION_ROLES,
  deriveCampaignStanding,
  projectCampaignVersions,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignPersistenceKind,
  type CampaignWorkspaceProjection,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceVersionRecord,
} from "@oalo/application";
import { US_STATES, type LibraryAdCampaignManifest } from "@oalo/contracts";

import type { LoadedAdsLibrary } from "../features/ads-library/server/catalog-loader.js";
import {
  NO_LIVE_RESULTS,
  type CampaignListRow,
  type CampaignNotice,
  type CampaignPageCommon,
  type CampaignPageData,
  type LibraryAdCampaignPage,
  type UseNewVersionRequest,
} from "../features/campaigns/campaign-page-model.js";
import type { CampaignApprovalControlsProps } from "../features/campaigns/components/campaign-approval-controls.js";
import { launchHref, type LaunchBand } from "../features/campaigns/launch-model.js";
import type { SavedAdBrand } from "./ad-brand-read.js";

/**
 * PRD-009e. Pure builders from what the workspace read returned to what the two Campaigns pages
 * draw: no clock, no environment, and no input or output of any kind, so each is tested with a
 * literal record and a literal catalog.
 *
 * The library arrives as the two questions this file asks of it (find an entry; where does an ad
 * stand), so a test hands over a small stand-in and the loader's whole module stays out of it.
 */

export type CampaignLibraryView = Pick<LoadedAdsLibrary, "find" | "standingOf">;

/** What the library says about the ad a version was made from. */
interface LibraryStanding {
  readonly inLibrary: boolean;
  readonly retired: boolean;
  readonly retiredOn: string | null;
  /** A newer version of the ad exists and is in the library (`undefined` when none does). */
  readonly newer: Readonly<{ version: number; headline: string; primaryText: string }> | undefined;
}

function libraryStandingOf(
  manifest: LibraryAdCampaignManifest,
  library: CampaignLibraryView,
): LibraryStanding {
  const standing = library.standingOf(manifest.libraryAd);
  if (standing === undefined) {
    return { inLibrary: false, retired: false, retiredOn: null, newer: undefined };
  }
  const highest = library.find(manifest.libraryAd.id, standing.highestVersion);
  const retired = standing.highestStatus === "retired";
  const newer =
    !retired && standing.highestVersion > manifest.libraryAd.version && highest !== undefined
      ? Object.freeze({
          version: standing.highestVersion,
          headline: highest.entry.defaults.headline,
          primaryText: highest.entry.defaults.primaryText,
        })
      : undefined;
  return {
    inLibrary: true,
    retired,
    retiredOn: retired ? (highest?.entry.retired?.on ?? null) : null,
    newer,
  };
}

function placeNames(
  targeting: Readonly<{ regions: readonly string[]; cities: readonly string[] }>,
) {
  return Object.freeze([
    ...targeting.cities,
    ...targeting.regions.map((code) => US_STATES[code] ?? code),
  ]);
}

function advertiserOf(manifest: LibraryAdCampaignManifest): LaunchBand {
  const { advertiser, content } = manifest;
  return Object.freeze({
    name: advertiser.name,
    title: advertiser.title,
    company: advertiser.company,
    nmls: advertiser.nmls,
    companyNmls: advertiser.companyNmls,
    colorPresetId: advertiser.colorPresetId,
    disclosureLine: content.disclosureText,
  });
}

/**
 * 009E-AC-006. Whether the person's Brand now differs from what this version froze. Only the
 * person who saved a version can say so: Brand is saved per person, so another viewer's Brand is
 * not "the" Brand this version was saved with, and comparing it would invent a change.
 */
function brandChangedSince(
  manifest: LibraryAdCampaignManifest,
  brand: SavedAdBrand | undefined,
): boolean {
  if (brand === undefined || !brand.saved) return false;
  const frozen = advertiserOf(manifest);
  const now = brand.band;
  return (
    frozen.name !== now.name ||
    frozen.title !== now.title ||
    frozen.company !== now.company ||
    frozen.nmls !== now.nmls ||
    frozen.companyNmls !== now.companyNmls ||
    frozen.colorPresetId !== now.colorPresetId ||
    frozen.disclosureLine !== now.disclosureLine ||
    manifest.content.consentText !== brand.leadFormWording
  );
}

export interface CampaignPageInput {
  readonly record: CampaignWorkspaceReadRecord;
  readonly versions: readonly CampaignWorkspaceVersionRecord[];
  readonly principal: Readonly<AuthenticatedPrincipal>;
  readonly kind: CampaignPersistenceKind;
  readonly library: CampaignLibraryView;
  /** The version number to show; the newest when omitted. */
  readonly versionNo?: number;
  /** The viewer's saved Brand, or `undefined` when it could not be read. Only the saver's is used. */
  readonly brand?: SavedAdBrand | undefined;
}

function approvalControlsFor(
  projection: CampaignWorkspaceProjection,
): CampaignApprovalControlsProps {
  return {
    campaignHref: projection.detailHref,
    campaignRef: projection.campaignRef,
    campaignVersionRef: projection.campaignVersionRef,
    manifestHash: projection.manifestHash,
    preflightResultHash: projection.preflight.resultHash,
    rowVersion: projection.rowVersion,
    canApprove: projection.canApprove,
    alreadyDecided: projection.approval?.decision,
    blocking: projection.preflight.blocking,
    state: projection.state,
  };
}

function noticesFor(
  input: Readonly<{
    manifest: LibraryAdCampaignManifest;
    library: LibraryStanding;
    undecided: boolean;
    canEdit: boolean;
    campaignRef: string;
    brandChanged: boolean;
  }>,
): readonly CampaignNotice[] {
  const chooseAnotherAdHref = input.canEdit
    ? launchHref({ step: 1, campaign: input.campaignRef, from: "campaigns" })
    : undefined;
  const notices: CampaignNotice[] = [];
  if (input.library.retired) {
    notices.push({
      kind: "retired",
      retiredOn: input.library.retiredOn,
      blocksApproval: input.undecided,
      chooseAnotherAdHref: input.undecided ? chooseAnotherAdHref : undefined,
    });
  } else if (!input.library.inLibrary) {
    notices.push({
      kind: "missing",
      blocksApproval: input.undecided,
      chooseAnotherAdHref: input.undecided ? chooseAnotherAdHref : undefined,
    });
  }
  const newer = input.library.newer;
  if (newer !== undefined) {
    const request: UseNewVersionRequest | undefined =
      input.undecided && input.canEdit
        ? {
            campaignRef: input.campaignRef,
            adId: input.manifest.libraryAd.id,
            adVersion: newer.version,
            headline: newer.headline,
            primaryText: newer.primaryText,
            endsOn: input.manifest.schedule.endsAt.slice(0, 10),
            dailyBudgetDollars: input.manifest.meta.dailyBudgetMinor / 100,
            totalBudgetDollars: input.manifest.meta.totalBudgetMinor / 100,
            places: [
              ...input.manifest.meta.targeting.regions,
              ...input.manifest.meta.targeting.cities,
            ],
          }
        : undefined;
    notices.push({ kind: "newer-version", useNewVersion: request });
  }
  if (input.brandChanged) notices.push({ kind: "brand-changed" });
  return Object.freeze(notices);
}

/**
 * 009E-AC-001 to 009E-AC-007 and 009E-AC-012. The campaign page for one version of one campaign.
 *
 * `undefined` answers every "no such page" the same way: the version is not among the campaign's
 * versions, which is also what a campaign in another location looks like, because the read finds no
 * rows there at all (009E-AC-005).
 */
export function buildCampaignPage(input: CampaignPageInput): CampaignPageData | undefined {
  const { record, principal, library } = input;
  const projection = projectCampaignWorkspace(record, principal, input.kind);
  const manifest = record.version.manifest;
  const libraryStanding =
    manifest.blueprintId === "library-ad" ? libraryStandingOf(manifest, library) : undefined;
  const versions = projectCampaignVersions(input.versions, principal, {
    state: record.state,
    adRetired: libraryStanding?.retired === true,
  });
  const shown = versions.find(
    (summary) => summary.versionNo === (input.versionNo ?? record.version.versionNo),
  );
  const shownRecord = input.versions.find(
    (candidate) => candidate.version.versionNo === shown?.versionNo,
  );
  if (shown === undefined || shownRecord === undefined) return undefined;

  const isLatest = shown.isLatest;
  const common: CampaignPageCommon = {
    campaignRef: projection.campaignRef,
    detailHref: projection.detailHref,
    versionNo: shown.versionNo,
    isLatest,
    standing: shown.standing,
    ...(shown.decision === undefined ? {} : { decision: shown.decision }),
    state: record.state,
    savedAt: shown.savedAt,
    savedByViewer: shown.savedByViewer,
    versions,
    campaignVersionRef: shown.campaignVersionRef,
    fixes:
      isLatest && projection.preflight.blocking
        ? Object.freeze(
            projection.preflight.findings
              .filter((finding) => finding.severity === "blocking")
              .map((finding) => finding.remediation),
          )
        : Object.freeze([]),
  };

  const shownManifest = shownRecord.version.manifest;
  if (shownManifest.blueprintId !== "library-ad") {
    return Object.freeze({
      ...common,
      kind: "earlier-flow" as const,
      headline: shownManifest.content.headline,
      body: shownManifest.content.body,
      disclosureText: shownManifest.content.disclosureText,
    });
  }

  const shownStanding = libraryStandingOf(shownManifest, library);
  const loaded = library.find(shownManifest.libraryAd.id, shownManifest.libraryAd.version);
  const canEdit = (CAMPAIGN_MUTATION_ROLES as readonly string[]).includes(principal.role);
  const undecided = shown.decision?.decision !== "approved";
  const brandChanged =
    isLatest && shown.savedByViewer && brandChangedSince(shownManifest, input.brand);
  const notices = isLatest
    ? noticesFor({
        manifest: shownManifest,
        library: shownStanding,
        undecided,
        canEdit,
        campaignRef: projection.campaignRef,
        brandChanged,
      })
    : Object.freeze([]);
  // 009c D4. A version nobody approved whose ad is retired, missing, or replaced cannot be approved,
  // so the page does not offer a control that would only be refused; the notice says what to do.
  const approvalBlockedByLibrary =
    undecided &&
    (shownStanding.retired || !shownStanding.inLibrary || shownStanding.newer !== undefined);
  const page: LibraryAdCampaignPage = {
    ...common,
    kind: "library-ad",
    name: loaded?.entry.name ?? shownManifest.content.headline,
    topic: loaded?.entry.topic,
    ad: Object.freeze({
      id: shownManifest.libraryAd.id,
      version: shownManifest.libraryAd.version,
      inLibrary: loaded !== undefined,
      alt: loaded?.entry.images.alt ?? shownManifest.images[0].altText,
      art:
        loaded === undefined
          ? undefined
          : Object.freeze({ tall: loaded.art.tall.url, square: loaded.art.square.url }),
      sample: loaded?.entry.sample ?? false,
      callToAction: shownManifest.content.callToAction,
      defaults: loaded === undefined ? undefined : Object.freeze({ ...loaded.entry.defaults }),
    }),
    words: Object.freeze({
      headline: shownManifest.content.headline,
      primaryText: shownManifest.content.body,
    }),
    advertiser: advertiserOf(shownManifest),
    startsOn: shownManifest.schedule.startsAt?.slice(0, 10),
    endsOn: shownManifest.schedule.endsAt.slice(0, 10),
    budget: Object.freeze({
      dailyDollars: shownManifest.meta.dailyBudgetMinor / 100,
      totalDollars: shownManifest.meta.totalBudgetMinor / 100,
    }),
    places: Object.freeze({
      states: Object.freeze([...shownManifest.meta.targeting.regions]),
      cities: Object.freeze([...shownManifest.meta.targeting.cities]),
    }),
    results: NO_LIVE_RESULTS,
    notices,
    canMakeNewVersion: isLatest && canEdit && !shownStanding.retired && shownStanding.inLibrary,
    makeNewVersionHref: launchHref({
      step: 2,
      campaign: projection.campaignRef,
      from: "campaigns",
    }),
    approvalControls:
      isLatest && !approvalBlockedByLibrary ? approvalControlsFor(projection) : undefined,
  };
  return Object.freeze(page);
}

/**
 * 009E-AC-009 to 009E-AC-012. One row of the Campaigns list: the library ad's name and topic and
 * its tall art as a thumbnail, or, for a campaign saved before PRD-009, its saved headline as the
 * name and no topic. The standing reads the recorded decision first, then the library (D8).
 */
export function buildCampaignListRow(
  record: CampaignWorkspaceReadRecord,
  principal: Readonly<AuthenticatedPrincipal>,
  kind: CampaignPersistenceKind,
  library: CampaignLibraryView,
): CampaignListRow {
  const projection = projectCampaignWorkspace(record, principal, kind);
  const manifest = record.version.manifest;
  const decision = projection.approval?.decision;
  if (manifest.blueprintId !== "library-ad") {
    return Object.freeze({
      campaignRef: projection.campaignRef,
      href: projection.detailHref,
      name: manifest.content.headline,
      topic: undefined,
      earlierFlow: true,
      thumbnail: undefined,
      alt: "",
      sample: false,
      startsOn: undefined,
      endsOn: undefined,
      places: Object.freeze([...manifest.meta.targeting.regions]),
      standing: deriveCampaignStanding({ state: projection.state, decision, adRetired: false }),
      decision,
      updatedAt: projection.updatedAt,
    });
  }
  const loaded = library.find(manifest.libraryAd.id, manifest.libraryAd.version);
  return Object.freeze({
    campaignRef: projection.campaignRef,
    href: projection.detailHref,
    name: loaded?.entry.name ?? manifest.content.headline,
    topic: loaded?.entry.topic,
    earlierFlow: false,
    thumbnail: loaded?.art.tall.url,
    alt: "",
    sample: loaded?.entry.sample ?? false,
    startsOn: manifest.schedule.startsAt?.slice(0, 10),
    endsOn: manifest.schedule.endsAt.slice(0, 10),
    places: placeNames(manifest.meta.targeting),
    standing: deriveCampaignStanding({
      state: projection.state,
      decision,
      adRetired: libraryStandingOf(manifest, library).retired,
    }),
    decision,
    updatedAt: projection.updatedAt,
  });
}

/** The list, newest change first, with ties broken by reference so the order never wobbles. */
export function sortCampaignListRows(rows: readonly CampaignListRow[]): readonly CampaignListRow[] {
  return Object.freeze(
    [...rows].sort(
      (left, right) =>
        right.updatedAt.localeCompare(left.updatedAt) ||
        left.campaignRef.localeCompare(right.campaignRef),
    ),
  );
}
