import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runFunnelRetention } from "./funnel-retention.js";

const state = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("./campaign-persistence-runtime.js", () => ({
  campaignDatabasePool: () => ({ connect: state.connect }),
}));

beforeEach(() => vi.clearAllMocks());
function request(secret: string) {
  return new Request("https://example.org/api/jobs/funnel-inquiries", {
    headers: { authorization: `Bearer ${secret}` },
  });
}
function connection(counts: unknown) {
  const execute = vi.fn().mockResolvedValue({ rows: [{ counts }] });
  const release = vi.fn();
  state.connect.mockResolvedValue({ execute, release });
  return { execute, release };
}
describe("combined temporary marketing inquiry cleanup", () => {
  it.each([
    { funnel: 3, financing: 4, total: 7 },
    { funnel: 15000, financing: 10000, total: 25000 },
    { funnel: 0, financing: 0, total: 0 },
  ])("runs one bounded shared purge for $total expired records", async (counts) => {
    const db = connection(counts);
    const secret = randomBytes(32).toString("base64url");
    const response = await runFunnelRetention(request(secret), {
      CRON_SECRET: secret,
      OALO_FUNNEL_PUBLICATION: "disabled",
      OALO_FINANCING_RELEASE: "disabled",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ removed: counts.total });
    expect(db.execute.mock.calls.map(([query]) => query.text)).toEqual([
      "begin",
      "set local role scheduler_runtime",
      "select campaign.purge_expired_marketing_inquiries() as counts",
      "commit",
    ]);
    expect(db.release).toHaveBeenCalledTimes(1);
  });
  it.each([
    { funnel: 1, financing: 2, total: 4 },
    { funnel: 15001, financing: 0, total: 15001 },
    { funnel: 0, financing: 10001, total: 10001 },
    { funnel: -1, financing: 0, total: -1 },
    { funnel: 0, financing: 0.5, total: 0.5 },
    { funnel: 0, financing: 0, total: 0, private: "unexpected" },
  ])("rolls back an invalid purge result", async (counts) => {
    const db = connection(counts);
    const secret = randomBytes(32).toString("base64url");
    const response = await runFunnelRetention(request(secret), { CRON_SECRET: secret });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "RETENTION_UNAVAILABLE" });
    expect(db.execute).toHaveBeenLastCalledWith(expect.objectContaining({ text: "rollback" }));
    expect(db.execute.mock.calls.map(([query]) => query.text)).not.toContain("commit");
    expect(db.release).toHaveBeenCalledTimes(1);
  });
  it("does not reveal database details when combined purge refuses", async () => {
    const db = connection({ funnel: 0, financing: 0, total: 0 });
    db.execute.mockImplementation(async (query) => {
      if (query.text.includes("purge_expired_marketing"))
        throw new Error("private database connection details");
      return { rows: [] };
    });
    const secret = randomBytes(32).toString("base64url");
    const response = await runFunnelRetention(request(secret), { CRON_SECRET: secret });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "RETENTION_UNAVAILABLE" });
    expect(db.execute).toHaveBeenLastCalledWith(expect.objectContaining({ text: "rollback" }));
    expect(db.release).toHaveBeenCalledTimes(1);
  });
});
