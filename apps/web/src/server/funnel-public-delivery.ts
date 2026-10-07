import { z } from "zod";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { readBoundedJson } from "./homeowners/errors.js";
import { decryptVisitor, funnelCapability, publicFunnelConfig } from "./funnel-public-store.js";

export const PUBLIC_COOKIE = "oalo_funnel_receipt";
export function readPublicCookie(cookie: string): string | null {
  const values = cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${PUBLIC_COOKIE}=`));
  if (values.length !== 1) return null;
  const value = values[0]!.slice(PUBLIC_COOKIE.length + 1);
  return /^[a-f0-9]{64}$/u.test(value) ? value : null;
}
const ConnectionSchema = z
  .object({
    locationId: z.string().regex(/^[A-Za-z0-9_-]{8,100}$/u),
    accessToken: z.string().min(20).max(4096).regex(/^\S+$/u),
  })
  .strict();
export function funnelHandoffConfigured(environment: unknown, locationId: string): boolean {
  try {
    const raw = publicFunnelConfig(environment).ghl;
    if (!raw) return false;
    return !!z.record(z.uuid(), ConnectionSchema).parse(JSON.parse(raw))[locationId];
  } catch {
    return false;
  }
}
/** Optional CRM delivery uses server-owned connections and the database's verified location binding. */
export async function tryFunnelDelivery(
  id: string,
  requestId: string,
  receipt: string,
  environment: unknown,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const config = publicFunnelConfig(environment);
  if (!config.ghl) return;
  const pool = campaignDatabasePool(environment);
  let claimed = false;
  try {
    const connections = z.record(z.uuid(), ConnectionSchema).parse(JSON.parse(config.ghl));
    const raw = await funnelCapability(pool, "claim", [id, requestId, receipt]);
    if (raw === null) return;
    claimed = true;
    const claim = z
      .object({ locationId: z.uuid(), ghlLocationId: z.string().nullable(), cipher: z.string() })
      .parse(raw);
    const connection = connections[claim.locationId];
    if (!connection || claim.ghlLocationId !== connection.locationId) {
      await funnelCapability(pool, "finish", [id, requestId, receipt, "pending", null]);
      return;
    }
    const visitor = decryptVisitor(config, id, requestId, claim.cipher);
    // Email-only matching avoids the documented collision between separate email/phone contacts.
    // No DND, subscription, workflow, tag or existing phone setting is overwritten.
    const response = await fetcher("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        authorization: `Bearer ${connection.accessToken}`,
        Version: "v3",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        locationId: connection.locationId,
        firstName: visitor.firstName,
        email: visitor.email,
        source: `AutomatedLO funnel ${id}`,
        createNewIfDuplicateAllowed: false,
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Provider refused");
    const result = z
      .object({
        contact: z.object({
          id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u),
          locationId: z.string(),
          email: z.string(),
        }),
      })
      .parse(await readBoundedJson(response, 100000));
    if (
      result.contact.locationId !== connection.locationId ||
      result.contact.email.toLowerCase() !== visitor.email
    )
      throw new Error("Provider identity mismatch");
    await funnelCapability(pool, "finish", [
      id,
      requestId,
      receipt,
      "delivered",
      result.contact.id,
    ]);
  } catch {
    // The durable inquiry survives a provider error. Do not repeat an uncertain side effect.
    if (claimed)
      await funnelCapability(pool, "finish", [id, requestId, receipt, "uncertain", null]).catch(
        () => undefined,
      );
  }
}
