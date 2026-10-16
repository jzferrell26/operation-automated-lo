import { describe, expect, it, vi, afterEach } from "vitest";
import sharp from "sharp";
import { createHash } from "node:crypto";
import * as runtimeModule from "../../../../apps/tasks/src/core/webinar-publisher-runtime.js";
import { createWebinarPublisherProjection, hashWebinarPublisherValue } from "@oalo/ghl";
import type { WebinarPublisherRuntimeDependencies } from "../../../../apps/tasks/src/core/webinar-publisher-runtime.js";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import { type SqlRequest, type DatabasePool, type WebinarPublisherWorkerRecord } from "@oalo/db";
import { createTrustedProductionTaskDeliveryAuthority } from "../../../../apps/tasks/src/core/production-runtime-composition.js";
import { createWebinarPublisherRelay } from "../../../../apps/tasks/src/core/webinar-publisher-relay.js";
import {
  createWebinarPublisherRuntimeBindings,
  createPostgresWebinarPublisherRuntimeBindings,
} from "../../../../apps/tasks/src/core/webinar-publisher-runtime-bindings.js";
import { formatSessionRef, parseInstallationRef } from "@oalo/contracts";

function fixture() {
  const f = publisherFixture();
  const time = Date.now();
  const now = () => new Date(time);
  const key = "c".repeat(64); // Synthetic signing key, not provider authority.
  const config = {
    taskAuthorityHmacKey: key,
    actorId: f.principal.actorId,
    locationId: f.principal.locationId,
    locationRef: f.principal.locationRef,
    correlationRef: f.task.correlationRef,
  };
  const calls: SqlRequest[] = [];
  const record: WebinarPublisherWorkerRecord = {
    operation: { ...f.operation, stage: "queued" },
    launch: f.launch,
    workerRef: null,
    deadlineAt: new Date(time + 120000).toISOString(),
    leaseExpiresAt: null as string | null,
    cancellationGeneration: 0,
  };
  let pending = [f.task];
  const pool: DatabasePool = {
    connect: vi.fn(async () => ({
      release: vi.fn(async () => undefined),
      execute: async (request: SqlRequest) => {
        calls.push(request);
        const rows =
          request.statementName === "transaction.read-context"
            ? [
                {
                  location_id: f.principal.locationId,
                  actor_id: f.principal.actorId,
                  correlation_id: f.task.correlationRef,
                },
              ]
            : request.statementName === "webinar-publisher.transaction-limits.v1"
              ? [{ value: true }]
              : request.statementName === "webinar-publisher.command.v1"
                ? [{ value: pending }]
                : request.statementName === "webinar-publisher.worker.v1"
                  ? [{ value: record }]
                  : [];
        return { rows, rowCount: rows.length };
      },
    })),
  };
  const currentPrincipal = vi.fn(async (_input: unknown) => f.principal);
  const authority = {
    currentPrincipal: async () => f.principal,
    assertEvidenceCurrent: async () => undefined,
    assertDispatch: async () => undefined,
    assertCheckpoint: async () => undefined,
  };
  const delivery = createTrustedProductionTaskDeliveryAuthority(key, now);
  const envelopes: unknown[] = [];
  const execute = vi.fn<runtimeModule.WebinarPublisherWorkerRuntime["execute"]>(
    async (input: unknown) => {
      const envelope = input as {
        authority: unknown;
        request: { task: typeof f.task; delivery: Parameters<typeof delivery.withAuthority>[1] };
      };
      return delivery.withAuthority(
        envelope.authority,
        envelope.request.delivery,
        envelope.request,
        async () => {
          envelopes.push(input);
          return {
            disposition: "pending" as const,
            state: "drafting" as const,
            stage: "adset" as const,
            operationRef: f.operation.operationRef,
          };
        },
      );
    },
  );
  const runtime = { execute, pending: vi.fn(async () => pending) };
  const dependencies = { pool, databaseAuthority: authority, currentPrincipal, runtime, now };
  return {
    f,
    config,
    pool,
    calls,
    record,
    dependencies,
    currentPrincipal,
    execute,
    envelopes,
    empty: () => {
      pending = [];
    },
  };
}
describe("bounded persisted webinar relay", () => {
  it("scans persisted work and signs the exact task without leaking its key to principal lookup", async () => {
    const h = fixture();
    expect(await createWebinarPublisherRelay(h.config, h.dependencies).run()).toMatchObject({
      disposition: "pending",
      stage: "adset",
    });
    expect(h.currentPrincipal).toHaveBeenCalledWith({
      actorId: h.f.principal.actorId,
      locationId: h.f.principal.locationId,
    });
    expect(h.calls.find((q) => q.statementName === "webinar-publisher.command.v1")?.values[2]).toBe(
      '{"limit":1}',
    );
    expect(h.envelopes[0]).toMatchObject({ request: { task: h.f.task } });
    expect(
      h.calls.some((q) => q.text.includes("processed_at") || q.text.includes("update integration")),
    ).toBe(false);
  });
  it("leaves pending work recoverable after a crash before invoke", async () => {
    const h = fixture();
    h.execute.mockRejectedValueOnce(Error("Simulated process loss"));
    const relay = createWebinarPublisherRelay(h.config, h.dependencies);
    await expect(relay.run()).rejects.toThrow("Simulated process loss");
    expect(await relay.run()).toMatchObject({ disposition: "pending" });
    expect(h.execute).toHaveBeenCalledTimes(2);
    expect(h.calls.every((q) => !q.text.includes("processed_at"))).toBe(true);
  });
  it("delegates overlapping deliveries to existing consumer CAS without completing the outbox", async () => {
    const h = fixture();
    let busy = false;
    h.execute.mockImplementation(async () => {
      if (busy)
        return {
          disposition: "busy",
          state: "drafting",
          stage: "campaign",
          operationRef: h.f.operation.operationRef,
        };
      busy = true;
      await Promise.resolve();
      return {
        disposition: "pending",
        state: "drafting",
        stage: "adset",
        operationRef: h.f.operation.operationRef,
      };
    });
    const relay = createWebinarPublisherRelay(h.config, h.dependencies);
    const results = await Promise.all([relay.run(), relay.run()]);
    expect(results.map((r) => r.disposition).sort()).toEqual(["busy", "pending"]);
    expect(h.calls.every((q) => !q.text.includes("processed_at"))).toBe(true);
  });
  it("does not invoke a worker with an active lease", async () => {
    const h = fixture();
    h.record.leaseExpiresAt = new Date(h.dependencies.now().getTime() + 30000).toISOString();
    expect(await createWebinarPublisherRelay(h.config, h.dependencies).run()).toEqual({
      disposition: "pending",
    });
    expect(h.execute).not.toHaveBeenCalled();
  });
  it("redelivers exact retained task after lease expiry, including uncertain standing", async () => {
    const h = fixture();
    h.record.leaseExpiresAt = new Date(h.dependencies.now().getTime() - 1).toISOString();
    Object.assign(h.record.operation, { stage: "reconcile", state: "uncertain" });
    await createWebinarPublisherRelay(h.config, h.dependencies).run();
    expect(h.envelopes[0]).toMatchObject({ request: { task: h.f.task } });
    expect(h.execute).toHaveBeenCalledTimes(1);
  });
  it.each(["aborted", "expired", "empty", "complete"])("stops for %s work", async (mode) => {
    const h = fixture();
    const control = new AbortController();
    if (mode === "aborted") control.abort();
    if (mode === "expired")
      h.record.deadlineAt = new Date(h.dependencies.now().getTime()).toISOString();
    if (mode === "empty") h.empty();
    if (mode === "complete") h.record.operation.stage = "complete";
    await createWebinarPublisherRelay(h.config, h.dependencies).run(control.signal);
    expect(h.execute).not.toHaveBeenCalled();
    if (mode === "aborted") expect(h.pool.connect).not.toHaveBeenCalled();
  });
  it("refuses current principal withdrawal before signing/invoke", async () => {
    const h = fixture();
    h.currentPrincipal
      .mockResolvedValueOnce(h.f.principal)
      .mockResolvedValueOnce({ ...h.f.principal, roleVersion: 2 });
    await expect(createWebinarPublisherRelay(h.config, h.dependencies).run()).rejects.toMatchObject(
      { code: "PUBLISHER_BINDINGS_UNAVAILABLE" },
    );
    expect(h.execute).not.toHaveBeenCalled();
  });
  it.each(["action", "projectionHash", "correlationRef"])(
    "refuses persisted task drift %s",
    async (field) => {
      const h = fixture();
      Object.assign(h.record.operation, {
        [field]:
          field === "action"
            ? "publish"
            : field === "projectionHash"
              ? "e".repeat(64)
              : "correlation_foreign001",
      });
      await expect(createWebinarPublisherRelay(h.config, h.dependencies).run()).rejects.toThrow();
      expect(h.execute).not.toHaveBeenCalled();
    },
  );
  it("refuses absent configuration without allocating persistence", () => {
    const h = fixture();
    expect(() => createWebinarPublisherRelay(undefined, h.dependencies)).toThrow(
      "Current trusted publisher runtime bindings are unavailable.",
    );
    expect(h.pool.connect).not.toHaveBeenCalled();
  });
});

describe("mandatory publisher runtime bindings", () => {
  it("does not accept shaped app_test records as runtime capabilities", () => {
    expect(() =>
      createWebinarPublisherRuntimeBindings({ taskAuthorityHmacKey: "c".repeat(64) }, {
        kind: "app_test",
      } as never),
    ).toThrow("Current trusted publisher runtime bindings are unavailable.");
  });
  it("refuses missing signing configuration without printing its contents", () => {
    expect(() =>
      createWebinarPublisherRuntimeBindings(
        { taskAuthorityHmacKey: "synthetic_private_key_should_not_escape" },
        {} as never,
      ),
    ).toThrow("Current trusted publisher runtime bindings are unavailable.");
  });
});

afterEach(() => vi.restoreAllMocks());
async function bindingFixture() {
  const h = fixture();
  const bytes = await sharp({
    create: { width: 1080, height: 1080, channels: 4, background: "#123456" },
  })
    .png()
    .toBuffer();
  const { projectionHash: _projectionHash, ...projection } = h.record.launch.summary.projection;
  h.record.launch.summary.projection = createWebinarPublisherProjection({
    ...projection,
    creative: {
      ...projection.creative,
      digest: createHash("sha256").update(bytes).digest("hex"),
      byteLength: bytes.length,
    },
  });
  const authentication = { current: vi.fn(async () => h.f.principal) };
  const readMediaBytes = vi.fn(async () => ({
    bytes,
    fileId: "media_file001",
    url: "https://storage.googleapis.com/webinar/creative.png",
    expiresAt: h.record.launch.summary.projection.schedule.endsAt,
  }));
  const ports = {
    pool: h.pool,
    admissionPool: {
      connect: vi.fn(async () => {
        throw Error("No test admission login");
      }),
    },
    admissionVerifier: {
      verify: vi.fn(async () => {
        throw Error("No actual test provenance");
      }),
    },
    databaseAuthority: h.dependencies.databaseAuthority,
    authentication,
    sourceEvidence: { assertCurrent: vi.fn(async () => undefined) },
    readMediaBytes,
    assertCurrent: vi.fn(async () => undefined),
    verifyResponse: vi.fn(async () => {
      throw Error("No independently captured provider response");
    }),
    responseAdmission: vi.fn<WebinarPublisherRuntimeDependencies["responseAdmission"]>(async () => {
      throw Error("No durable capture candidate");
    }),
    native: {
      fetch: vi.fn(async () => Response.json({})),
      resolveLocationToken: vi.fn(async () => {
        throw Error("No test location token");
      }),
      authority: {
        assertCurrent: vi.fn(async () => {
          throw Error("No native proof");
        }),
      },
    },
    now: h.dependencies.now,
  };
  let bound: WebinarPublisherRuntimeDependencies | undefined;
  vi.spyOn(runtimeModule, "createWebinarPublisherWorkerRuntime").mockImplementation(
    (dependencies) => {
      bound = dependencies;
      return h.dependencies.runtime;
    },
  );
  createWebinarPublisherRuntimeBindings(
    { taskAuthorityHmacKey: h.config.taskAuthorityHmacKey },
    ports,
  );
  return { h, ports, bound: bound! };
}
describe("concrete binding dependency seams", () => {
  it("verifies the actual stored PNG digest and pinned provider media URL", async () => {
    const b = await bindingFixture();
    const receipt = await b.bound.media(b.h.f.principal, b.h.record);
    expect(receipt).toMatchObject({
      digest: b.h.record.launch.summary.projection.creative.digest,
      fileId: "media_file001",
      width: 1080,
      height: 1080,
    });
    expect(b.ports.readMediaBytes).toHaveBeenCalledWith(b.h.f.principal, b.h.record);
  });
  it("rechecks current auth after asynchronous media retrieval", async () => {
    const b = await bindingFixture();
    b.ports.authentication.current
      .mockResolvedValueOnce(b.h.f.principal)
      .mockResolvedValueOnce({ ...b.h.f.principal, roleVersion: 2 });
    await expect(b.bound.media(b.h.f.principal, b.h.record)).rejects.toMatchObject({
      code: "PUBLISHER_BINDINGS_UNAVAILABLE",
    });
  });
  it("does not forward serialized principal role data into auth bootstrap", async () => {
    const b = await bindingFixture();
    await b.bound.currentPrincipal({
      operationRef: b.h.f.task.operationRef,
      actorId: b.h.f.principal.actorId,
      locationId: b.h.f.principal.locationId,
    });
    expect(b.ports.authentication.current).toHaveBeenCalledWith({
      operationRef: b.h.f.task.operationRef,
      actorId: b.h.f.principal.actorId,
      locationId: b.h.f.principal.locationId,
    });
  });
  it("requires an operation for command authentication and keeps pending owner reads separate", async () => {
    const b = await bindingFixture();
    await expect(
      b.bound.currentPrincipal({
        actorId: b.h.f.principal.actorId,
        locationId: b.h.f.principal.locationId,
      } as never),
    ).rejects.toMatchObject({ code: "PUBLISHER_BINDINGS_UNAVAILABLE" });
    expect(b.ports.authentication.current).not.toHaveBeenCalled();
    await b.bound.databaseAuthority.currentPrincipal(b.h.f.principal);
    expect(b.ports.authentication.current).not.toHaveBeenCalled();
    const supplied = { ...b.h.f.principal, sessionId: "session_newLogin001" };
    await expect(b.bound.databaseAuthority.currentPrincipal(supplied)).rejects.toMatchObject({
      code: "PUBLISHER_BINDINGS_UNAVAILABLE",
    });
  });
  it("constructs the actual private SQL operation resolver without substituting a principal", async () => {
    const b = await bindingFixture();
    const sessionId = "00000000-0000-4000-8000-000000000123";
    const calls: SqlRequest[] = [];
    const resolverPool: DatabasePool = {
      connect: vi.fn(async () => ({
        release: vi.fn(async () => undefined),
        execute: async (query: SqlRequest) => {
          calls.push(query);
          const rows =
            query.statementName === "publisher-auth.resolve.v1"
              ? [
                  {
                    value: {
                      actorId: b.h.f.principal.actorId,
                      locationId: b.h.f.principal.locationId,
                      installationId: parseInstallationRef(b.h.f.principal.installationRef),
                      sessionId,
                      role: "location_admin",
                      roleVersion: 1,
                      authenticationMode: "embedded",
                    },
                  },
                ]
              : [];
          return { rows, rowCount: rows.length };
        },
      })),
    };
    let captured: WebinarPublisherRuntimeDependencies | undefined;
    vi.mocked(runtimeModule.createWebinarPublisherWorkerRuntime).mockImplementation(
      (dependencies) => {
        captured = dependencies;
        return b.h.dependencies.runtime;
      },
    );
    const { authentication: _authentication, ...ports } = b.ports;
    createPostgresWebinarPublisherRuntimeBindings(
      { taskAuthorityHmacKey: b.h.config.taskAuthorityHmacKey },
      { ...ports, authenticationResolverPool: resolverPool },
    );
    const identity = {
      operationRef: b.h.f.task.operationRef,
      actorId: b.h.f.principal.actorId,
      locationId: b.h.f.principal.locationId,
    };
    expect(await captured!.currentPrincipal(identity)).toMatchObject({
      ...b.h.f.principal,
      sessionId: formatSessionRef(sessionId),
    });
    const lookup = calls.find((query) => query.statementName === "publisher-auth.resolve.v1")!;
    expect(lookup.text).toBe(
      "select campaign.webinar_publisher_resolve_authentication($1::text,$2::uuid,$3::uuid) as value",
    );
    expect(lookup.values).toEqual([identity.operationRef, identity.actorId, identity.locationId]);
    expect(
      calls.some((query) => query.text === "set local role publisher_authentication_resolver"),
    ).toBe(true);
    expect(calls.at(-1)?.text).toBe("commit");
    expect(b.ports.authentication.current).not.toHaveBeenCalled();
    expect(b.ports.native.fetch).not.toHaveBeenCalled();
    for (const pool of [ports.pool, ports.admissionPool, undefined]) {
      expect(() =>
        createPostgresWebinarPublisherRuntimeBindings(
          { taskAuthorityHmacKey: b.h.config.taskAuthorityHmacKey },
          { ...ports, authenticationResolverPool: pool } as never,
        ),
      ).toThrow("Current trusted publisher runtime bindings are unavailable.");
    }
    expect(() =>
      createPostgresWebinarPublisherRuntimeBindings(
        { taskAuthorityHmacKey: b.h.config.taskAuthorityHmacKey },
        {
          ...ports,
          authenticationResolverPool: resolverPool,
          databaseAuthority: { ...ports.databaseAuthority, currentPrincipal: undefined },
        } as never,
      ),
    ).toThrow("Current trusted publisher runtime bindings are unavailable.");
    await expect(
      captured!.currentPrincipal({ ...identity, operationRef: undefined } as never),
    ).rejects.toThrow();
  });
  it.each(["bytes", "origin", "expires"])("refuses unqualified stored media %s", async (field) => {
    const b = await bindingFixture();
    const original = await b.ports.readMediaBytes();
    b.ports.readMediaBytes.mockResolvedValueOnce({
      ...original,
      ...(field === "bytes"
        ? { bytes: Buffer.from("invalid") }
        : field === "origin"
          ? { url: "https://example.test/creative.png" }
          : { expiresAt: b.h.dependencies.now().toISOString() }),
    });
    await expect(b.bound.media(b.h.f.principal, b.h.record)).rejects.toThrow();
    expect(b.ports.native.fetch).not.toHaveBeenCalled();
  });
  it("requires independent capture verification instead of trusting app_test shape", async () => {
    const b = await bindingFixture();
    await expect(
      b.bound.verifyResponse({
        principal: b.h.f.principal,
        record: b.h.record,
        operation: "linked",
        normalized: { kind: "app_test" },
        readBackHash: "f".repeat(64),
        observedAt: b.h.dependencies.now().toISOString(),
        state: "draft_ready",
        nativeIds: b.h.record.launch.nativeIds,
      }),
    ).rejects.toThrow("No independently captured provider response");
    expect(b.ports.native.fetch).not.toHaveBeenCalled();
  });
  it("refuses the same admission and request runtime pool", async () => {
    const b = await bindingFixture();
    expect(() =>
      createWebinarPublisherRuntimeBindings(
        { taskAuthorityHmacKey: b.h.config.taskAuthorityHmacKey },
        { ...b.ports, admissionPool: b.ports.pool },
      ),
    ).toThrow("Current trusted publisher runtime bindings are unavailable.");
  });
});

async function observationFixture() {
  const b = await bindingFixture();
  const p = b.h.record.launch.summary.projection;
  b.h.record.launch.nativeIds = { campaignId: "campaign_native001", adsetId: null, adId: null };
  const linked = {
    id: "campaign_native001",
    name: "Captured campaign",
    locationId: p.assets.locationId,
    fbAdAccountId: p.assets.adAccountId,
    objective: p.objective,
    specialAdCategories: p.specialAdCategories,
    publishingStatus: "DRAFT",
    adsets: [],
  };
  const observedAt = b.h.dependencies.now().toISOString();
  const response: Parameters<WebinarPublisherRuntimeDependencies["responseAdmission"]>[0] = {
    principal: b.h.f.principal,
    record: b.h.record,
    operation: "linked",
    normalized: linked,
    readBackHash: hashWebinarPublisherValue(linked),
    observedAt,
    state: "drafting",
    nativeIds: b.h.record.launch.nativeIds,
  };
  const candidate = {
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    admissionRef: "admission_synthetic001",
    artifactHash: "b".repeat(64),
    verifierRef: "verifier_synthetic001",
    origin: "verified_provider",
    kind: "observation",
    observedAt,
    expiresAt: new Date(b.h.dependencies.now().getTime() + 60000).toISOString(),
    normalized: {
      projectionHash: b.h.record.operation.projectionHash,
      nativeIds: response.nativeIds,
      state: "drafting",
      readBackHash: response.readBackHash,
      observedAt,
      facebookIds: {
        campaignId: null as string | null,
        adsetId: null as string | null,
        adId: null as string | null,
      },
      metrics: {
        impressions: null as number | null,
        clicks: null as number | null,
        spendMinor: null as number | null,
      },
    },
  };
  b.ports.responseAdmission.mockResolvedValue(candidate);
  return { ...b, response, candidate };
}
describe("strict actual observation mapping", () => {
  it("preserves independently captured metadata and actual normalized digest without invented metrics", async () => {
    const b = await observationFixture();
    expect(await b.bound.responseAdmission(b.response)).toEqual(b.candidate);
    expect(b.ports.admissionVerifier.verify).not.toHaveBeenCalled(); // Separate real runtime admission still must verify.
  });
  it.each(["state", "projection", "hash", "ids", "facebook", "metrics", "expiry", "time"])(
    "refuses capture candidate drift %s",
    async (field) => {
      const b = await observationFixture();
      if (field === "state") b.candidate.normalized.state = "paused";
      if (field === "projection") b.candidate.normalized.projectionHash = "f".repeat(64);
      if (field === "hash") b.candidate.normalized.readBackHash = "f".repeat(64);
      if (field === "ids")
        b.candidate.normalized.nativeIds = {
          ...b.response.nativeIds,
          campaignId: "campaign_foreign001",
        };
      if (field === "facebook") b.candidate.normalized.facebookIds.campaignId = "fb_invented001";
      if (field === "metrics") b.candidate.normalized.metrics.impressions = 0;
      if (field === "expiry")
        b.candidate.expiresAt = new Date(b.h.dependencies.now().getTime() - 1).toISOString();
      if (field === "time")
        b.candidate.normalized.observedAt = new Date(
          b.h.dependencies.now().getTime() - 1,
        ).toISOString();
      await expect(b.bound.responseAdmission(b.response)).rejects.toThrow();
    },
  );
});
