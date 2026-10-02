import { projectCampaignWorkspace } from "@oalo/application";
import { ZodError } from "zod";

import { reviewHref } from "../features/campaigns/launch-model.js";
import {
  resolveAuthenticatedPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse, jsonCommandError } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import { LibraryAdNotAvailableError, saveLibraryAdVersion } from "./library-ad-save.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

/**
 * PRD-009d 009D-AC-011. A step 2 request is a few hundred bytes; the cap leaves room for the longest
 * words the request allows and refuses anything larger before it is parsed.
 */
export const LIBRARY_AD_SAVE_MAX_BYTES = 16_000;

function campaignCommandErrorResponse(error: unknown): Response {
  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "INVALID_CAMPAIGN_DRAFT",
        issues: error.issues.map((issue) => ({ path: issue.path, code: issue.code })),
      },
      { status: 400 },
    );
  }
  if (error instanceof HomeownerError) {
    return Response.json(
      { error: "INVALID_CAMPAIGN_DRAFT" },
      { status: error.status === 413 ? 413 : 400 },
    );
  }
  if (error instanceof LibraryAdNotAvailableError) {
    return Response.json({ error: "LIBRARY_AD_NOT_AVAILABLE" }, { status: 400 });
  }
  return (
    campaignCommandAuthErrorResponse(error) ?? jsonCommandError(400, "CAMPAIGN_PREFLIGHT_FAILED")
  );
}

/**
 * "Save and check" (PRD-009d D1): saves one library-ad version and runs the checks on it, then
 * answers with where step 3 is. Nothing is published or sent, and the answer says so.
 */
export async function handleCampaignPreflight(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "preflight");
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return withCorrelationHeaders(
        Response.json({ error: "INVALID_CAMPAIGN_DRAFT" }, { status: 415 }),
        correlation,
      );
    }
    const input = await readBoundedJson(request, LIBRARY_AD_SAVE_MAX_BYTES);
    const adapter = createCampaignPersistenceAdapter(
      principal,
      environment,
      correlation.correlationRef,
    );
    const result = await saveLibraryAdVersion(input, principal, environment, {
      versionRepository: adapter.versionRepository,
      readRepository: adapter.readRepository,
    });
    const campaign = await adapter.persistDraft(result.version, result.preflight);
    const projection = projectCampaignWorkspace(campaign, principal, adapter.kind);
    return withCorrelationHeaders(
      Response.json(
        {
          state: projection.state,
          reviewHref: reviewHref(projection.campaignRef),
          detailHref: projection.detailHref,
          campaignRef: projection.campaignRef,
          campaignVersionRef: projection.campaignVersionRef,
          versionNo: projection.versionNo,
          manifestHash: projection.manifestHash,
          preflightResultHash: projection.preflight.resultHash,
          blocking: projection.preflight.blocking,
          findings: projection.preflight.findings,
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
