import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
} from "@oalo/db";
import { z } from "zod";
import { resolveAuthenticatedReadPrincipal } from "./authenticated-principal.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";
import { decryptVisitor, publicFunnelConfig } from "./funnel-public-store.js";
import { campaignCommandAuthErrorResponse } from "./campaign-command-http.js";

const csvCell = (value: string) =>
  `"${(/^[=+@\-\t\r]/u.test(value.trimStart()) ? "'" : "") + value.replaceAll('"', '""')}"`;
export async function downloadFunnelInquiries(
  request: Request,
  environment: unknown = process.env,
) {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(
      request,
      environment,
      resolveRuntimeCampaignCommandPorts(environment),
    );
    if (principal.authenticationMode === "local_synthetic" || principal.role === "platform_support")
      return new Response(null, { status: 403 });
    const id = z.uuid().parse(new URL(request.url).searchParams.get("publication"));
    const config = publicFunnelConfig(environment),
      pool = campaignDatabasePool(environment);
    const authority = createPrincipalBoundTenantContextAuthority(
      principal,
      workspaceCorrelationReferenceFor(principal),
    );
    const records = await withTenantTransaction(pool, authority, async (tx) => {
      const owned = await tx.read(
        defineSqlContract({
          name: "funnel-inquiries.owner",
          access: "read",
          text: "select id from campaign.funnel_publications where id=$1::uuid and location_id=$2::uuid and user_id=$3::uuid",
          decode: (row: unknown) => z.object({ id: z.uuid() }).parse(row),
        }),
        [id, principal.locationId, principal.actorId],
      );
      if (!owned.length) return null;
      return tx.read(
        defineSqlContract({
          name: "funnel-inquiries.export",
          access: "read",
          text: "select request_id,payload_cipher,delivery_status,created_at::text from campaign.funnel_inquiries where publication_id=$1::uuid and location_id=$2::uuid and user_id=$3::uuid and expires_at>now() order by created_at desc limit 1000",
          decode: (row: unknown) =>
            z
              .object({
                request_id: z.uuid(),
                payload_cipher: z.string(),
                delivery_status: z.string(),
                created_at: z.string(),
              })
              .parse(row),
        }),
        [id, principal.locationId, principal.actorId],
      );
    });
    if (records === null) return new Response(null, { status: 404 });
    const rows = records.map((item) => {
      const visitor = decryptVisitor(config, id, item.request_id, item.payload_cipher);
      return [
        item.created_at,
        visitor.firstName,
        visitor.email,
        visitor.phone,
        visitor.goal,
        item.delivery_status,
        "Permission to respond to this request received",
      ]
        .map(csvCell)
        .join(",");
    });
    const csv = ["Received,First name,Email,Phone,Goal,HighLevel delivery,Consent", ...rows].join(
      "\r\n",
    );
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="funnel-inquiries.csv"',
        "cache-control": "no-store, private",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const auth = campaignCommandAuthErrorResponse(error);
    return auth ?? new Response(null, { status: error instanceof z.ZodError ? 400 : 503 });
  }
}
