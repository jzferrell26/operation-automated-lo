import { afterEach, describe, expect, it, vi } from "vitest";
import type { DatabasePool, SqlRequest, WebinarPublisherWorkerRecord } from "@oalo/db";
import { formatSessionRef } from "@oalo/contracts";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { createWebinarPublisherProjection, WEBINAR_PUBLISHER_WIRE_MAPPING_HASH } from "@oalo/ghl";
import * as workerModule from "../../../../apps/tasks/src/core/webinar-publisher-worker.js";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import {
  createProductionTaskAuthorityProof,
  createTrustedProductionTaskDeliveryAuthority,
} from "../../../../apps/tasks/src/core/production-runtime-composition.js";
import {
  createWebinarPublisherWorkerRuntime,
  WebinarPublisherWorkerEnvelopeSchema,
  type WebinarPublisherRuntimeDependencies,
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
  const record: WebinarPublisherWorkerRecord = {
    operation: { ...f.operation, stage: "complete", state: "draft_ready" },
    launch: { ...f.launch, state: "draft_ready" },
    workerRef: null,
    deadlineAt: f.proof.expiresAt,
    leaseExpiresAt: null,
    cancellationGeneration: 0,
  };
  const records = new Map([[f.task.operationRef, record]]);
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
                ? [
                    {
                      value: records.get(
                        (JSON.parse(String(query.values[2])) as { operationRef: string })
                          .operationRef,
                      ),
                    },
                  ]
                : query.statementName === "webinar-publisher.command.v1"
                  ? [{ value: [f.task] }]
                  : [];
        return { rows, rowCount: rows.length };
      },
    })),
  };
  const currentPrincipal = vi.fn<WebinarPublisherRuntimeDependencies["currentPrincipal"]>(
    async () => f.principal,
  );
  const fetch = vi.fn(async () => Response.json({}));
  const verifier = vi.fn(async (_p, _candidate) => {
    throw Error("No fixture provenance admitted");
  });
  const dependencies: WebinarPublisherRuntimeDependencies = {
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
  };
  const runtime = createWebinarPublisherWorkerRuntime(dependencies);
  return {
    f,
    calls,
    pool,
    currentPrincipal,
    fetch,
    runtime,
    envelope,
    now,
    key,
    dependencies,
    record,
    records,
  };
}

afterEach(() => vi.restoreAllMocks());
describe("signed webinar runtime composition", () => {
  it("resolves the exact immutable operation from the verified signed envelope", async () => {
    const h = fixture();
    await h.runtime.execute(h.envelope);
    expect(h.currentPrincipal).toHaveBeenCalledWith({
      operationRef: h.f.task.operationRef,
      actorId: h.f.principal.actorId,
      locationId: h.f.principal.locationId,
    });
    expect(h.currentPrincipal.mock.calls.length).toBeGreaterThan(2);
  });
  it.each(["missing", "changed"])(
    "refuses %s operation identity before authentication access",
    async (kind) => {
      const h = fixture();
      const envelope = structuredClone(h.envelope);
      if (kind === "missing") Reflect.deleteProperty(envelope.request.task, "operationRef");
      else envelope.request.task.operationRef = "operation_other001";
      await expect(h.runtime.execute(envelope)).rejects.toThrow();
      expect(h.currentPrincipal).not.toHaveBeenCalled();
      expect(h.pool.connect).not.toHaveBeenCalled();
      expect(h.fetch).not.toHaveBeenCalled();
    },
  );
  it.each(["expired", "newer-session", "mode"])(
    "refuses %s original authority before claim",
    async (kind) => {
      const h = fixture();
      h.record.operation.stage = "queued";
      h.dependencies.assertCurrent = async () => {
        if (kind === "expired")
          h.currentPrincipal.mockRejectedValue(Error("Original authentication expired"));
        else
          h.currentPrincipal.mockResolvedValue({
            ...h.f.principal,
            ...(kind === "mode"
              ? { authenticationMode: "first_party" as const }
              : { sessionId: "session_newerLogin001" }),
          });
      };
      await expect(h.runtime.execute(h.envelope)).rejects.toThrow();
      expect(
        h.calls.some((query) => query.values[1] === "claim" || query.values[1] === "dispatch"),
      ).toBe(false);
      expect(h.fetch).not.toHaveBeenCalled();
    },
  );
  it("retains A and B operation/session closures when overlapping executions finish in reverse order", async () => {
    const h = fixture();
    const a = {
      ...h.f.principal,
      authenticationMode: "first_party" as const,
      sessionId: formatSessionRef("00000000-0000-4000-8000-000000000111"),
    };
    const b = { ...a, sessionId: formatSessionRef("00000000-0000-4000-8000-000000000222") };
    const taskB = { ...h.f.task, operationRef: "operation_concurrentB001" };
    h.records.set(taskB.operationRef, {
      ...h.record,
      operation: { ...h.record.operation, operationRef: taskB.operationRef },
    });
    const requestB = { ...h.envelope.request, task: taskB };
    const envelopeB = {
      ...h.envelope,
      request: requestB,
      authority: createProductionTaskAuthorityProof({
        delivery: requestB.delivery,
        request: requestB,
        locationId: b.locationId,
        actorId: b.actorId,
        expiresAt: h.envelope.authority.expiresAt,
        hmacKey: h.key,
      }),
    };
    const gate = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();
    let held = false;
    h.currentPrincipal.mockImplementation(async (identity) => {
      if (identity.operationRef === h.f.task.operationRef) {
        if (!held) {
          held = true;
          entered.resolve();
          await gate.promise;
        }
        return a;
      }
      if (identity.operationRef === taskB.operationRef) return b;
      throw Error("Cross-operation lookup");
    });
    const executionA = h.runtime.execute(h.envelope);
    await entered.promise;
    expect(await h.runtime.execute(envelopeB)).toMatchObject({
      disposition: "complete",
      operationRef: taskB.operationRef,
    });
    gate.resolve();
    expect(await executionA).toMatchObject({
      disposition: "complete",
      operationRef: h.f.task.operationRef,
    });
    const reads = h.calls.filter((query) => query.statementName === "webinar-publisher.worker.v1");
    expect(
      reads.map((query) => [
        JSON.parse(String(query.values[2])).operationRef,
        JSON.parse(String(query.values[0])).sessionId,
      ]),
    ).toEqual([
      [taskB.operationRef, "00000000-0000-4000-8000-000000000222"],
      [h.f.task.operationRef, "00000000-0000-4000-8000-000000000111"],
    ]);
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("rechecks operation authority after async media and capture verification", async () => {
    for (const seam of ["media", "capture"] as const) {
      const h = fixture();
      const withdrawal = async () => {
        h.currentPrincipal.mockResolvedValue({
          ...h.f.principal,
          sessionId: "session_newerLogin001",
        });
        return {};
      };
      if (seam === "media") h.dependencies.media = withdrawal;
      else
        h.dependencies.verifyResponse = async () => {
          await withdrawal();
        };
      vi.spyOn(workerModule, "runWebinarPublisherWorker").mockImplementation(
        async (_task, principal, _worker, ports) => {
          if (seam === "media") await ports.media(principal, h.record);
          else
            await ports.admitResponse({
              principal,
              record: h.record,
              operation: "linked",
              normalized: {},
              readBackHash: "a".repeat(64),
              observedAt: h.now.toISOString(),
              state: "draft_ready",
              nativeIds: h.record.launch.nativeIds,
            });
          throw Error("Unexpected acceptance");
        },
      );
      await expect(h.runtime.execute(h.envelope)).rejects.toMatchObject({
        code: "AUTHORITY_WITHDRAWN",
      });
      expect(h.calls.some((query) => query.statementName === "webinar-publisher.admit.v1")).toBe(
        false,
      );
      expect(h.fetch).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    }
  });
  it("refuses withdrawal during the database dispatch qualifier before dispatch SQL", async () => {
    const h = fixture();
    Object.assign(h.record.operation, { stage: "campaign", leaseGeneration: 1 });
    h.record.workerRef = "worker_runtime001";
    h.dependencies.databaseAuthority.assertDispatch = async () => {
      h.currentPrincipal.mockResolvedValue({
        ...h.f.principal,
        sessionId: "session_newerLogin001",
      });
    };
    vi.spyOn(workerModule, "runWebinarPublisherWorker").mockImplementation(
      async (_task, principal, workerRef, ports) => {
        await ports.repository.beginDispatch(principal, {
          operationRef: h.f.task.operationRef,
          workerRef,
          leaseGeneration: 1,
          expectedStage: "campaign",
          requestHash: "a".repeat(64),
        });
        throw Error("Unexpected dispatch acceptance");
      },
    );
    const refusal = await h.runtime.execute(h.envelope).catch((error: unknown) => error);
    expect(h.calls.some((query) => query.values[1] === "dispatch")).toBe(false);
    expect(refusal).toMatchObject({ code: "AUTHORITY_WITHDRAWN" });
    expect(h.calls.at(-1)?.statementName).toBe("transaction.rollback");
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each(["token", "native-authority"])(
    "refuses original session withdrawal during %s resolution before native fetch",
    async (seam) => {
      const h = fixture();
      const bytes = await sharp({
        create: { width: 1080, height: 1080, channels: 4, background: "#123456" },
      })
        .png()
        .toBuffer();
      const { projectionHash: _projectionHash, ...body } = h.f.summary.projection;
      const projection = createWebinarPublisherProjection({
        ...body,
        providerContract: {
          ...body.providerContract,
          wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
        },
        creative: {
          ...body.creative,
          digest: createHash("sha256").update(bytes).digest("hex"),
          byteLength: bytes.length,
        },
      });
      const withdrawal = () =>
        h.currentPrincipal.mockResolvedValue({
          ...h.f.principal,
          sessionId: "session_newerLogin001",
        });
      const token = vi.fn(async () => {
        if (seam === "token") withdrawal();
        return {
          locationId: projection.assets.locationId,
          accessToken: "fixture_transport_token_only",
        };
      });
      const authority = vi.fn(async () => {
        withdrawal();
      });
      h.dependencies.native = {
        ...h.dependencies.native,
        resolveLocationToken: token,
        authority: { assertCurrent: authority },
      };
      vi.spyOn(workerModule, "runWebinarPublisherWorker").mockImplementation(
        async (_task, _principal, _worker, ports) => {
          await ports.transport.execute({
            operation: "upload",
            locationRef: projection.locationRef,
            projection,
            qualification: {
              ...h.f.proof,
              wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
              projectionHash: projection.projectionHash,
            },
            body: { bytes, name: "fixture.png" },
          });
          throw Error("Unexpected transport acceptance");
        },
      );
      await expect(h.runtime.execute(h.envelope)).rejects.toThrow();
      expect(token).toHaveBeenCalledTimes(1);
      expect(authority).toHaveBeenCalledTimes(seam === "token" ? 0 : 1);
      expect(h.fetch).not.toHaveBeenCalled();
      expect(
        h.currentPrincipal.mock.calls.every(
          ([identity]) => identity.operationRef === h.f.task.operationRef,
        ),
      ).toBe(true);
    },
  );
  it("refuses a different record operation inside a valid execution before media access", async () => {
    const h = fixture();
    const media = vi.fn(h.dependencies.media);
    h.dependencies.media = media;
    vi.spyOn(workerModule, "runWebinarPublisherWorker").mockImplementation(
      async (_task, principal, _worker, ports) => {
        await ports.media(principal, {
          ...h.record,
          operation: { ...h.record.operation, operationRef: "operation_foreign001" },
        });
        throw Error("Unexpected acceptance");
      },
    );
    await expect(h.runtime.execute(h.envelope)).rejects.toMatchObject({ code: "TASK_MISMATCH" });
    expect(media).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });
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
