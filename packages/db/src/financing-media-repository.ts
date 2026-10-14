import {
  assertMayExecuteCampaignMutation,
  FinancingMediaError,
  type AuthenticatedPrincipal,
  type FinancingMediaRepository,
} from "@oalo/application";
import {
  FinancingMediaRecordSchema,
  FinancingMediaRevocationSchema,
  FinancingMediaRefSchema,
  type FinancingMediaRecord,
} from "@oalo/contracts";
import { defineSqlContract, type DatabasePool } from "./sql-contract.js";
import { withTenantTransaction, type TenantContextAuthority } from "./transaction-context.js";
import { z } from "zod";

const SELECT = `select jsonb_build_object('mediaRef', m.media_ref, 'locationRef', m.location_ref,
 'createdBy', m.created_by_ref, 'requestId', m.request_id::text, 'requestHash', m.request_hash,
 'sourceSha256', m.source_sha256, 'sha256', m.sha256, 'mimeType', m.mime_type, 'byteSize', m.byte_size,
 'width', m.width, 'height', m.height, 'normalizationVersion', m.normalization_version,
 'metadataRetained', false, 'createdAt', to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'rights', jsonb_build_object('schemaVersion',1,'basis',m.rights_basis,'confirmed',true,
 'attestedBy',m.created_by_ref,'attestedAt',to_char(m.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'scope','tenant-private-financing')) as record,
 case when r.media_ref is null then null else jsonb_build_object('mediaRef',r.media_ref,'revokedBy',r.revoked_by_ref,
 'revokedAt',to_char(r.revoked_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) end as revocation
 from campaign.financing_media m left join campaign.financing_media_revocations r using(location_id,media_ref)
 where m.location_id=platform.current_location_id() and m.media_ref=$1::text`;
const read = defineSqlContract({
  name: "financing-media.read.v1",
  access: "read",
  text: SELECT,
  decode: (row: unknown) =>
    z
      .object({
        record: FinancingMediaRecordSchema,
        revocation: FinancingMediaRevocationSchema.nullable(),
      })
      .parse(row),
});
const insert = defineSqlContract({
  name: "financing-media.insert.v1",
  access: "write",
  text: `
insert into campaign.financing_media(location_id,media_ref,location_ref,created_by,created_by_ref,request_id,
request_hash,source_sha256,sha256,mime_type,byte_size,width,height,normalization_version,rights_basis,created_at)
values(platform.current_location_id(),$1,$2,platform.current_actor_id(),$3,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz)
on conflict do nothing returning media_ref`,
  decode: (row: unknown) => z.object({ media_ref: FinancingMediaRefSchema }).parse(row),
});
const revoke = defineSqlContract({
  name: "financing-media.revoke.v1",
  access: "write",
  text: `
insert into campaign.financing_media_revocations(location_id,media_ref,revoked_by,revoked_by_ref)
values(platform.current_location_id(),$1,platform.current_actor_id(),$2) on conflict do nothing returning media_ref`,
  decode: (row: unknown) => z.object({ media_ref: FinancingMediaRefSchema }).parse(row),
});

export class PostgresFinancingMediaRepository implements FinancingMediaRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly authority: TenantContextAuthority,
    private readonly principal: AuthenticatedPrincipal,
  ) {}
  async find(mediaRef: string) {
    FinancingMediaRefSchema.parse(mediaRef);
    return withTenantTransaction(this.pool, this.authority, async (tx) => {
      const found = (await tx.read(read, [mediaRef]))[0];
      if (found && found.record.locationRef !== this.principal.locationRef)
        throw new FinancingMediaError("FINANCING_MEDIA_INTEGRITY_FAILED", 422);
      return found;
    });
  }
  async commitReady(input: FinancingMediaRecord) {
    assertMayExecuteCampaignMutation(this.principal);
    const r = FinancingMediaRecordSchema.parse(input);
    if (r.locationRef !== this.principal.locationRef || r.createdBy !== this.principal.actorRef)
      throw new FinancingMediaError("FINANCING_MEDIA_CONFLICT", 409);
    return withTenantTransaction(this.pool, this.authority, async (tx) => {
      await tx.write(insert, [
        r.mediaRef,
        r.locationRef,
        r.createdBy,
        r.requestId,
        r.requestHash,
        r.sourceSha256,
        r.sha256,
        r.mimeType,
        r.byteSize,
        r.width,
        r.height,
        r.normalizationVersion,
        r.rights.basis,
        r.createdAt,
      ]);
      const found = (await tx.read(read, [r.mediaRef]))[0];
      if (!found || found.record.requestHash !== r.requestHash || found.record.sha256 !== r.sha256)
        throw new FinancingMediaError("FINANCING_MEDIA_CONFLICT", 409);
      if (found.revocation) throw new FinancingMediaError("FINANCING_MEDIA_REVOKED", 410);
      return found.record;
    });
  }
  async revoke(mediaRef: string) {
    assertMayExecuteCampaignMutation(this.principal);
    FinancingMediaRefSchema.parse(mediaRef);
    return withTenantTransaction(this.pool, this.authority, async (tx) => {
      if (!(await tx.read(read, [mediaRef]))[0])
        throw new FinancingMediaError("FINANCING_MEDIA_NOT_FOUND", 404);
      await tx.write(revoke, [mediaRef, this.principal.actorRef]);
      const result = (await tx.read(read, [mediaRef]))[0]?.revocation;
      if (!result) throw new FinancingMediaError("FINANCING_MEDIA_UNAVAILABLE", 503);
      return result;
    });
  }
}
