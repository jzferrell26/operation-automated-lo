import { describe, expect, it, vi } from "vitest";
import type { DatabasePool, SqlRequest } from "@oalo/db";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import {
  createProductionTaskAuthorityProof,
  createTrustedProductionTaskDeliveryAuthority,
} from "../../../../apps/tasks/src/core/production-runtime-composition.js";
import {
  createWebinarPublisherWorkerRuntime,
  WebinarPublisherWorkerEnvelopeSchema,
} from "../../../../apps/tasks/src/core/webinar-publisher-runtime.js";
import { executeWebinarPublisherTask } from "../../../../apps/tasks/src/tasks/webinar-publisher-command.js";

function fixture() {
  const f = publisherFixture();
  const now = new Date();
  const key = "e".repeat(64); // Synthetic test signing key only.
  const delivery = {
    schemaVersion: 1 as const,
    deliveryKind: "task" as const,
    deliveryRef: "delivery_webinar001",
    businessOutcomeKey: "a".repeat(64),
    locationRef: f.principal.locationRef,
    correlationId: f.task.correlationRef,
  };
  const request = { schemaVersion: 1 as const, task: f.task, delivery };
  const authority = createProductionTaskAuthorityProof({
    delivery,
    request,
    locationId: f.principal.locationId,
    actorId: f.principal.actorId,
    expiresAt: new Date(now.getTime() + 60000).toISOString(),
    hmacKey: key,
  });
  const envelope = { schemaVersion: 1 as const, authority, request };
  const calls: SqlRequest[] = [];
  const record = {
    operation: { ...f.operation, stage: "complete", state: "draft_ready" },
    launch: { ...f.launch, state: "draft_ready" },
    workerRef: null,
    deadlineAt: f.proof.expiresAt,
    leaseExpiresAt: null,
    cancellationGeneration: 0,
  };
  const pool: DatabasePool = {
    connect: vi.fn(async () => ({
      release: vi.fn(async () => undefined),
      execute: async (query: SqlRequest) => {
        calls.push(query);
        const rows =
          query.statementName === "transaction.read-context"
            ? [
                {
                  location_id: f.principal.locationId,
                  actor_id: f.principal.actorId,
                  correlation_id: f.task.correlationRef,
                },
              ]
            : query.statementName === "webinar-publisher.transaction-limits.v1"
              ? [{ value: true }]
              : query.statementName === "webinar-publisher.worker.v1"
                ? [{ value: record }]
                : query.statementName === "webinar-publisher.command.v1"
                  ? [{ value: [f.task] }]
                  : [];
        return { rows, rowCount: rows.length };
      },
    })),
  };
  const currentPrincipal = vi.fn(async () => f.principal);
  const fetch = vi.fn(async () => Response.json({}));
  const verifier = vi.fn(async (_p, _candidate) => {
    throw Error("No fixture provenance admitted");
  });
  const runtime = createWebinarPublisherWorkerRuntime({
    pool,
    admissionPool: pool,
    admissionVerifier: { verify: verifier },
    databaseAuthority: {
      currentPrincipal: async (p) => p,
      assertEvidenceCurrent: async () => undefined,
      assertDispatch: async () => undefined,
      assertCheckpoint: async () => undefined,
    },
    native: {
      fetch,
      resolveLocationToken: async () => {
        throw Error("No live binding");
      },
      authority: {
        assertCurrent: async () => {
          throw Error("No live binding");
        },
      },
    },
    deliveryAuthority: createTrustedProductionTaskDeliveryAuthority(key, () => now),
    currentPrincipal,
    assertCurrent: async () => undefined,
    media: async () => {
      throw Error("No media binding");
    },
    responseAdmission: async () => {
      throw Error("No provider capture");
    },
    verifyResponse: async () => {
      throw Error("No provider capture");
    },
    workerRef: () => "worker_runtime001",
    now: () => now,
  });
  return { f, calls, pool, currentPrincipal, fetch, runtime, envelope, now, key };
}
describe("signed webinar runtime composition", () => {
  it("uses the concrete Postgres repository and serializable tenant context on current complete replay", async () => {
    const h = fixture();
    expect(await executeWebinarPublisherTask(h.envelope, () => h.runtime)).toMatchObject({
      disposition: "complete",
      state: "draft_ready",
    });
    expect(h.calls[0]?.text).toBe("begin isolation level serializable");
    expect(h.calls.find((q) => q.statementName === "webinar-publisher.worker.v1")?.text).toContain(
      "$1::text::jsonb",
    );
    expect(h.calls.at(-1)?.statementName).toBe("transaction.commit");
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each(["signature", "expired", "request", "actor", "location"])(
    "rejects %s before principal or persistence access",
    async (kind) => {
      const h = fixture();
      const value = { ...structuredClone(h.envelope), authority: { ...h.envelope.authority } };
      if (kind === "signature") value.authority.signature = "a".repeat(64);
      if (kind === "expired")
        value.authority.expiresAt = new Date(h.now.getTime() - 1).toISOString();
      if (kind === "request") value.request.task.action = "publish";
      if (kind === "actor") value.authority.actorId = "00000000-0000-4000-8000-000000000001";
      if (kind === "location") value.authority.locationId = "00000000-0000-4000-8000-000000000001";
      await expect(h.runtime.execute(value)).rejects.toThrow();
      expect(h.currentPrincipal).not.toHaveBeenCalled();
      expect(h.pool.connect).not.toHaveBeenCalled();
      expect(h.fetch).not.toHaveBeenCalled();
    },
  );
  it("rejects current principal withdrawal even with a valid signed historical envelope", async () => {
    const h = fixture();
    h.currentPrincipal.mockResolvedValue({
      ...h.f.principal,
      actorId: "00000000-0000-4000-8000-000000000001",
    });
    await expect(h.runtime.execute(h.envelope)).rejects.toMatchObject({
      code: "AUTHORITY_WITHDRAWN",
    });
    expect(h.pool.connect).not.toHaveBeenCalled();
  });
  it("rejects browser role/unknown fields and delivery/task mismatch", () => {
    const h = fixture();
    expect(
      WebinarPublisherWorkerEnvelopeSchema.safeParse({ ...h.envelope, role: "location_admin" })
        .success,
    ).toBe(false);
    expect(
      WebinarPublisherWorkerEnvelopeSchema.safeParse({
        ...h.envelope,
        request: {
          ...h.envelope.request,
          delivery: { ...h.envelope.request.delivery, locationRef: "location_foreign001" },
        },
      }).success,
    ).toBe(false);
  });
  it("default task refuses missing trusted deployed runtime", async () => {
    const h = fixture();
    await expect(executeWebinarPublisherTask(h.envelope)).rejects.toMatchObject({
      code: "RUNTIME_UNBOUND",
    });
  });
  it("reads only persisted pending messages through the concrete repository", async () => {
    const h = fixture();
    expect(await h.runtime.pending(h.f.principal, h.f.task.correlationRef)).toEqual([h.f.task]);
    expect(h.calls.find((q) => q.statementName === "webinar-publisher.command.v1")?.values[1]).toBe(
      "pending",
    );
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
