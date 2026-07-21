import { OutboxEventSchema, type OutboxEvent } from "@oalo/contracts";

import { defineSqlContract } from "./sql-contract.js";

export interface LeasedOutboxEventRow extends OutboxEvent {
  readonly leaseOwner: string;
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
  const expectedKeys = [
    "aggregate_ref",
    "aggregate_type",
    "aggregate_version",
    "available_at",
    "command_ref",
    "correlation_id",
    "event_id",
    "event_name",
    "lease_owner",
    "location_ref",
    "schema_version",
  ] as const;
  const actualKeys = Object.keys(record).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error("Leased outbox row columns do not match contract v1");
  }

  const schemaVersion = OutboxEventSchema.shape.schemaVersion.parse(
    requiredInteger(record.schema_version, "schema_version"),
  );
  const eventName = OutboxEventSchema.shape.eventName.parse(record.event_name);
  const aggregateType = OutboxEventSchema.shape.aggregateType.parse(record.aggregate_type);
  const eventVersion = /\.v([1-9][0-9]*)$/u.exec(eventName);
  if (eventVersion === null || Number(eventVersion[1]) !== schemaVersion) {
    throw new Error("Leased outbox event name and schema version do not match");
  }

  return Object.freeze({
    eventId: requiredString(record.event_id, "event_id"),
    locationRef: requiredString(record.location_ref, "location_ref"),
    eventName,
    schemaVersion,
    aggregateType,
    aggregateRef: requiredString(record.aggregate_ref, "aggregate_ref"),
    aggregateVersion: requiredInteger(record.aggregate_version, "aggregate_version"),
    commandRef: requiredString(record.command_ref, "command_ref"),
    correlationId: requiredString(record.correlation_id, "correlation_id"),
    availableAt: isoDateTime(record.available_at),
    leaseOwner: requiredString(record.lease_owner, "lease_owner"),
  });
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Leased outbox ${field} must be non-empty text`);
  }
  return value;
}

function requiredInteger(value: unknown, field: string): number {
  const parsed =
    typeof value === "bigint"
      ? Number(value)
      : typeof value === "string" && /^[0-9]+$/u.test(value)
        ? Number(value)
        : value;
  if (!Number.isSafeInteger(parsed) || (parsed as number) < 0) {
    throw new Error(`Leased outbox ${field} must be a non-negative safe integer`);
  }
  return parsed as number;
}

function isoDateTime(value: unknown): string {
  const parsed = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime())) {
    throw new Error("Leased outbox available_at must be a valid timestamp");
  }
  return OutboxEventSchema.shape.availableAt.parse(parsed.toISOString());
}

function recordRow(row: unknown): Readonly<Record<string, unknown>> {
  if (typeof row !== "object" || row === null) throw new Error("Database row must be an object");
  return row as Readonly<Record<string, unknown>>;
}
