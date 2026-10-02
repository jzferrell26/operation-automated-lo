import {
  CampaignResourceNotAccessibleError,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";

import { loadAdsLibrary } from "../features/ads-library/server/catalog-loader.js";
import type {
  CampaignListRow,
  CampaignPageData,
} from "../features/campaigns/campaign-page-model.js";
import { readSavedAdBrand, type SavedAdBrand } from "./ad-brand-read.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import {
  buildCampaignListRow,
  buildCampaignPage,
  sortCampaignListRows,
} from "./campaign-page-data.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { activeLibraryCards } from "./launch-an-ad.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { WorkspacePreferenceError } from "./workspace-preferences.js";

export async function listWorkspaceCampaigns(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
): Promise<readonly CampaignWorkspaceProjection[]> {
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const records = await adapter.readRepository.listForLocation();
  return Object.freeze(
    records.flatMap((record) => {
      try {
        return [projectCampaignWorkspace(record, principal, adapter.kind)];
      } catch (error) {
        if (error instanceof CampaignResourceNotAccessibleError) return [];
        throw error;
      }
    }),
  );
}

export async function loadWorkspaceCampaign(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  environment: unknown = process.env,
): Promise<CampaignWorkspaceProjection | undefined> {
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const record = await adapter.readRepository.getByCampaignRef(campaignRef);
  if (record === undefined) return undefined;
  try {
    return projectCampaignWorkspace(record, principal, adapter.kind);
  } catch (error) {
    if (error instanceof CampaignResourceNotAccessibleError) return undefined;
    throw error;
  }
}

/**
 * 005A-AC-010. An unauthenticated request is no longer an empty campaign list. `[]` is a claim
 * about a tenant ("this location has no campaigns"), and a page that renders it for a visitor with
 * no session reads as signed in with nothing in it. `UnauthenticatedPrincipalError` therefore
 * propagates, and the read entry points branch on it.
 *
 * A store that is configured but unreachable is a different failure and still surfaces as one:
 * `CampaignWorkspaceStoreUnavailableError` and `AuthenticatedWorkspaceUnavailableError` propagate
 * too, so a broken deployment cannot look like an empty workspace either.
 */
export async function loadOverviewCampaigns(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
): Promise<readonly CampaignWorkspaceProjection[]> {
  return listWorkspaceCampaigns(principal, environment);
}

/**
 * 009E-AC-009. The Campaigns list's rows: each campaign the person may read, newest change first,
 * with the library's name, topic, and thumbnail for its ad and the standing every screen shares. A
 * campaign the person may not read is left out, as it is everywhere else.
 */
export async function listCampaignRows(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
): Promise<readonly CampaignListRow[]> {
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const [records, library] = await Promise.all([
    adapter.readRepository.listForLocation(),
    loadAdsLibrary({ environment }),
  ]);
  return sortCampaignListRows(
    records.flatMap((record) => {
      try {
        return [buildCampaignListRow(record, principal, adapter.kind, library)];
      } catch (error) {
        if (error instanceof CampaignResourceNotAccessibleError) return [];
        throw error;
      }
    }),
  );
}

/**
 * 009C-AC-012 and the writing review's W-10. True when the ads library holds no ad a person could
 * choose today: the real catalog ships empty, and the sample ads load only in a local run with the
 * sample flag on. The Campaigns list reads it only when it has no campaign to show, so a new real
 * account is told what the library says instead of being invited to pick an ad that is not there.
 */
export async function readLibraryHasNoActiveAd(
  environment: unknown = process.env,
): Promise<boolean> {
  return activeLibraryCards(await loadAdsLibrary({ environment })).length === 0;
}

export interface WorkspaceCampaignReadResult {
  readonly authenticated: boolean;
  readonly campaigns: readonly CampaignListRow[];
}

const UNAUTHENTICATED_READ: WorkspaceCampaignReadResult = Object.freeze({
  authenticated: false,
  campaigns: Object.freeze([]),
});

/**
 * Resolves the read principal through the runtime composition and reports whether the request was
 * authenticated at all, so a caller can render "not signed in" instead of "no campaigns".
 *
 * Only `UnauthenticatedPrincipalError` becomes an unauthenticated read.
 * `AuthenticatedWorkspaceUnavailableError` propagates to the route error boundary, for the reason
 * the comment above `loadOverviewCampaigns` gives and this function used to contradict: a
 * deployment whose workspace mode cannot be classified is broken, not signed out. Catching it here
 * sent an operator to a sign-in page to retype credentials that were never the problem, and hid a
 * misconfigured host behind a screen that looks like ordinary product behaviour. Propagating it
 * still fails closed, because no tenant row is read and none is rendered.
 */
export async function readWorkspaceCampaignsForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<WorkspaceCampaignReadResult> {
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) return UNAUTHENTICATED_READ;
    throw error;
  }
  return Object.freeze({
    authenticated: true,
    campaigns: await listCampaignRows(principal, environment),
  });
}

/**
 * Kept for callers that only need the list. It no longer hides an unauthenticated request: the
 * error propagates so the caller decides what to render.
 */
export async function loadWorkspaceCampaignsForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<readonly CampaignWorkspaceProjection[]> {
  const principal = await resolveAuthenticatedReadPrincipal(
    request,
    environment,
    resolveRuntimeCampaignCommandPorts(environment),
  );
  return loadOverviewCampaigns(principal, environment);
}

/**
 * 009E-AC-001 to 009E-AC-007 and 009E-AC-012. What the campaign page for one version is handed, or
 * where to go instead.
 *
 * `versionNo` names an older version (D3). The newest version has the campaign's own address, so a
 * request for it by number answers with that address rather than a second page for the same thing.
 * A campaign or version that does not exist, and every campaign in another location, answer
 * `undefined`: the read finds no rows in another location, so the two cannot be told apart
 * (009E-AC-005).
 */
export type CampaignPageLoad =
  Readonly<{ kind: "page"; page: CampaignPageData }> | Readonly<{ kind: "redirect"; href: string }>;

/**
 * The person's saved Brand, read only when it can matter: when they saved the newest version of a
 * library ad and are looking at it (009E-AC-006's "Brand changed" notice). Anyone else's Brand is
 * not the Brand this version froze, and support cannot open a person's Brand at all.
 */
async function brandToCompare(
  principal: Readonly<AuthenticatedPrincipal>,
  latest: Readonly<{ createdBy: string; manifest: Readonly<{ blueprintId: string }> }>,
  versionNo: number | undefined,
  environment: unknown,
): Promise<SavedAdBrand | undefined> {
  if (versionNo !== undefined) return undefined;
  if (latest.manifest.blueprintId !== "library-ad" || latest.createdBy !== principal.actorRef) {
    return undefined;
  }
  try {
    return await readSavedAdBrand(principal, environment);
  } catch (error) {
    if (error instanceof WorkspacePreferenceError) return undefined;
    throw error;
  }
}

export async function loadCampaignPage(
  principal: Readonly<AuthenticatedPrincipal>,
  campaignRef: string,
  versionNo: number | undefined,
  environment: unknown = process.env,
): Promise<CampaignPageLoad | undefined> {
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const record = await adapter.readRepository.getByCampaignRef(campaignRef);
  if (record === undefined) return undefined;
  try {
    const latestHref = projectCampaignWorkspace(record, principal, adapter.kind).detailHref;
    if (versionNo !== undefined && versionNo === record.version.versionNo) {
      return Object.freeze({ kind: "redirect" as const, href: latestHref });
    }
    const [versions, library, brand] = await Promise.all([
      adapter.readRepository.listVersionsOf(campaignRef),
      loadAdsLibrary({ environment }),
      brandToCompare(principal, record.version, versionNo, environment),
    ]);
    const page = buildCampaignPage({
      record,
      versions,
      principal,
      kind: adapter.kind,
      library,
      ...(versionNo === undefined ? {} : { versionNo }),
      brand,
    });
    return page === undefined ? undefined : Object.freeze({ kind: "page" as const, page });
  } catch (error) {
    if (error instanceof CampaignResourceNotAccessibleError) return undefined;
    throw error;
  }
}

export async function readWorkspaceCampaignForRequest(
  request: Request,
  campaignRef: string,
  environment: unknown = process.env,
  versionNo?: number,
): Promise<Readonly<{ authenticated: boolean; campaign: CampaignPageLoad | undefined }>> {
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) {
      return Object.freeze({ authenticated: false, campaign: undefined });
    }
    throw error;
  }
  return Object.freeze({
    authenticated: true,
    campaign: await loadCampaignPage(principal, campaignRef, versionNo, environment),
  });
}
