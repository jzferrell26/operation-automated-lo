import { projectCampaignWorkspace } from "@oalo/application";
import { ZodError } from "zod";

import {
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { compileOpenHouseDraft } from "./open-house-draft.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

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
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "preflight");
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    const input: unknown = await request.json();
    const adapter = createCampaignPersistenceAdapter(
      principal,
      environment,
      correlation.correlationRef,
    );
    const result = await compileOpenHouseDraft(
      input,
      principal,
      environment,
      adapter.versionRepository,
    );
    const campaign = await adapter.persistDraft(result.version, result.preflight);
    const projection = projectCampaignWorkspace(campaign, principal, adapter.kind);
    return withCorrelationHeaders(
      Response.json(
        {
          state: projection.state,
          detailHref: projection.detailHref,
          campaignRef: projection.campaignRef,
          campaignVersionRef: projection.campaignVersionRef,
          manifestHash: projection.manifestHash,
          preflightResultHash: projection.preflight.resultHash,
          blocking: projection.preflight.blocking,
          findings: projection.preflight.findings,
          headline: projection.headline,
          propertyAddress: projection.propertyAddress,
          realtorDisplayName: projection.realtorDisplayName,
          dailyBudgetMinor: projection.dailyBudgetMinor,
          totalBudgetMinor: projection.totalBudgetMinor,
          specialAdCategory: projection.specialAdCategory,
          persistenceKind: projection.persistenceKind,
          providerPublicationAuthorized: false,
        },
        { status: 200 },
      ),
      correlation,
    );
  } catch (error) {
    return withCorrelationHeaders(campaignCommandErrorResponse(error), correlation);
  }
}
