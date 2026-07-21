import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { leaseOutboxBatchContract } from "../dist/index.js";

const completeLeaseRow = Object.freeze({
  aggregate_ref: "campaign_safe_ref",
  aggregate_type: "campaign",
  aggregate_version: "7",
  available_at: new Date("2026-07-21T15:30:00.000Z"),
  command_ref: "00000000-0000-4000-8000-000000000532",
  correlation_id: "correlation_outbox_001",
  event_id: "00000000-0000-4000-8000-000000000732",
  event_name: "campaign.render-requested.v1",
  lease_owner: "scheduler_worker_001",
  location_ref: "00000000-0000-4000-8000-000000000131",
  schema_version: 1,
});

describe("outbox database contract", () => {
  it("preserves every application OutboxLease field", () => {
    assert.deepEqual(leaseOutboxBatchContract.decode(completeLeaseRow), {
      aggregateRef: "campaign_safe_ref",
      aggregateType: "campaign",
      aggregateVersion: 7,
      availableAt: "2026-07-21T15:30:00.000Z",
      commandRef: "00000000-0000-4000-8000-000000000532",
      correlationId: "correlation_outbox_001",
      eventId: "00000000-0000-4000-8000-000000000732",
      eventName: "campaign.render-requested.v1",
      leaseOwner: "scheduler_worker_001",
      locationRef: "00000000-0000-4000-8000-000000000131",
      schemaVersion: 1,
    });
  });

  it("fails closed when a required lease field is absent", () => {
    const { command_ref: _omitted, ...missingCommandRef } = completeLeaseRow;
    assert.throws(() => leaseOutboxBatchContract.decode(missingCommandRef), {
      message: "Leased outbox row columns do not match contract v1",
    });
  });

  it("rejects event names outside the application contract", () => {
    assert.throws(
      () =>
        leaseOutboxBatchContract.decode({
          ...completeLeaseRow,
          event_name: "campaign.unknown-requested.v1",
        }),
      /Invalid option/u,
    );
  });

  it("rejects mismatched event-name and schema versions", () => {
    assert.throws(
      () => leaseOutboxBatchContract.decode({ ...completeLeaseRow, schema_version: 2 }),
      /Invalid input/u,
    );
  });
});
