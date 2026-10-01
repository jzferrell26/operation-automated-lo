import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleSharedHomeReport } from "./http.js";
import { homeReportsEnabled } from "./runtime.js";
import { resetSharedReportBudgetsForTests } from "./share-throttle.js";

/**
 * PRD-007 independent security review, finding M-2.
 *
 * A homeowner's report link needs exactly one deployment setting to be answered: whether reports are
 * switched on. It used to validate every homeowner setting to read that one, and the paid-lookup
 * allowlist is an operator-edited list that changes each time a workspace is approved. One mistyped
 * entry made every shared link fail (the endpoint answered 400 and named the setting to the caller,
 * the page showed an error), including for homeowners who have no part in that setting.
 */

const database = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  readSharedHomeReport: database.read,
}));
vi.mock("../campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));

const secret = "e5".repeat(32);
const MISTYPED_SETTINGS = {
  OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "00000000-0000-4000-8000-00000000000",
  OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: "many",
  OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: { not: "text" },
  OALO_APP_URL: 42,
};

function link(): Request {
  return new Request(`https://reports.example.test/api/homeowner-reports/shared/${secret}`);
}

beforeEach(() => {
  vi.resetAllMocks();
  resetSharedReportBudgetsForTests();
  database.read.mockResolvedValue(null);
});

describe("whether reports are switched on", () => {
  it("is true only for the exact word the runbook names", () => {
    expect(homeReportsEnabled({ OALO_HOMEOWNER_REPORTS: "enabled" })).toBe(true);
    for (const value of ["", "true", "Enabled", "enabled ", undefined])
      expect(homeReportsEnabled({ OALO_HOMEOWNER_REPORTS: value }), String(value)).toBe(false);
    expect(homeReportsEnabled({})).toBe(false);
  });

  it("does not depend on any other homeowner setting being well formed", () => {
    expect(homeReportsEnabled({ OALO_HOMEOWNER_REPORTS: "enabled", ...MISTYPED_SETTINGS })).toBe(
      true,
    );
    expect(homeReportsEnabled({ ...MISTYPED_SETTINGS })).toBe(false);
  });

  it("answers false, and never throws, for a setting that is not even text", () => {
    expect(homeReportsEnabled({ OALO_HOMEOWNER_REPORTS: 1 })).toBe(false);
    expect(homeReportsEnabled(null)).toBe(false);
    expect(homeReportsEnabled("enabled")).toBe(false);
  });
});

describe("the shared report endpoint, while another homeowner setting is mistyped", () => {
  const environment = { OALO_HOMEOWNER_REPORTS: "enabled", ...MISTYPED_SETTINGS };

  it("answers a live link as it would with every setting right", async () => {
    database.read.mockResolvedValue({ id: "hreport_a" });

    const response = await handleSharedHomeReport(link(), secret, environment);

    expect(response.status).toBe(200);
  });

  it("answers an unknown link with the usual not found, and names no setting", async () => {
    const response = await handleSharedHomeReport(link(), secret, environment);
    const text = await response.text();

    expect(response.status).toBe(404);
    expect(text).toBe(JSON.stringify({ message: "This report link is unavailable or expired." }));
    expect(text).not.toContain("OALO_");
    expect(text).not.toContain("fields");
  });

  it("still answers every link with not found when reports are switched off", async () => {
    const response = await handleSharedHomeReport(link(), secret, {
      ...MISTYPED_SETTINGS,
      OALO_HOMEOWNER_REPORTS: "disabled",
    });

    expect(response.status).toBe(404);
    expect(database.read).not.toHaveBeenCalled();
  });
});
