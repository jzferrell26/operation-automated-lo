import { assertMayExecuteCampaignMutation, CampaignVersionConflictError } from "@oalo/application";
import { ZodError } from "zod";

import {
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import { PropertyCampaignSaveError, savePropertyCampaign } from "./property-campaign-save.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { LocalCampaignVersionConflictError } from "./local-campaign-store.js";

export const PROPERTY_CAMPAIGN_MAX_BYTES = 16_000;

/** REC-001/006: reuse the verified mutation boundary; this handler performs no provider operation. */
export async function handlePropertyCampaignSave(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "propertyDraft");
  const json = (body: unknown, status = 200) =>
    withCorrelationHeaders(
      Response.json(body, { status, headers: { "cache-control": "no-store" } }),
      correlation,
    );
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    assertMayExecuteCampaignMutation(principal);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "INVALID_CAMPAIGN_DRAFT" }, 415);
    }
    const input = await readBoundedJson(request, PROPERTY_CAMPAIGN_MAX_BYTES);
    const adapter = createCampaignPersistenceAdapter(
      principal,
      environment,
      correlation.correlationRef,
    );
    const saved = await savePropertyCampaign(input, principal, environment, {
      versionRepository: adapter.versionRepository,
      readRepository: adapter.readRepository,
    });
    const persisted = await adapter.persistDraft(saved.version, saved.preflight);
    return json({
      campaignRef: persisted.version.campaignRef,
      versionNo: persisted.version.versionNo,
      providerPublicationAuthorized: false,
    });
  } catch (error) {
    if (
      error instanceof LocalCampaignVersionConflictError ||
      error instanceof CampaignVersionConflictError
    ) {
      return json({ error: "PROPERTY_CAMPAIGN_SAVE_CONFLICT" }, 409);
    }
    if (error instanceof PropertyCampaignSaveError)
      return json({ error: error.code }, error.status);
    if (error instanceof ZodError) return json({ error: "INVALID_CAMPAIGN_DRAFT" }, 400);
    if (error instanceof HomeownerError) {
      return json({ error: "INVALID_CAMPAIGN_DRAFT" }, error.status === 413 ? 413 : 400);
    }
    const auth = campaignCommandAuthErrorResponse(error);
    if (auth !== undefined) return withCorrelationHeaders(auth, correlation);
    return json({ error: "PROPERTY_CAMPAIGN_SAVE_FAILED" }, 503);
  }
}
