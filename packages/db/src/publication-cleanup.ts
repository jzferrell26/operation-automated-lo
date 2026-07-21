import type { PublicationCleanupIntent, PublicationCleanupLease } from "@oalo/contracts";

import { defineSqlContract, type DatabasePool } from "./sql-contract.js";
import {
  withTenantTransaction,
  type TenantDatabaseContext,
  type TenantTransaction,
} from "./transaction-context.js";

export interface DatabasePublicationCleanupReconciliationPort {
  enqueue(
    intent: PublicationCleanupIntent,
  ): Promise<"enqueued" | "already_pending" | "already_completed" | "already_dead_lettered">;
  claimAvailable(input: {
    readonly leaseOwner: string;
    readonly limit: number;
    readonly leaseUntil: string;
  }): Promise<readonly PublicationCleanupLease[]>;
  complete(input: {
    readonly idempotencyKey: string;
    readonly leaseOwner: string;
    readonly quarantinedKeys: readonly string[];
  }): Promise<void>;
  releaseAfterFailure(input: {
    readonly availableAt: string;
    readonly idempotencyKey: string;
    readonly leaseOwner: string;
    readonly problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED";
  }): Promise<"pending" | "dead_lettered">;
}

export interface PublicationCleanupDatabaseContextResolver {
  resolvePublicationCleanupDatabaseContext(): Promise<unknown>;
}

export interface ResolvedPublicationCleanupDatabaseContext extends TenantDatabaseContext {
  readonly authorityState: "active";
  readonly locationRef: string;
}

export class PublicationCleanupPersistenceError extends Error {
  readonly code:
    | "PUBLICATION_CLEANUP_CONTEXT_INVALID"
    | "PUBLICATION_CLEANUP_CONTEXT_REVOKED"
    | "PUBLICATION_CLEANUP_INPUT_INVALID"
    | "PUBLICATION_CLEANUP_NOT_ACTIVE"
    | "PUBLICATION_CLEANUP_RESULT_INVALID";

  constructor(code: PublicationCleanupPersistenceError["code"], message: string) {
    super(message);
    this.name = "PublicationCleanupPersistenceError";
    this.code = code;
  }
}

interface EnqueueRow {
  readonly result: "enqueued" | "already_pending" | "already_completed" | "already_dead_lettered";
}

interface MutationRow {
  readonly affected: boolean;
}

interface ReleaseRow {
  readonly status: "pending" | "dead_lettered";
}

const enqueueContract = defineSqlContract<EnqueueRow>({
  name: "integration.enqueue-publication-cleanup.v1",
  access: "write",
  text: `
select integration.enqueue_publication_cleanup_v1(($1::text)::jsonb) as result
  `.trim(),
  decode(row: unknown): EnqueueRow {
    const record = resultRecord(row);
    if (
      (record.result !== "enqueued" &&
        record.result !== "already_pending" &&
        record.result !== "already_completed" &&
        record.result !== "already_dead_lettered") ||
      Object.keys(record).length !== 1
    ) {
      throw invalidResult("Publication cleanup enqueue result is invalid");
    }
    return Object.freeze({ result: record.result });
  },
});

const claimAvailableContract = defineSqlContract<PublicationCleanupLease>({
  name: "integration.claim-publication-cleanup.v1",
  access: "write",
  text: `
select *
from integration.claim_publication_cleanup_batch_v1($1::text, $2::integer, $3::timestamptz)
  `.trim(),
  decode: decodeLease,
});

const completeContract = mutationContract(
  "integration.complete-publication-cleanup.v1",
  `select integration.complete_publication_cleanup_v1(
  $1::text, $2::text, ($3::text)::jsonb
) as affected`,
);

const releaseAfterFailureContract = defineSqlContract<ReleaseRow>({
  name: "integration.release-publication-cleanup.v1",
  access: "write",
  text: `select integration.release_publication_cleanup_after_failure_v1(
  $1::text, $2::text, $3::text, $4::timestamptz
) as status`,
  decode(row: unknown): ReleaseRow {
    const record = resultRecord(row);
    if (
      (record.status !== "pending" && record.status !== "dead_lettered") ||
      Object.keys(record).length !== 1
    ) {
      throw invalidResult("Publication cleanup release result is invalid");
    }
    return Object.freeze({ status: record.status });
  },
});

export class PostgresPublicationCleanupReconciliationPort implements DatabasePublicationCleanupReconciliationPort {
  readonly #pool: DatabasePool;
  readonly #resolver: PublicationCleanupDatabaseContextResolver;

  constructor(pool: DatabasePool, resolver: PublicationCleanupDatabaseContextResolver) {
    this.#pool = pool;
    this.#resolver = resolver;
  }

  async enqueue(
    untrustedIntent: PublicationCleanupIntent,
  ): Promise<"enqueued" | "already_pending" | "already_completed" | "already_dead_lettered"> {
    const intent = validateIntent(untrustedIntent);
    return this.#run(async (transaction) => {
      const rows = await transaction.write(enqueueContract, [JSON.stringify(intent)]);
      if (rows.length !== 1 || rows[0] === undefined) {
        throw invalidResult("Publication cleanup enqueue was not confirmed");
      }
      return rows[0].result;
    });
  }

  async claimAvailable(untrustedInput: {
    readonly leaseOwner: string;
    readonly limit: number;
    readonly leaseUntil: string;
  }): Promise<readonly PublicationCleanupLease[]> {
    const input = validateClaimInput(untrustedInput);
    return this.#run(async (transaction) =>
      transaction.write(claimAvailableContract, [
        input.leaseOwner,
        input.limit,
        new Date(input.leaseUntil),
      ]),
    );
  }

  async complete(untrustedInput: {
    readonly idempotencyKey: string;
    readonly leaseOwner: string;
    readonly quarantinedKeys: readonly string[];
  }): Promise<void> {
    const idempotencyKey = validSha256(untrustedInput.idempotencyKey, "idempotency key");
    const leaseOwner = validLeaseOwner(untrustedInput.leaseOwner);
    const quarantinedKeys = validKeys(untrustedInput.quarantinedKeys, "quarantined keys");
    await this.#mutate(completeContract, [
      idempotencyKey,
      leaseOwner,
      JSON.stringify(quarantinedKeys),
    ]);
  }

  async releaseAfterFailure(untrustedInput: {
    readonly availableAt: string;
    readonly idempotencyKey: string;
    readonly leaseOwner: string;
    readonly problemCode: "PUBLICATION_QUARANTINE_RETRY_FAILED";
  }): Promise<"pending" | "dead_lettered"> {
    if (untrustedInput.problemCode !== "PUBLICATION_QUARANTINE_RETRY_FAILED") {
      throw invalidInput("Publication cleanup retry problem code is invalid");
    }
    const availableAt = validFutureTimestamp(untrustedInput.availableAt);
    return this.#run(async (transaction) => {
      const rows = await transaction.write(releaseAfterFailureContract, [
        validSha256(untrustedInput.idempotencyKey, "idempotency key"),
        validLeaseOwner(untrustedInput.leaseOwner),
        untrustedInput.problemCode,
        new Date(availableAt),
      ]);
      if (rows.length !== 1 || rows[0] === undefined) {
        throw invalidResult("Publication cleanup release was not confirmed");
      }
      return rows[0].status;
    });
  }

  async #mutate(
    contract: ReturnType<typeof mutationContract>,
    values: readonly string[],
  ): Promise<void> {
    await this.#run(async (transaction) => {
      const rows = await transaction.write(contract, values);
      if (rows.length !== 1 || rows[0]?.affected !== true) {
        throw new PublicationCleanupPersistenceError(
          "PUBLICATION_CLEANUP_NOT_ACTIVE",
          "Publication cleanup intent is not actively leased by this tenant",
        );
      }
    });
  }

  async #run<Result>(work: (transaction: TenantTransaction) => Promise<Result>): Promise<Result> {
    const context = await resolveContext(this.#resolver);
    return withTenantTransaction(
      this.#pool,
      { resolveTenantDatabaseContext: async () => context },
      work,
    );
  }
}

export function createPostgresPublicationCleanupReconciliationPort(
  pool: DatabasePool,
  resolver: PublicationCleanupDatabaseContextResolver,
): PostgresPublicationCleanupReconciliationPort {
  return new PostgresPublicationCleanupReconciliationPort(pool, resolver);
}

function mutationContract(name: string, text: string) {
  return defineSqlContract<MutationRow>({
    name,
    access: "write",
    text,
    decode(row: unknown): MutationRow {
      const record = resultRecord(row);
      if (typeof record.affected !== "boolean" || Object.keys(record).length !== 1) {
        throw invalidResult("Publication cleanup mutation result is invalid");
      }
      return Object.freeze({ affected: record.affected });
    },
  });
}

function validateIntent(untrusted: PublicationCleanupIntent): PublicationCleanupIntent {
  if (
    typeof untrusted !== "object" ||
    untrusted === null ||
    Object.keys(untrusted).toSorted().join(",") !==
      "attemptedKeys,campaignVersionRef,idempotencyKey,locationRef,maximumAttempts,problemCode,publicBucket,publicCampaignId,publishedVersion" ||
    typeof untrusted.locationRef !== "string" ||
    !/^[A-Za-z0-9_-]{8,128}$/u.test(untrusted.locationRef) ||
    typeof untrusted.publicBucket !== "string" ||
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(untrusted.publicBucket) ||
    typeof untrusted.publicCampaignId !== "string" ||
    !/^[A-Za-z0-9_-]{8,128}$/u.test(untrusted.publicCampaignId) ||
    typeof untrusted.campaignVersionRef !== "string" ||
    untrusted.campaignVersionRef.length < 8 ||
    untrusted.campaignVersionRef.length > 128 ||
    !Number.isSafeInteger(untrusted.publishedVersion) ||
    untrusted.publishedVersion <= 0 ||
    !Number.isSafeInteger(untrusted.maximumAttempts) ||
    untrusted.maximumAttempts < 1 ||
    untrusted.maximumAttempts > 20 ||
    untrusted.problemCode !== "PUBLICATION_PARTIAL_FAILURE"
  ) {
    throw invalidInput("Publication cleanup intent is invalid");
  }
  return Object.freeze({
    attemptedKeys: validKeys(untrusted.attemptedKeys, "attempted keys"),
    campaignVersionRef: untrusted.campaignVersionRef,
    idempotencyKey: validSha256(untrusted.idempotencyKey, "idempotency key"),
    locationRef: untrusted.locationRef,
    maximumAttempts: untrusted.maximumAttempts,
    problemCode: "PUBLICATION_PARTIAL_FAILURE",
    publicBucket: untrusted.publicBucket,
    publicCampaignId: untrusted.publicCampaignId,
    publishedVersion: untrusted.publishedVersion,
  });
}

function validateClaimInput(input: {
  readonly leaseOwner: string;
  readonly limit: number;
  readonly leaseUntil: string;
}): Readonly<{ leaseOwner: string; limit: number; leaseUntil: string }> {
  const parsedLeaseUntil = new Date(input.leaseUntil);
  if (
    typeof input.leaseOwner !== "string" ||
    input.leaseOwner.length < 1 ||
    input.leaseOwner.length > 200 ||
    !Number.isSafeInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 100 ||
    Number.isNaN(parsedLeaseUntil.getTime()) ||
    parsedLeaseUntil.getTime() <= Date.now()
  ) {
    throw invalidInput("Publication cleanup lease request is invalid");
  }
  return Object.freeze({
    leaseOwner: input.leaseOwner,
    leaseUntil: parsedLeaseUntil.toISOString(),
    limit: input.limit,
  });
}

async function resolveContext(
  resolver: PublicationCleanupDatabaseContextResolver,
): Promise<ResolvedPublicationCleanupDatabaseContext> {
  const untrusted = await resolver.resolvePublicationCleanupDatabaseContext();
  if (typeof untrusted !== "object" || untrusted === null || Array.isArray(untrusted)) {
    throw new PublicationCleanupPersistenceError(
      "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      "Publication cleanup database context is invalid",
    );
  }
  const candidate = untrusted as Readonly<Record<string, unknown>>;
  if (
    Object.keys(candidate).toSorted().join(",") !==
      "actorId,authorityState,correlationId,locationId,locationRef" ||
    typeof candidate.actorId !== "string" ||
    typeof candidate.correlationId !== "string" ||
    typeof candidate.locationId !== "string" ||
    typeof candidate.locationRef !== "string" ||
    !/^[A-Za-z0-9_-]{8,128}$/u.test(candidate.locationRef)
  ) {
    throw new PublicationCleanupPersistenceError(
      "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      "Publication cleanup database context fields are invalid",
    );
  }
  if (candidate.authorityState === "revoked") {
    throw new PublicationCleanupPersistenceError(
      "PUBLICATION_CLEANUP_CONTEXT_REVOKED",
      "Publication cleanup database authority has been revoked",
    );
  }
  if (candidate.authorityState !== "active") {
    throw new PublicationCleanupPersistenceError(
      "PUBLICATION_CLEANUP_CONTEXT_INVALID",
      "Publication cleanup database authority state is invalid",
    );
  }
  return Object.freeze({
    actorId: candidate.actorId,
    authorityState: "active",
    correlationId: candidate.correlationId,
    locationId: candidate.locationId,
    locationRef: candidate.locationRef,
  });
}

function decodeLease(row: unknown): PublicationCleanupLease {
  const record = resultRecord(row);
  const expectedKeys = [
    "attempt_count",
    "attempted_keys",
    "campaign_version_ref",
    "idempotency_key",
    "lease_owner",
    "lease_until",
    "location_ref",
    "maximum_attempts",
    "problem_code",
    "public_bucket",
    "public_campaign_id",
    "published_version",
  ] as const;
  const actualKeys = Object.keys(record).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index]) ||
    typeof record.public_bucket !== "string" ||
    typeof record.location_ref !== "string" ||
    typeof record.public_campaign_id !== "string" ||
    typeof record.campaign_version_ref !== "string" ||
    typeof record.published_version !== "number" ||
    !Array.isArray(record.attempted_keys) ||
    typeof record.idempotency_key !== "string" ||
    record.problem_code !== "PUBLICATION_PARTIAL_FAILURE" ||
    typeof record.attempt_count !== "number" ||
    !Number.isSafeInteger(record.attempt_count) ||
    record.attempt_count < 1 ||
    typeof record.maximum_attempts !== "number" ||
    !Number.isSafeInteger(record.maximum_attempts) ||
    record.maximum_attempts < 1 ||
    record.maximum_attempts > 20 ||
    typeof record.lease_owner !== "string"
  ) {
    throw invalidResult("Publication cleanup lease result is invalid");
  }
  const leaseUntil = databaseTimestamp(record.lease_until);
  return Object.freeze({
    attemptCount: record.attempt_count,
    attemptedKeys: validKeys(record.attempted_keys, "attempted keys"),
    campaignVersionRef: record.campaign_version_ref,
    idempotencyKey: record.idempotency_key,
    leaseOwner: record.lease_owner,
    leaseUntil,
    locationRef: record.location_ref,
    maximumAttempts: record.maximum_attempts,
    problemCode: "PUBLICATION_PARTIAL_FAILURE",
    publicBucket: record.public_bucket,
    publicCampaignId: record.public_campaign_id,
    publishedVersion: record.published_version,
  });
}

function databaseTimestamp(value: unknown): string {
  const parsed = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime())) {
    throw invalidResult("Publication cleanup lease timestamp is invalid");
  }
  return parsed.toISOString();
}

function validKeys(value: readonly unknown[], label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 100 ||
    value.some((key) => typeof key !== "string" || key.length < 1 || key.length > 1_024)
  ) {
    throw invalidInput(`Publication cleanup ${label} are invalid`);
  }
  return Object.freeze([...value]) as readonly string[];
}

function validSha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/u.test(value)) {
    throw invalidInput(`Publication cleanup ${label} is invalid`);
  }
  return value;
}

function validLeaseOwner(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 200) {
    throw invalidInput("Publication cleanup lease owner is invalid");
  }
  return value;
}

function validFutureTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw invalidInput("Publication cleanup retry timestamp is invalid");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidInput("Publication cleanup retry timestamp is invalid");
  }
  return parsed.toISOString();
}

function resultRecord(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw invalidResult("Publication cleanup database result must be an object");
  }
  return row as Readonly<Record<string, unknown>>;
}

function invalidInput(message: string): PublicationCleanupPersistenceError {
  return new PublicationCleanupPersistenceError("PUBLICATION_CLEANUP_INPUT_INVALID", message);
}

function invalidResult(message: string): PublicationCleanupPersistenceError {
  return new PublicationCleanupPersistenceError("PUBLICATION_CLEANUP_RESULT_INVALID", message);
}
