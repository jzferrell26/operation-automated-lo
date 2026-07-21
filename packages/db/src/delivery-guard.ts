import { DeliveryReferenceSchema, type DeliveryReference } from "@oalo/contracts";

import { defineSqlContract, type DatabasePool } from "./sql-contract.js";
import {
  withTenantTransaction,
  type TenantDatabaseContext,
  type TenantTransaction,
} from "./transaction-context.js";

interface DeliveryClaimResultRow {
  readonly acquired: boolean;
}

interface DeliveryMutationResultRow {
  readonly affected: boolean;
}

export interface DatabaseDeliveryGuardPort {
  claim(delivery: DeliveryReference): Promise<boolean>;
  complete(delivery: DeliveryReference): Promise<void>;
  release(delivery: DeliveryReference): Promise<void>;
  markCompletionUncertain(
    delivery: DeliveryReference,
    problemCode: "DELIVERY_COMPLETION_UNCERTAIN",
  ): Promise<void>;
}

export interface DeliveryDatabaseContextResolver {
  resolveDeliveryDatabaseContext(delivery: DeliveryReference): Promise<unknown>;
}

export interface ResolvedDeliveryDatabaseContext extends TenantDatabaseContext {
  readonly authorityState: "active";
  readonly locationRef: string;
}

export class DeliveryGuardContextError extends Error {
  readonly code:
    | "DELIVERY_CONTEXT_UNKNOWN"
    | "DELIVERY_CONTEXT_INVALID"
    | "DELIVERY_CONTEXT_MISMATCH"
    | "DELIVERY_CONTEXT_REVOKED";

  constructor(code: DeliveryGuardContextError["code"], message: string) {
    super(message);
    this.name = "DeliveryGuardContextError";
    this.code = code;
  }
}

export class DeliveryGuardPersistenceError extends Error {
  readonly code: "DELIVERY_CLAIM_NOT_ACTIVE";

  constructor(message: string) {
    super(message);
    this.name = "DeliveryGuardPersistenceError";
    this.code = "DELIVERY_CLAIM_NOT_ACTIVE";
  }
}

const claimDeliveryContract = defineSqlContract<DeliveryClaimResultRow>({
  name: "integration.claim-delivery.v1",
  access: "write",
  text: `
with existing as materialized (
  select
    claim.id,
    claim.external_delivery_id,
    claim.business_outcome_key,
    claim.status
  from integration.delivery_claims as claim
  where claim.location_id = platform.current_location_id()
    and claim.delivery_kind = $1::text
    and (
      claim.external_delivery_id = $2::text
      or claim.business_outcome_key = $3::text
    )
  order by claim.id
  for update
),
reclaimed as (
  update integration.delivery_claims as claim
     set status = 'claimed',
         claimed_at = pg_catalog.statement_timestamp(),
         completed_at = null,
         released_at = null
    from existing
   where claim.id = existing.id
     and existing.status = 'released'
     and existing.external_delivery_id = $2::text
     and existing.business_outcome_key = $3::text
     and (select pg_catalog.count(*) from existing) = 1
  returning true as acquired
),
inserted as (
  insert into integration.delivery_claims (
    location_id,
    delivery_kind,
    external_delivery_id,
    business_outcome_key
  )
  select platform.current_location_id(), $1::text, $2::text, $3::text
  where not exists (select 1 from existing)
  on conflict do nothing
  returning true as acquired
)
select coalesce(
  (select acquired from reclaimed limit 1),
  (select acquired from inserted limit 1),
  false
) as acquired
  `.trim(),
  decode: decodeClaimResult,
});

const completeDeliveryContract = mutationContract("integration.complete-delivery.v1", "completed");
const releaseDeliveryContract = mutationContract("integration.release-delivery.v1", "released");
const markCompletionUncertainContract = defineSqlContract<DeliveryMutationResultRow>({
  name: "integration.mark-delivery-completion-uncertain.v1",
  access: "write",
  text: `
select integration.mark_delivery_completion_uncertain_v1(
  $1::text,
  $2::text,
  $3::text,
  $4::text
) as affected
  `.trim(),
  decode: decodeMutationResult,
});

export class PostgresDeliveryGuard implements DatabaseDeliveryGuardPort {
  readonly #pool: DatabasePool;
  readonly #resolver: DeliveryDatabaseContextResolver;

  constructor(pool: DatabasePool, resolver: DeliveryDatabaseContextResolver) {
    this.#pool = pool;
    this.#resolver = resolver;
  }

  async claim(untrustedDelivery: unknown): Promise<boolean> {
    const delivery = DeliveryReferenceSchema.parse(untrustedDelivery);
    return this.#run(delivery, async (transaction) => {
      const rows = await transaction.write(claimDeliveryContract, values(delivery));
      if (rows.length !== 1) {
        throw new DeliveryGuardPersistenceError("Delivery claim did not return one result");
      }
      return rows[0]?.acquired === true;
    });
  }

  async complete(untrustedDelivery: unknown): Promise<void> {
    await this.#mutate(untrustedDelivery, completeDeliveryContract, "complete");
  }

  async release(untrustedDelivery: unknown): Promise<void> {
    await this.#mutate(untrustedDelivery, releaseDeliveryContract, "release");
  }

  async markCompletionUncertain(
    untrustedDelivery: unknown,
    problemCode: "DELIVERY_COMPLETION_UNCERTAIN",
  ): Promise<void> {
    if (problemCode !== "DELIVERY_COMPLETION_UNCERTAIN") {
      throw new DeliveryGuardPersistenceError("Delivery completion problem code is invalid");
    }
    const delivery = DeliveryReferenceSchema.parse(untrustedDelivery);
    await this.#run(delivery, async (transaction) => {
      const rows = await transaction.write(markCompletionUncertainContract, [
        ...values(delivery),
        problemCode,
      ]);
      if (rows.length !== 1 || rows[0]?.affected !== true) {
        throw new DeliveryGuardPersistenceError(
          "Cannot mark completion uncertain without an active matching claim",
        );
      }
    });
  }

  async #mutate(
    untrustedDelivery: unknown,
    contract: ReturnType<typeof mutationContract>,
    operation: "complete" | "release",
  ): Promise<void> {
    const delivery = DeliveryReferenceSchema.parse(untrustedDelivery);
    await this.#run(delivery, async (transaction) => {
      const rows = await transaction.write(contract, values(delivery));
      if (rows.length !== 1 || rows[0]?.affected !== true) {
        throw new DeliveryGuardPersistenceError(
          `Cannot ${operation} a delivery without an active matching claim`,
        );
      }
    });
  }

  async #run<Result>(
    delivery: DeliveryReference,
    work: (transaction: TenantTransaction) => Promise<Result>,
  ): Promise<Result> {
    const context = await resolveContext(this.#resolver, delivery);
    return withTenantTransaction(
      this.#pool,
      { resolveTenantDatabaseContext: async () => context },
      work,
    );
  }
}

export function createResolverAwarePostgresDeliveryGuard(
  pool: DatabasePool,
  resolver: DeliveryDatabaseContextResolver,
): PostgresDeliveryGuard {
  return new PostgresDeliveryGuard(pool, resolver);
}

async function resolveContext(
  resolver: DeliveryDatabaseContextResolver,
  delivery: DeliveryReference,
): Promise<ResolvedDeliveryDatabaseContext> {
  const untrusted = await resolver.resolveDeliveryDatabaseContext(delivery);
  if (untrusted === undefined || untrusted === null) {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_UNKNOWN",
      "Delivery database context could not be resolved",
    );
  }
  if (typeof untrusted !== "object" || Array.isArray(untrusted)) {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_INVALID",
      "Resolved delivery database context must be an object",
    );
  }
  const candidate = untrusted as Readonly<Record<string, unknown>>;
  const expectedKeys = [
    "actorId",
    "authorityState",
    "correlationId",
    "locationId",
    "locationRef",
  ] as const;
  const actualKeys = Object.keys(candidate).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_INVALID",
      "Resolved delivery database context has invalid fields",
    );
  }
  if (candidate.authorityState === "revoked") {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_REVOKED",
      "Delivery database authority has been revoked",
    );
  }
  if (candidate.authorityState !== "active") {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_INVALID",
      "Resolved delivery database authority state is invalid",
    );
  }
  if (
    candidate.locationRef !== delivery.locationRef ||
    candidate.correlationId !== delivery.correlationId
  ) {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_MISMATCH",
      "Resolved delivery context does not match the delivery reference",
    );
  }
  if (
    typeof candidate.locationId !== "string" ||
    typeof candidate.actorId !== "string" ||
    typeof candidate.correlationId !== "string" ||
    typeof candidate.locationRef !== "string"
  ) {
    throw new DeliveryGuardContextError(
      "DELIVERY_CONTEXT_INVALID",
      "Resolved delivery database context values are invalid",
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

function mutationContract(name: string, status: "completed" | "released") {
  const timestampColumn = status === "completed" ? "completed_at" : "released_at";
  return defineSqlContract<DeliveryMutationResultRow>({
    name,
    access: "write",
    text: `
with changed as (
  update integration.delivery_claims as claim
     set status = '${status}',
         ${timestampColumn} = pg_catalog.statement_timestamp()
   where claim.location_id = platform.current_location_id()
     and claim.delivery_kind = $1::text
     and claim.external_delivery_id = $2::text
     and claim.business_outcome_key = $3::text
     and claim.status = 'claimed'
  returning true as affected
)
select exists(select 1 from changed) as affected
    `.trim(),
    decode: decodeMutationResult,
  });
}

function values(delivery: DeliveryReference): readonly [string, string, string] {
  return [delivery.deliveryKind, delivery.deliveryRef, delivery.businessOutcomeKey];
}

function decodeClaimResult(row: unknown): DeliveryClaimResultRow {
  const record = resultRecord(row);
  if (typeof record.acquired !== "boolean" || Object.keys(record).length !== 1) {
    throw new DeliveryGuardPersistenceError("Delivery claim result is invalid");
  }
  return Object.freeze({ acquired: record.acquired });
}

function decodeMutationResult(row: unknown): DeliveryMutationResultRow {
  const record = resultRecord(row);
  if (typeof record.affected !== "boolean" || Object.keys(record).length !== 1) {
    throw new DeliveryGuardPersistenceError("Delivery mutation result is invalid");
  }
  return Object.freeze({ affected: record.affected });
}

function resultRecord(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    throw new DeliveryGuardPersistenceError("Delivery persistence result must be an object");
  }
  return row as Readonly<Record<string, unknown>>;
}
