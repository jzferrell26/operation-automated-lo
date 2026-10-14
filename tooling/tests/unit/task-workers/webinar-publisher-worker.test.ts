import { describe, expect, it, vi } from "vitest";
import { canonicalCampaignHash, webinarPublisherConfirmationHash } from "@oalo/application";
import {
  WebinarPublisherPauseQualificationSchema,
  type WebinarPublisherCheckpoint,
} from "@oalo/contracts";
import { type WebinarPublisherWorkerRecord } from "@oalo/db";
import {
  createWebinarPublisherNativeTransport,
  createWebinarPublisherProjection,
  compileWebinarPublisherDraft,
  hashWebinarPublisherValue,
  WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
} from "@oalo/ghl";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import {
  runWebinarPublisherWorker,
  type WebinarPublisherWorkerPorts,
} from "../../../../apps/tasks/src/core/webinar-publisher-worker.js";

// Synthetic DB fence model and real native compiler/transport. No live App Test is claimed.
function fixture(action: "draft" | "publish" | "pause" | "resume" | "cancel" = "draft") {
  const f = publisherFixture();
  const time = Date.now();
  const now = () => new Date(time);
  const { projectionHash: _hash, ...input } = f.summary.projection;
  f.summary.projection = createWebinarPublisherProjection({
    ...input,
    providerContract: {
      ...input.providerContract,
      wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
    },
  });
  const p = f.summary.projection;
  const { summaryHash: _summary, ...summary } = f.summary;
  f.summary.summaryHash = canonicalCampaignHash(summary);
  Object.assign(f.operation, {
    summaryHash: f.summary.summaryHash,
    projectionHash: p.projectionHash,
    action,
  });
  Object.assign(f.task, { projectionHash: p.projectionHash, action });
  const rehash = () => {
    f.operation.confirmationHash = webinarPublisherConfirmationHash({
      action,
      summary: f.summary,
      nativeIds: f.operation.nativeIdsAtConfirmation,
    });
    f.operation.requestHash = canonicalCampaignHash({
      requestId: f.operation.requestId,
      projectionRef: f.operation.projectionRef,
      expectedProjectionHash: f.operation.projectionHash,
      expectedRowVersion: f.operation.expectedRowVersion,
      action,
      confirmationHash: f.operation.confirmationHash,
    });
  };
  rehash();
  f.proof = {
    ...f.proof,
    projectionHash: p.projectionHash,
    wireMappingHash: WEBINAR_PUBLISHER_WIRE_MAPPING_HASH,
  };
  const media = {
    schemaVersion: 1,
    projectionRef: p.projectionRef,
    projectionHash: p.projectionHash,
    assetRef: p.creative.assetRef,
    digest: p.creative.digest,
    width: 1080,
    height: 1080,
    byteLength: p.creative.byteLength,
    fileId: "media_native001",
    url: "https://example.test/media/approved.png",
    observedAt: p.createdAt,
    expiresAt: p.schedule.endsAt,
  };
  const pauseProof = WebinarPublisherPauseQualificationSchema.parse({
    schemaVersion: 1,
    contractId: "CTR-003",
    contractRevision: 1,
    kind: "app_test",
    action: "pause",
    evidenceRef: "evidence_pauseCurrent001",
    artifactHash: "a".repeat(64),
    projectionHash: p.projectionHash,
    wireMappingHash: p.providerContract.wireMappingHash,
    locationId: p.assets.locationId,
    adAccountId: p.assets.adAccountId,
    campaignId: "campaign_native001",
    observedAt: p.createdAt,
    expiresAt: p.schedule.endsAt,
  });
  const outcome = compileWebinarPublisherDraft({
    projection: p,
    qualification: f.proof,
    media,
    now: now().toISOString(),
  });
  if (!outcome.ok) throw Error("Synthetic worker fixture is invalid");
  const compiled = outcome;
  let record: WebinarPublisherWorkerRecord = {
    operation: f.operation,
    launch: f.launch,
    workerRef: null,
    deadlineAt: new Date(time + 3600000).toISOString(),
    leaseExpiresAt: null,
    cancellationGeneration: 0,
  };
  let busy = false;
  let unresolved = false;
  let nativeStatus = "DRAFT";
  let facebook = false;
  let lostWrite = false;
  let cancelOnResponse = false;
  let late = false;
  const checkpoints: WebinarPublisherCheckpoint[] = [];
  const linked = () => ({
    ...compiled.campaign,
    id: "campaign_native001",
    fbAdAccountId: p.assets.adAccountId,
    publishingStatus: nativeStatus,
    ...(facebook ? { fbCampaignId: "fb_campaign001" } : {}),
    adsets:
      record.launch.nativeIds.adsetId === null
        ? []
        : [
            {
              ...compiled.adset,
              campaignId: "campaign_native001",
              id: "adset_native001",
              publishingStatus: nativeStatus,
              ...(facebook ? { fbAdSetId: "fb_adset001" } : {}),
              ads:
                record.launch.nativeIds.adId === null
                  ? []
                  : [
                      {
                        ...compiled.ad,
                        campaignId: "campaign_native001",
                        adsetId: "adset_native001",
                        id: "ad_native001",
                        publishingStatus: nativeStatus,
                        ...(facebook ? { fbAdId: "fb_ad001" } : {}),
                      },
                    ],
            },
          ],
  });
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    const body = init.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    if (cancelOnResponse) {
      record.cancellationGeneration += 1;
      cancelOnResponse = false;
    }
    if (late) {
      record.operation.leaseGeneration += 1;
      late = false;
    }
    if (lostWrite && init.method !== "GET") {
      lostWrite = false;
      throw Error("Synthetic connection lost after acceptance");
    }
    if (url.includes("publishing-progress"))
      return Response.json({
        campaignId: "campaign_native001",
        publishingStatus: nativeStatus,
        total: 3,
        processed: 3,
        isComplete: true,
        hasFailed: false,
      });
    if (url.endsWith("/publish")) return Response.json(linked());
    if (url.endsWith("/pause") || url.endsWith("/resume")) return Response.json({ success: true });
    if (init.method === "GET") return Response.json(linked());
    if (url.endsWith("/campaigns"))
      return Response.json({
        ...body,
        id: "campaign_native001",
        fbAdAccountId: p.assets.adAccountId,
        publishingStatus: "DRAFT",
      });
    if (url.endsWith("/adsets"))
      return Response.json({ ...body, id: "adset_native001", publishingStatus: "DRAFT" });
    return Response.json({ ...body, id: "ad_native001", publishingStatus: "DRAFT" });
  });
  const repository: WebinarPublisherWorkerPorts["repository"] = {
    readWorker: async () => structuredClone(record),
    qualifiedProof: async (_principal, _projection, kind) =>
      kind === "pause" ? pauseProof : f.proof,
    claim: async (_principal, input) => {
      if (busy) return { status: "busy" as const };
      busy = true;
      record.workerRef = input.workerRef;
      record.operation.leaseGeneration += 1;
      record.leaseExpiresAt = new Date(time + 55000).toISOString();
      record.operation.stage = unresolved
        ? "reconcile"
        : record.operation.stage === "queued"
          ? action === "draft"
            ? "campaign"
            : action === "cancel"
              ? "reconcile"
              : action
          : record.operation.stage;
      record.operation.state = unresolved ? "uncertain" : "drafting";
      return { ...structuredClone(record), status: "leased" as const };
    },
    beginDispatch: async (_principal, raw) => {
      const input = raw as { leaseGeneration: number };
      if (input.leaseGeneration !== record.operation.leaseGeneration || unresolved)
        throw Error("FENCED");
      unresolved = true;
      return {
        status: "dispatch-recorded" as const,
        generation: record.operation.leaseGeneration,
        cancellationGeneration: record.cancellationGeneration,
      };
    },
    checkpoint: async (_principal, raw) => {
      const c = raw as WebinarPublisherCheckpoint;
      if (
        record.cancellationGeneration !== 0 ||
        c.leaseGeneration !== record.operation.leaseGeneration ||
        c.expectedStage !== record.operation.stage
      )
        throw Error("FENCED");
      checkpoints.push(c);
      unresolved = false;
      Object.assign(record.operation, {
        stage: c.stage,
        state: c.state,
        providerObservedAt: c.providerObservedAt,
      });
      if (
        ["parity", "publish", "resume"].includes(c.expectedStage) &&
        c.stage === "complete" &&
        c.state === "failed"
      )
        record.operation.lastSafeFailure = "PARITY_MISMATCH";
      Object.assign(record.launch, { state: c.state, nativeIds: c.nativeIds });
      return { ...structuredClone(record), status: "leased" as const };
    },
    markUncertain: async (_principal, raw) => {
      const c = raw as { leaseGeneration: number };
      if (
        record.cancellationGeneration !== 0 ||
        c.leaseGeneration !== record.operation.leaseGeneration
      )
        throw Error("FENCED");
      record.operation.stage = "reconcile";
      record.operation.state = "uncertain";
      return { ...structuredClone(record), status: "leased" as const };
    },
  };
  const assertCurrent = vi.fn(async () => undefined);
  const admitResponse = vi.fn(async () => undefined);
  const ports: WebinarPublisherWorkerPorts = {
    repository,
    transport: createWebinarPublisherNativeTransport({
      fetch,
      resolveLocationToken: async () => ({
        locationId: p.assets.locationId,
        accessToken: "synthetic_worker_access_token_only",
      }),
      authority: { assertCurrent: async () => undefined },
      now: () => time,
    }),
    assertCurrent,
    media: vi.fn(async () => media),
    admitResponse,
    now,
  };
  return {
    f,
    ports,
    fetch,
    checkpoints,
    assertCurrent,
    admitResponse,
    compiled,
    linked,
    record: () => record,
    ready: () => {
      record.launch.nativeIds = {
        campaignId: "campaign_native001",
        adsetId: "adset_native001",
        adId: "ad_native001",
      };
      if (action !== "draft") {
        f.operation.nativeIdsAtConfirmation = { ...record.launch.nativeIds };
        rehash();
      }
    },
    release: () => {
      busy = false;
      record.leaseExpiresAt = null;
    },
    lost: () => {
      lostWrite = true;
    },
    cancel: () => {
      cancelOnResponse = true;
    },
    late: () => {
      late = true;
    },
    status: (value: string, ids = false) => {
      nativeStatus = value;
      facebook = ids;
    },
    unresolved: () => {
      unresolved = true;
    },
  };
}
const worker = "worker_publisher001";
describe("native webinar persisted stage consumer", () => {
  it.each(["headline", "account", "adId", "media", "schedule", "budget", "geography"] as const)(
    "refuses changed %s before publish dispatch",
    async (field) => {
      const h = fixture("publish");
      h.ready();
      const begin = vi.spyOn(h.ports.repository, "beginDispatch");
      const original = h.fetch.getMockImplementation()!;
      h.fetch.mockImplementation(async (url, init) => {
        if (init.method !== "GET" || !url.includes("/campaign/")) return original(url, init);
        const data = h.linked();
        if (field === "headline")
          data.adsets[0]!.ads[0]!.headlines = [{ text: "Remote changed headline" }];
        if (field === "account") data.fbAdAccountId = "act_999999";
        if (field === "adId") data.adsets[0]!.ads[0]!.id = "ad_foreign001";
        if (field === "media")
          data.adsets[0]!.ads[0]!.media[0]!.src = "https://example.test/media/drift.png";
        if (field === "schedule")
          data.adsets[0]!.budget.scheduleEndDate = new Date(
            Date.parse(h.f.summary.projection.schedule.endsAt) + 1000,
          ).toISOString();
        if (field === "budget") data.adsets[0]!.budget.amount += 1;
        if (field === "geography") data.adsets[0]!.audience.geoLocations[0]!.key = "999999";
        return Response.json(data);
      });
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).resolves.toMatchObject({ disposition: "complete", state: "failed" });
      expect(begin).not.toHaveBeenCalled();
      expect(h.fetch.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
      expect(h.checkpoints.at(-1)).toMatchObject({
        expectedStage: "publish",
        stage: "complete",
        state: "failed",
        nativeIds: h.record().launch.nativeIds,
      });
      expect(h.record().operation.lastSafeFailure).toBe("PARITY_MISMATCH");
    },
  );
  it.each(["unavailable", "malformed"])(
    "does not manufacture failure standing from %s pre-publish GET",
    async (mode) => {
      const h = fixture("publish");
      h.ready();
      const begin = vi.spyOn(h.ports.repository, "beginDispatch");
      const original = h.fetch.getMockImplementation()!;
      h.fetch.mockImplementation(async (url, init) =>
        init.method === "GET" && url.includes("/campaign/")
          ? mode === "unavailable"
            ? new Response("", { status: 503 })
            : Response.json({ id: "campaign_native001" })
          : original(url, init),
      );
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).rejects.toThrow();
      expect(begin).not.toHaveBeenCalled();
      expect(h.checkpoints).toHaveLength(0);
      expect(h.admitResponse).not.toHaveBeenCalled();
      expect(h.fetch.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
    },
  );
  it("refuses cancellation during the fresh draft read before recording publish dispatch", async () => {
    const h = fixture("publish");
    h.ready();
    h.cancel();
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow();
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("requires independently verified fresh draft standing before publish reservation", async () => {
    const h = fixture("publish");
    h.ready();
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    h.admitResponse.mockRejectedValueOnce(Error("Unverified capture"));
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow("Unverified capture");
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("rechecks proof expiry after the fresh read before publish reservation", async () => {
    const h = fixture("publish");
    h.ready();
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (init.method === "GET")
        h.f.proof.expiresAt = new Date(h.ports.now().getTime() - 1).toISOString();
      return response;
    });
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toMatchObject({ code: "PROVIDER_UNQUALIFIED" });
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it.each(["headline", "account", "adId", "media", "schedule", "budget", "geography"] as const)(
    "refuses changed %s before resume dispatch",
    async (field) => {
      const h = fixture("resume");
      h.ready();
      h.status("PAUSED", true);
      const begin = vi.spyOn(h.ports.repository, "beginDispatch");
      const original = h.fetch.getMockImplementation()!;
      h.fetch.mockImplementation(async (url, init) => {
        if (init.method !== "GET" || !url.includes("/campaign/")) return original(url, init);
        const data = h.linked();
        if (field === "headline")
          data.adsets[0]!.ads[0]!.headlines = [{ text: "Remote changed headline" }];
        if (field === "account") data.fbAdAccountId = "act_999999";
        if (field === "adId") data.adsets[0]!.ads[0]!.id = "ad_foreign001";
        if (field === "media")
          data.adsets[0]!.ads[0]!.media[0]!.src = "https://example.test/media/drift.png";
        if (field === "schedule")
          data.adsets[0]!.budget.scheduleEndDate = new Date(
            Date.parse(h.f.summary.projection.schedule.endsAt) + 1000,
          ).toISOString();
        if (field === "budget") data.adsets[0]!.budget.amount += 1;
        if (field === "geography") data.adsets[0]!.audience.geoLocations[0]!.key = "999999";
        return Response.json(data);
      });
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).resolves.toMatchObject({ disposition: "complete", state: "failed" });
      expect(begin).not.toHaveBeenCalled();
      expect(h.fetch.mock.calls.some(([url]) => url.endsWith("/resume"))).toBe(false);
      expect(h.checkpoints.at(-1)).toMatchObject({
        expectedStage: "resume",
        stage: "complete",
        state: "failed",
        nativeIds: h.record().launch.nativeIds,
      });
      expect(h.record().operation.lastSafeFailure).toBe("PARITY_MISMATCH");
    },
  );
  it.each(["unavailable", "malformed"])(
    "does not manufacture failure standing from %s pre-resume GET",
    async (mode) => {
      const h = fixture("resume");
      h.ready();
      h.status("PAUSED", true);
      const begin = vi.spyOn(h.ports.repository, "beginDispatch");
      const original = h.fetch.getMockImplementation()!;
      h.fetch.mockImplementation(async (url, init) =>
        init.method === "GET" && url.includes("/campaign/")
          ? mode === "unavailable"
            ? new Response("", { status: 503 })
            : Response.json({ id: "campaign_native001" })
          : original(url, init),
      );
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).rejects.toThrow();
      expect(begin).not.toHaveBeenCalled();
      expect(h.checkpoints).toHaveLength(0);
      expect(h.admitResponse).not.toHaveBeenCalled();
      expect(h.fetch.mock.calls.some(([url]) => url.endsWith("/resume"))).toBe(false);
    },
  );
  it("refuses cancellation during the fresh paused read before recording resume dispatch", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED", true);
    h.cancel();
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow();
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("requires independently verified fresh paused standing before resume reservation", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED", true);
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    h.admitResponse.mockRejectedValueOnce(Error("Unverified capture"));
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow("Unverified capture");
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("rechecks proof expiry after the fresh read before resume reservation", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED", true);
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (init.method === "GET")
        h.f.proof.expiresAt = new Date(h.ports.now().getTime() - 1).toISOString();
      return response;
    });
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toMatchObject({ code: "PROVIDER_UNQUALIFIED" });
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("verifies paused linked parity before resume and observes actual live standing", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED", true);
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) => {
      if (url.endsWith("/resume")) h.status("PUBLISHED", true);
      return original(url, init);
    });
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "complete", state: "live" },
    );
    expect(h.fetch.mock.calls.map(([url, init]) => [init.method, new URL(url).pathname])).toEqual([
      ["GET", "/ad-publishing/facebook/campaign/campaign_native001"],
      ["POST", "/ad-publishing/facebook/campaigns/campaign_native001/resume"],
      ["GET", "/ad-publishing/facebook/campaigns/campaign_native001/publishing-progress"],
      ["GET", "/ad-publishing/facebook/campaign/campaign_native001"],
    ]);
    expect(h.admitResponse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operation: "linked",
        state: "paused",
        nativeIds: h.record().launch.nativeIds,
      }),
    );
    expect(h.admitResponse.mock.invocationCallOrder[0]).toBeLessThan(
      begin.mock.invocationCallOrder[0]!,
    );
    expect(h.checkpoints[0]).toMatchObject({ state: "resume_pending", stage: "progress" });
  });
  it("refuses resume of paused drafts without actual published Facebook IDs", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED");
    const begin = vi.spyOn(h.ports.repository, "beginDispatch");
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "complete", state: "failed" },
    );
    expect(begin).not.toHaveBeenCalled();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints[0]).toMatchObject({
      expectedStage: "resume",
      stage: "complete",
      state: "failed",
      requestHash: null,
    });
  });
  it.each(["DRAFT", "FAILED", "IN_REVIEW"])(
    "refuses resume with unhealthy child standing %s",
    async (status) => {
      const h = fixture("resume");
      h.ready();
      h.status("PAUSED", true);
      const original = h.fetch.getMockImplementation()!;
      h.fetch.mockImplementation(async (url, init) => {
        if (init.method !== "GET" || !url.includes("/campaign/")) return original(url, init);
        const linked = h.linked();
        linked.adsets[0]!.ads[0]!.publishingStatus = status;
        return Response.json(linked);
      });
      const begin = vi.spyOn(h.ports.repository, "beginDispatch");
      expect(
        await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).toMatchObject({ disposition: "complete", state: "failed" });
      expect(begin).not.toHaveBeenCalled();
      expect(h.fetch).toHaveBeenCalledTimes(1);
      expect(h.record().operation.lastSafeFailure).toBe("PARITY_MISMATCH");
    },
  );
  it("rechecks cancellation after resume reservation immediately before POST", async () => {
    const h = fixture("resume");
    h.ready();
    h.status("PAUSED", true);
    const original = h.ports.repository.beginDispatch.bind(h.ports.repository);
    vi.spyOn(h.ports.repository, "beginDispatch").mockImplementation(async (...args) => {
      const receipt = await original(...args);
      h.record().cancellationGeneration += 1;
      return receipt;
    });
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow();
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.fetch.mock.calls[0]?.[1].method).toBe("GET");
    expect(h.checkpoints).toHaveLength(0);
  });
  it("persists terminal parity refusal with exact IDs and no publish", async () => {
    const h = fixture();
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) => {
      const response = await original(url, init);
      if (init.method !== "GET") return response;
      const linked = h.linked();
      linked.adsets[0]!.ads[0]!.headlines = [{ text: "Unapproved headline drift" }];
      return Response.json(linked);
    });
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).resolves.toMatchObject({ disposition: "complete", state: "failed", stage: "complete" });
    expect(h.checkpoints.at(-1)).toMatchObject({
      expectedStage: "parity",
      stage: "complete",
      state: "failed",
      nativeIds: {
        campaignId: "campaign_native001",
        adsetId: "adset_native001",
        adId: "ad_native001",
      },
    });
    expect(h.record().operation.lastSafeFailure).toBe("PARITY_MISMATCH");
    expect(h.admitResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({
        operation: "linked",
        state: "failed",
        normalized: expect.any(Object),
        readBackHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );
    expect(h.fetch.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
  });
  it.each(["campaign", "adset", "ad"] as const)(
    "reconciles retained %s readback before any next create",
    async (stage) => {
      const h = fixture();
      h.unresolved();
      h.record().launch.nativeIds = {
        campaignId: "campaign_native001",
        adsetId: stage === "campaign" ? null : "adset_native001",
        adId: stage === "ad" ? "ad_native001" : null,
      };
      const r = await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports);
      expect(r).toMatchObject({
        disposition: "pending",
        state: "drafting",
        stage: stage === "campaign" ? "adset" : stage === "adset" ? "ad" : "parity",
      });
      expect(h.fetch).toHaveBeenCalledTimes(1);
      expect(h.fetch.mock.calls[0]?.[1].method).toBe("GET");
      expect(h.checkpoints[0]?.requestHash).toMatch(/^[a-f0-9]{64}$/u);
      expect(h.admitResponse).toHaveBeenCalledWith(
        expect.objectContaining({ state: "drafting", nativeIds: h.record().launch.nativeIds }),
      );
    },
  );
  it("creates three distinct drafts and verifies linked parity, without publishing", async () => {
    const h = fixture();
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "complete", state: "draft_ready" },
    );
    expect(h.fetch.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      "/ad-publishing/facebook/campaigns",
      "/ad-publishing/facebook/adsets",
      "/ad-publishing/facebook/ads",
      "/ad-publishing/facebook/campaign/campaign_native001",
    ]);
    expect(h.checkpoints.map((c) => c.stage)).toEqual(["adset", "ad", "parity", "complete"]);
    expect(h.admitResponse).toHaveBeenCalledTimes(4);
  });
  it("serializes duplicate delivery and checks current authority on complete replay", async () => {
    const h = fixture();
    const results = await Promise.all([
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      runWebinarPublisherWorker(h.f.task, h.f.principal, "worker_duplicate001", h.ports),
    ]);
    expect(results.map((r) => r.disposition).sort()).toEqual(["busy", "complete"]);
    expect(h.fetch.mock.calls.filter(([, init]) => init.method === "PUT")).toHaveLength(3);
    h.assertCurrent.mockRejectedValueOnce(Error("Withdrawn"));
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toThrow("Withdrawn");
    expect(h.fetch).toHaveBeenCalledTimes(4);
  });
  it("retains unknown IDs after ambiguous create and never sends that create again", async () => {
    const h = fixture();
    h.lost();
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "uncertain" },
    );
    h.release();
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "uncertain" },
    );
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.record().launch.nativeIds.campaignId).toBeNull();
  });
  it.each(["cancel", "late"] as const)(
    "fences %s response without advancing stages or another write",
    async (mode) => {
      const h = fixture();
      h[mode]();
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).rejects.toThrow("FENCED");
      expect(h.fetch).toHaveBeenCalledTimes(1);
      expect(h.checkpoints).toHaveLength(0);
    },
  );
  it("treats queued publish acknowledgement as pending, never live", async () => {
    const h = fixture("publish");
    h.ready();
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "uncertain", state: "uncertain" },
    );
    expect(h.checkpoints[0]).toMatchObject({ state: "publish_queued", stage: "progress" });
    expect(h.fetch.mock.calls.map(([url, init]) => [init.method, new URL(url).pathname])).toEqual([
      ["GET", "/ad-publishing/facebook/campaign/campaign_native001"],
      ["POST", "/ad-publishing/facebook/campaigns/campaign_native001/publish"],
      ["GET", "/ad-publishing/facebook/campaigns/campaign_native001/publishing-progress"],
      ["GET", "/ad-publishing/facebook/campaign/campaign_native001"],
    ]);
  });
  it("requires all real Facebook IDs and actual linked parity before live", async () => {
    const h = fixture("publish");
    h.ready();
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) => {
      if (url.endsWith("/publish")) h.status("PUBLISHED", true);
      return original(url, init);
    });
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "complete", state: "live" },
    );
    expect(h.checkpoints.at(-1)).toMatchObject({
      providerObservedAt: expect.any(String),
      state: "live",
    });
  });
  it.each(["PAUSED", "PUBLISHED"])(
    "pause reads owned lineage without creative media (%s)",
    async (status) => {
      const h = fixture("pause");
      h.ready();
      h.status(status, true);
      vi.mocked(h.ports.media).mockRejectedValue(Error("Expired creative"));
      expect(
        await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).toMatchObject({ state: status === "PAUSED" ? "paused" : "uncertain" });
      expect(h.ports.media).not.toHaveBeenCalled();
      expect(h.fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each(["locationRef", "projectionHash", "action", "correlationRef"])(
    "rejects task drift in %s before claim/send",
    async (key) => {
      const h = fixture();
      const value =
        key === "action"
          ? "pause"
          : key === "projectionHash"
            ? "f".repeat(64)
            : "foreign_reference001";
      await expect(
        runWebinarPublisherWorker({ ...h.f.task, [key]: value }, h.f.principal, worker, h.ports),
      ).rejects.toThrow();
      expect(h.fetch).not.toHaveBeenCalled();
    },
  );
  it("aborted delivery causes no send", async () => {
    const h = fixture();
    const controller = new AbortController();
    controller.abort();
    expect(
      await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports, controller.signal),
    ).toMatchObject({ disposition: "pending" });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("expired work budget remains pending without a provider send", async () => {
    const h = fixture();
    const ports = { ...h.ports, now: () => new Date(Date.parse(h.record().deadlineAt) + 1) };
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, ports)).toMatchObject({
      disposition: "pending",
    });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it.each(["confirmationHash", "requestHash"] as const)(
    "refuses retained %s drift before send",
    async (field) => {
      const h = fixture();
      h.record().operation[field] = "f".repeat(64);
      await expect(
        runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
      ).rejects.toMatchObject({ code: "TASK_MISMATCH" });
      expect(h.fetch).not.toHaveBeenCalled();
    },
  );
  it("will not adopt previously unknown IDs from a linked response", async () => {
    const h = fixture();
    h.unresolved();
    h.record().launch.nativeIds = { campaignId: "campaign_native001", adsetId: null, adId: null };
    const extra = {
      ...h.linked(),
      adsets: [
        {
          ...h.compiled.adset,
          campaignId: "campaign_native001",
          id: "adset_unrecorded001",
          publishingStatus: "DRAFT",
          ads: [],
        },
      ],
    };
    h.fetch.mockResolvedValueOnce(Response.json(extra));
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toMatchObject({ code: "PARITY_MISMATCH" });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(h.checkpoints).toHaveLength(0);
  });
  it("records uncertainty for foreign publish acknowledgement before progress", async () => {
    const h = fixture("publish");
    h.ready();
    const foreign = h.linked();
    foreign.adsets[0]!.id = "adset_foreign001";
    const original = h.fetch.getMockImplementation()!;
    h.fetch.mockImplementation(async (url, init) =>
      url.endsWith("/publish") ? Response.json(foreign) : original(url, init),
    );
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports)).toMatchObject(
      { disposition: "uncertain" },
    );
    expect(h.checkpoints).toHaveLength(0);
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });
  it("refuses fixture-shaped synthetic provider proof", async () => {
    const h = fixture();
    h.f.proof.kind = "local_synthetic";
    await expect(
      runWebinarPublisherWorker(h.f.task, h.f.principal, worker, h.ports),
    ).rejects.toMatchObject({ code: "PROVIDER_UNQUALIFIED" });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it("does not bless mismatched normalized response hashes", async () => {
    const h = fixture();
    const ports = {
      ...h.ports,
      transport: {
        execute: vi.fn(async () => ({
          normalized: h.linked(),
          requestHash: hashWebinarPublisherValue({}),
          normalizedResultHash: "f".repeat(64),
          rateLimit: {},
        })),
      },
    };
    expect(await runWebinarPublisherWorker(h.f.task, h.f.principal, worker, ports)).toMatchObject({
      disposition: "uncertain",
    });
    expect(h.checkpoints).toHaveLength(0);
  });
});
