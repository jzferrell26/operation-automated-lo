import { createHash } from "node:crypto";

import {
  ApprovalDecisionSchema,
  CampaignVersionSchema,
  PreflightResultSchema,
  type ApprovalDecision,
  type CampaignVersion,
  type PreflightResult,
} from "@oalo/contracts";
import type { CampaignVersionRepository, CampaignVersionTransaction } from "@oalo/application";

import {
  defineSqlContract,
  type DatabasePool,
  type SqlContract,
  type SqlScalar,
} from "./sql-contract.js";
import {
  withTenantTransaction,
  type TenantContextAuthority,
  type TenantTransaction,
} from "./transaction-context.js";

export class CampaignPersistenceError extends Error {
  readonly code:
    | "CAMPAIGN_MANIFEST_HASH_MISMATCH"
    | "CAMPAIGN_VERSION_CONFLICT"
    | "CAMPAIGN_PREFLIGHT_MISMATCH"
    | "CAMPAIGN_ROW_INVALID";

  constructor(code: CampaignPersistenceError["code"], message: string) {
    super(message);
    this.name = "CampaignPersistenceError";
    this.code = code;
  }
}

interface CampaignIdRow {
  readonly campaignId: string;
}

interface VersionNoRow {
  readonly versionNo: number;
}

interface AffectedRow {
  readonly affected: boolean;
}

interface CampaignVersionRow {
  readonly location_ref: string;
  readonly campaign_ref: string;
  readonly campaign_version_ref: string;
  readonly version_no: unknown;
  readonly source_campaign_ref: string | null;
  readonly input_versions: unknown;
  readonly manifest: unknown;
  readonly manifest_hash: string;
  readonly created_by_actor_ref: string;
  readonly created_at: unknown;
}

interface PreflightRow {
  readonly campaign_ref: string;
  readonly campaign_version_ref: string;
  readonly manifest_hash: string;
  readonly input_versions: unknown;
  readonly ruleset_version_ref: string;
  readonly findings: unknown;
  readonly blocking: boolean;
  readonly result_hash: string;
  readonly evaluated_at: unknown;
}

interface ApprovalRow {
  readonly approval_ref: string;
  readonly location_ref: string;
  readonly campaign_ref: string;
  readonly campaign_version_ref: string;
  readonly manifest_hash: string;
  readonly preflight_result_hash: string;
  readonly actor_ref: string;
  readonly actor_kind: string;
  readonly actor_role: string;
  readonly decided_at: unknown;
  readonly ip_audit_hash: string;
  readonly decision: string;
  readonly snapshot: unknown;
}

const lockCampaignContract = defineSqlContract<CampaignIdRow>({
  name: "campaign.lock-aggregate.v1",
  access: "write",
  text: `
insert into campaign.campaigns (
  location_id,
  campaign_ref,
  created_by_actor_id,
  status
) values (
  platform.current_location_id(),
  $1::text,
  platform.current_actor_id(),
  'draft'
)
on conflict (location_id, campaign_ref) where campaign_ref is not null
do update set updated_at = campaign.campaigns.updated_at
returning id::text as campaign_id
  `.trim(),
  decode: decodeCampaignId,
});

const latestVersionNoContract = defineSqlContract<VersionNoRow>({
  name: "campaign.latest-version-no.v1",
  access: "read",
  text: `
select coalesce(pg_catalog.max(version.version_no), 0)::integer as version_no
from campaign.campaign_versions as version
where version.location_id = platform.current_location_id()
  and version.campaign_ref = $1::text
  `.trim(),
  decode: decodeVersionNo,
});

const selectVersionContract = defineSqlContract<CampaignVersion>({
  name: "campaign.select-version.v1",
  access: "read",
  text: `
select
  version.location_ref,
  version.campaign_ref,
  version.campaign_version_ref,
  version.version_no,
  version.source_campaign_ref,
  version.input_versions,
  version.manifest,
  version.manifest_hash,
  version.created_by_actor_ref,
  version.created_at
from campaign.campaign_versions as version
where version.location_id = platform.current_location_id()
  and version.campaign_version_ref = $1::text
  `.trim(),
  decode: decodeCampaignVersionRow,
});

const insertVersionContract = defineSqlContract<AffectedRow>({
  name: "campaign.insert-version.v1",
  access: "write",
  text: `
insert into campaign.campaign_versions (
  location_id,
  campaign_id,
  campaign_ref,
  campaign_version_ref,
  version_no,
  source_campaign_ref,
  location_ref,
  input_versions,
  manifest,
  manifest_hash,
  created_by_actor_id,
  created_by_actor_ref,
  created_at
)
select
  platform.current_location_id(),
  campaign_row.id,
  $1::text,
  $2::text,
  $3::integer,
  $4::text,
  $5::text,
  $6::text::jsonb,
  $7::text::jsonb,
  $8::text,
  platform.current_actor_id(),
  $9::text,
  $10::timestamptz
from campaign.campaigns as campaign_row
where campaign_row.location_id = platform.current_location_id()
  and campaign_row.campaign_ref = $1::text
on conflict (location_id, campaign_version_ref) do nothing
returning true as affected
  `.trim(),
  decode: decodeAffected,
});

const insertPreflightContract = defineSqlContract<AffectedRow>({
  name: "campaign.insert-preflight.v1",
  access: "write",
  text: `
insert into campaign.preflight_results (
  location_id,
  campaign_id,
  campaign_version_id,
  campaign_ref,
  campaign_version_ref,
  manifest_hash,
  result_hash,
  ruleset_version_ref,
  blocking,
  findings,
  input_versions,
  evaluated_at
)
select
  platform.current_location_id(),
  version.campaign_id,
  version.id,
  version.campaign_ref,
  version.campaign_version_ref,
  version.manifest_hash,
  $4::text,
  $5::text,
  $6::boolean,
  $7::text::jsonb,
  $8::text::jsonb,
  $9::timestamptz
from campaign.campaign_versions as version
where version.location_id = platform.current_location_id()
  and version.campaign_ref = $1::text
  and version.campaign_version_ref = $2::text
  and version.manifest_hash = $3::text
on conflict (location_id, campaign_version_id, result_hash) do nothing
returning true as affected
  `.trim(),
  decode: decodeAffected,
});

const updateCampaignStatusContract = defineSqlContract<AffectedRow>({
  name: "campaign.update-status-from-preflight.v1",
  access: "write",
  text: `
update campaign.campaigns as campaign_row
   set status = $2::text,
       row_version = campaign_row.row_version + 1,
       updated_at = pg_catalog.statement_timestamp()
 where campaign_row.location_id = platform.current_location_id()
   and campaign_row.campaign_ref = $1::text
returning true as affected
  `.trim(),
  decode: decodeAffected,
});

const selectPreflightContract = defineSqlContract<PreflightResult>({
  name: "campaign.select-preflight.v1",
  access: "read",
  text: `
select
  result.campaign_ref,
  result.campaign_version_ref,
  result.manifest_hash,
  result.input_versions,
  result.ruleset_version_ref,
  result.findings,
  result.blocking,
  result.result_hash,
  result.evaluated_at
from campaign.preflight_results as result
where result.location_id = platform.current_location_id()
  and result.campaign_version_ref = $1::text
  and result.result_hash = $2::text
  `.trim(),
  decode: decodePreflightRow,
});

const insertApprovalContract = defineSqlContract<AffectedRow>({
  name: "campaign.insert-approval.v1",
  access: "write",
  text: `
insert into campaign.approval_decisions (
  location_id,
  campaign_id,
  campaign_version_id,
  approval_ref,
  location_ref,
  campaign_ref,
  campaign_version_ref,
  manifest_hash,
  preflight_result_hash,
  actor_id,
  actor_ref,
  actor_kind,
  actor_role,
  decided_at,
  ip_audit_hash,
  decision,
  snapshot
)
select
  platform.current_location_id(),
  version.campaign_id,
  version.id,
  $1::text,
  $2::text,
  version.campaign_ref,
  version.campaign_version_ref,
  version.manifest_hash,
  $3::text,
  platform.current_actor_id(),
  $4::text,
  'human',
  $5::text,
  $6::timestamptz,
  $7::text,
  $8::text,
  $9::text::jsonb
from campaign.campaign_versions as version
where version.location_id = platform.current_location_id()
  and version.campaign_ref = $10::text
  and version.campaign_version_ref = $11::text
  and version.manifest_hash = $12::text
on conflict (location_id, approval_ref) do nothing
returning true as affected
  `.trim(),
  decode: decodeAffected,
});

const selectApprovalContract = defineSqlContract<ApprovalDecision>({
  name: "campaign.select-approval.v1",
  access: "read",
  text: `
select
  decision.approval_ref,
  decision.location_ref,
  decision.campaign_ref,
  decision.campaign_version_ref,
  decision.manifest_hash,
  decision.preflight_result_hash,
  decision.actor_ref,
  decision.actor_kind,
  decision.actor_role,
  decision.decided_at,
  decision.ip_audit_hash,
  decision.decision,
  decision.snapshot
from campaign.approval_decisions as decision
where decision.location_id = platform.current_location_id()
  and decision.approval_ref = $1::text
  `.trim(),
  decode: decodeApprovalRow,
});

export class PostgresCampaignVersionRepository implements CampaignVersionRepository {
  readonly #pool: DatabasePool;
  readonly #authority: TenantContextAuthority;

  constructor(pool: DatabasePool, authority: TenantContextAuthority) {
    this.#pool = pool;
    this.#authority = authority;
  }

  async run<T>(work: (transaction: CampaignVersionTransaction) => Promise<T>): Promise<T> {
    return withTenantTransaction(this.#pool, this.#authority, async (transaction) =>
      work(createCampaignVersionTransaction(transaction)),
    );
  }

  async persistPreflight(result: PreflightResult): Promise<PreflightResult> {
    const parsed = PreflightResultSchema.parse(result);
    return withTenantTransaction(this.#pool, this.#authority, async (transaction) => {
      const inserted = await writeOne(transaction, insertPreflightContract, [
        parsed.campaignRef,
        parsed.campaignVersionRef,
        parsed.manifestHash,
        parsed.resultHash,
        parsed.rulesetVersionRef,
        parsed.blocking,
        jsonText(parsed.findings),
        jsonText(parsed.inputVersions),
        parsed.evaluatedAt,
      ]);
      if (!inserted) {
        const existing = await readOptional(transaction, selectPreflightContract, [
          parsed.campaignVersionRef,
          parsed.resultHash,
        ]);
        if (existing) return existing;
        throw new CampaignPersistenceError(
          "CAMPAIGN_PREFLIGHT_MISMATCH",
          "Preflight persistence requires a matching campaign version and manifest hash",
        );
      }
      const status = parsed.blocking ? "preflight_failed" : "awaiting_approval";
      const updated = await writeOne(transaction, updateCampaignStatusContract, [
        parsed.campaignRef,
        status,
      ]);
      if (!updated) {
        throw new CampaignPersistenceError(
          "CAMPAIGN_PREFLIGHT_MISMATCH",
          "Preflight persistence could not update the campaign aggregate status",
        );
      }
      return parsed;
    });
  }

  async persistApprovalDecision(decision: ApprovalDecision): Promise<ApprovalDecision> {
    const parsed = ApprovalDecisionSchema.parse(decision);
    return withTenantTransaction(this.#pool, this.#authority, async (transaction) => {
      const inserted = await writeOne(transaction, insertApprovalContract, [
        parsed.approvalRef,
        parsed.locationRef,
        parsed.preflightResultHash,
        parsed.actorRef,
        parsed.actorRole,
        parsed.decidedAt,
        parsed.ipAuditHash,
        parsed.decision,
        jsonText(parsed.snapshot),
        parsed.campaignRef,
        parsed.campaignVersionRef,
        parsed.manifestHash,
      ]);
      if (!inserted) {
        const existing = await readOptional(transaction, selectApprovalContract, [
          parsed.approvalRef,
        ]);
        if (existing) return existing;
        throw new CampaignPersistenceError(
          "CAMPAIGN_PREFLIGHT_MISMATCH",
          "Approval persistence requires a matching campaign version and manifest hash",
        );
      }
      return parsed;
    });
  }

  async getVersion(campaignVersionRef: string): Promise<CampaignVersion | undefined> {
    return withTenantTransaction(this.#pool, this.#authority, async (transaction) =>
      readOptional(transaction, selectVersionContract, [campaignVersionRef]),
    );
  }

  async getPreflight(
    campaignVersionRef: string,
    resultHash: string,
  ): Promise<PreflightResult | undefined> {
    return withTenantTransaction(this.#pool, this.#authority, async (transaction) =>
      readOptional(transaction, selectPreflightContract, [campaignVersionRef, resultHash]),
    );
  }
}

export function createPostgresCampaignVersionRepository(
  pool: DatabasePool,
  authority: TenantContextAuthority,
): PostgresCampaignVersionRepository {
  return new PostgresCampaignVersionRepository(pool, authority);
}

function createCampaignVersionTransaction(
  transaction: TenantTransaction,
): CampaignVersionTransaction {
  return {
    async getByCampaignVersionRef(_locationRef, campaignVersionRef) {
      return readOptional(transaction, selectVersionContract, [campaignVersionRef]);
    },
    async getLatestVersionNo(_locationRef, campaignRef) {
      await writeExpected(transaction, lockCampaignContract, [campaignRef]);
      const rows = await transaction.read(latestVersionNoContract, [campaignRef]);
      return rows[0]?.versionNo ?? 0;
    },
    async append(version) {
      const parsed = CampaignVersionSchema.parse(version);
      const expectedHash = canonicalHash(parsed.manifest);
      if (expectedHash !== parsed.manifestHash) {
        throw new CampaignPersistenceError(
          "CAMPAIGN_MANIFEST_HASH_MISMATCH",
          "Stored campaign manifest hash does not match the canonical manifest hash",
        );
      }
      await writeExpected(transaction, lockCampaignContract, [parsed.campaignRef]);
      const inserted = await writeOne(transaction, insertVersionContract, [
        parsed.campaignRef,
        parsed.campaignVersionRef,
        parsed.versionNo,
        parsed.sourceCampaignRef ?? null,
        parsed.locationRef,
        jsonText(parsed.inputVersions),
        jsonText(parsed.manifest),
        parsed.manifestHash,
        parsed.createdBy,
        parsed.createdAt,
      ]);
      if (inserted) return;
      const existing = await readOptional(transaction, selectVersionContract, [
        parsed.campaignVersionRef,
      ]);
      if (existing && existing.manifestHash === parsed.manifestHash) return;
      throw new CampaignPersistenceError(
        "CAMPAIGN_VERSION_CONFLICT",
        "Campaign version reference already exists with different immutable content",
      );
    },
  };
}

async function writeExpected<Row>(
  transaction: TenantTransaction,
  contract: SqlContract<Row>,
  values: readonly SqlScalar[],
): Promise<Row> {
  const rows = await transaction.write(contract, values);
  const row = rows[0];
  if (!row) {
    throw new CampaignPersistenceError(
      "CAMPAIGN_ROW_INVALID",
      `SQL contract ${contract.name} returned no row`,
    );
  }
  return row;
}

async function writeOne<Row extends { readonly affected: boolean }>(
  transaction: TenantTransaction,
  contract: SqlContract<Row>,
  values: readonly SqlScalar[],
): Promise<boolean> {
  const rows = await transaction.write(contract, values);
  return rows[0]?.affected === true;
}

async function readOptional<Row>(
  transaction: TenantTransaction,
  contract: SqlContract<Row>,
  values: readonly SqlScalar[],
): Promise<Row | undefined> {
  const rows = await transaction.read(contract, values);
  return rows[0];
}

function decodeCampaignId(row: unknown): CampaignIdRow {
  const record = recordRow(row);
  const campaignId = requiredString(record.campaign_id, "campaign_id");
  return Object.freeze({ campaignId });
}

function decodeVersionNo(row: unknown): VersionNoRow {
  const record = recordRow(row);
  return Object.freeze({ versionNo: requiredInteger(record.version_no, "version_no") });
}

function decodeAffected(row: unknown): AffectedRow {
  const record = recordRow(row);
  if (record.affected !== true) {
    throw new CampaignPersistenceError("CAMPAIGN_ROW_INVALID", "Write result must be true");
  }
  return Object.freeze({ affected: true });
}

function decodeCampaignVersionRow(row: unknown): CampaignVersion {
  const record = recordRow(row) as CampaignVersionRow & Readonly<Record<string, unknown>>;
  return CampaignVersionSchema.parse({
    schemaVersion: 1,
    locationRef: requiredString(record.location_ref, "location_ref"),
    campaignRef: requiredString(record.campaign_ref, "campaign_ref"),
    campaignVersionRef: requiredString(record.campaign_version_ref, "campaign_version_ref"),
    versionNo: requiredInteger(record.version_no, "version_no", 1),
    ...(record.source_campaign_ref
      ? { sourceCampaignRef: requiredString(record.source_campaign_ref, "source_campaign_ref") }
      : {}),
    inputVersions: record.input_versions,
    manifest: record.manifest,
    manifestHash: requiredString(record.manifest_hash, "manifest_hash"),
    createdBy: requiredString(record.created_by_actor_ref, "created_by_actor_ref"),
    createdAt: isoDateTime(record.created_at),
  });
}

function decodePreflightRow(row: unknown): PreflightResult {
  const record = recordRow(row) as PreflightRow & Readonly<Record<string, unknown>>;
  return PreflightResultSchema.parse({
    schemaVersion: 1,
    campaignRef: requiredString(record.campaign_ref, "campaign_ref"),
    campaignVersionRef: requiredString(record.campaign_version_ref, "campaign_version_ref"),
    manifestHash: requiredString(record.manifest_hash, "manifest_hash"),
    inputVersions: record.input_versions,
    rulesetVersionRef: requiredString(record.ruleset_version_ref, "ruleset_version_ref"),
    findings: record.findings,
    blocking: record.blocking === true,
    resultHash: requiredString(record.result_hash, "result_hash"),
    evaluatedAt: isoDateTime(record.evaluated_at),
  });
}

function decodeApprovalRow(row: unknown): ApprovalDecision {
  const record = recordRow(row) as ApprovalRow & Readonly<Record<string, unknown>>;
  return ApprovalDecisionSchema.parse({
    schemaVersion: 1,
    approvalRef: requiredString(record.approval_ref, "approval_ref"),
    locationRef: requiredString(record.location_ref, "location_ref"),
    campaignRef: requiredString(record.campaign_ref, "campaign_ref"),
    campaignVersionRef: requiredString(record.campaign_version_ref, "campaign_version_ref"),
    manifestHash: requiredString(record.manifest_hash, "manifest_hash"),
    preflightResultHash: requiredString(record.preflight_result_hash, "preflight_result_hash"),
    actorRef: requiredString(record.actor_ref, "actor_ref"),
    actorKind: "human",
    actorRole: record.actor_role,
    decidedAt: isoDateTime(record.decided_at),
    ipAuditHash: requiredString(record.ip_audit_hash, "ip_audit_hash"),
    decision: record.decision,
    snapshot: record.snapshot,
  });
}

function canonicalHash(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
    .join(",")}}`;
}

function jsonText(value: unknown): string {
  return JSON.stringify(value);
}

function recordRow(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null) {
    throw new CampaignPersistenceError("CAMPAIGN_ROW_INVALID", "Database row must be an object");
  }
  return row as Readonly<Record<string, unknown>>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CampaignPersistenceError("CAMPAIGN_ROW_INVALID", `${field} must be non-empty text`);
  }
  return value;
}

function requiredInteger(value: unknown, field: string, minimum = 0): number {
  const parsed =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string" && /^-?[0-9]+$/u.test(value)
        ? Number(value)
        : value;
  if (!Number.isSafeInteger(parsed) || (parsed as number) < minimum) {
    throw new CampaignPersistenceError(
      "CAMPAIGN_ROW_INVALID",
      `${field} must be a safe integer greater than or equal to ${minimum}`,
    );
  }
  return parsed as number;
}

function isoDateTime(value: unknown): string {
  const parsed = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime())) {
    throw new CampaignPersistenceError("CAMPAIGN_ROW_INVALID", "Timestamp is invalid");
  }
  return parsed.toISOString();
}

export const campaignVersionContracts = Object.freeze({
  insertVersionContract,
  selectVersionContract,
  insertPreflightContract,
  selectPreflightContract,
  insertApprovalContract,
  selectApprovalContract,
});
