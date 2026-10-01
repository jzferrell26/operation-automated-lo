import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleSharedHomeReport } from "./http.js";
import { resetSharedReportBudgetsForTests } from "./share-throttle.js";

/**
 * PRD-007 acceptance item 7: "A link visit alone is not treated as homeowner intent; review requests
 * are explicit and deduplicated."
 *
 * Opening a shared report records nothing. Only a request that comes from the report page itself,
 * for a link that works, names a review, and carries an event key, is recorded. The database
 * function that deduplicates is proven in the real-database suite. This is the door in front of it.
 */

const doubles = vi.hoisted(() => ({ read: vi.fn(), record: vi.fn() }));
vi.mock("@oalo/db", async (importOriginal) => {
  const real = await importOriginal<typeof import("@oalo/db")>();
  return { ...real, readSharedHomeReport: doubles.read, recordSharedHomeEvent: doubles.record };
});
vi.mock("../campaign-persistence-runtime.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../campaign-persistence-runtime.js")>();
  return { ...real, campaignDatabasePool: () => ({}) };
});

const HOST = "reports.example.test";
const ENVIRONMENT = { OALO_HOMEOWNER_REPORTS: "enabled" };
const secret = "d4".repeat(32);
const EVENT_KEY = "00000000-0000-4000-8000-0000000000e1";

function post(headers: Record<string, string>, body: unknown) {
  return new Request(`https://${HOST}/api/homeowner-reports/shared/${secret}`, {
    method: "POST",
    headers: { host: HOST, "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
const review = { event: "review_requested", eventKey: EVENT_KEY };
const sameOrigin = { origin: `https://${HOST}` };

beforeEach(() => {
  vi.resetAllMocks();
  resetSharedReportBudgetsForTests();
  doubles.read.mockResolvedValue({ id: "a-report" });
  doubles.record.mockResolvedValue(true);
});

describe("opening a shared report", () => {
  it("shows the report and records nothing, because a visit alone is not intent", async () => {
    const response = await handleSharedHomeReport(
      new Request(`https://${HOST}/api/homeowner-reports/shared/${secret}`, {
        headers: { host: HOST },
      }),
      secret,
      ENVIRONMENT,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ report: { id: "a-report" } });
    expect(doubles.record).not.toHaveBeenCalled();
  });
});

describe("a request for a review", () => {
  it("is recorded when it comes from the report page, with the event key it carried", async () => {
    const response = await handleSharedHomeReport(post(sameOrigin, review), secret, ENVIRONMENT);
    expect(response.status).toBe(200);
    expect(doubles.record).toHaveBeenCalledOnce();
    expect(doubles.record.mock.calls[0]?.slice(2)).toEqual(["review_requested", EVENT_KEY]);
  });

  it.each([
    ["names no origin", {}],
    ["comes from another site's origin", { origin: "https://elsewhere.example.test" }],
    ["is marked cross-site by the browser", { ...sameOrigin, "sec-fetch-site": "cross-site" }],
  ])("is refused, and recorded nowhere, when it %s", async (_name, headers) => {
    const response = await handleSharedHomeReport(post(headers, review), secret, ENVIRONMENT);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "ORIGIN_NOT_ALLOWED" });
    expect(doubles.record).not.toHaveBeenCalled();
  });

  it("is refused when it names an event this door does not accept", async () => {
    for (const event of ["review_resolved", "deleted", ""]) {
      const response = await handleSharedHomeReport(
        post(sameOrigin, { event, eventKey: EVENT_KEY }),
        secret,
        ENVIRONMENT,
      );
      expect(response.status).toBe(400);
    }
    expect(doubles.record).not.toHaveBeenCalled();
  });

  it("is answered like any unusable link when the link no longer works", async () => {
    doubles.read.mockResolvedValue(null);
    const response = await handleSharedHomeReport(post(sameOrigin, review), secret, ENVIRONMENT);
    expect(response.status).toBe(404);
    expect(doubles.record).not.toHaveBeenCalled();
  });

  it("is answered like any unusable link when the database declines to record it", async () => {
    doubles.record.mockResolvedValue(false);
    const response = await handleSharedHomeReport(post(sameOrigin, review), secret, ENVIRONMENT);
    expect(response.status).toBe(404);
  });
});
