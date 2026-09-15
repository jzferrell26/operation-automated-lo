import {
  CampaignResourceNotAccessibleError,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
  type CampaignWorkspaceProjection,
} from "@oalo/application";

import {
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
} from "./authenticated-principal.js";
import { AuthenticatedWorkspaceUnavailableError } from "./authenticated-workspace-data.js";
import {
  CampaignWorkspaceStoreUnavailableError,
  createCampaignPersistenceAdapter,
} from "./campaign-persistence-runtime.js";

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

export async function loadOverviewCampaigns(
  principal: Readonly<AuthenticatedPrincipal> | undefined,
  environment: unknown = process.env,
): Promise<readonly CampaignWorkspaceProjection[]> {
  if (principal === undefined) return [];
  try {
    return await listWorkspaceCampaigns(principal, environment);
  } catch (error) {
    if (
      error instanceof UnauthenticatedPrincipalError ||
      error instanceof CampaignWorkspaceStoreUnavailableError ||
      error instanceof AuthenticatedWorkspaceUnavailableError
    ) {
      return [];
    }
    throw error;
  }
}

export async function loadWorkspaceCampaignsForRequest(
  request: Request,
  environment: unknown = process.env,
): Promise<readonly CampaignWorkspaceProjection[]> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      createDefaultCampaignCommandPorts(),
    );
    return await loadOverviewCampaigns(principal, environment);
  } catch {
    return [];
  }
}
