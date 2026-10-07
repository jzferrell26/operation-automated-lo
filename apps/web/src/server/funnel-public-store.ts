import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { type AuthenticatedPrincipal } from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
  type SqlScalar,
} from "@oalo/db";
import { z } from "zod";
import {
  PublishedFunnelSchema,
  type FunnelSnapshot,
  type PublishedFunnel,
} from "../features/funnels/publication-model.js";
import { FunnelVisitorSchema, type FunnelVisitor } from "../features/funnels/visitor-model.js";
import {
  campaignDatabasePool,
  workspaceCorrelationReferenceFor,
} from "./campaign-persistence-runtime.js";

export class FunnelPublicError extends Error {
  constructor(
    readonly status: number,
    readonly code: string = "FUNNEL_PUBLIC_UNAVAILABLE",
  ) {
    super(code);
  }
}
const EnvironmentSchema = z
  .object({
    OALO_ENVIRONMENT: z.string().optional(),
    OALO_APP_URL: z.url(),
    OALO_FUNNEL_PUBLICATION: z.literal("enabled"),
    OALO_FUNNEL_DATA_KEY: z.string().regex(/^[A-Za-z0-9_-]{43}$/u),
    OALO_FUNNEL_GHL_CONNECTIONS_JSON: z.string().optional(),
    OALO_FUNNEL_GHL_DELIVERY: z.literal("enabled").optional(),
  })
  .passthrough();
export function publicFunnelConfig(environment: unknown) {
  const parsed = EnvironmentSchema.safeParse(environment);
  if (!parsed.success) throw new FunnelPublicError(503);
  const url = new URL(parsed.data.OALO_APP_URL);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" &&
      !(
        parsed.data.OALO_ENVIRONMENT === "local" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new FunnelPublicError(503);
  const key = Buffer.from(parsed.data.OALO_FUNNEL_DATA_KEY, "base64url");
  if (key.length !== 32) throw new FunnelPublicError(503);
  return {
    origin: url.origin,
    key,
    ghl:
      parsed.data.OALO_FUNNEL_GHL_DELIVERY === "enabled"
        ? parsed.data.OALO_FUNNEL_GHL_CONNECTIONS_JSON
        : undefined,
  };
}
export type PublicFunnelConfig = ReturnType<typeof publicFunnelConfig>;
export const receiptHash = (value: string) => createHash("sha256").update(value).digest("hex");
export function receiptSecret(config: PublicFunnelConfig, id: string, requestId: string) {
  return createHmac("sha256", config.key)
    .update(`funnel-receipt-v1:${id}:${requestId}`)
    .digest("hex");
}
export function visitorHash(config: PublicFunnelConfig, id: string, visitor: FunnelVisitor) {
  return createHmac("sha256", config.key)
    .update(`funnel-request-v1:${id}:${JSON.stringify(visitor)}`)
    .digest("hex");
}
export function encryptVisitor(
  config: PublicFunnelConfig,
  id: string,
  visitor: FunnelVisitor,
): string {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", config.key, iv);
  cipher.setAAD(Buffer.from(`${id}:${visitor.requestId}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(visitor), "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}
export function decryptVisitor(
  config: PublicFunnelConfig,
  id: string,
  requestId: string,
  value: string,
): FunnelVisitor {
  const parts = value.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new FunnelPublicError(503);
  const decipher = createDecipheriv("aes-256-gcm", config.key, Buffer.from(parts[1]!, "base64url"));
  decipher.setAuthTag(Buffer.from(parts[2]!, "base64url"));
  decipher.setAAD(Buffer.from(`${id}:${requestId}`));
  return FunnelVisitorSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(parts[3]!, "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    ),
  );
}
const FUNCTION_SQL = {
  read: "select campaign.funnel_public_snapshot($1::uuid) as value",
  accept: "select campaign.funnel_accept_inquiry($1::uuid,$2::uuid,$3,$4,$5,$6,$7) as value",
  receipt: "select campaign.funnel_receipt_valid($1::uuid,$2) as value",
  claim: "select campaign.funnel_claim_delivery($1::uuid,$2::uuid,$3) as value",
  finish: "select campaign.funnel_finish_delivery($1::uuid,$2::uuid,$3,$4,$5) as value",
} as const;
/** A finite capability allowlist. No request or caller can supply SQL or tenant context. */
export async function funnelCapability(
  pool: DatabasePool,
  name: keyof typeof FUNCTION_SQL,
  values: readonly SqlScalar[],
): Promise<unknown> {
  const connection = await pool.connect();
  const execute = (statementName: string, text: string, args: readonly SqlScalar[] = []) =>
    connection.execute({ statementName, text, values: args, preparedStatementMode: "unnamed" });
  try {
    await execute("funnel.capability-begin", "begin");
    await execute("funnel.capability-role", "set local role app_runtime");
    const result = await execute(`funnel.public-${name}`, FUNCTION_SQL[name], values);
    await execute("funnel.capability-commit", "commit");
    return z.object({ value: z.unknown() }).parse(result.rows[0]).value;
  } catch (error) {
    await execute("funnel.capability-rollback", "rollback");
    throw error;
  } finally {
    await connection.release();
  }
}
export async function readPublishedFunnel(
  id: string,
  environment: unknown,
): Promise<PublishedFunnel | null> {
  if (!z.uuid().safeParse(id).success) return null;
  publicFunnelConfig(environment);
  const raw = await funnelCapability(campaignDatabasePool(environment), "read", [id]);
  return raw === null ? null : PublishedFunnelSchema.parse(raw);
}
function publicationContract(name: string, access: "read" | "write", text: string) {
  return defineSqlContract({
    name: `funnel-publication.${name}`,
    access,
    text,
    decode: (row: unknown) => z.object({ value: PublishedFunnelSchema }).parse(row).value,
  });
}
const projection =
  "jsonb_build_object('id',id,'snapshot',snapshot,'active',active,'sourceRevision',source_revision,'createdAt',created_at,'expiresAt',expires_at) as value";
export function publicationStore(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
) {
  const pool = campaignDatabasePool(environment),
    authority = createPrincipalBoundTenantContextAuthority(
      principal,
      workspaceCorrelationReferenceFor(principal),
    );
  return {
    list: () =>
      withTenantTransaction(pool, authority, async (tx) =>
        tx.read(
          publicationContract(
            "list",
            "read",
            `select ${projection} from campaign.funnel_publications where location_id=$1::uuid and user_id=$2::uuid order by created_at desc limit 30`,
          ),
          [principal.locationId, principal.actorId],
        ),
      ),
    publish: (snapshot: FunnelSnapshot, revision: string) =>
      withTenantTransaction(pool, authority, async (tx) => {
        const lock = defineSqlContract({
          name: "funnel-publication.lock",
          access: "write" as const,
          text: "select pg_advisory_xact_lock(hashtextextended($1,0))",
          decode: () => true,
        });
        await tx.write(lock, [`${principal.locationId}:${principal.actorId}:${snapshot.kind}`]);
        const previous = await tx.read(
          publicationContract(
            "revision",
            "read",
            `select ${projection} from campaign.funnel_publications where location_id=$1::uuid and user_id=$2::uuid and kind=$3 and source_revision=$4::uuid`,
          ),
          [principal.locationId, principal.actorId, snapshot.kind, revision],
        );
        if (previous[0]) {
          if (!previous[0].active || Date.parse(previous[0].expiresAt) <= Date.now())
            throw new FunnelPublicError(409, "FUNNEL_RETIRED_VERSION");
          return previous[0];
        }
        const id = randomUUID(),
          now = new Date(),
          expiry = new Date(now.getTime() + 90 * 86400000);
        const rows = await tx.write(
          publicationContract(
            "insert",
            "write",
            `insert into campaign.funnel_publications(id,location_id,user_id,kind,source_revision,snapshot,created_at,expires_at) values($1::uuid,$2::uuid,$3::uuid,$4,$5::uuid,$6::text::jsonb,$7::timestamptz,$8::timestamptz) returning ${projection}`,
          ),
          [
            id,
            principal.locationId,
            principal.actorId,
            snapshot.kind,
            revision,
            JSON.stringify(snapshot),
            now,
            expiry,
          ],
        );
        if (!rows[0]) throw new FunnelPublicError(503);
        return rows[0];
      }),
    revoke: (id: string) =>
      withTenantTransaction(pool, authority, async (tx) => {
        z.uuid().parse(id);
        const result = await tx.write(
          defineSqlContract({
            name: "funnel-publication.revoke",
            access: "write",
            text: "update campaign.funnel_publications set active=false where id=$1::uuid and location_id=$2::uuid and user_id=$3::uuid returning id",
            decode: (row: unknown) => z.object({ id: z.uuid() }).parse(row),
          }),
          [id, principal.locationId, principal.actorId],
        );
        if (!result.length) throw new FunnelPublicError(404);
      }),
  };
}
