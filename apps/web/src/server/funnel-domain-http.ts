import { assertMayExecuteCampaignMutation } from "@oalo/application";
import { z } from "zod";
import { DomainCommandSchema } from "../features/domains/model.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import { domainManagementConfigured, createDomainProvider } from "./funnel-domain-provider.js";
import {
  checkFunnelDomain,
  FunnelDomainError,
  newDomainClaim,
  postgresFunnelDomainStore,
} from "./funnel-domain-store.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "no-store, private", "referrer-policy": "no-referrer" },
  });
export async function handleFunnelDomains(
  request: Request,
  environment: unknown = process.env,
): Promise<Response> {
  try {
    if (!["GET", "POST"].includes(request.method)) return json({ error: "DOMAIN_METHOD" }, 405);
    const mutation = request.method === "POST";
    const principal = await (
      mutation ? resolveAuthenticatedPrincipal : resolveAuthenticatedReadPrincipal
    )(request, environment, resolveRuntimeCampaignCommandPorts(environment));
    const canEdit = principal.role === "location_admin" || principal.role === "campaign_creator";
    if (principal.authenticationMode === "local_synthetic")
      return mutation
        ? json({ error: "DOMAIN_FORBIDDEN" }, 403)
        : json({ available: false, canEdit: false, domain: null });
    const store = postgresFunnelDomainStore(principal, campaignDatabasePool(environment));
    const available = domainManagementConfigured(environment);
    if (!mutation) return json({ available, canEdit, domain: (await store.list())[0] ?? null });
    assertMayExecuteCampaignMutation(principal);
    if (!canEdit) throw new FunnelDomainError(403, "DOMAIN_FORBIDDEN");
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
      throw new FunnelDomainError(415, "DOMAIN_INVALID");
    const command = DomainCommandSchema.parse(await readBoundedJson(request, 2000));
    // Disconnect stays usable if the provider or its configuration is unavailable.
    if (command.action === "disconnect")
      return json({
        domain: await store.command("disconnect", command.id, command.expectedRevision),
      });
    if (!available) throw new FunnelDomainError(503);
    if (command.action === "connect") {
      const claim = newDomainClaim(command);
      return json({ domain: await store.command("connect", claim.id, null, claim) });
    }
    return json({
      domain: await checkFunnelDomain(
        store,
        createDomainProvider(environment),
        command.id,
        command.expectedRevision,
      ),
    });
  } catch (error) {
    const auth = campaignCommandAuthErrorResponse(error);
    if (auth) return auth;
    if (error instanceof FunnelDomainError) return json({ error: error.code }, error.status);
    if (error instanceof z.ZodError) return json({ error: "DOMAIN_INVALID" }, 400);
    if (error instanceof HomeownerError)
      return json({ error: "DOMAIN_INVALID" }, error.status === 413 ? 413 : 400);
    return json({ error: "DOMAIN_UNAVAILABLE" }, 503);
  }
}
