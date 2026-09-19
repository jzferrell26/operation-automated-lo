import {
  CampaignResourceNotAccessibleError,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";

import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { AuthenticatedWorkspaceUnavailableError } from "./authenticated-workspace-data.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

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

export interface WorkspaceCampaignReadResult {
  readonly authenticated: boolean;
  readonly campaigns: readonly CampaignWorkspaceProjection[];
}

const UNAUTHENTICATED_READ: WorkspaceCampaignReadResult = Object.freeze({
  authenticated: false,
  campaigns: Object.freeze([]),
});

/**
 * Resolves the read principal through the runtime composition and reports whether the request was
 * authenticated at all, so a caller can render "not signed in" instead of "no campaigns".
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
    if (
      error instanceof UnauthenticatedPrincipalError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      return UNAUTHENTICATED_READ;
    }
    throw error;
  }
  return Object.freeze({
    authenticated: true,
    campaigns: await loadOverviewCampaigns(principal, environment),
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

export async function readWorkspaceCampaignForRequest(
  request: Request,
  campaignRef: string,
  environment: unknown = process.env,
): Promise<
  Readonly<{ authenticated: boolean; campaign: CampaignWorkspaceProjection | undefined }>
> {
  let principal: Readonly<AuthenticatedPrincipal>;
  try {
    principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
  } catch (error) {
    if (
      error instanceof UnauthenticatedPrincipalError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      return Object.freeze({ authenticated: false, campaign: undefined });
    }
    throw error;
  }
  return Object.freeze({
    authenticated: true,
    campaign: await loadWorkspaceCampaign(principal, campaignRef, environment),
  });
}
