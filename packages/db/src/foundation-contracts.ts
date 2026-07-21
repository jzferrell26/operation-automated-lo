import { defineSqlContract } from "./sql-contract.js";

export interface LeasedOutboxEventRow {
  readonly eventId: string;
  readonly locationId: string;
  readonly eventName: string;
  readonly schemaVersion: number;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly correlationId: string;
}

export interface AuthorityActiveRow {
  readonly active: boolean;
}

export interface QueueLeaseRow {
  readonly leaseId: string;
}

export const leaseOutboxBatchContract = defineSqlContract<LeasedOutboxEventRow>({
  name: "integration.lease-outbox-batch.v1",
  access: "write",
  text: `
select *
from integration.lease_outbox_batch($1::text, $2::integer, $3::integer)
  `.trim(),
  decode: decodeLeasedOutboxEvent,
});

export const authorityActiveContract = defineSqlContract<AuthorityActiveRow>({
  name: "integration.authority-active.v1",
  access: "read",
  text: `
select integration.authority_active($1::uuid, $2::text) as active
  `.trim(),
  decode(row: unknown): AuthorityActiveRow {
    const record = recordRow(row);
    if (typeof record.active !== "boolean") throw new Error("Authority result must be boolean");
    return Object.freeze({ active: record.active });
  },
});

export const acquireQueueLeaseContract = defineSqlContract<QueueLeaseRow>({
  name: "integration.acquire-queue-lease.v1",
  access: "write",
  text: `
select integration.acquire_queue_lease(
  $1::uuid,
  $2::text,
  $3::text,
  $4::text,
  $5::text,
  $6::timestamptz
)::text as lease_id
  `.trim(),
  decode(row: unknown): QueueLeaseRow {
    const record = recordRow(row);
    if (typeof record.lease_id !== "string") throw new Error("Queue lease ID must be text");
    return Object.freeze({ leaseId: record.lease_id });
  },
});

function decodeLeasedOutboxEvent(row: unknown): LeasedOutboxEventRow {
  const record = recordRow(row);
  if (
    typeof record.event_id !== "string" ||
    typeof record.location_id !== "string" ||
    typeof record.event_name !== "string" ||
    typeof record.schema_version !== "number" ||
    typeof record.aggregate_type !== "string" ||
    typeof record.aggregate_id !== "string" ||
    typeof record.correlation_id !== "string"
  ) {
    throw new Error("Leased outbox row does not match contract v1");
  }
  return Object.freeze({
    eventId: record.event_id,
    locationId: record.location_id,
    eventName: record.event_name,
    schemaVersion: record.schema_version,
    aggregateType: record.aggregate_type,
    aggregateId: record.aggregate_id,
    correlationId: record.correlation_id,
  });
}

function recordRow(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null) throw new Error("Database row must be an object");
  return row as Readonly<Record<string, unknown>>;
}
