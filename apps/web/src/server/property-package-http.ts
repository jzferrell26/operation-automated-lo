import { assertMayExecuteCampaignMutation } from "@oalo/application";
import { OpaqueReferenceSchema, PropertyPackageOutputSchema } from "@oalo/contracts";
import { z, ZodError } from "zod";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { correlationReferenceForRequest, withCorrelationHeaders } from "./correlation-boundary.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import { PropertyPackageError } from "./property-package-content.js";
import { propertyDraftHtmlCsp } from "./property-package-html.js";
import {
  generatePropertyPackage,
  packageSummary,
  readVerifiedPropertyPackage,
  savedPropertyVersion,
} from "./property-package-service.js";
import { createPropertyPackageStore } from "./property-package-store.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

export const PRIVATE_PACKAGE_HEADERS = Object.freeze({
  "cache-control": "private, no-store, max-age=0",
  "x-robots-tag": "noindex, nofollow, noarchive",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "cross-origin-resource-policy": "same-origin",
});

function failure(error: unknown): Response {
  if (error instanceof PropertyPackageError)
    return Response.json({ error: error.code }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json({ error: "PROPERTY_PACKAGE_INVALID_SOURCE" }, { status: 400 });
  if (error instanceof HomeownerError)
    return Response.json(
      { error: "PROPERTY_PACKAGE_INVALID_SOURCE" },
      { status: error.status === 413 ? 413 : 400 },
    );
  return (
    campaignCommandAuthErrorResponse(error) ??
    Response.json({ error: "PROPERTY_PACKAGE_UNAVAILABLE" }, { status: 503 })
  );
}

function privateResponse(response: Response): Response {
  for (const [key, value] of Object.entries(PRIVATE_PACKAGE_HEADERS))
    response.headers.set(key, value);
  return response;
}

export async function handlePropertyPackageGeneration(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  const correlation = correlationReferenceForRequest(request, "propertyPackage");
  const finish = (response: Response) =>
    withCorrelationHeaders(privateResponse(response), correlation);
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    assertMayExecuteCampaignMutation(principal);
    if (
      request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
      "application/json"
    ) {
      return finish(Response.json({ error: "PROPERTY_PACKAGE_INVALID_SOURCE" }, { status: 415 }));
    }
    const raw = await readBoundedJson(request, 2048);
    const campaigns = createCampaignPersistenceAdapter(
      principal,
      environment,
      correlation.correlationRef,
    ).readRepository;
    const result = await generatePropertyPackage(raw, principal, environment, {
      campaigns,
      packages: createPropertyPackageStore(principal, environment),
    });
    return finish(
      Response.json({ package: packageSummary(result), providerPublicationAuthorized: false }),
    );
  } catch (error) {
    return finish(failure(error));
  }
}

const OutputParamsSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    output: PropertyPackageOutputSchema,
  })
  .strict();

export async function handlePropertyPackageOutput(
  request: Request,
  rawParams: unknown,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<Response> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    const params = OutputParamsSchema.parse(rawParams);
    const campaigns = createCampaignPersistenceAdapter(principal, environment).readRepository;
    const version = await savedPropertyVersion(
      principal,
      params.campaignRef,
      params.campaignVersionRef,
      campaigns,
    );
    const bundle = await readVerifiedPropertyPackage(
      version,
      createPropertyPackageStore(principal, environment),
    );
    if (bundle === undefined) throw new PropertyPackageError("PROPERTY_PACKAGE_NOT_FOUND", 404);
    const item = bundle.outputs[params.output];
    const body =
      "base64" in item ? new Uint8Array(Buffer.from(item.base64, "base64")) : item.content;
    const extension = { page: "html", flyer: "pdf", qr: "svg", copy: "txt" }[params.output];
    const headers = new Headers(PRIVATE_PACKAGE_HEADERS);
    headers.set(
      "content-type",
      `${item.mimeType}${params.output === "flyer" ? "" : "; charset=utf-8"}`,
    );
    headers.set(
      "content-disposition",
      `${params.output === "flyer" ? "attachment" : "inline"}; filename="property-campaign-v${bundle.sourceVersionNo}-draft.${extension}"`,
    );
    headers.set(
      "content-security-policy",
      params.output === "page"
        ? propertyDraftHtmlCsp(bundle.outputs.page.content)
        : "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
    return new Response(body, { headers });
  } catch (error) {
    return privateResponse(failure(error));
  }
}
