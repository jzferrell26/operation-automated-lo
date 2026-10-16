import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalCampaignHash } from "@oalo/application";
import { publisherFixture } from "../../../../packages/db/test/webinar-publisher-fixture.mjs";
import { singleActorSessionFixture } from "../../../../apps/web/src/server/signed-session.test-support.js";
import { handlePublisherStatus } from "../../../../apps/web/src/server/webinar-publisher-status.js";
import { LOCAL_SYNTHETIC_ENV } from "../../../../apps/web/src/server/campaign-command-test-support.js";
import * as runtimeAuthentication from "../../../../apps/web/src/server/runtime-authentication.js";
import * as persistence from "../../../../apps/web/src/server/campaign-persistence-runtime.js";
import { GET } from "../../../../apps/web/src/app/api/campaigns/webinar-ads/status/[operationRef]/route.js";

afterEach(() => vi.restoreAllMocks());
function fixture() {
  const f = publisherFixture();
  const session = singleActorSessionFixture(f.principal);
  const request = new Request(
    "https://app.operation-automated-lo.test/api/campaigns/webinar-publisher/operation",
    { headers: session.headersFor(f.principal.actorRef) },
  );
  const now = new Date("2026-10-16T12:00:00.000Z");
  const read = vi.fn().mockResolvedValue({ operation: f.operation, launch: f.launch });
  const run = (raw: unknown = { operationRef: f.operation.operationRef }, req = request) =>
    handlePublisherStatus(
      req,
      raw,
      { ...LOCAL_SYNTHETIC_ENV, OALO_REVIEW_SURFACE: "authorized" },
      session.ports,
      { read, now: () => now },
    );
  return { f, session, request, now, read, run };
}
function privateResponse(response: Response) {
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
}
describe("private webinar publishing status HTTP boundary", () => {
  it("the exported route refuses missing native configuration with private headers", async () => {
    const { f, request, session } = fixture();
    vi.spyOn(runtimeAuthentication, "resolveRuntimeCampaignCommandPorts").mockReturnValue(
      session.ports,
    );
    const pool = vi.spyOn(persistence, "campaignDatabasePool").mockImplementation(() => {
      throw new Error("TEST_CONFIGURATION_UNAVAILABLE");
    });
    const response = await GET(request, {
      params: Promise.resolve({ operationRef: f.operation.operationRef }),
    });
    expect(response.status).toBe(503);
    privateResponse(response);
    expect(await response.json()).toEqual({ error: "PUBLISHER_STATUS_UNAVAILABLE" });
    expect(pool).toHaveBeenCalledOnce();
  });
  it("reads a minimal owner DTO without exposing command provenance, native IDs or raw failures", async () => {
    const { f, run, read } = fixture();
    const response = await run();
    expect(response.status).toBe(200);
    privateResponse(response);
    const body = await response.json();
    expect(read).toHaveBeenCalledOnce();
    expect(read.mock.calls[0]?.[0].actorRef).toBe(f.principal.actorRef);
    expect(body).toMatchObject({
      operationRef: f.operation.operationRef,
      campaignRef: f.summary.projection.campaignRef,
      state: f.operation.state,
      campaignState: f.launch.state,
      providerObservedAt: null,
      checkedAt: "2026-10-16T12:00:00.000Z",
      destination: f.summary.projection.destination.publicUrl,
    });
    expect(Object.keys(body).sort()).toEqual(
      [
        "operationRef",
        "campaignRef",
        "campaignVersionRef",
        "action",
        "state",
        "campaignState",
        "stage",
        "providerObservedAt",
        "checkedAt",
        "accountLabel",
        "pageLabel",
        "destination",
        "headline",
        "dailyBudgetMinor",
        "totalBudgetMinor",
        "totalSemantics",
        "endsAt",
      ].sort(),
    );
  });
  it("does not substitute the server read time for the provider observation", async () => {
    const { f, run, read } = fixture();
    read.mockResolvedValue({
      operation: { ...f.operation, state: "live", providerObservedAt: "2026-10-15T10:00:00.000Z" },
      launch: { ...f.launch, state: "paused" },
    });
    const response = await run();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      state: "live",
      campaignState: "paused",
      providerObservedAt: "2026-10-15T10:00:00.000Z",
      checkedAt: "2026-10-16T12:00:00.000Z",
    });
  });
  it("refuses missing signed identity before storage", async () => {
    const { run, read } = fixture();
    const response = await run(
      undefined,
      new Request(
        "https://app.operation-automated-lo.test/api/campaigns/webinar-publisher/operation",
      ),
    );
    expect(response.status).toBe(401);
    privateResponse(response);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses a revoked signed role before storage", async () => {
    const { session, run, read } = fixture();
    vi.spyOn(session.ports.roleBindings, "currentRoleVersion").mockResolvedValue(undefined);
    const response = await run();
    expect(response.status).toBe(401);
    privateResponse(response);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses the unsigned synthetic fallback before storage", async () => {
    const { session, read } = fixture();
    const response = await handlePublisherStatus(
      new Request("https://app.operation-automated-lo.test/status"),
      { operationRef: "publishop_status01" },
      LOCAL_SYNTHETIC_ENV,
      session.ports,
      { read, now: () => new Date() },
    );
    expect(response.status).toBe(403);
    privateResponse(response);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses a signed non-owner before storage", async () => {
    const f = publisherFixture();
    const principal = { ...f.principal, role: "campaign_creator" as const };
    const session = singleActorSessionFixture(principal),
      read = vi.fn();
    const request = new Request("https://app.operation-automated-lo.test/status", {
      headers: session.headersFor(principal.actorRef),
    });
    const response = await handlePublisherStatus(
      request,
      { operationRef: f.operation.operationRef },
      LOCAL_SYNTHETIC_ENV,
      session.ports,
      { read, now: () => new Date() },
    );
    expect(response.status).toBe(403);
    privateResponse(response);
    expect(read).not.toHaveBeenCalled();
  });
  it("refuses a future provider observation rather than manufacturing freshness", async () => {
    const { f, read, run } = fixture();
    read.mockResolvedValue({
      operation: { ...f.operation, providerObservedAt: "2026-10-17T12:00:00.000Z" },
      launch: f.launch,
    });
    const response = await run();
    expect(response.status).toBe(503);
    privateResponse(response);
  });
  it.each(["../foreign", "", "https://foreign.test/ref"])(
    "refuses malformed operation %s before storage",
    async (operationRef) => {
      const { run, read } = fixture();
      const response = await run({ operationRef });
      expect(response.status).toBe(400);
      privateResponse(response);
      expect(read).not.toHaveBeenCalled();
    },
  );
  it.each(["actorRef", "locationRef", "operationRef"] as const)(
    "hides a foreign or mismatched %s",
    async (field) => {
      const { f, read, run } = fixture();
      const foreign = publisherFixture();
      read.mockResolvedValue({
        operation: { ...f.operation, [field]: foreign.operation[field] },
        launch: f.launch,
      });
      const response = await run();
      expect(response.status).toBe(404);
      privateResponse(response);
      expect(await response.json()).toEqual({ error: "NOT_FOUND" });
    },
  );
  it.each([null, undefined])("hides missing operation %s", async (value) => {
    const { read, run } = fixture();
    read.mockResolvedValue(value);
    const response = await run();
    expect(response.status).toBe(404);
    privateResponse(response);
  });
  it("maps the native inaccessible-operation refusal without exposing SQL", async () => {
    const { read, run } = fixture();
    read.mockRejectedValue(new Error("PUBLISHER_NOT_FOUND"));
    const response = await run();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "NOT_FOUND" });
    privateResponse(response);
  });
  it("refuses a corrupt stored summary and redacts schema and database errors", async () => {
    const { f, read, run } = fixture();
    read.mockResolvedValue({
      operation: f.operation,
      launch: { ...f.launch, summary: { ...f.summary, accountLabel: "changed" } },
    });
    for (const fail of [
      undefined,
      new Error("password=private database internal"),
      new Error("relation missing"),
    ]) {
      if (fail) read.mockRejectedValue(fail);
      const response = await run();
      expect(response.status).toBe(503);
      privateResponse(response);
      expect(await response.json()).toEqual({ error: "PUBLISHER_STATUS_UNAVAILABLE" });
    }
    read.mockResolvedValue({});
    expect((await run()).status).toBe(503);
  });
  it("independently refuses a projection changed inside an otherwise rehashed summary", async () => {
    const { f, read, run } = fixture();
    const { summaryHash: _hash, ...body } = f.summary;
    const changed = {
      ...body,
      projection: {
        ...body.projection,
        copy: { ...body.projection.copy, headline: "Tampered headline" },
      },
    };
    const summary = { ...changed, summaryHash: canonicalCampaignHash(changed) };
    read.mockResolvedValue({
      operation: { ...f.operation, summaryHash: summary.summaryHash },
      launch: { ...f.launch, summary },
    });
    expect((await run()).status).toBe(503);
  });
});
