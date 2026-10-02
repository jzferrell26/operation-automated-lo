import {
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignPersistenceKind,
  type CampaignWorkspaceReadRecord,
  type CampaignWorkspaceVersionRecord,
} from "@oalo/application";
import {
  ApprovalDecisionSchema,
  type AdsLibraryEntry,
  type ApprovalDecision,
  type CampaignState,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";

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
import type { SavedAdBrand } from "./ad-brand-read.js";
import { createLocalSyntheticPrincipal } from "./authenticated-principal.js";
import {
  buildCampaignListRow,
  buildCampaignPage,
  type CampaignLibraryView,
} from "./campaign-page-data.js";
import {
  LOCAL_SYNTHETIC_ENV,
  OPEN_HOUSE_DRAFT_INPUT,
  SAMPLE_LIBRARY_ENV,
} from "./campaign-command-test-support.js";
import { libraryAdManifestInput } from "./library-ad-test-support.js";
import {
  compileOpenHouseDraft,
  createMemoryCampaignVersionRepository,
} from "./open-house-draft.test-support.js";

/**
 * PRD-009e test support. A campaign as the Campaigns pages read it, built from the repository's own
 * sample library and the real builders, with no database: a library-ad version with its check, an
 * optional recorded decision (with or without the decider's own name), older versions, and the
 * library's verdict on its ad. Each test then asks `buildCampaignPage` or `buildCampaignListRow`
 * what the page should be handed, and the screens draw it.
 */

/** A creator, who can save versions and cannot approve them. */
export const CREATOR: AuthenticatedPrincipal = createLocalSyntheticPrincipal();

/** Somebody who may approve, which is where a stale "ready" is most misleading. */
export const APPROVER: AuthenticatedPrincipal = {
  ...CREATOR,
  role: "campaign_approver" as const,
  actorRef: "principal_localApprover001",
  actorId: "00000000-0000-4000-8000-000000000812",
};

/** The workspace owner, who can both save and approve. */
export const OWNER: AuthenticatedPrincipal = {
  ...CREATOR,
  role: "location_admin" as const,
  actorRef: "principal_localOwner001",
  actorId: "00000000-0000-4000-8000-000000000813",
};

let library: Promise<LoadedAdsLibrary> | undefined;

/** The real catalog and the labelled sample ads, loaded once for the whole test file. */
export function sampleLibrary(): Promise<LoadedAdsLibrary> {
  library ??= loadAdsLibrary({ environment: SAMPLE_LIBRARY_ENV });
  return library;
}

export interface LibraryRecordOptions {
  readonly adId?: string;
  readonly adVersion?: number;
  readonly campaignRef?: string;
  readonly versionNo?: number;
  readonly createdBy?: string;
  readonly createdAt?: string;
  readonly headline?: string;
  readonly brandName?: string;
  readonly startsAt?: string | null;
  readonly endsAt?: string;
  readonly cities?: readonly string[];
  /** Words the checks send back, so the version comes out needing changes. */
  readonly needsChanges?: boolean;
  readonly decision?: "approved" | "rejected";
  readonly decidedAt?: string;
  readonly decidedBy?: "approver" | "location_admin";
  /** The decider's own name, recorded in the decision's evidence; absent for an older decision. */
  readonly approverDisplayName?: string;
}

const NEEDS_CHANGES_HEADLINE = "Low rates for every first home";

function entryFor(entries: LoadedAdsLibrary, id: string, version: number): AdsLibraryEntry {
  const found = entries.find(id, version);
  if (found === undefined) throw new Error(`No sample ${id} v${String(version)}`);
  return found.entry;
}

/** One version of a library-ad campaign, its latest check, and its decision when it has one. */
export async function libraryVersionRecord(
  options: LibraryRecordOptions = {},
): Promise<CampaignWorkspaceVersionRecord & { readonly preflight: PreflightResult }> {
  const entry = entryFor(
    await sampleLibrary(),
    options.adId ?? "sample-first-home",
    options.adVersion ?? 2,
  );
  const createdAt = new Date(options.createdAt ?? "2026-10-01T16:00:00.000Z");
  const campaignRef = options.campaignRef ?? "campaign_01LibraryPage";
  const versionNo = options.versionNo ?? 1;
  const headline = options.needsChanges === true ? NEEDS_CHANGES_HEADLINE : options.headline;
  const input = libraryAdManifestInput(entry, {
    ...(headline === undefined ? {} : { headline }),
    ...(options.brandName === undefined ? {} : { brandName: options.brandName }),
  });
  const manifest = buildLibraryAdManifest({
    ...input,
    schedule: {
      startsAt: options.startsAt === undefined ? null : options.startsAt,
      endsAt: options.endsAt ?? "2099-10-20T23:59:59.000Z",
    },
    places: { states: ["TX"], cities: [...(options.cities ?? ["Austin, TX"])] },
  });
  const created = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: CREATOR.locationRef,
        campaignRef,
        campaignVersionRef: `campaignversion_01LibraryV${String(versionNo)}`,
        inputVersions: {
          blueprintVersionRef: "blueprint_libraryAd001",
          brandProfileVersionRef: "brandprofile_local001",
          complianceProfileVersionRef: "complianceprofile_local001",
          partnerProfileVersionRef: "partnerprofile_none001",
          routingProfileVersionRef: "routingprofile_local001",
          rulesetVersionRef: LIBRARY_AD_RULESET_VERSION_REF,
        },
        manifest,
        createdBy: options.createdBy ?? CREATOR.actorRef,
      },
    },
    createMemoryCampaignVersionRepository(),
  );
  // The memory repository numbers every version 1; a campaign's history needs its own numbers.
  const version: CampaignVersion = { ...created, versionNo };
  // A version saved while its ad was current, so its check runs as it did then; the library's
  // verdict on the ad today is the page's to apply.
  const preflight = runCampaignPreflight(
    version,
    libraryAdPreflightRules(createdAt, {
      ...libraryAdRuleContext(entry, []),
      retiredOn: null,
    }),
  );
  if (options.needsChanges === true && !preflight.blocking) {
    throw new Error(
      "The needs-changes headline no longer fails the checks, so it is not a fixture.",
    );
  }
  const approval =
    options.decision === undefined
      ? undefined
      : decisionFor(version, preflight, options.decision, options);
  return Object.freeze({ version, preflight, ...(approval === undefined ? {} : { approval }) });
}

function decisionFor(
  version: CampaignVersion,
  preflight: PreflightResult,
  decision: "approved" | "rejected",
  options: LibraryRecordOptions,
): ApprovalDecision {
  const manifest = version.manifest;
  if (manifest.blueprintId !== "library-ad") throw new Error("Not a library-ad version.");
  const [tall, square] = manifest.images;
  return ApprovalDecisionSchema.parse({
    schemaVersion: 1,
    approvalRef: `approval_01LibraryV${String(version.versionNo)}`,
    locationRef: version.locationRef,
    campaignRef: version.campaignRef,
    campaignVersionRef: version.campaignVersionRef,
    manifestHash: version.manifestHash,
    preflightResultHash: preflight.resultHash,
    actorRef: APPROVER.actorRef,
    actorKind: "human",
    actorRole: options.decidedBy ?? "approver",
    decidedAt: options.decidedAt ?? "2026-10-01T12:00:00.000Z",
    ipAuditHash: "e".repeat(64),
    decision,
    snapshot: {
      blueprintId: "library-ad",
      libraryAdId: manifest.libraryAd.id,
      libraryAdVersion: manifest.libraryAd.version,
      tallSha256: tall.contentSha256,
      squareSha256: square.contentSha256,
      creativeVersionRef: `libcreative_${"a".repeat(40)}`,
      copyVersionRef: `libcopy_${"b".repeat(40)}`,
      disclosureVersionRef: `libdisclosure_${"c".repeat(40)}`,
      targetingHash: "1".repeat(64),
      budgetHash: "2".repeat(64),
      datesHash: "3".repeat(64),
      ...(options.approverDisplayName === undefined
        ? {}
        : { approverDisplayName: options.approverDisplayName }),
    },
  });
}

export interface LibraryCampaignOptions extends LibraryRecordOptions {
  readonly state?: CampaignState;
  /** Older versions of the same campaign, oldest first, saved before this one. */
  readonly olderVersions?: readonly LibraryRecordOptions[];
}

export interface BuiltCampaign {
  readonly record: CampaignWorkspaceReadRecord;
  readonly versions: readonly CampaignWorkspaceVersionRecord[];
}

/** A campaign whose newest version is the one described, with its older versions behind it. */
export async function libraryCampaign(
  options: LibraryCampaignOptions = {},
): Promise<BuiltCampaign> {
  const campaignRef = options.campaignRef ?? "campaign_01LibraryPage";
  const olderOptions = options.olderVersions ?? [];
  const newestNo = options.versionNo ?? olderOptions.length + 1;
  const older = await Promise.all(
    olderOptions.map((older, index) =>
      libraryVersionRecord({ ...older, campaignRef, versionNo: older.versionNo ?? index + 1 }),
    ),
  );
  const newest = await libraryVersionRecord({ ...options, campaignRef, versionNo: newestNo });
  const decided = newest.approval?.decision;
  const state: CampaignState =
    options.state ??
    (decided === "approved"
      ? "approved"
      : newest.preflight.blocking
        ? "preflight_failed"
        : "awaiting_approval");
  const record: CampaignWorkspaceReadRecord = Object.freeze({
    version: newest.version,
    preflight: newest.preflight,
    state,
    rowVersion: decided === undefined ? 1 : 2,
    updatedAt: newest.approval?.decidedAt ?? newest.version.createdAt,
    ...(newest.approval === undefined ? {} : { approval: newest.approval }),
  });
  return Object.freeze({
    record,
    versions: Object.freeze([newest, ...older.reverse()]),
  });
}

/** An open house version saved before PRD-009, which the page opens read-only (D4). */
export async function earlierFlowCampaign(
  options: Readonly<{ decision?: "approved" | "rejected" }> = {},
): Promise<BuiltCampaign> {
  const compiled = await compileOpenHouseDraft(
    OPEN_HOUSE_DRAFT_INPUT,
    createLocalSyntheticPrincipal(),
    LOCAL_SYNTHETIC_ENV,
  );
  const { manifest } = compiled.version;
  if (manifest.blueprintId !== "open-house-boost") throw new Error("Not an open house version.");
  const { artifacts } = manifest;
  const approval =
    options.decision === undefined
      ? undefined
      : ApprovalDecisionSchema.parse({
          schemaVersion: 1,
          approvalRef: "approval_earlier001",
          locationRef: compiled.version.locationRef,
          campaignRef: compiled.version.campaignRef,
          campaignVersionRef: compiled.version.campaignVersionRef,
          manifestHash: compiled.version.manifestHash,
          preflightResultHash: compiled.preflight.resultHash,
          actorRef: APPROVER.actorRef,
          actorKind: "human",
          actorRole: "approver",
          decidedAt: "2026-09-20T12:00:00.000Z",
          ipAuditHash: "e".repeat(64),
          decision: options.decision,
          snapshot: {
            pageVersionRef: artifacts.pageVersionRef,
            pdfVersionRef: artifacts.pdfVersionRef,
            creativeVersionRef: artifacts.creativeVersionRef,
            copyVersionRef: artifacts.copyVersionRef,
            emailPackageVersionRef: artifacts.emailPackageVersionRef,
            smsPackageVersionRef: artifacts.smsPackageVersionRef,
            disclosureVersionRef: artifacts.disclosureVersionRef,
            targetingHash: "1".repeat(64),
            budgetHash: "2".repeat(64),
            datesHash: "3".repeat(64),
            formVersionRef: artifacts.formVersionRef,
            destinationVersionRef: artifacts.destinationVersionRef,
          },
        });
  const record: CampaignWorkspaceReadRecord = Object.freeze({
    version: compiled.version,
    preflight: compiled.preflight,
    state: approval?.decision === "approved" ? "approved" : "awaiting_approval",
    rowVersion: approval === undefined ? 1 : 2,
    updatedAt: approval?.decidedAt ?? compiled.version.createdAt,
    ...(approval === undefined ? {} : { approval }),
  });
  return Object.freeze({
    record,
    versions: Object.freeze([
      Object.freeze({
        version: compiled.version,
        preflight: compiled.preflight,
        ...(approval === undefined ? {} : { approval }),
      }),
    ]),
  });
}

/** What the campaign page is handed for a built campaign, read by `principal`. */
export async function pageOf(
  campaign: BuiltCampaign,
  options: Readonly<{
    principal?: AuthenticatedPrincipal;
    kind?: CampaignPersistenceKind;
    versionNo?: number;
    library?: CampaignLibraryView;
    brand?: SavedAdBrand | undefined;
  }> = {},
) {
  const page = buildCampaignPage({
    record: campaign.record,
    versions: campaign.versions,
    principal: options.principal ?? APPROVER,
    kind: options.kind ?? "postgres",
    library: options.library ?? (await sampleLibrary()),
    ...(options.versionNo === undefined ? {} : { versionNo: options.versionNo }),
    ...(options.brand === undefined ? {} : { brand: options.brand }),
  });
  if (page === undefined) throw new Error("The campaign page was not built.");
  return page;
}

/** What the Campaigns list is handed for a built campaign. */
export async function rowOf(
  campaign: BuiltCampaign,
  options: Readonly<{ principal?: AuthenticatedPrincipal; library?: CampaignLibraryView }> = {},
) {
  return buildCampaignListRow(
    campaign.record,
    options.principal ?? APPROVER,
    "postgres",
    options.library ?? (await sampleLibrary()),
  );
}

/**
 * A day as this product writes one: "Jul 21, 2026", "7/21/2026", or "2026-07-21". The design-quality
 * check in the browser holds the same pattern, and holds each match to tabular figures; a `time`
 * element is where the global stylesheet gives it those.
 */
const DAY_PATTERN =
  /\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/u;

/**
 * Every piece of text under `root` that holds a day without being inside a `time` element, which is
 * what the browser's tabular figures check would flag (each found as its element and its words).
 * Details for support are left out, as the browser check leaves them out.
 */
export function daysOutsideTimeElements(root: Element): string[] {
  const found: string[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const element = node.parentElement;
    const text = node.textContent ?? "";
    if (element === null || !DAY_PATTERN.test(text)) continue;
    if (element.closest("time, [data-support-details]") !== null) continue;
    found.push(`${element.tagName.toLowerCase()} "${text.trim()}"`);
  }
  return found;
}

/** An element's text as a reader takes it: every run of white space is one space, and no edge space. */
function wordsOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/gu, " ").trim();
}

/**
 * A text matcher for a whole sentence whose days are drawn as `time` elements: the sentence is the
 * element's full text, however many elements it is split across, and no element inside it holds
 * all of it (so the match is the sentence's own element and not one of its ancestors).
 */
export function wholeSentence(sentence: string | RegExp) {
  return (_own: string, element: Element | null): boolean => {
    if (element === null) return false;
    const full = wordsOf(element);
    const matches = typeof sentence === "string" ? full === sentence : sentence.test(full);
    return matches && [...element.children].every((child) => wordsOf(child) !== full);
  };
}
