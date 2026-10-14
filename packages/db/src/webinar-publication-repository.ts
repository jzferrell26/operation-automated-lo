import { freezeAuthenticatedPrincipal, type AuthenticatedPrincipal } from "@oalo/application";
import { OpaqueReferenceSchema, parseSessionRef } from "@oalo/contracts";
import { z } from "zod";
import { defineSqlContract, type DatabasePool } from "./sql-contract.js";
import {
  createPrincipalBoundTenantContextAuthority,
  withTenantTransaction,
} from "./transaction-context.js";

export const WebinarPublicationRowSchema = z
  .object({
    publication: z
      .object({
        id: z.uuid(),
        snapshot: z.unknown(),
        active: z.boolean(),
        sourceRevision: z.uuid(),
        createdAt: z.iso.datetime({ offset: true }),
        expiresAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
    publisherActorRef: OpaqueReferenceSchema,
    frozenDestination: z.unknown(),
  })
  .strict();
export type WebinarPublicationRow = z.infer<typeof WebinarPublicationRowSchema>;

const owned = defineSqlContract({
  name: "webinar-destination.owned.v1",
  access: "read",
  text: "select campaign.webinar_destination_owned($1::uuid,$2::text,$3::bigint,$4::text,$5::uuid) as value",
  decode: (row: unknown) =>
    z.object({ value: WebinarPublicationRowSchema.nullable() }).strict().parse(row).value,
});
const version = defineSqlContract({
  name: "webinar-destination.version.v1",
  access: "read",
  text: "select campaign.webinar_destination_for_version($1::text,$2::text,$3::text,$4::bigint,$5::text,$6::uuid) as value",
  decode: owned.decode,
});
const listOwned = defineSqlContract({
  name: "webinar-destination.list-owned.v1",
  access: "read",
  text: "select campaign.webinar_destination_owned(p.id,$1::text,$2::bigint,$3::text,$4::uuid) as value from campaign.funnel_publications p where p.location_id=platform.current_location_id() and p.user_id=platform.current_actor_id() and p.kind in ('live-webinar','on-demand') order by p.created_at desc limit 30",
  decode: owned.decode,
});
const historicalVersion = defineSqlContract({
  name: "webinar-destination.history-version.v1",
  access: "read",
  text: "select campaign.webinar_destination_history_for_version($1::text,$2::text,$3::text,$4::bigint,$5::text,$6::uuid) as value",
  decode: owned.decode,
});

/** Fixed queries, bound principal and transaction context. No arbitrary source SQL or owner ID. */
export function createWebinarPublicationRepository(
  pool: DatabasePool,
  principal: Readonly<AuthenticatedPrincipal>,
  correlationRef: string,
) {
  const actor = freezeAuthenticatedPrincipal(principal);
  if (actor.authenticationMode === "local_synthetic")
    throw new Error("WEBINAR_DESTINATION_FORBIDDEN");
  const authority = createPrincipalBoundTenantContextAuthority(actor, correlationRef);
  const identity = [
    actor.role,
    actor.roleVersion,
    actor.authenticationMode,
    actor.authenticationMode === "first_party" ? parseSessionRef(actor.sessionId) : null,
  ] as const;
  return {
    listOwned: async (): Promise<readonly WebinarPublicationRow[]> =>
      withTenantTransaction(pool, authority, async (tx) =>
        (await tx.read(listOwned, identity)).filter(
          (row): row is WebinarPublicationRow => row !== null,
        ),
      ),
    owned: async (publicationId: string): Promise<WebinarPublicationRow | null> => {
      z.uuid().parse(publicationId);
      return withTenantTransaction(
        pool,
        authority,
        async (tx) => (await tx.read(owned, [publicationId, ...identity]))[0] ?? null,
      );
    },
    forVersion: async (
      campaignRef: string,
      versionRef: string,
    ): Promise<WebinarPublicationRow | null> => {
      OpaqueReferenceSchema.parse(campaignRef);
      OpaqueReferenceSchema.parse(versionRef);
      return withTenantTransaction(
        pool,
        authority,
        async (tx) => (await tx.read(version, [campaignRef, versionRef, ...identity]))[0] ?? null,
      );
    },
    historicalForVersion: async (
      campaignRef: string,
      versionRef: string,
    ): Promise<WebinarPublicationRow | null> => {
      OpaqueReferenceSchema.parse(campaignRef);
      OpaqueReferenceSchema.parse(versionRef);
      return withTenantTransaction(
        pool,
        authority,
        async (tx) =>
          (await tx.read(historicalVersion, [campaignRef, versionRef, ...identity]))[0] ?? null,
      );
    },
  };
}
