import { describe, expect, it, vi } from "vitest";
import {
  PostgresWebinarPublisherRepository,
  createWebinarPublisherAdmissionService,
  WebinarPublisherAdmissionSchema,
  type DatabasePool,
  type SqlRequest,
  type WebinarPublisherDatabaseAuthority,
} from "@oalo/db";
import {
  publisherFixture,
  publisherEvidenceFixture,
} from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import {
  canonicalCampaignHash,
  createApprovalDecision,
  createSessionApprovalAuthority,
} from "@oalo/application";
import { formatSessionRef } from "@oalo/contracts";
import { webinarEvidence, WEBINAR_NOW } from "../webinar-ads/webinar-foundation-fixtures.js";

async function setup() {
  const f = publisherFixture();
  const calls: SqlRequest[] = [];
  let response: unknown = null;
  let handler: (request: SqlRequest) => unknown = () => response;
  const release = vi.fn(async () => {});
  const pool: DatabasePool = {
    connect: async () => ({
      release,
      execute: async (request) => {
        calls.push(request);
        return {
          rowCount: 1,
          rows:
            request.statementName === "transaction.read-context"
              ? [
                  {
                    location_id: f.principal.locationId,
                    actor_id: f.principal.actorId,
                    correlation_id: "correlation_database001",
                  },
                ]
              : request.statementName === "webinar-publisher.transaction-limits.v1"
                ? [{ value: true }]
                : request.statementName.startsWith("webinar-publisher.")
                  ? [{ value: handler(request) }]
                  : [],
        };
      },
    }),
  };
  const authority: WebinarPublisherDatabaseAuthority = {
    currentPrincipal: vi.fn(async (p) => p),
    assertEvidenceCurrent: vi.fn(async () => {}),
    assertDispatch: vi.fn(async () => {}),
    assertCheckpoint: vi.fn(async () => {}),
  };
  const repository = new PostgresWebinarPublisherRepository(
    pool,
    authority,
    "correlation_database001",
  );
  const record = {
    operation: { ...f.operation, leaseGeneration: 1, stage: "campaign" },
    launch: f.launch,
    workerRef: "worker_database001",
    deadlineAt: new Date(Date.now() + 900000).toISOString(),
    leaseExpiresAt: new Date(Date.now() + 60000).toISOString(),
    cancellationGeneration: 0,
  };
  const dispatch = {
    operationRef: f.operation.operationRef,
    workerRef: "worker_database001",
    leaseGeneration: 1,
    expectedStage: "campaign",
    requestHash: "a".repeat(64),
  };
  const checkpoint = {
    ...dispatch,
    stage: "adset",
    state: "drafting",
    nativeIds: { campaignId: "native_campaign001", adsetId: null, adId: null },
    providerObservedAt: new Date().toISOString(),
    readBackHash: "b".repeat(64),
  };
  return {
    ...f,
    calls,
    pool,
    release,
    authority,
    repository,
    record,
    dispatch,
    checkpoint,
    respond: (value: unknown) => {
      response = value;
    },
    handle: (callback: typeof handler) => {
      handler = callback;
    },
  };
}
describe("native webinar database adapter", () => {
  it("full PG source fixture uses actual SDK approval and consistent canonical projection hashes", async () => {
    const f = publisherFixture();
    const evidence = await publisherEvidenceFixture(f);
    expect(evidence.version.manifest.blueprintId).toBe("webinar-ad");
    const { projectionHash, ...body } = f.summary.projection;
    expect(canonicalCampaignHash(body)).toBe(projectionHash);
    expect(evidence.approval.snapshot).toMatchObject({});
    expect(evidence.version.manifestHash).toBe(f.summary.projection.manifestHash);
  });
  it("uses serializable BEGIN before context, fixed SQL and principal locks even for no-op work", async () => {
    const f = await setup();
    await f.repository.run(f.principal, async () => 42);
    expect(f.calls[0]?.text).toBe("begin isolation level serializable");
    expect(f.calls.at(-1)?.statementName).toBe("transaction.commit");
    expect(f.calls.filter((c) => c.statementName === "webinar-publisher.command.v1")).toHaveLength(
      2,
    );
    expect(f.release).toHaveBeenCalledOnce();
  });
  it.each(["local_synthetic", "role", "actor", "location", "installation", "session"])(
    "refuses invalid %s identity before connecting",
    async (kind) => {
      const f = await setup();
      const p = { ...f.principal };
      if (kind === "local_synthetic") p.authenticationMode = "local_synthetic";
      if (kind === "role") p.role = "campaign_creator";
      if (kind === "actor") p.actorRef = "actor_wrong001";
      if (kind === "location") p.locationRef = "location_wrong001";
      if (kind === "installation") p.installationRef = "installation_wrong001";
      if (kind === "session") {
        p.authenticationMode = "first_party";
        p.sessionId = "session_wrong001";
      }
      await expect(f.repository.run(p, async () => {})).rejects.toThrow();
      expect(f.calls).toHaveLength(0);
    },
  );
  it("binds a real canonical first-party session in SQL", async () => {
    const f = await setup();
    const p = {
      ...f.principal,
      authenticationMode: "first_party" as const,
      sessionId: formatSessionRef("00000000-0000-4000-8000-000000000001"),
    };
    await f.repository.run(p, async () => {});
    expect(
      JSON.parse(
        String(f.calls.find((c) => c.statementName === "webinar-publisher.command.v1")?.values[0]),
      ).sessionId,
    ).toBe("00000000-0000-4000-8000-000000000001");
  });
  it.each(["start", "commit"])("rejects authority withdrawal at %s", async (phase) => {
    const f = await setup();
    vi.mocked(f.authority.currentPrincipal)
      .mockResolvedValueOnce(phase === "start" ? { ...f.principal, roleVersion: 2 } : f.principal)
      .mockResolvedValueOnce({ ...f.principal, roleVersion: 2 });
    await expect(f.repository.run(f.principal, async () => {})).rejects.toThrow(
      "AUTHORITY_WITHDRAWN",
    );
    expect(f.calls.some((c) => c.statementName === "transaction.commit")).toBe(false);
  });
  it("loads, verifies and rechecks actual current source evidence before commit", async () => {
    const f = await setup();
    const base = await webinarEvidence();
    const p = {
      ...f.principal,
      actorRef: base.version.createdBy,
      locationRef: base.version.locationRef,
    };
    // The evidence decoder and trusted source verifier are exercised independently of DB ownership SQL.
    const approval = await createApprovalDecision(
      {
        approvalRef: "approval_database001",
        campaignVersion: base.version,
        preflight: base.preflight,
        actorRef: p.actorRef,
        actorKind: "human",
        actorRole: "location_admin",
        decidedAt: WEBINAR_NOW,
        ipAuditHash: "a".repeat(64),
        decision: "approved",
        approverDisplayName: undefined,
      },
      createSessionApprovalAuthority(p),
      { assertCurrent: async () => {} },
    );
    const evidence = { ...base, approval, state: "approved" };
    delete (evidence as { rowVersion?: number }).rowVersion;
    f.handle((r) => (r.values[1] === "evidence" ? evidence : null));
    await f.repository.run(f.principal, async (tx) => {
      expect(await tx.loadCurrentEvidence("campaign_database001")).toMatchObject({
        state: "approved",
      });
    });
    expect(f.authority.assertEvidenceCurrent).toHaveBeenCalledTimes(2);
    vi.mocked(f.authority.assertEvidenceCurrent).mockRejectedValueOnce(new Error("withdrawn"));
    await expect(
      f.repository.run(f.principal, async (tx) => tx.loadCurrentEvidence("campaign_database001")),
    ).rejects.toThrow("withdrawn");
  });
  it("rolls back callback errors and closed-context work", async () => {
    const f = await setup();
    await expect(
      f.repository.run(f.principal, async () => {
        throw new Error("callback");
      }),
    ).rejects.toThrow("callback");
    expect(f.calls.at(-1)?.statementName).toBe("transaction.rollback");
  });
  it("resolves only admitted exact selections and saves immutable hash-checked summaries", async () => {
    const f = await setup();
    f.handle((r) =>
      r.values[1] === "selection" ? f.resolved : r.values[1] === "insert-summary" ? f.launch : null,
    );
    await f.repository.run(f.principal, async (tx) => {
      expect(
        await tx.resolveSelection({ version: {} as never, selection: f.summary.selection }),
      ).toEqual(f.resolved);
      expect(await tx.insertSummary(f.summary)).toEqual(f.launch);
    });
    f.respond(null);
    f.handle(() => ({ ...f.resolved, pageRef: "page_foreign001" }));
    await expect(
      f.repository.run(f.principal, (tx) =>
        tx.resolveSelection({ version: {} as never, selection: f.summary.selection }),
      ),
    ).rejects.toThrow("PROVENANCE_UNQUALIFIED");
  });
  it.each(["summary", "projection"])("rejects tampered %s hashes", async (target) => {
    const f = await setup();
    const bad = structuredClone(f.launch);
    if (target === "summary") bad.summary.summaryHash = "0".repeat(64);
    else bad.summary.projection.projectionHash = "0".repeat(64);
    f.handle((r) => (r.values[1] === "load" ? bad : null));
    await expect(
      f.repository.run(f.principal, (tx) => tx.loadLaunch(f.operation.projectionRef)),
    ).rejects.toThrow("HASH_MISMATCH");
  });
  it("finds original operation and atomically reserves exact task, validates principal", async () => {
    const f = await setup();
    f.handle((r) =>
      r.values[1] === "reserve" || r.values[1] === "find-command"
        ? f.operation
        : r.values[1] === "load"
          ? f.launch
          : null,
    );
    await f.repository.run(f.principal, async (tx) => {
      expect(await tx.loadLaunch(f.operation.projectionRef)).toEqual(f.launch);
      expect(await tx.findCommand(f.operation.requestId)).toEqual(f.operation);
      expect(
        await tx.reserveCommand({
          operation: f.operation,
          task: f.task,
          expectedRowVersion: 1,
          expectedState: "reserved",
          principal: f.principal,
        }),
      ).toEqual(f.operation);
      await expect(
        tx.reserveCommand({
          operation: f.operation,
          task: f.task,
          expectedRowVersion: 1,
          expectedState: "reserved",
          principal: { ...f.principal, roleVersion: 2 },
        }),
      ).rejects.toThrow("AUTHORITY_WITHDRAWN");
    });
    const saved = JSON.parse(
      String(f.calls.find((call) => call.values[1] === "reserve")?.values[2]),
    );
    expect(saved.operation).toEqual(f.operation);
    expect(saved.task).toEqual(f.task);
    expect(saved.operation.requestHash).toBe(f.operation.requestHash);
    expect(saved.task.projectionHash).toBe(f.summary.projection.projectionHash);
  });
  it("returns absent owned source, lineage and command without fabricating records", async () => {
    const f = await setup();
    await f.repository.run(f.principal, async (tx) => {
      expect(await tx.loadCurrentEvidence("campaign_database001")).toBeUndefined();
      expect(await tx.loadLaunch("projection_database001")).toBeUndefined();
      expect(await tx.findCommand(f.operation.requestId)).toBeUndefined();
    });
  });
  it("claims a task with bounded lease and reads separate operation/lineage state", async () => {
    const f = await setup();
    f.respond({ ...f.record, status: "leased" });
    expect(
      (
        await f.repository.claim(f.principal, {
          task: f.task,
          workerRef: "worker_database001",
          leaseSeconds: 60,
        })
      ).status,
    ).toBe("leased");
    const claimed = JSON.parse(
      String(f.calls.find((call) => call.values[1] === "claim")?.values[2]),
    );
    expect(claimed.task).toEqual(f.task);
    expect(claimed).toMatchObject({ workerRef: "worker_database001", leaseSeconds: 60 });
    f.respond(f.record);
    expect(await f.repository.readWorker(f.principal, f.operation.operationRef)).toEqual(f.record);
    await expect(
      f.repository.claim(f.principal, {
        task: f.task,
        workerRef: "worker_database001",
        leaseSeconds: 61,
      }),
    ).rejects.toThrow();
  });
  it("discovers strict pending tasks with a bounded tenant limit", async () => {
    const f = await setup();
    f.respond([f.task]);
    expect(await f.repository.pendingTasks(f.principal)).toEqual([f.task]);
    await expect(f.repository.pendingTasks(f.principal, 51)).rejects.toThrow();
  });
  it("checks trusted pre-dispatch authority before recording a possible external effect", async () => {
    const f = await setup();
    f.handle((r) =>
      r.values[1] === "read"
        ? f.record
        : { status: "dispatch-recorded", generation: 1, cancellationGeneration: 0 },
    );
    expect(await f.repository.beginDispatch(f.principal, f.dispatch)).toMatchObject({
      status: "dispatch-recorded",
    });
    expect(f.authority.assertDispatch).toHaveBeenCalledOnce();
    vi.mocked(f.authority.assertDispatch).mockRejectedValueOnce(new Error("media withdrawn"));
    const before = f.calls.length;
    await expect(f.repository.beginDispatch(f.principal, f.dispatch)).rejects.toThrow(
      "media withdrawn",
    );
    expect(f.calls.slice(before).some((c) => c.values[1] === "dispatch")).toBe(false);
  });
  it("records a verified checkpoint and ambiguity without sending another provider request", async () => {
    const f = await setup();
    f.handle((r) => (r.values[1] === "read" ? f.record : { ...f.record, status: "leased" }));
    await f.repository.checkpoint(f.principal, f.checkpoint);
    expect(f.authority.assertCheckpoint).toHaveBeenCalledOnce();
    const { requestHash: _requestHash, ...uncertain } = f.dispatch;
    await f.repository.markUncertain(f.principal, uncertain);
  });
  it.each(["qualification", "pause", "observation"] as const)(
    "parses exact admitted %s proof and refuses missing provenance",
    async (kind) => {
      const f = await setup();
      const value =
        kind === "qualification"
          ? f.proof
          : kind === "pause"
            ? {
                schemaVersion: 1,
                contractId: "CTR-003",
                contractRevision: 1,
                kind: "app_test",
                action: "pause",
                evidenceRef: "evidence_pause001",
                artifactHash: "a".repeat(64),
                projectionHash: f.operation.projectionHash,
                wireMappingHash: "6".repeat(64),
                locationId: "native_location001",
                adAccountId: "act_123456",
                campaignId: "native_campaign001",
                observedAt: f.operation.createdAt,
                expiresAt: f.proof.expiresAt,
              }
            : {
                projectionHash: f.operation.projectionHash,
                nativeIds: {
                  campaignId: "native_campaign001",
                  adsetId: "native_adset001",
                  adId: "native_ad001",
                },
                state: "paused",
                readBackHash: "a".repeat(64),
                observedAt: f.operation.createdAt,
                facebookIds: { campaignId: null, adsetId: null, adId: null },
                metrics: { impressions: null, clicks: null, spendMinor: null },
              };
      f.respond(value);
      expect(
        await f.repository.qualifiedProof(f.principal, f.operation.projectionRef, kind),
      ).toMatchObject({ projectionHash: f.operation.projectionHash });
      f.respond(null);
      await expect(
        f.repository.qualifiedProof(f.principal, f.operation.projectionRef, kind),
      ).rejects.toThrow("PROVENANCE_UNQUALIFIED");
    },
  );
  it("does not commit malformed records or expired owner rechecks", async () => {
    const f = await setup();
    f.respond({ broken: true });
    await expect(f.repository.readWorker(f.principal, f.operation.operationRef)).rejects.toThrow();
    f.respond(f.record);
    vi.mocked(f.authority.currentPrincipal)
      .mockResolvedValueOnce(f.principal)
      .mockResolvedValueOnce({ ...f.principal, roleVersion: 2 });
    await expect(f.repository.readWorker(f.principal, f.operation.operationRef)).rejects.toThrow(
      "AUTHORITY_WITHDRAWN",
    );
  });
  it("serializes only verified strict admission output through the separate pool, releases on failure", async () => {
    const f = await setup();
    const verify = vi.fn(async () => f.receipt);
    expect(
      await createWebinarPublisherAdmissionService(f.pool, { verify }).admit(f.principal, {
        untrusted: "hint",
      }),
    ).toEqual(f.receipt);
    const call = f.calls.at(-1)!;
    expect(call.statementName).toBe("webinar-publisher.admit.v1");
    expect(String(call.values[3])).not.toContain("untrusted");
    const admitted = JSON.parse(String(call.values[3]));
    expect(admitted).toEqual(f.receipt);
    expect(canonicalCampaignHash(admitted)).toBe(canonicalCampaignHash(f.receipt));
    expect(f.calls.some((c) => /set.*role/u.test(c.text))).toBe(false);
    const failing: DatabasePool = {
      connect: async () => ({
        release: f.release,
        execute: async () => {
          throw new Error("no capability");
        },
      }),
    };
    await expect(
      createWebinarPublisherAdmissionService(failing, { verify }).admit(f.principal, null),
    ).rejects.toThrow("no capability");
    expect(f.release).toHaveBeenCalledTimes(2);
  });
  it.each(["token", "revision", "origin", "window", "synthetic", "liveWithoutFacebookIds"])(
    "rejects inadmissible %s evidence",
    async (kind) => {
      const f = await setup();
      let receipt: unknown = structuredClone(f.receipt);
      if (kind === "token") receipt = { ...f.receipt, accessToken: "secret" };
      if (kind === "revision") receipt = { ...f.receipt, contractRevision: 2 };
      if (kind === "origin") receipt = { ...f.receipt, origin: "browser" };
      if (kind === "window") receipt = { ...f.receipt, expiresAt: f.receipt.observedAt };
      if (kind === "synthetic")
        receipt = {
          ...f.receipt,
          kind: "qualification",
          normalized: { ...f.proof, kind: "local_synthetic" },
        };
      if (kind === "liveWithoutFacebookIds")
        receipt = {
          ...f.receipt,
          kind: "observation",
          normalized: {
            projectionHash: f.operation.projectionHash,
            nativeIds: f.launch.nativeIds,
            state: "live",
            readBackHash: "a".repeat(64),
            observedAt: f.operation.createdAt,
            facebookIds: { campaignId: null, adsetId: null, adId: null },
            metrics: { impressions: null, clicks: null, spendMinor: null },
          },
        };
      if (kind !== "synthetic")
        expect(WebinarPublisherAdmissionSchema.safeParse(receipt).success).toBe(false);
      await expect(
        createWebinarPublisherAdmissionService(f.pool, { verify: async () => receipt }).admit(
          f.principal,
          null,
        ),
      ).rejects.toThrow();
      expect(f.calls).toHaveLength(0);
    },
  );
  it("canonical hashes remain unchanged by database JSON property order", async () => {
    const f = await setup();
    const { summaryHash, ...body } = f.summary;
    expect(canonicalCampaignHash({ ...body, pageLabel: body.pageLabel })).toBe(summaryHash);
  });
});
