import { beforeEach, describe, expect, it, vi } from "vitest";
import { findVocabularyHits } from "../../copy/forbidden-vocabulary.js";
import { handleSharedHomeReport } from "./http.js";
import {
  resetSharedReportBudgetsForTests,
  SHARED_REPORT_EVENTS_PER_MINUTE,
  SHARED_REPORT_READS_PER_MINUTE,
} from "./share-throttle.js";

/**
 * PRD-007 independent security review, finding M-1, the endpoint half.
 *
 * `/api/homeowner-reports/shared/[secret]` answers anyone, and every well-shaped link costs a
 * database round trip sequence before it can be told apart from a real one. A caller that asks too
 * often is refused before that work starts. The page half is in
 * `app/(public)/home-report/[secret]/not-found.integration.test.tsx`.
 */

const database = vi.hoisted(() => ({ read: vi.fn(), record: vi.fn() }));
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  readSharedHomeReport: database.read,
  recordSharedHomeEvent: database.record,
}));
vi.mock("../campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));

const ENVIRONMENT = { OALO_HOMEOWNER_REPORTS: "enabled" };
const HOST = "reports.example.test";
const secret = "c3".repeat(32);

function shared(method: "GET" | "POST", address: string | null, path = secret): Request {
  return new Request(`https://${HOST}/api/homeowner-reports/shared/${path}`, {
    method,
    headers: {
      host: HOST,
      ...(address === null ? {} : { "x-vercel-forwarded-for": address }),
      ...(method === "POST"
        ? {
            origin: `https://${HOST}`,
            "content-type": "application/json",
          }
        : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify({ event: "review_requested" }) } : {}),
  });
}

function open(request: Request, path = secret) {
  return handleSharedHomeReport(request, path, ENVIRONMENT);
}

beforeEach(() => {
  vi.resetAllMocks();
  resetSharedReportBudgetsForTests();
  database.read.mockResolvedValue(null);
});

describe("the shared report endpoint, for a caller that asks too often", () => {
  it("refuses a caller past its limit with a wait and the usual private headers, before any lookup", async () => {
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE; used += 1)
      expect((await open(shared("GET", "203.0.113.7"))).status).toBe(404);
    expect(database.read).toHaveBeenCalledTimes(SHARED_REPORT_READS_PER_MINUTE);

    const refused = await open(shared("GET", "203.0.113.7"));

    expect(refused.status).toBe(429);
    expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(Number(refused.headers.get("Retry-After"))).toBeLessThanOrEqual(60);
    expect(refused.headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(refused.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(refused.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    const body = (await refused.json()) as { message: string };
    expect(body.message).toBe(
      "Too many attempts from your connection. Please wait a minute and try again.",
    );
    expect(findVocabularyHits(body.message)).toEqual([]);
    expect(database.read).toHaveBeenCalledTimes(SHARED_REPORT_READS_PER_MINUTE);
  });

  it("does not spend a caller's allowance on a link that is not shaped like one", async () => {
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE * 2; used += 1)
      expect((await open(shared("GET", "203.0.113.7", "not-a-link"), "not-a-link")).status).toBe(
        404,
      );
    expect(database.read).not.toHaveBeenCalled();

    expect((await open(shared("GET", "203.0.113.7"))).status).toBe(404);
    expect(database.read).toHaveBeenCalledTimes(1);
  });

  it("keeps one caller's refusal from reaching another", async () => {
    for (let used = 0; used <= SHARED_REPORT_READS_PER_MINUTE; used += 1)
      await open(shared("GET", "203.0.113.7"));

    expect((await open(shared("GET", "203.0.113.7"))).status).toBe(429);
    expect((await open(shared("GET", "198.51.100.9"))).status).toBe(404);
  });

  it("answers a link and an unknown link alike while the caller is within its limit", async () => {
    database.read.mockResolvedValueOnce({ id: "hreport_a" }).mockResolvedValue(null);
    const real = await open(shared("GET", "203.0.113.7"));
    const unknown = await open(shared("GET", "203.0.113.7", "d4".repeat(32)), "d4".repeat(32));

    expect(real.status).toBe(200);
    expect(unknown.status).toBe(404);
  });

  it("holds explicit review requests to a smaller allowance than reads", async () => {
    database.read.mockResolvedValue({ id: "hreport_a" });
    database.record.mockResolvedValue(true);
    for (let used = 0; used < SHARED_REPORT_EVENTS_PER_MINUTE; used += 1)
      expect((await open(shared("POST", "203.0.113.7"))).status).toBe(200);

    const refused = await open(shared("POST", "203.0.113.7"));

    expect(refused.status).toBe(429);
    expect(refused.headers.get("Retry-After")).not.toBeNull();
    expect(database.record).toHaveBeenCalledTimes(SHARED_REPORT_EVENTS_PER_MINUTE);
    expect((await open(shared("GET", "203.0.113.7"))).status).toBe(200);
  });

  it("does not hold back a request that names no address, so a local run is unaffected", async () => {
    for (let used = 0; used < SHARED_REPORT_READS_PER_MINUTE * 2; used += 1)
      expect((await open(shared("GET", null))).status).toBe(404);
  });
});
