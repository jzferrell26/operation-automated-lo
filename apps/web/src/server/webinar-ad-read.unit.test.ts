import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalCampaignHash } from "@oalo/application";
import { createHash } from "node:crypto";
import { createTemporaryCampaignStore } from "./campaign-command-test-support.js";
import { singleActorSessionFixture } from "./signed-session.test-support.js";
import { prepareWebinarAdVersion } from "./webinar-ad-prepare.js";
import { buildWebinarAdReview, handleWebinarAdArt, readWebinarVersion } from "./webinar-ad-read.js";
import { buildCampaignListRow, buildCampaignPage } from "./campaign-page-data.js";
import { readHome } from "./home-reads.js";
import {
  webinarMemoryAdapter,
  WEBINAR_TEST_BRAND as brand,
  WEBINAR_TEST_DESTINATION as destination,
  WEBINAR_TEST_INPUT as input,
  WEBINAR_TEST_PRINCIPAL as principal,
} from "./webinar-ad.test-support.js";

const store = createTemporaryCampaignStore("oalo-webinar-read-");
afterEach(async () => {
  await store.restore();
  vi.restoreAllMocks();
});
async function fixture() {
  await store.enter();
  const environment = store.env(),
    adapter = webinarMemoryAdapter();
  const saved = await prepareWebinarAdVersion(input, principal, environment, {
    adapter,
    readBrand: async () => brand,
    resolveDestination: async () => destination,
    now: () => new Date("2026-10-13T12:00:00.000Z"),
  });
  return {
    environment,
    adapter,
    saved,
    params: {
      campaignRef: saved.version.campaignRef,
      campaignVersionRef: saved.version.campaignVersionRef,
    },
  };
}
const noLibrary = { find: () => undefined, standingOf: () => undefined };
describe("authenticated frozen webinar art and refusal projections", () => {
  it.each(["tall", "square"] as const)(
    "downloads exact %s PNG with private headers without requiring current destination eligibility",
    async (shape) => {
      const f = await fixture(),
        session = singleActorSessionFixture(principal);
      const request = new Request(
        "https://app.operation-automated-lo.test/api/campaigns/webinar-ads/art",
        { headers: session.headersFor(principal.actorRef) },
      );
      const response = await handleWebinarAdArt(
        request,
        { ...f.params, shape },
        f.environment,
        session.ports,
        () => f.adapter,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("content-disposition")).toContain(`-${shape}.png`);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      const digest = createHash("sha256")
        .update(new Uint8Array(await response.arrayBuffer()))
        .digest("hex");
      if (f.saved.version.manifest.blueprintId !== "webinar-ad")
        throw new Error("Expected webinar");
      expect(digest).toBe(f.saved.version.manifest.images[shape === "tall" ? 0 : 1].contentSha256);
    },
  );
  it("refuses absent auth, unknown version, foreign workspace, traversal and corrupt frozen raster", async () => {
    const f = await fixture(),
      session = singleActorSessionFixture(principal);
    const authenticated = new Request(
      "https://app.operation-automated-lo.test/api/campaigns/webinar-ads/art",
      { headers: session.headersFor(principal.actorRef) },
    );
    const denied = await handleWebinarAdArt(
      new Request(authenticated.url),
      { ...f.params, shape: "tall" },
      { ...f.environment, OALO_REVIEW_SURFACE: "authorized" },
      session.ports,
      () => f.adapter,
    );
    expect(denied.status).toBe(401);
    expect(
      (
        await handleWebinarAdArt(
          authenticated,
          { ...f.params, campaignVersionRef: "campaignversion_missing001", shape: "tall" },
          f.environment,
          session.ports,
          () => f.adapter,
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await handleWebinarAdArt(
          authenticated,
          { ...f.params, shape: "../square" },
          f.environment,
          session.ports,
          () => f.adapter,
        )
      ).status,
    ).toBe(400);
    await expect(
      readWebinarVersion({ ...principal, locationRef: "location_foreign001" }, f.params, f.adapter),
    ).rejects.toThrow("not accessible");
    const broken = structuredClone(f.saved.version);
    if (broken.manifest.blueprintId !== "webinar-ad") throw new Error("Expected webinar");
    broken.manifest.images[0].contentSha256 = "f".repeat(64);
    const changed = { ...broken, manifestHash: canonicalCampaignHash(broken.manifest) };
    const adapter = {
      ...f.adapter,
      readRepository: {
        ...f.adapter.readRepository,
        listVersionsOf: async () => [{ version: changed, preflight: f.saved.preflight }],
      },
    };
    const failed = await handleWebinarAdArt(
      authenticated,
      { ...f.params, shape: "tall" },
      f.environment,
      session.ports,
      () => adapter,
    );
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "WEBINAR_RASTER_CHANGED" });
  });
  it("suppresses stale approval and ready chips while preserving review details and a distinct historic title", async () => {
    const f = await fixture();
    const record = { version: f.saved.version, preflight: f.saved.preflight };
    const review = await buildWebinarAdReview(
      record,
      principal,
      f.environment,
      {
        assertCurrent: async () => {
          throw new Error("Publication withdrawn");
        },
      },
      async () => ({
        destination,
        title: "Exact published webinar headline",
        learningSummary: "The original learning summary",
      }),
    );
    expect(review.current.available).toBe(false);
    expect(review.publication?.title).toBe("Exact published webinar headline");
    const owner = { ...principal, role: "location_admin" as const };
    const page = buildCampaignPage({
      record: f.saved.record,
      versions: [record],
      principal: owner,
      kind: "postgres",
      library: noLibrary,
      webinarReview: review,
    });
    expect(page?.kind).toBe("webinar-ad");
    if (page?.kind !== "webinar-ad") throw new Error("Expected webinar page");
    expect(page.approvalControls).toBeUndefined();
    expect(page.standing).toBe("preflight_failed");
    expect(page.review.art.tall).toContain(f.saved.version.campaignVersionRef);
    expect(
      buildCampaignListRow(f.saved.record, owner, "postgres", noLibrary, review.current).standing,
    ).toBe("preflight_failed");
    const home = await readHome(
      owner,
      { ...f.environment, OALO_REVIEW_SURFACE: "authorized" },
      {
        readChecklistFacts: async () => ({ installationStatuses: [], brand: undefined }),
        readCampaigns: async () => ({ kind: "postgres", records: [f.saved.record] }),
        loadLibrary: async () => ({ ...noLibrary, entries: [] }),
        readWebinarCurrent: async () => review.current,
      },
    );
    expect(home.approval?.rows).toHaveLength(0);
  });
  it("does not treat changed saved evidence or a mismatched publication label as current", async () => {
    const f = await fixture();
    const modified = structuredClone(f.saved.version);
    if (modified.manifest.blueprintId !== "webinar-ad") throw new Error("Expected webinar");
    modified.manifest.content.headline = "Unhashed alteration";
    await expect(
      buildWebinarAdReview(
        { version: modified, preflight: f.saved.preflight },
        principal,
        f.environment,
      ),
    ).rejects.toThrow("WEBINAR_SAVED_EVIDENCE_INVALID");
    const review = await buildWebinarAdReview(
      { version: f.saved.version, preflight: f.saved.preflight },
      principal,
      f.environment,
      { assertCurrent: async () => {} },
      async () => ({
        destination: { ...destination, snapshotHash: "e".repeat(64) },
        title: "Another publication",
        learningSummary: null,
      }),
    );
    expect(review.current).toEqual({ available: false, error: "DESTINATION_CHANGED" });
    expect(review.publication).toBeNull();
  });
});
