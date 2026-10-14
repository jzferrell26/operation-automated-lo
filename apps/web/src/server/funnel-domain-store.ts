import { randomBytes, randomUUID } from "node:crypto";
import { assertMayExecuteCampaignMutation, type AuthenticatedPrincipal } from "@oalo/application";
import {
  createPrincipalBoundTenantContextAuthority,
  defineSqlContract,
  withTenantTransaction,
  type DatabasePool,
} from "@oalo/db";
import { z } from "zod";
import {
  DOMAIN_FRESHNESS_MS,
  FunnelDomainSchema,
  ownershipRecord,
  type FunnelDomain,
} from "../features/domains/model.js";
import { workspaceCorrelationReferenceFor } from "./campaign-persistence-runtime.js";
import type { DomainProvider } from "./funnel-domain-provider.js";

export class FunnelDomainError extends Error {
  constructor(
    readonly status: number,
    readonly code = "DOMAIN_UNAVAILABLE",
  ) {
    super(code);
  }
}
export interface FunnelDomainStore {
  list(): Promise<readonly FunnelDomain[]>;
  command(
    action: "connect" | "disconnect" | "reserve" | "claim" | "finish",
    id: string,
    revision: string | null,
    candidate?: unknown,
  ): Promise<FunnelDomain>;
}
export function postgresFunnelDomainStore(
  principal: Readonly<AuthenticatedPrincipal>,
  pool: DatabasePool,
): FunnelDomainStore {
  const authority = createPrincipalBoundTenantContextAuthority(
    principal,
    workspaceCorrelationReferenceFor(principal),
  );
  return {
    list: () =>
      withTenantTransaction(pool, authority, (tx) =>
        tx.read(
          defineSqlContract({
            name: "funnel-domain.list",
            access: "read",
            text: "select record from campaign.funnel_domains where location_id=$1::uuid and user_id=$2::uuid order by disconnected,created_at desc limit 10",
            decode: (row) => z.object({ record: FunnelDomainSchema }).parse(row).record,
          }),
          [principal.locationId, principal.actorId],
        ),
      ),
    async command(action, id, revision, candidate = null) {
      assertMayExecuteCampaignMutation(principal);
      z.uuid().parse(id);
      if (revision !== null) z.uuid().parse(revision);
      try {
        return await withTenantTransaction(pool, authority, async (tx) => {
          const result = await tx.write(
            defineSqlContract({
              name: "funnel-domain.command",
              access: "write",
              text: "select campaign.funnel_domain_command($1,$2::uuid,$3::uuid,$4::text::jsonb) as value",
              decode: (row) => z.object({ value: FunnelDomainSchema.nullable() }).parse(row).value,
            }),
            [action, id, revision, JSON.stringify(candidate)],
          );
          if (!result[0]) throw new FunnelDomainError(404, "DOMAIN_NOT_FOUND");
          return result[0];
        });
      } catch (error) {
        if (z.object({ code: z.literal("40001") }).safeParse(error).success)
          throw new FunnelDomainError(409, "DOMAIN_CONFLICT");
        if (z.object({ code: z.literal("42501") }).safeParse(error).success)
          throw new FunnelDomainError(403, "DOMAIN_FORBIDDEN");
        throw error;
      }
    },
  };
}
export function newDomainClaim(
  input: { hostname: string; apex: boolean; defaultKind: FunnelDomain["defaultKind"] },
  now = Date.now(),
): FunnelDomain {
  const challenge = randomBytes(32).toString("hex");
  return FunnelDomainSchema.parse({
    ...input,
    id: randomUUID(),
    revision: randomUUID(),
    challenge,
    status: "ownership_needed",
    claimed: false,
    records: [ownershipRecord(input.hostname, challenge)],
    checkedAt: null,
    readyUntil: null,
    nextCheckAt: null,
    challengeExpiresAt: new Date(now + DOMAIN_FRESHNESS_MS).toISOString(),
  });
}
/** Network calls occur outside transactions. Each persisted step has a fresh CAS revision. */
export async function checkFunnelDomain(
  store: FunnelDomainStore,
  provider: DomainProvider,
  id: string,
  revision: string,
): Promise<FunnelDomain> {
  let current = await store.command("reserve", id, revision);
  const finish = (status: FunnelDomain["status"], records = current.records) =>
    store.command("finish", id, current.revision, { status, records });
  let owned: boolean;
  try {
    owned = await provider.owns(current.hostname, current.challenge);
  } catch {
    return finish("attention");
  } // Explicitly persist uncertain checks and deny routing.
  if (!owned)
    return finish("ownership_needed", [ownershipRecord(current.hostname, current.challenge)]);
  current = await store.command("claim", id, current.revision);
  try {
    const attached = await provider.attach(current.hostname, current.apex);
    const records = [ownershipRecord(current.hostname, current.challenge), ...attached.records];
    if (!attached.verified) return await finish("hosting_needed", records);
    if (!attached.configured) return await finish("dns_needed", records);
    const certificate = await provider.certificate(current.hostname);
    return await finish(certificate ? "ready" : "certificate_needed", records);
  } catch (error) {
    // A concurrent disconnect/conflict must remain visible and never be overwritten.
    if (error instanceof FunnelDomainError) throw error;
    return finish("attention");
  }
}
