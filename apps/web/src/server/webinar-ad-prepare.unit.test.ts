import { afterEach, describe, expect, it } from "vitest";
import { canonicalCampaignHash, executeHumanCampaignApproval } from "@oalo/application";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import { singleActorSessionFixture } from "./signed-session.test-support.js";
import { handleWebinarAdPrepare } from "./webinar-ad-http.js";
import { prepareWebinarAdVersion } from "./webinar-ad-prepare.js";
import { buildWebinarAdReview, readWebinarVersion } from "./webinar-ad-read.js";
import {
  webinarMemoryAdapter,
  WEBINAR_TEST_BRAND as brand,
  WEBINAR_TEST_DESTINATION as destination,
  WEBINAR_TEST_INPUT as input,
  WEBINAR_TEST_PRINCIPAL as principal,
} from "./webinar-ad.test-support.js";

const store = createTemporaryCampaignStore("oalo-webinar-producer-");
afterEach(() => store.restore());
async function fixture() {
  await store.enter();
  const environment = store.env();
  const adapter = webinarMemoryAdapter();
  return {
    environment,
    adapter,
    preparation: {
      readBrand: async () => brand,
      resolveDestination: async () => destination,
      now: () => new Date("2026-10-13T12:00:00.000Z"),
    },
  };
}
function request(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/webinar-ads", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
describe("webinar preparation boundary with actual fixed-font PNG regeneration", () => {
  it("saves exact raster evidence and clamped UTC end, then converges on the original retry", async () => {
    const f = await fixture();
    const first = await prepareWebinarAdVersion(input, principal, f.environment, {
      ...f.preparation,
      adapter: f.adapter,
    });
    const second = await prepareWebinarAdVersion(input, principal, f.environment, {
      ...f.preparation,
      adapter: f.adapter,
    });
    expect(second.duplicate).toBe(true);
    expect(second.version).toEqual(first.version);
    expect(second.preflight).toEqual(first.preflight);
    const manifest = first.version.manifest;
    if (manifest.blueprintId !== "webinar-ad") throw new Error("Expected webinar variant");
    expect(manifest.schedule.endsAt).toBe(destination.eventStartsAt);
    expect(manifest.destinationHash).toBe(canonicalCampaignHash(destination));
    expect(manifest.meta.enabled).toBe(false);
    expect(manifest.images.map((image) => [image.shape, image.width, image.height])).toEqual([
      ["tall", 1080, 1350],
      ["square", 1080, 1080],
    ]);
    expect(first.preflight.blocking).toBe(false);
    expect(await f.adapter.readRepository.listVersionsOf(first.version.campaignRef)).toHaveLength(
      1,
    );
  });
  it("returns 201 then 200 from the authenticated HTTP handler with private correlation headers", async () => {
    const f = await fixture(),
      session = singleActorSessionFixture(principal);
    const dependencies = { adapter: () => f.adapter, preparation: f.preparation };
    const first = await handleWebinarAdPrepare(
      request(input, session.headersFor(principal.actorRef)),
      f.environment,
      session.ports,
      dependencies,
    );
    expect(first.status).toBe(201);
    expect(first.headers.get("cache-control")).toBe("private, no-store");
    expect(first.headers.get("x-oalo-correlation-ref")).toMatch(/^correlation_/u);
    const saved = await first.json();
    expect(saved.providerEnabled).toBe(false);
    const retry = await handleWebinarAdPrepare(
      request(input, session.headersFor(principal.actorRef)),
      f.environment,
      session.ports,
      dependencies,
    );
    expect(retry.status).toBe(200);
    expect((await retry.json()).campaignVersionRef).toBe(saved.campaignVersionRef);
  });
  it.each(["brand", "destinationUrl", "actorRef", "approval", "sourceHash"])(
    "rejects browser override %s without append",
    async (key) => {
      const f = await fixture(),
        session = singleActorSessionFixture(principal);
      const response = await handleWebinarAdPrepare(
        request({ ...input, [key]: "untrusted" }, session.headersFor(principal.actorRef)),
        f.environment,
        session.ports,
        { adapter: () => f.adapter, preparation: f.preparation },
      );
      expect(response.status).toBe(400);
      expect(await f.adapter.readRepository.listForLocation()).toEqual([]);
    },
  );
  it("refuses foreign publisher, incomplete brand, expired schedule, and co-brand words before saving", async () => {
    const f = await fixture();
    const prepare = (
      changes: Partial<Parameters<typeof prepareWebinarAdVersion>[3]>,
      body: unknown = input,
    ) =>
      prepareWebinarAdVersion(body, principal, f.environment, {
        ...f.preparation,
        adapter: f.adapter,
        ...changes,
      });
    await expect(
      prepare({
        resolveDestination: async () => ({
          ...destination,
          publisherActorRef: "principal_other001",
        }),
      }),
    ).rejects.toThrow("not accessible");
    await expect(prepare({ readBrand: async () => ({ ...brand, saved: false }) })).rejects.toThrow(
      "WEBINAR_BRAND_INCOMPLETE",
    );
    await expect(prepare({}, { ...input, endsOn: "2020-01-01" })).rejects.toThrow(
      "WEBINAR_SCHEDULE_INVALID",
    );
    await expect(
      prepare(
        { readBrand: async () => ({ ...brand, partnerNames: ["Fictional Realty"] }) },
        { ...input, headline: "Learn with Fictional Realty" },
      ),
    ).rejects.toThrow("WEBINAR_PREFLIGHT_BLOCKED");
    expect(await f.adapter.readRepository.listForLocation()).toEqual([]);
  });
  it("refuses conflicting exact retry and stale genuinely new edits but permits original retries after advancement", async () => {
    const f = await fixture(),
      deps = { ...f.preparation, adapter: f.adapter };
    const first = await prepareWebinarAdVersion(input, principal, f.environment, deps);
    await expect(
      prepareWebinarAdVersion(
        { ...input, headline: "Another educational headline" },
        principal,
        f.environment,
        deps,
      ),
    ).rejects.toThrow("different immutable content");
    const second = await prepareWebinarAdVersion(
      {
        ...input,
        requestId: "00000000-0000-4000-8000-000000000904",
        campaignRef: first.version.campaignRef,
        expectedCampaignVersionRef: first.version.campaignVersionRef,
      },
      principal,
      f.environment,
      deps,
    );
    expect(second.version.versionNo).toBe(2);
    await expect(
      prepareWebinarAdVersion(
        {
          ...input,
          requestId: "00000000-0000-4000-8000-000000000905",
          campaignRef: first.version.campaignRef,
          expectedCampaignVersionRef: first.version.campaignVersionRef,
        },
        principal,
        f.environment,
        deps,
      ),
    ).rejects.toThrow("WEBINAR_VERSION_CONFLICT");
    expect((await prepareWebinarAdVersion(input, principal, f.environment, deps)).duplicate).toBe(
      true,
    );
  });
  it("returns incomplete save with safe references, remains unapprovable, then recovers exact original version", async () => {
    const f = await fixture(),
      session = singleActorSessionFixture(principal);
    const broken = {
      ...f.adapter,
      persistDraft: async () => {
        throw new Error("database detail must stay private");
      },
    };
    const failed = await handleWebinarAdPrepare(
      request(input, session.headersFor(principal.actorRef)),
      f.environment,
      session.ports,
      { adapter: () => broken, preparation: f.preparation },
    );
    expect(failed.status).toBe(503);
    const body = await failed.json();
    expect(body).toMatchObject({ error: "WEBINAR_SAVE_INCOMPLETE", incompleteSave: true });
    expect(JSON.stringify(body)).not.toContain("database detail");
    expect(await f.adapter.readRepository.listForLocation()).toEqual([]);
    const version = await readWebinarVersion(
      principal,
      { campaignRef: body.campaignRef, campaignVersionRef: body.campaignVersionRef },
      f.adapter,
    );
    const review = await buildWebinarAdReview(
      version,
      principal,
      f.environment,
      { assertCurrent: async () => {} },
      async () => ({
        destination,
        title: "Original published title",
        learningSummary: "Learn the buying steps",
      }),
    );
    expect(review.current).toEqual({ available: false, error: "WEBINAR_SAVE_INCOMPLETE" });
    expect(review.incompleteSave).toBe(true);
    await expect(
      executeHumanCampaignApproval(
        {
          campaignRef: body.campaignRef,
          decision: "approved",
          decidedAt: new Date(),
          ipAuditHash: "b".repeat(64),
          correlationRef: "correlation_webinartest001",
          approverDisplayName: undefined,
          expectedCampaignVersionRef: body.campaignVersionRef,
          expectedManifestHash: version.version.manifestHash,
          expectedPreflightResultHash: "a".repeat(64),
          expectedRowVersion: 1,
        },
        { ...principal, role: "location_admin" },
        f.adapter.approvalRepository,
        { standingOf: async () => undefined },
        {
          assertCurrent: async () => {
            throw new Error("Must not reach evidence without preflight");
          },
        },
      ),
    ).rejects.toThrow("not accessible");
    const recovered = await prepareWebinarAdVersion(input, principal, f.environment, {
      ...f.preparation,
      adapter: f.adapter,
    });
    expect(recovered.duplicate).toBe(true);
    expect(recovered.version.campaignVersionRef).toBe(body.campaignVersionRef);
    expect(recovered.preflight.blocking).toBe(false);
  });
  it("refuses real-mode synthetic principal, revoked session, wrong origin, and signed viewer", async () => {
    const f = await fixture(),
      session = singleActorSessionFixture(principal);
    const run = (headers: HeadersInit, auth = session.ports) =>
      handleWebinarAdPrepare(
        request(input, headers),
        { ...f.environment, OALO_REVIEW_SURFACE: "authorized" },
        auth,
        { adapter: () => f.adapter, preparation: f.preparation },
      );
    expect((await run({})).status).toBe(401);
    expect(
      (await run(session.headersFor(principal.actorRef, { origin: "https://hostile.example" })))
        .status,
    ).toBe(403);
    expect(
      (
        await run(session.headersFor(principal.actorRef), {
          ...session.ports,
          roleBindings: { currentRoleVersion: async () => undefined },
        })
      ).status,
    ).toBe(401);
    const viewer = { ...principal, role: "viewer" as const },
      viewerSession = singleActorSessionFixture(viewer);
    expect((await run(viewerSession.headersFor(viewer.actorRef), viewerSession.ports)).status).toBe(
      403,
    );
    await expect(
      prepareWebinarAdVersion(
        input,
        { ...principal, authenticationMode: "local_synthetic" },
        f.environment,
        { ...f.preparation, adapter: f.adapter },
      ),
    ).rejects.toThrow("WEBINAR_REAL_WORKSPACE_REQUIRED");
  });
  it("bounds raw JSON and rejects missing edit authority without allocating a version", async () => {
    const f = await fixture(),
      session = singleActorSessionFixture(principal);
    const run = (body: unknown) =>
      handleWebinarAdPrepare(
        request(body, session.headersFor(principal.actorRef)),
        f.environment,
        session.ports,
        { adapter: () => f.adapter, preparation: f.preparation },
      );
    expect((await run("{")).status).toBe(400);
    expect((await run(JSON.stringify({ ...input, headline: "x".repeat(9000) }))).status).toBe(400);
    expect((await run({ ...input, campaignRef: "campaign_missing001" })).status).toBe(400);
    expect(
      (await run({ ...input, expectedCampaignVersionRef: "campaignversion_missing001" })).status,
    ).toBe(400);
    expect(
      (
        await run({
          ...input,
          campaignRef: "campaign_missing001",
          expectedCampaignVersionRef: "campaignversion_missing001",
        })
      ).status,
    ).toBe(404);
    expect(await f.adapter.readRepository.listForLocation()).toEqual([]);
  });
  it("normalizes UUID spelling before reference and request hashing", async () => {
    const f = await fixture(),
      deps = { ...f.preparation, adapter: f.adapter };
    const requestId = "abcdefab-cdef-4abc-8def-abcdefabcdef";
    const first = await prepareWebinarAdVersion(
      { ...input, requestId },
      principal,
      f.environment,
      deps,
    );
    const retry = await prepareWebinarAdVersion(
      { ...input, requestId: requestId.toUpperCase() },
      principal,
      f.environment,
      deps,
    );
    expect(retry.duplicate).toBe(true);
    expect(retry.version).toEqual(first.version);
    expect(await f.adapter.readRepository.listVersionsOf(first.version.campaignRef)).toHaveLength(
      1,
    );
  });
});
