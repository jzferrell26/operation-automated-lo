import { ZodError } from "zod";

import {
  createDefaultCampaignCommandPorts,
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { persistLocalCampaign } from "./local-campaign-store.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";

function campaignCommandErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      { error: "INVALID_CAMPAIGN_DRAFT", issues: error.issues },
      { status: 400 },
    );
  }
  return (
    campaignCommandAuthErrorResponse(error) ?? jsonCommandError(400, "CAMPAIGN_PREFLIGHT_FAILED")
  );
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
