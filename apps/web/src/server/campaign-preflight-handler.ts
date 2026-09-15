import {
  CampaignCommandForbiddenError,
  CampaignPrincipalInvalidError,
  CampaignResourceNotAccessibleError,
} from "@oalo/application";
import { BrowserSessionPolicyError, SessionPolicyError } from "@oalo/auth";
import { ZodError } from "zod";

import {
  UnauthenticatedPrincipalError,
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { AuthenticatedWorkspaceUnavailableError } from "./authenticated-workspace-data.js";
import { persistLocalCampaign } from "./local-campaign-store.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

function campaignCommandErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "INVALID_CAMPAIGN_DRAFT", issues: error.issues },
      { status: 400 },
    );
  }
  if (
    error instanceof UnauthenticatedPrincipalError ||
    error instanceof SessionPolicyError ||
    error instanceof BrowserSessionPolicyError ||
    error instanceof CampaignPrincipalInvalidError
  ) {
    return jsonError(401, "UNAUTHENTICATED");
  }
  if (error instanceof CampaignCommandForbiddenError) {
    return jsonError(403, "FORBIDDEN");
  }
  if (error instanceof CampaignResourceNotAccessibleError) {
    return jsonError(404, "NOT_FOUND");
  }
  if (error instanceof AuthenticatedWorkspaceUnavailableError) {
    return jsonError(403, "WORKSPACE_UNAVAILABLE");
  }
  return jsonError(400, "CAMPAIGN_PREFLIGHT_FAILED");
}

export async function handleCampaignPreflight(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = createDefaultCampaignCommandPorts(),
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    const input: unknown = await request.json();
    const result = await compileOpenHouseDraft(input, principal, environment);
    const campaign = await persistLocalCampaign(result.version, result.preflight, environment);
    return Response.json(
      {
        ...result,
        state: campaign.state,
        detailHref: `/marketing/campaigns/${result.version.campaignRef}`,
      },
      { status: 200 },
    );
  } catch (error) {
    return campaignCommandErrorResponse(error);
  }
}
