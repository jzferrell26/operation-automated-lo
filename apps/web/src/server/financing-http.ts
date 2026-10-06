import {
  assertCampaignAccessible,
  assertMayExecuteCampaignMutation,
  FinancingCalculationError,
} from "@oalo/application";
import { OpaqueReferenceSchema } from "@oalo/contracts";
import { z, ZodError } from "zod";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { readBoundedJson, HomeownerError } from "./homeowners/errors.js";
import { PRIVATE_PACKAGE_HEADERS } from "./property-package-http.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import {
  FinancingSaveError,
  saveFinancingComparison,
  verifyFinancingVersion,
} from "./financing-save.js";

export function financingResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: PRIVATE_PACKAGE_HEADERS });
}
export function financingFailure(error: unknown): Response {
  if (error instanceof FinancingSaveError)
    return financingResponse({ error: error.code }, error.status);
  if (error instanceof FinancingCalculationError)
    return financingResponse({ error: "FINANCING_INVALID", message: error.message }, 400);
  if (error instanceof ZodError) return financingResponse({ error: "FINANCING_INVALID" }, 400);
  if (error instanceof HomeownerError)
    return financingResponse({ error: "FINANCING_INVALID" }, error.status === 413 ? 413 : 400);
  const auth = campaignCommandAuthErrorResponse(error);
  if (auth) {
    for (const [key, value] of Object.entries(PRIVATE_PACKAGE_HEADERS))
      auth.headers.set(key, value);
    return auth;
  }
  return financingResponse({ error: "FINANCING_UNAVAILABLE" }, 503);
}

export async function handleFinancingSave(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
) {
  try {
    const principal = await resolveAuthenticatedPrincipal(request, environment, ports);
    assertMayExecuteCampaignMutation(principal);
    if (
      request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
      "application/json"
    )
      return financingResponse({ error: "FINANCING_INVALID" }, 415);
    const raw = await readBoundedJson(request, 64000);
    const adapter = createCampaignPersistenceAdapter(principal, environment);
    const saved = await saveFinancingComparison(raw, principal, environment, {
      versions: adapter.versionRepository,
      campaigns: adapter.readRepository,
    });
    await adapter.persistDraft(saved.version, saved.preflight);
    return financingResponse({
      campaignRef: saved.version.campaignRef,
      campaignVersionRef: saved.version.campaignVersionRef,
      providerPublicationAuthorized: false,
    });
  } catch (error) {
    return financingFailure(error);
  }
}

const OutputSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    output: z.enum(["site", "flyer"]),
  })
  .strict();
export async function readFinancingOutput(
  request: Request,
  raw: unknown,
  environment: unknown,
  ports: CampaignCommandPorts,
) {
  const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
  const params = OutputSchema.parse(raw);
  const store = createCampaignPersistenceAdapter(principal, environment).readRepository;
  const record = (await store.listVersionsOf(params.campaignRef)).find(
    (item) => item.version.campaignVersionRef === params.campaignVersionRef,
  );
  if (!record) throw new FinancingSaveError("FINANCING_NOT_FOUND", 404);
  assertCampaignAccessible(principal, record.version);
  const manifest = verifyFinancingVersion(record.version);
  return {
    params,
    report: {
      campaignRef: record.version.campaignRef,
      campaignVersionRef: record.version.campaignVersionRef,
      versionNo: record.version.versionNo,
      createdAt: record.version.createdAt,
      manifest,
    },
  };
}
