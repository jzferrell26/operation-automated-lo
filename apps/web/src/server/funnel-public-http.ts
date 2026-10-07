import { createHmac } from "node:crypto";
import { assertMayExecuteCampaignMutation } from "@oalo/application";
import { z } from "zod";
import {
  landingSnapshot,
  publicationBlockers,
  PublishFunnelCommandSchema,
  type FunnelSnapshot,
} from "../features/funnels/publication-model.js";
import { FunnelVisitorSchema } from "../features/funnels/visitor-model.js";
import { salesContent } from "../features/funnels/sales-content.js";
import {
  resolveAuthenticatedPrincipal,
  resolveAuthenticatedReadPrincipal,
} from "./authenticated-principal.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { createFunnelStore } from "./funnel-store.js";
import { HomeownerError, readBoundedJson } from "./homeowners/errors.js";
import {
  PUBLIC_COOKIE,
  readPublicCookie,
  tryFunnelDelivery,
  funnelHandoffConfigured,
} from "./funnel-public-delivery.js";
import {
  encryptVisitor,
  FunnelPublicError,
  funnelCapability,
  publicationStore,
  publicFunnelConfig,
  readPublishedFunnel,
  receiptHash,
  receiptSecret,
  visitorHash,
} from "./funnel-public-store.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

const HEADERS = {
  "cache-control": "no-store, private",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: HEADERS });
function failure(error: unknown) {
  const auth = campaignCommandAuthErrorResponse(error);
  if (auth) return auth;
  if (error instanceof FunnelPublicError) return json({ error: error.code }, error.status);
  if (error instanceof z.ZodError) return json({ error: "FUNNEL_PUBLIC_INVALID" }, 400);
  if (error instanceof HomeownerError)
    return json({ error: "FUNNEL_PUBLIC_INVALID" }, error.status === 413 ? 413 : 400);
  return json({ error: "FUNNEL_PUBLIC_UNAVAILABLE" }, 503);
}
export async function handlePublication(request: Request, environment: unknown = process.env) {
  try {
    const mutation = request.method !== "GET",
      ports = resolveRuntimeCampaignCommandPorts(environment);
    const principal = await (
      mutation ? resolveAuthenticatedPrincipal : resolveAuthenticatedReadPrincipal
    )(request, environment, ports);
    if (mutation) assertMayExecuteCampaignMutation(principal);
    if (principal.authenticationMode === "local_synthetic") {
      if (!mutation)
        return json({
          available: false,
          publications: [],
          message:
            "Sign in to an enabled workspace to publish. The local demo does not publish pages.",
          handoffConfigured: false,
        });
      throw new FunnelPublicError(403);
    }
    const store = publicationStore(principal, environment);
    if (!mutation) {
      let available = true;
      try {
        publicFunnelConfig(environment);
      } catch {
        available = false;
      }
      return json({
        available,
        publications: (await store.list()).map(({ snapshot, ...item }) => ({
          ...item,
          kind: snapshot.kind,
        })),
        message: available
          ? "Publish a reviewed version to receive real inquiries. Saving edits does not change a published page."
          : "Publishing is not enabled. You can still take existing pages offline and download their saved inquiries.",
        handoffConfigured: funnelHandoffConfigured(environment, principal.locationId),
      });
    }
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
      throw new FunnelPublicError(415);
    const raw = await readBoundedJson(request, 2000);
    if (raw && typeof raw === "object" && "action" in raw && raw.action === "revoke") {
      const input = z
        .object({ id: z.uuid(), action: z.literal("revoke") })
        .strict()
        .parse(raw);
      await store.revoke(input.id);
      return json({ revoked: true });
    }
    // Pausing new public traffic never disables owner review, export or revocation.
    // Publishing a new snapshot still requires the explicit environment authority.
    const config = publicFunnelConfig(environment);
    const command = PublishFunnelCommandSchema.parse(raw),
      draft = (await createFunnelStore(principal, environment).list()).find(
        (item) => item.kind === command.kind,
      );
    if (!draft || draft.revision !== command.expectedRevision)
      throw new FunnelPublicError(409, "FUNNEL_PUBLIC_STALE");
    if (publicationBlockers(draft.kind, draft.fields).length)
      throw new FunnelPublicError(422, "FUNNEL_PUBLIC_INCOMPLETE");
    const fields = { ...draft.fields, sales: salesContent(draft.kind, draft.fields) };
    const publication = await store.publish(
      { kind: draft.kind, fields, brand: draft.brand },
      draft.revision,
    );
    return json({ publication, url: `${config.origin}/f/${publication.id}` });
  } catch (error) {
    return failure(error);
  }
}
export async function publicSnapshot(
  id: string,
  cookie: string,
  environment: unknown,
): Promise<{ snapshot: FunnelSnapshot; hasAccess: boolean } | null> {
  const publication = await readPublishedFunnel(id, environment);
  if (!publication) return null;
  const secret = readPublicCookie(cookie),
    valid = secret
      ? await funnelCapability(campaignDatabasePool(environment), "receipt", [
          id,
          receiptHash(secret),
        ])
      : false;
  return {
    snapshot: valid === true ? publication.snapshot : landingSnapshot(publication.snapshot),
    hasAccess: valid === true,
  };
}
export async function handleVisitor(
  request: Request,
  id: string,
  environment: unknown = process.env,
) {
  try {
    if (!z.uuid().safeParse(id).success) throw new FunnelPublicError(404);
    const config = publicFunnelConfig(environment);
    if (request.headers.get("origin") !== config.origin) throw new FunnelPublicError(403);
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
      throw new FunnelPublicError(415);
    const visitor = FunnelVisitorSchema.parse(await readBoundedJson(request, 5000));
    const publication = await readPublishedFunnel(id, environment);
    if (!publication) throw new FunnelPublicError(404);
    if (
      publication.snapshot.kind === "live-webinar" &&
      Date.parse(publication.snapshot.fields.eventStartsAt) <= Date.now()
    )
      throw new FunnelPublicError(410, "FUNNEL_EVENT_ENDED");
    const secret = receiptSecret(config, id, visitor.requestId),
      hash = receiptHash(secret);
    // Never persist raw IP, user-agent, email or phone outside the authenticated ciphertext.
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipHash = createHmac("sha256", config.key)
      .update(`funnel-ip-v1:${id}:${ip}`)
      .digest("hex");
    const consent = `I agree that ${publication.snapshot.brand.company} may use this information to respond to my request.`;
    const accepted = z
      .object({ status: z.string(), delivery: z.string().optional() })
      .parse(
        await funnelCapability(campaignDatabasePool(environment), "accept", [
          id,
          visitor.requestId,
          visitorHash(config, id, visitor),
          hash,
          ipHash,
          receiptHash(consent),
          encryptVisitor(config, id, visitor),
        ]),
      );
    if (accepted.status !== "accepted")
      throw new FunnelPublicError(
        accepted.status === "limited" ? 429 : accepted.status === "conflict" ? 409 : 404,
      );
    if (accepted.delivery === "pending")
      await tryFunnelDelivery(id, visitor.requestId, hash, environment);
    const response = json({ accepted: true });
    response.headers.set(
      "set-cookie",
      `${PUBLIC_COOKIE}=${secret}; Path=/f/${id}; HttpOnly; SameSite=Lax; Max-Age=86400${config.origin.startsWith("https:") ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    return failure(error);
  }
}
