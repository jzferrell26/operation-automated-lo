import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";
import {
  canonicalCampaignHash as hash,
  freezeAuthenticatedPrincipal,
  FinancingReleaseError,
  type AuthenticatedPrincipal,
  type FinancingInquiryCapture,
  type FinancingReleaseTransaction,
} from "@oalo/application";
import {
  FinancingReleaseEvidenceSchema,
  FinancingReleaseResolvedSourceSchema,
  FinancingReleaseRecordSchema,
  FinancingReleaseSnapshotSchema,
  FinancingReleaseInquiryRequestSchema,
  FinancingInquiryReceiptSchema,
  OpaqueReferenceSchema,
  parseSessionRef,
  type FinancingReleaseResolvedSource,
  type FinancingReleaseSnapshot,
  type FinancingReleaseRecord,
} from "@oalo/contracts";
import { defineSqlContract, type DatabasePool, type SqlScalar } from "./sql-contract.js";
import {
  createPrincipalBoundTenantContextAuthority,
  withTenantTransaction,
  type TenantTransaction,
} from "./transaction-context.js";

const Hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const FinancingEvidenceKindSchema = z.enum([
  "property",
  "partner-identity",
  "lender-identity",
  "preset",
  "quote",
  "disclosure",
  "public-media",
  "template",
  "routing",
  "consent",
  "origin",
]);
/** Admission is a separate privileged service operation, never a browser attestation. */
export const VerifiedFinancingEvidenceAdmissionSchema = z
  .object({
    locationId: z.uuid(),
    kind: FinancingEvidenceKindSchema,
    evidence: FinancingReleaseEvidenceSchema,
    provenance: z
      .object({
        qualificationRef: OpaqueReferenceSchema,
        receiptHash: Hash,
        verifierRef: OpaqueReferenceSchema,
        method: z.enum(["lender-record", "public-permission-record", "platform-record"]),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const lender = ["preset", "quote", "disclosure", "lender-identity"].includes(value.kind);
    const permission = ["public-media", "partner-identity", "property"].includes(value.kind);
    if (
      value.evidence.revokedAt !== null ||
      value.provenance.method !==
        (lender ? "lender-record" : permission ? "public-permission-record" : "platform-record")
    )
      ctx.addIssue({
        code: "custom",
        message: "A current independently qualified record is required.",
      });
  });
export type VerifiedFinancingEvidenceAdmission = z.infer<
  typeof VerifiedFinancingEvidenceAdmissionSchema
>;

export interface FinancingInquiryEncryptionConfiguration {
  readonly currentKeyId: string;
  readonly keys: Readonly<Record<string, Uint8Array>>;
  /** Stable independent key for dedupe hashes; retain across encryption-key rotations. */
  readonly requestHashKey: Uint8Array;
}
const EncryptedPayloadSchema = z
  .object({
    schemaVersion: z.literal(1),
    request: FinancingReleaseInquiryRequestSchema,
    consent: z
      .object({
        versionRef: OpaqueReferenceSchema,
        hash: Hash,
        text: z.string().min(1).max(20000),
        acceptedAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
    attribution: z
      .object({
        locationRef: OpaqueReferenceSchema,
        campaignRef: OpaqueReferenceSchema,
        campaignVersionRef: OpaqueReferenceSchema,
        propertyVersionRef: OpaqueReferenceSchema,
        publicationId: z.uuid(),
        releaseRef: OpaqueReferenceSchema,
        bundleHash: Hash,
        partnerVersionRef: OpaqueReferenceSchema,
        routingProfileVersionRef: OpaqueReferenceSchema,
        highlevelLocationRef: OpaqueReferenceSchema,
      })
      .strict(),
  })
  .strict();
const encryption = (input: FinancingInquiryEncryptionConfiguration) => {
  const keys = Object.fromEntries(
    Object.entries(input.keys).map(([id, key]) => {
      if (
        !/^[a-zA-Z0-9_-]{1,40}$/u.test(id) ||
        !(key instanceof Uint8Array) ||
        key.byteLength !== 32
      )
        throw new FinancingReleaseError("UNAVAILABLE", 503);
      return [id, Buffer.from(key)];
    }),
  );
  if (
    !keys[input.currentKeyId] ||
    !(input.requestHashKey instanceof Uint8Array) ||
    input.requestHashKey.byteLength !== 32
  )
    throw new FinancingReleaseError("UNAVAILABLE", 503);
  return {
    currentKeyId: input.currentKeyId,
    keys,
    requestHashKey: Buffer.from(input.requestHashKey),
  };
};
type Encryption = ReturnType<typeof encryption>;
const aad = (location: string, publication: string, request: string) =>
  Buffer.from(`financing-inquiry-v1:${location}:${publication}:${request}`);
function encrypt(config: Encryption, input: FinancingInquiryCapture): string {
  const snapshot = input.snapshot;
  const payload = EncryptedPayloadSchema.parse({
    schemaVersion: 1,
    request: input.request,
    consent: {
      versionRef: snapshot.consentVersionRef,
      hash: snapshot.authority.consentHash,
      text: snapshot.authority.consentText,
      acceptedAt: input.acceptedAt,
    },
    attribution: {
      locationRef: snapshot.locationRef,
      campaignRef: snapshot.campaignRef,
      campaignVersionRef: snapshot.campaignVersionRef,
      propertyVersionRef: snapshot.propertyVersionRef,
      publicationId: snapshot.publicationId,
      releaseRef: snapshot.releaseRef,
      bundleHash: snapshot.bundleHash,
      partnerVersionRef: snapshot.partnerVersionRef,
      routingProfileVersionRef: snapshot.routingProfileVersionRef,
      highlevelLocationRef: snapshot.authority.highlevelLocationRef,
    },
  });
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", config.keys[config.currentKeyId]!, iv);
  cipher.setAAD(aad(snapshot.locationRef, snapshot.publicationId, input.request.requestId));
  const bytes = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return [
    "v1",
    config.currentKeyId,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    bytes.toString("base64url"),
  ].join(".");
}
function decrypt(
  config: Encryption,
  locationRef: string,
  publicationId: string,
  requestId: string,
  value: string,
) {
  const [version, keyId, iv, tag, body, extra] = value.split(".");
  const key = keyId ? config.keys[keyId] : undefined;
  if (version !== "v1" || !key || !iv || !tag || !body || extra !== undefined)
    throw new FinancingReleaseError("UNAVAILABLE", 503);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(aad(locationRef, publicationId, requestId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const payload = EncryptedPayloadSchema.parse(
    JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString(
        "utf8",
      ),
    ),
  );
  if (
    payload.attribution.locationRef !== locationRef ||
    payload.attribution.publicationId !== publicationId ||
    payload.request.requestId !== requestId
  )
    throw new FinancingReleaseError("UNAVAILABLE", 503);
  return payload;
}

const query = (name: string, text: string, access: "read" | "write" = "write") =>
  defineSqlContract({
    name: `financing-release.${name}.v1`,
    text,
    access,
    decode: (row: unknown) => z.object({ value: z.unknown() }).strict().parse(row).value,
  });
// Values are serialized JSON strings. Bind as text first so postgres.js does not
// apply its JSONB serializer a second time after server parameter description.
export const financingReleaseSqlContracts = Object.freeze({
  authorize: query(
    "authorize",
    "select campaign.financing_release_authorize($1,$2::bigint,$3,$4::uuid) as value",
  ),
  sourceSave: query(
    "source-save",
    "select campaign.financing_release_save_source($1::text::jsonb,$2,$3) as value",
  ),
  sourceRead: query("source-read", "select campaign.financing_release_source($1,$2,$3) as value"),
  reserve: query("reserve", "select campaign.financing_release_reserve($1,$2::uuid,$3) as value"),
  load: query("load", "select campaign.financing_release_load($1) as value"),
  save: query(
    "save",
    "select campaign.financing_release_save($1::text::jsonb,$2::integer) as value",
  ),
  current: query("current", "select campaign.financing_release_current($1::text::jsonb) as value"),
  complete: query(
    "complete",
    "select campaign.financing_release_complete($1,$2::uuid,$3,$4) as value",
  ),
  capture: query(
    "capture",
    "select campaign.financing_release_capture($1,$2::uuid,$3,$4,$5::uuid,$6::timestamptz,$7::timestamptz) as value",
  ),
  export: query("export", "select campaign.financing_release_export() as value"),
  remove: query("remove", "select campaign.financing_release_remove_inquiry($1::uuid) as value"),
  withdraw: query(
    "withdraw",
    "select campaign.financing_release_withdraw_evidence($1,$2) as value",
  ),
  publication: query(
    "publication",
    "select campaign.financing_release_publication($1::uuid,$2) as value",
  ),
  publicContext: query(
    "public-context",
    "select campaign.financing_release_public_context($1::uuid,$2) as value",
  ),
  purge: query("purge", "select campaign.purge_expired_marketing_inquiries() as value"),
  admit: query(
    "admit",
    "select campaign.financing_release_admit_evidence($1::uuid,$2,$3::text::jsonb,$4::text::jsonb) as value",
  ),
});
const rows = async (
  tx: TenantTransaction,
  name: keyof typeof financingReleaseSqlContracts,
  values: readonly SqlScalar[] = [],
) => {
  const result = await tx.write(financingReleaseSqlContracts[name], values);
  if (result.length !== 1) throw new FinancingReleaseError("UNAVAILABLE", 503);
  return result[0];
};
function lockedEvidence(db: TenantTransaction, locationRef: string, releaseRef?: string) {
  const checked = new Map<string, FinancingReleaseSnapshot>();
  const check = async (input: FinancingReleaseSnapshot) => {
    const snapshot = FinancingReleaseSnapshotSchema.parse(input);
    if (
      snapshot.locationRef !== locationRef ||
      (releaseRef !== undefined && snapshot.releaseRef !== releaseRef) ||
      (await rows(db, "current", [JSON.stringify(snapshot)])) !== true
    )
      throw new FinancingReleaseError("INELIGIBLE", 422);
    checked.set(snapshot.releaseRef, snapshot);
  };
  return {
    check,
    recheck: async () => {
      for (const snapshot of checked.values()) await check(snapshot);
    },
  };
}
async function captureEncrypted(
  db: TenantTransaction,
  config: Encryption,
  input: FinancingInquiryCapture,
  assertCurrent: (snapshot: FinancingReleaseSnapshot) => Promise<void>,
) {
  const request = FinancingReleaseInquiryRequestSchema.parse(input.request);
  const snapshot = FinancingReleaseSnapshotSchema.parse(input.snapshot);
  Hash.parse(input.contentHash);
  z.iso.datetime({ offset: true }).parse(input.acceptedAt);
  z.iso.datetime({ offset: true }).parse(input.expiresAt);
  if (
    Date.parse(input.expiresAt) !== Date.parse(input.acceptedAt) + 30 * 86400000 ||
    input.contentHash !==
      hash({
        publicationId: snapshot.publicationId,
        request,
        consentHash: snapshot.authority.consentHash,
      })
  )
    throw new FinancingReleaseError("INELIGIBLE", 422);
  await assertCurrent(snapshot);
  const inputHash = createHmac("sha256", config.requestHashKey)
    .update(`financing:${input.contentHash}`)
    .digest("hex");
  return FinancingInquiryReceiptSchema.parse(
    await rows(db, "capture", [
      snapshot.releaseRef,
      request.requestId,
      inputHash,
      encrypt(config, { ...input, request, snapshot }),
      randomUUID(),
      input.acceptedAt,
      input.expiresAt,
    ]),
  );
}
/** Reuses the verified tenant context/pool, while selecting SERIALIZABLE at BEGIN before context queries. */
function serializablePool(
  pool: DatabasePool,
  publicSelection?: { publicationId: string; canonicalOrigin: string },
): DatabasePool {
  return {
    async connect() {
      const connection = await pool.connect();
      return {
        execute: async (request) => {
          if (request.statementName === "transaction.begin") {
            const began = await connection.execute({
              ...request,
              text: "begin isolation level serializable",
            });
            if (publicSelection)
              await connection.execute({
                ...request,
                statementName: "financing-public.assume-role",
                text: "set local role financing_public_runtime",
              });
            return began;
          }
          if (publicSelection && request.statementName === "transaction.assume-app-runtime-role")
            return connection.execute({
              ...request,
              text: "set local role financing_public_runtime",
            });
          if (publicSelection && request.statementName === "transaction.set-context")
            return connection.execute({
              ...request,
              text: financingReleaseSqlContracts.publicContext.text,
              values: [publicSelection.publicationId, publicSelection.canonicalOrigin],
            });
          return connection.execute(request);
        },
        release: () => connection.release(),
      };
    },
  };
}
const safe = async <T>(work: () => Promise<T>): Promise<T> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof FinancingReleaseError) throw error;
    const code = z.object({ code: z.string() }).safeParse(error);
    if (code.success && ["23505", "P0002"].includes(code.data.code))
      throw new FinancingReleaseError("CONFLICT", 409);
    if (code.success && code.data.code === "P0001")
      throw new FinancingReleaseError("INELIGIBLE", 422);
    throw new FinancingReleaseError("UNAVAILABLE", 503);
  }
};

/** Concrete server adapter. No synthetic principal, verifier admission or encryption default. */
export class PostgresFinancingReleaseRepository {
  readonly #actor: Readonly<AuthenticatedPrincipal>;
  readonly #authority: ReturnType<typeof createPrincipalBoundTenantContextAuthority>;
  readonly #crypto: Encryption;
  readonly #active = new AsyncLocalStorage<TenantTransaction>();
  constructor(
    readonly pool: DatabasePool,
    principal: Readonly<AuthenticatedPrincipal>,
    correlationRef: string,
    config: FinancingInquiryEncryptionConfiguration,
  ) {
    this.#actor = freezeAuthenticatedPrincipal(principal);
    if (this.#actor.authenticationMode === "local_synthetic")
      throw new FinancingReleaseError("INELIGIBLE", 422);
    this.#authority = createPrincipalBoundTenantContextAuthority(this.#actor, correlationRef);
    this.#crypto = encryption(config);
  }
  async #run<T>(work: (tx: TenantTransaction) => Promise<T>) {
    const active = this.#active.getStore();
    if (active) return work(active);
    return safe(() =>
      withTenantTransaction(serializablePool(this.pool), this.#authority, async (tx) => {
        const actor = this.#actor;
        if (
          (await rows(tx, "authorize", [
            actor.role,
            actor.roleVersion,
            actor.authenticationMode,
            actor.authenticationMode === "first_party" ? parseSessionRef(actor.sessionId) : null,
          ])) !== true
        )
          throw new FinancingReleaseError("INELIGIBLE", 422);
        const result = await this.#active.run(tx, () => work(tx));
        if (
          (await rows(tx, "authorize", [
            actor.role,
            actor.roleVersion,
            actor.authenticationMode,
            actor.authenticationMode === "first_party" ? parseSessionRef(actor.sessionId) : null,
          ])) !== true
        )
          throw new FinancingReleaseError("INELIGIBLE", 422);
        return result;
      }),
    );
  }
  /** Setup selections can only bind exact previously admitted verification records. */
  async saveSource(input: unknown): Promise<FinancingReleaseResolvedSource> {
    const source = FinancingReleaseResolvedSourceSchema.parse(input);
    if (
      source.sourceVersion.locationRef !== this.#actor.locationRef ||
      hash(source.sourceVersion.manifest) !== source.sourceVersion.manifestHash
    )
      throw new FinancingReleaseError("INELIGIBLE", 422);
    return this.#run(async (tx) =>
      FinancingReleaseResolvedSourceSchema.parse(
        await rows(tx, "sourceSave", [
          JSON.stringify(source),
          hash(source),
          hash(source.authority),
        ]),
      ),
    );
  }
  async resolveSource(campaignRef: string, versionRef: string, evidenceHash: string) {
    OpaqueReferenceSchema.parse(campaignRef);
    OpaqueReferenceSchema.parse(versionRef);
    Hash.parse(evidenceHash);
    return this.#run(async (tx) =>
      FinancingReleaseResolvedSourceSchema.parse(
        await rows(tx, "sourceRead", [campaignRef, versionRef, evidenceHash]),
      ),
    );
  }
  async withdrawEvidence(recordRef: string, revisionRef: string): Promise<void> {
    OpaqueReferenceSchema.parse(recordRef);
    OpaqueReferenceSchema.parse(revisionRef);
    await this.#run(async (tx) => {
      if ((await rows(tx, "withdraw", [recordRef, revisionRef])) !== true)
        throw new FinancingReleaseError("NOT_FOUND", 404);
    });
  }
  async transaction<T>(
    locationRef: string,
    work: (tx: FinancingReleaseTransaction) => Promise<T>,
  ): Promise<T> {
    if (locationRef !== this.#actor.locationRef) throw new FinancingReleaseError("NOT_FOUND", 404);
    return this.#run(async (db) => {
      const { check: assertCurrent, recheck } = lockedEvidence(db, locationRef);
      const tx: FinancingReleaseTransaction = {
        reserve: async (command, requestId, contentHash) => {
          z.enum(["prepare", "approve", "publish", "reject", "revoke"]).parse(command);
          z.uuid().parse(requestId);
          Hash.parse(contentHash);
          return rows(db, "reserve", [command, requestId, contentHash]);
        },
        load: async (ref) => {
          OpaqueReferenceSchema.parse(ref);
          return rows(db, "load", [ref]);
        },
        save: async (input, expectedRevision) => {
          const record = FinancingReleaseRecordSchema.parse(input);
          if (record.snapshot.locationRef !== locationRef)
            throw new FinancingReleaseError("NOT_FOUND", 404);
          if (["prepared", "approved", "published"].includes(record.state))
            await assertCurrent(record.snapshot);
          if ((await rows(db, "save", [JSON.stringify(record), expectedRevision])) !== true)
            throw new FinancingReleaseError("CONFLICT", 409);
        },
        assertEvidenceCurrent: async (snapshot, now) => {
          z.iso.datetime({ offset: true }).parse(now);
          await assertCurrent(snapshot);
        },
        complete: async (command, requestId, contentHash, releaseRef) => {
          if (
            (await rows(db, "complete", [
              command,
              z.uuid().parse(requestId),
              Hash.parse(contentHash),
              OpaqueReferenceSchema.parse(releaseRef),
            ])) !== true
          )
            throw new FinancingReleaseError("CONFLICT", 409);
        },
        capture: (input) => captureEncrypted(db, this.#crypto, input, assertCurrent),
      };
      const result = await work(tx);
      // Server clock and all locked authoritative rows are checked again after render/storage work.
      await recheck();
      return result;
    });
  }
  async load(releaseRef: string): Promise<FinancingReleaseRecord | null> {
    OpaqueReferenceSchema.parse(releaseRef);
    return this.#run(async (tx) =>
      FinancingReleaseRecordSchema.nullable().parse(await rows(tx, "load", [releaseRef])),
    );
  }
  async exportInquiries() {
    return this.#run(async (tx) => {
      const items = z
        .array(
          z
            .object({
              receipt: FinancingInquiryReceiptSchema,
              cipher: z.string().min(40).max(48000),
            })
            .strict(),
        )
        .max(1000)
        .parse(await rows(tx, "export"));
      return items.map(({ receipt, cipher }) => ({
        receipt,
        payload: decrypt(
          this.#crypto,
          this.#actor.locationRef,
          receipt.publicationId,
          receipt.requestId,
          cipher,
        ),
      }));
    });
  }
  async removeInquiry(inquiryId: string): Promise<boolean> {
    z.uuid().parse(inquiryId);
    return this.#run(async (tx) => z.boolean().parse(await rows(tx, "remove", [inquiryId])));
  }
}

async function executeCapability(
  pool: DatabasePool,
  name: "admit" | "publication" | "publicContext" | "purge",
  values: readonly SqlScalar[],
) {
  return safe(async () => {
    const connection = await pool.connect();
    const execute = (statementName: string, text: string, values: readonly SqlScalar[] = []) =>
      connection.execute({ statementName, text, values, preparedStatementMode: "unnamed" });
    try {
      await execute("financing-capability.begin", "begin isolation level serializable");
      await execute(
        "financing-capability.assume-role",
        name === "purge"
          ? "set local role scheduler_runtime"
          : name === "admit"
            ? "set local role financing_verifier_runtime"
            : "set local role financing_public_runtime",
      );
      const result = await execute(
        financingReleaseSqlContracts[name].name,
        financingReleaseSqlContracts[name].text,
        values,
      );
      if (result.rows.length !== 1) throw new FinancingReleaseError("UNAVAILABLE", 503);
      const value = financingReleaseSqlContracts[name].decode(result.rows[0]);
      await execute("financing-capability.commit", "commit");
      return value;
    } catch (error) {
      try {
        await execute("financing-capability.rollback", "rollback");
      } catch (cleanup) {
        throw new AggregateError([error, cleanup], "Financing capability rollback failed");
      }
      throw error;
    } finally {
      await connection.release();
    }
  });
}

/** Requires a separately provisioned verifier connection authorized to assume financing_verifier_runtime.
 * Runtime pool credentials cannot admit evidence. Provenance is retained, never guessed by setup. */
export async function admitVerifiedFinancingEvidence(
  verifierPool: DatabasePool,
  raw: unknown,
): Promise<void> {
  const input = VerifiedFinancingEvidenceAdmissionSchema.parse(raw);
  if (
    (await executeCapability(verifierPool, "admit", [
      input.locationId,
      input.kind,
      JSON.stringify(input.evidence),
      JSON.stringify(input.provenance),
    ])) !== true
  )
    throw new FinancingReleaseError("INELIGIBLE", 422);
}

/** Wire into the existing 12:15 UTC cleanup consumer, replacing its funnel-only
 * batch loop. Running that old full-budget loop in addition would exceed policy. */
export async function purgeExpiredMarketingInquiries(schedulerPool: DatabasePool) {
  return safe(async () => {
    const result = z
      .object({
        funnel: z.number().int().min(0).max(15000),
        financing: z.number().int().min(0).max(10000),
        total: z.number().int().min(0).max(25000),
      })
      .strict()
      .parse(await executeCapability(schedulerPool, "purge", []));
    if (result.total !== result.funnel + result.financing)
      throw new FinancingReleaseError("UNAVAILABLE", 503);
    return result;
  });
}

/** Fixed server capability, not an HTTP response. Never return its private result to a visitor. */
export async function findPublicFinancingRelease(
  pool: DatabasePool,
  publicationId: string,
  canonicalOrigin: string,
): Promise<FinancingReleaseRecord | null> {
  z.uuid().parse(publicationId);
  z.string()
    .regex(/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/u)
    .parse(canonicalOrigin);
  return safe(async () =>
    FinancingReleaseRecordSchema.nullable().parse(
      await executeCapability(pool, "publication", [publicationId, canonicalOrigin]),
    ),
  );
}

const PublicContextSchema = z
  .object({
    locationId: z.uuid(),
    actorId: z.uuid(),
    correlationId: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    releaseRef: OpaqueReferenceSchema,
  })
  .strict();
/** Anonymous reads/capture use an exact eligible publication capability. No signed principal is
 * fabricated, no visitor controls tenant/owner, and no admin command/export port is exposed. */
export class PostgresPublicFinancingReleaseRepository {
  readonly #crypto: Encryption;
  readonly #active = new AsyncLocalStorage<{
    db: TenantTransaction;
    owner: z.infer<typeof PublicContextSchema>;
  }>();
  constructor(
    readonly pool: DatabasePool,
    readonly publicationId: string,
    readonly canonicalOrigin: string,
    config: FinancingInquiryEncryptionConfiguration,
  ) {
    z.uuid().parse(publicationId);
    z.string()
      .regex(/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/u)
      .parse(canonicalOrigin);
    this.#crypto = encryption(config);
  }
  async #run<T>(
    work: (db: TenantTransaction, owner: z.infer<typeof PublicContextSchema>) => Promise<T>,
  ) {
    const active = this.#active.getStore();
    if (active) return work(active.db, active.owner);
    return safe(async () => {
      const owner = PublicContextSchema.parse(
        await executeCapability(this.pool, "publicContext", [
          this.publicationId,
          this.canonicalOrigin,
        ]),
      );
      return withTenantTransaction(
        serializablePool(this.pool, {
          publicationId: this.publicationId,
          canonicalOrigin: this.canonicalOrigin,
        }),
        { resolveTenantDatabaseContext: async () => owner },
        async (db) => {
          const current = PublicContextSchema.parse(
            await rows(db, "publicContext", [this.publicationId, this.canonicalOrigin]),
          );
          if (hash(current) !== hash(owner)) throw new FinancingReleaseError("INELIGIBLE", 422);
          // Source resolution during application capture reuses the same locked transaction,
          // avoiding a second connection that would wait on this transaction's release lock.
          const result = await this.#active.run({ db, owner }, () => work(db, owner));
          const after = PublicContextSchema.parse(
            await rows(db, "publicContext", [this.publicationId, this.canonicalOrigin]),
          );
          if (hash(after) !== hash(owner)) throw new FinancingReleaseError("INELIGIBLE", 422);
          return result;
        },
      );
    });
  }
  async findPublication() {
    return findPublicFinancingRelease(this.pool, this.publicationId, this.canonicalOrigin);
  }
  async resolveSource(campaignRef: string, versionRef: string, evidenceHash: string) {
    OpaqueReferenceSchema.parse(campaignRef);
    OpaqueReferenceSchema.parse(versionRef);
    Hash.parse(evidenceHash);
    return this.#run(async (db) =>
      FinancingReleaseResolvedSourceSchema.parse(
        await rows(db, "sourceRead", [campaignRef, versionRef, evidenceHash]),
      ),
    );
  }
  async transaction<T>(locationRef: string, work: (tx: FinancingReleaseTransaction) => Promise<T>) {
    return this.#run(async (db, owner) => {
      if (locationRef !== owner.locationRef) throw new FinancingReleaseError("NOT_FOUND", 404);
      const { check, recheck } = lockedEvidence(db, owner.locationRef, owner.releaseRef);
      const unavailable = async (): Promise<never> => {
        throw new FinancingReleaseError("INELIGIBLE", 422);
      };
      const tx: FinancingReleaseTransaction = {
        reserve: unavailable,
        save: unavailable,
        complete: unavailable,
        load: async (ref) => {
          if (ref !== owner.releaseRef) throw new FinancingReleaseError("NOT_FOUND", 404);
          return rows(db, "load", [ref]);
        },
        assertEvidenceCurrent: async (snapshot, now) => {
          z.iso.datetime({ offset: true }).parse(now);
          await check(snapshot);
        },
        capture: (input) => captureEncrypted(db, this.#crypto, input, check),
      };
      const result = await work(tx);
      await recheck();
      return result;
    });
  }
}
