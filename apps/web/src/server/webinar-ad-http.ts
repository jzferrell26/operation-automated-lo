import {
  CampaignVersionConflictError,
  CampaignWebinarEvidenceUnavailableError,
  assertMayExecuteCampaignMutation,
  projectCampaignWorkspace,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import { OpaqueReferenceSchema } from "@oalo/contracts";
import { WebinarAdRasterError } from "@oalo/rendering";
import { BrowserSessionPolicyError } from "@oalo/auth";
import { ZodError, z } from "zod";
import { readSavedAdBrand } from "./ad-brand-read.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import {
  createCampaignPersistenceAdapter,
  type CampaignPersistenceAdapter,
} from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import {
  prepareWebinarAdVersion,
  WebinarPreparationError,
  WebinarIncompleteSaveError,
  type WebinarPreparationPorts,
} from "./webinar-ad-prepare.js";
import { listOwnWebinarChoices, WebinarDestinationError } from "./webinar-destination.js";

export const WEBINAR_PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
} as const;
export function webinarFailure(error: unknown): Response {
  let response: Response;
  if (error instanceof BrowserSessionPolicyError)
    response = Response.json({ error: "FORBIDDEN" }, { status: 403 });
  else if (error instanceof WebinarIncompleteSaveError)
    response = Response.json(
      {
        error: error.code,
        incompleteSave: true,
        campaignRef: error.campaignRef,
        campaignVersionRef: error.campaignVersionRef,
        nextStep: "Retry this same preparation to finish saving its checks.",
      },
      { status: 503 },
    );
  else if (error instanceof WebinarPreparationError || error instanceof WebinarDestinationError)
    response = Response.json({ error: error.code }, { status: error.status });
  else if (error instanceof WebinarAdRasterError)
    response = Response.json(
      { error: error.code },
      { status: error.code === "WEBINAR_BRAND_DOES_NOT_FIT" ? 422 : 503 },
    );
  else if (error instanceof CampaignVersionConflictError)
    response = Response.json({ error: "WEBINAR_VERSION_CONFLICT" }, { status: 409 });
  else if (error instanceof CampaignWebinarEvidenceUnavailableError)
    response = Response.json({ error: "WEBINAR_EVIDENCE_UNAVAILABLE" }, { status: 409 });
  else if (error instanceof ZodError || error instanceof HomeownerError)
    response = Response.json({ error: "WEBINAR_INVALID" }, { status: 400 });
  else
    response =
      campaignCommandAuthErrorResponse(error) ??
      Response.json({ error: "WEBINAR_UNAVAILABLE" }, { status: 503 });
  for (const [key, value] of Object.entries(WEBINAR_PRIVATE_HEADERS))
    response.headers.set(key, value);
  return response;
}
export type WebinarAdapterFactory = (
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  correlation?: string,
) => CampaignPersistenceAdapter;
export interface WebinarHttpDependencies {
  readonly adapter?: WebinarAdapterFactory;
  readonly preparation?: Omit<WebinarPreparationPorts, "adapter">;
}
export async function handleWebinarAdPrepare(
  request: Request,
  environment: unknown = process.env,
  auth: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
  dependencies: WebinarHttpDependencies = {},
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "preflight");
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, auth);
    assertMayExecuteCampaignMutation(principal);
    if (
      request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
      "application/json"
    )
      throw new WebinarPreparationError(400, "WEBINAR_INVALID");
    const raw = await readBoundedJson(request, 8 * 1024);
    const adapter = (dependencies.adapter ?? createCampaignPersistenceAdapter)(
      principal,
      environment,
      correlation.correlationRef,
    );
    const result = await prepareWebinarAdVersion(raw, principal, environment, {
      ...dependencies.preparation,
      adapter,
    });
    const projection = projectCampaignWorkspace(result.record, principal, adapter.kind);
    const latest = result.record.version.campaignVersionRef === result.version.campaignVersionRef;
    return withCorrelationHeaders(
      Response.json(
        {
          campaignRef: result.version.campaignRef,
          campaignVersionRef: result.version.campaignVersionRef,
          manifestHash: result.version.manifestHash,
          preflightResultHash: result.preflight.resultHash,
          rowVersion: projection.rowVersion,
          versionNo: result.version.versionNo,
          state: latest
            ? projection.state
            : result.savedDecision === "approved"
              ? "approved"
              : result.preflight.blocking
                ? "preflight_failed"
                : "awaiting_approval",
          duplicate: result.duplicate,
          detailHref: latest
            ? projection.detailHref
            : `${projection.detailHref}/versions/${result.version.versionNo}`,
          effectiveEndsAt:
            result.version.manifest.blueprintId === "webinar-ad"
              ? result.version.manifest.schedule.endsAt
              : null,
          providerEnabled: false,
        },
        { status: result.duplicate ? 200 : 201, headers: WEBINAR_PRIVATE_HEADERS },
      ),
      correlation,
    );
  } catch (error) {
    return withCorrelationHeaders(webinarFailure(error), correlation);
  }
}
export async function readWebinarAdContext(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
) {
  assertMayExecuteCampaignMutation(principal);
  if (principal.authenticationMode === "local_synthetic")
    throw new WebinarPreparationError(403, "WEBINAR_REAL_WORKSPACE_REQUIRED");
  const brand = await readSavedAdBrand(principal, environment);
  const destinations = await listOwnWebinarChoices(principal, environment);
  return {
    canPrepare: true,
    brand: { saved: brand.saved, band: brand.band, leadFormWording: brand.leadFormWording },
    destinations,
    providerEnabled: false as const,
  };
}
export type WebinarAdContext = Awaited<ReturnType<typeof readWebinarAdContext>>;
export async function handleWebinarAdContext(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    return Response.json(await readWebinarAdContext(principal, environment), {
      headers: WEBINAR_PRIVATE_HEADERS,
    });
  } catch (error) {
    return webinarFailure(error);
  }
}
export const WebinarVersionParamsSchema = z
  .object({ campaignRef: OpaqueReferenceSchema, campaignVersionRef: OpaqueReferenceSchema })
  .strict();
