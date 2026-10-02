import { projectCampaignWorkspace } from "@oalo/application";
import type { PreflightResult } from "@oalo/contracts";
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
 * PRD-009d D5, D8, and 009D-AC-019. What the save answers about each finding.
 *
 * The workspace projection carries no `affected`, because the campaign page and the list never
 * needed to say where a finding sits. Step 3's "Fix it" does: a word finding opens step 2 at the
 * words, and a finding in Brand text names the Brand field. So the answer is read from the stored
 * result, field by field, and carries exactly the five things a finding is.
 */
function answeredFindings(preflight: PreflightResult) {
  return preflight.findings.map((finding) => ({
    ruleCode: finding.ruleCode,
    severity: finding.severity,
    description: finding.description,
    affected: finding.affected,
    remediation: finding.remediation,
  }));
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
          findings: answeredFindings(campaign.preflight),
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
