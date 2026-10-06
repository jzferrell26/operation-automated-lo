import {
  CampaignResourceNotAccessibleError,
  principalHasCampaignApprovalRole,
  projectCampaignWorkspace,
  recordedLibraryAdOf,
  type AuthenticatedPrincipal,
  type CampaignPersistenceKind,
  type CampaignWorkspaceReadRecord,
  type LibraryAdCatalogStanding,
} from "@oalo/application";
import {
  ADS_LIBRARY_TOPICS,
  type AdsLibraryCatalogKind,
  type AdsLibraryEntry,
  type AdsLibraryTopic,
} from "@oalo/contracts";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
} from "@oalo/db";
import { z } from "zod";

import { loadAdsLibrary } from "../features/ads-library/server/catalog-loader.js";
import type { HomeData } from "../features/overview/model/home-view.js";
import {
  buildHomeChecklist,
  INSTALLATION_STATUSES,
  type InstallationStatus,
  type SavedBrandRecord,
} from "../features/overview/model/home-checklist.js";
import {
  buildApprovalList,
  buildRunningList,
  libraryAdStillApprovable,
  type HomeCampaignFacts,
} from "../features/overview/model/home-campaigns.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { campaignPersistenceKind } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  createCampaignPersistenceAdapter,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-009b D2 and D3. Everything Home reads, in one place, under the signed-in person's own tenant
 * context.
 *
 * Three reads feed the page:
 *
 * 1. **The checklist's two facts.** Whether this workspace has an installation row with each status,
 *    and what the person's saved brand holds. Both are saved records; nothing is read from the
 *    browser (009B-AC-005). Each runs inside `withTenantTransaction`, so the row-level policy
 *    decides which rows exist, and each names the one table and key it needs, so no write path and
 *    no other preference is touched.
 * 2. **The campaigns**, through the same persistence adapter the Campaigns pages use, so Home and
 *    the campaign page agree about a campaign's state and decision.
 * 3. **The ads library**, for the topics that have an active ad and for each campaign's ad name,
 *    whether the ad is a sample, and whether it can still be approved.
 *
 * The three are passed in as ports so a test can say what each one answers. The local demo has no
 * database: nothing has been saved there, so its checklist reads nothing and says so.
 */

export type { HomeData };

export type HomeRead =
  Readonly<{ authenticated: false }> | Readonly<{ authenticated: true; home: HomeData }>;

/** The narrow part of the loaded ads library that Home uses. */
export type HomeLibrary = Readonly<{
  entries: readonly Readonly<{
    entry: Pick<AdsLibraryEntry, "id" | "version" | "topic" | "status" | "name">;
    source: AdsLibraryCatalogKind;
  }>[];
  find(
    id: string,
    version: number,
  ): Readonly<{ entry: Pick<AdsLibraryEntry, "name">; source: AdsLibraryCatalogKind }> | undefined;
  standingOf(ad: Readonly<{ id: string; version: number }>): LibraryAdCatalogStanding | undefined;
}>;

export type ChecklistFacts = Readonly<{
  installationStatuses: readonly InstallationStatus[];
  brand: SavedBrandRecord;
}>;

export type HomeReadPorts = Readonly<{
  readChecklistFacts(
    principal: Readonly<AuthenticatedPrincipal>,
    environment: unknown,
  ): Promise<ChecklistFacts>;
  readCampaigns(
    principal: Readonly<AuthenticatedPrincipal>,
    environment: unknown,
  ): Promise<
    Readonly<{ kind: CampaignPersistenceKind; records: readonly CampaignWorkspaceReadRecord[] }>
  >;
  loadLibrary(environment: unknown): Promise<HomeLibrary>;
}>;

const InstallationStatusRowSchema = z.object({ status: z.enum(INSTALLATION_STATUSES) });

const installationStatusesContract = defineSqlContract<InstallationStatus>({
  name: "home.installation-statuses",
  access: "read",
  text: "select status from platform.marketplace_installations where location_id = $1::uuid",
  decode: (row) => InstallationStatusRowSchema.parse(row).status,
});

/**
 * The brand the Brand page saves, under `workspace.brand.v1`. Only the two facts D2 reads are
 * parsed, and the rest of the stored value is left alone, so a field the Brand page adds later
 * cannot make Home report a saved brand as unreadable.
 */
const SavedBrandRowSchema = z.object({
  value: z.object({ value: z.object({ name: z.string(), nmls: z.string() }).loose() }).loose(),
});

const savedBrandContract = defineSqlContract<Readonly<{ value: unknown }>>({
  name: "home.saved-brand",
  access: "read",
  text: "select value from platform.user_preferences where location_id = $1::uuid and user_id = $2::uuid and key = 'workspace.brand.v1'",
  decode: (row) => Object.freeze({ value: (row as { value: unknown }).value }),
});

export function savedBrandFrom(rows: readonly Readonly<{ value: unknown }>[]): SavedBrandRecord {
  const row = rows[0];
  if (row === undefined) return undefined;
  const parsed = SavedBrandRowSchema.safeParse({ value: row.value });
  return parsed.success
    ? Object.freeze({ name: parsed.data.value.value.name, nmls: parsed.data.value.value.nmls })
    : "unreadable";
}

async function readChecklistFactsFromDatabase(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<ChecklistFacts> {
  const pool = campaignDatabasePool(environment);
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
  return withTenantTransaction(pool, authority, async (transaction) => {
    const statuses = await transaction.read(installationStatusesContract, [principal.locationId]);
    const brand = await transaction.read(savedBrandContract, [
      principal.locationId,
      principal.actorId,
    ]);
    return Object.freeze({
      installationStatuses: Object.freeze([...statuses]),
      brand: savedBrandFrom(brand),
    });
  });
}

const DEFAULT_PORTS: HomeReadPorts = Object.freeze({
  readChecklistFacts: readChecklistFactsFromDatabase,
  async readCampaigns(principal, environment) {
    const adapter = createCampaignPersistenceAdapter(principal, environment);
    return { kind: adapter.kind, records: await adapter.readRepository.listForLocation() };
  },
  loadLibrary: (environment) => loadAdsLibrary({ environment }),
});

function activeTopics(library: HomeLibrary): readonly AdsLibraryTopic[] {
  const withAnActiveAd = new Set(
    library.entries
      .filter((item) => item.entry.status === "active")
      .map((item) => item.entry.topic),
  );
  return Object.freeze(ADS_LIBRARY_TOPICS.filter((topic) => withAnActiveAd.has(topic)));
}

/**
 * One campaign, as Home's two lists need it. A campaign the person may not read is left out, as it
 * is on every other page. A library-ad campaign is named after its library ad when the catalog
 * still has it, and says whether that ad is a sample; whether it can still be approved is the
 * approval command's own rule, applied to the standing the catalog gives that version.
 */
function factsFor(
  record: CampaignWorkspaceReadRecord,
  principal: Readonly<AuthenticatedPrincipal>,
  kind: CampaignPersistenceKind,
  library: HomeLibrary,
): HomeCampaignFacts | undefined {
  let projection;
  try {
    projection = projectCampaignWorkspace(record, principal, kind);
  } catch (error: unknown) {
    if (error instanceof CampaignResourceNotAccessibleError) return undefined;
    throw error;
  }
  const manifest = record.version.manifest;
  const common = {
    campaignRef: projection.campaignRef,
    detailHref: projection.detailHref,
    state: projection.state,
    decision: projection.approval?.decision,
    updatedAt: projection.updatedAt,
    canApprove: projection.canApprove,
  };
  if (manifest.blueprintId !== "library-ad") {
    // A campaign saved before PRD-009 (R-6): no library ad, no run dates, and the approval command
    // does not ask the catalog about it.
    return Object.freeze({
      ...common,
      name: projection.headline,
      startsAt: undefined,
      endsAt: undefined,
      adAvailable: true,
      sample: false,
    });
  }
  const loaded = library.find(manifest.libraryAd.id, manifest.libraryAd.version);
  return Object.freeze({
    ...common,
    name: loaded?.entry.name ?? projection.headline,
    startsAt: manifest.schedule.startsAt ?? undefined,
    endsAt: manifest.schedule.endsAt,
    adAvailable: libraryAdStillApprovable(
      recordedLibraryAdOf(manifest),
      library.standingOf(manifest.libraryAd),
    ),
    sample: loaded?.source === "sample",
  });
}

/**
 * Home's data for one signed-in person. The checklist read is skipped in the local demo, which has
 * no database: nothing is saved there, so nothing is connected and no brand is started, and the
 * card says exactly that.
 */
export async function readHome(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
  ports: HomeReadPorts = DEFAULT_PORTS,
): Promise<HomeData> {
  const hasDatabase = campaignPersistenceKind(environment) === "postgres";
  const [facts, campaigns, library] = await Promise.all([
    hasDatabase
      ? ports.readChecklistFacts(principal, environment)
      : Promise.resolve<ChecklistFacts>({ installationStatuses: [], brand: undefined }),
    ports.readCampaigns(principal, environment),
    ports.loadLibrary(environment),
  ]);
  const campaignFacts = campaigns.records.flatMap((record) => {
    const read = factsFor(record, principal, campaigns.kind, library);
    return read === undefined ? [] : [read];
  });
  return Object.freeze({
    checklist: buildHomeChecklist(facts),
    canCreateCampaigns:
      principal.role === "location_admin" || principal.role === "campaign_creator",
    topics: activeTopics(library),
    running: buildRunningList(campaignFacts),
    approval: buildApprovalList(campaignFacts, principalHasCampaignApprovalRole(principal)),
  });
}

/**
 * The page's entry point. An unauthenticated request is not an empty Home: it is reported as such,
 * and the page sends the visitor to sign in (005A-AC-010). Every other failure propagates to the
 * route's error boundary, because a Home that said "nothing connected" about a read that failed
 * would be a false statement.
 */
export async function readHomeForRequest(
  request: Request,
  environment: unknown = process.env,
  ports: HomeReadPorts = DEFAULT_PORTS,
): Promise<HomeRead> {
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error: unknown) {
    if (error instanceof UnauthenticatedPrincipalError)
      return Object.freeze({ authenticated: false });
    throw error;
  }
  return Object.freeze({
    authenticated: true,
    home: await readHome(principal, environment, ports),
  });
}
