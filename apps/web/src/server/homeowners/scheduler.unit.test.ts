import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import type { HomeProperty } from "@oalo/contracts";
import { HomeownerStoreError } from "@oalo/db";
import { HomeownerError } from "./errors.js";
import { homeownerInput, homeownerValuation } from "./homeowner-fixtures.js";
import { handleHomeSchedule, scheduledRequestId } from "./scheduler.js";

/**
 * PRD-007 acceptance item 8, at the handler: the daily job that refreshes enrolled properties.
 *
 * The pure pieces (calendar months, due-date request ids, the cron secret) are in
 * `finance.unit.test.ts`, and the leases are in the real-database suite. What nothing covered was the
 * handler that joins them: who may call it, when it does nothing, what it checks before it spends a
 * lookup, and what it does when a lookup fails (it pauses the property and does not try again).
 * The database and the two providers are replaced here, so no request leaves the process.
 */

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  list: vi.fn(),
  advance: vi.fn(),
  generate: vi.fn(),
  handoff: vi.fn(),
  connections: vi.fn(),
  mode: vi.fn(),
}));
vi.mock("@oalo/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@oalo/db")>()),
  claimDueHomeProperties: mocks.claim,
  PostgresHomeownerRepository: class {
    list = mocks.list;
    advanceSchedule = mocks.advance;
  },
}));
vi.mock("../authenticated-workspace-data.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../authenticated-workspace-data.js")>()),
  authenticatedWorkspaceMode: mocks.mode,
}));
vi.mock("../campaign-persistence-runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../campaign-persistence-runtime.js")>()),
  campaignDatabasePool: () => ({}),
}));
vi.mock("./runtime.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./runtime.js")>()),
  homeConnectionsFor: mocks.connections,
}));
vi.mock("./service.js", () => ({
  generateHomeReport: mocks.generate,
  handoffHomeReport: mocks.handoff,
}));

const SECRET = "s".repeat(40);
const LOCATION = "00000000-0000-4000-8000-000000000011";
const ACTOR = "00000000-0000-4000-8000-000000000012";
const CLAIM = { locationId: LOCATION, propertyId: `home_${"a".repeat(32)}`, actorId: ACTOR };
const DUE = "2026-10-24T12:00:00.000Z";
const NOW = new Date("2026-10-24T12:05:00Z");
const ENVIRONMENT = {
  OALO_HOMEOWNER_REPORTS: "enabled",
  OALO_HOMEOWNER_LIVE_DATA: "enabled",
  OALO_HOMEOWNER_MONTHLY_LOOKUP_LIMIT: "5",
  CRON_SECRET: SECRET,
};

function call(headers: Record<string, string> = { authorization: `Bearer ${SECRET}` }) {
  return new Request("https://app.example.test/api/jobs/homeowner-reports", { headers });
}

function property(
  overrides: {
    mortgageAsOf?: string;
    association?: "property_only" | "ghl_contact";
    enrollment?: Partial<HomeProperty["enrollment"]>;
  } = {},
): HomeProperty {
  const priorDay = new Date("2026-09-24T12:00:00Z");
  const base = homeownerInput(priorDay);
  const propertyOnly = overrides.association === "property_only";
  const input = {
    ...base,
    association: overrides.association ?? "ghl_contact",
    ...(propertyOnly ? { contactId: "property-only", contactName: "Property valuation" } : {}),
    mortgage: { ...base.mortgage, asOf: overrides.mortgageAsOf ?? "2026-10-20" },
  };
  const report = buildHomeReport(
    { ...input, mortgage: { ...input.mortgage, asOf: "2026-09-24" } },
    homeownerValuation(priorDay),
    `hreport_${"a".repeat(32)}`,
    CLAIM.propertyId,
    priorDay,
  );
  return {
    id: CLAIM.propertyId,
    contactId: input.contactId,
    contactName: input.contactName,
    address: input.address,
    createdAt: priorDay.toISOString(),
    updatedAt: priorDay.toISOString(),
    enrollment: {
      cadence: "monthly",
      paused: false,
      nextRefreshAt: DUE,
      deliverUpdates: false,
      ...overrides.enrollment,
    },
    // The saved report carries the mortgage inputs the schedule re-uses.
    reports: [{ ...report, input: { ...report.input, mortgage: input.mortgage } }],
    reviewRequestedAt: null,
    lastError: null,
  };
}

const provider = () => ({ estimate: vi.fn() });
const contactPort = (communicationAllowed: boolean) => ({
  get: vi
    .fn()
    .mockResolvedValue({ id: "fixture-contact", name: "Owner", email: null, communicationAllowed }),
  search: vi.fn(),
  handoff: vi.fn(),
});
const body = async (response: Response) => (await response.json()) as Record<string, unknown>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetAllMocks();
  mocks.mode.mockReturnValue("review");
  mocks.claim.mockResolvedValueOnce([CLAIM]).mockResolvedValue([]);
  mocks.advance.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe("who may start the monthly job", () => {
  it("refuses a caller with no secret, a wrong secret or a short secret, before any database work", async () => {
    expect((await handleHomeSchedule(call({}), ENVIRONMENT)).status).toBe(401);
    expect(
      (await handleHomeSchedule(call({ authorization: `Bearer ${"x".repeat(40)}` }), ENVIRONMENT))
        .status,
    ).toBe(401);
    const short = { ...ENVIRONMENT, CRON_SECRET: "short-secret" };
    expect(
      (await handleHomeSchedule(call({ authorization: "Bearer short-secret" }), short)).status,
    ).toBe(401);
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("answers a caller with no secret the same way whether or not a homeowner setting is mistyped", async () => {
    const mistyped = { ...ENVIRONMENT, OALO_HOMEOWNER_ALLOWED_LOCATION_IDS: "not-a-workspace-id" };
    const response = await handleHomeSchedule(call({}), mistyped);
    expect(response.status).toBe(401);
    const answer = JSON.stringify(await body(response));
    expect(answer).toContain("UNAUTHORIZED");
    expect(answer).not.toContain("OALO_HOMEOWNER");
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});

describe("when the monthly job does nothing", () => {
  it.each([
    ["reports are not switched on", { OALO_HOMEOWNER_REPORTS: undefined }],
    ["live data is not switched on", { OALO_HOMEOWNER_LIVE_DATA: undefined }],
  ])("claims nothing and says it is off when %s", async (_name, change) => {
    const response = await handleHomeSchedule(call(), { ...ENVIRONMENT, ...change });
    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ enabled: false, updated: 0, paused: 0 });
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("claims nothing outside the signed-in review runtime", async () => {
    mocks.mode.mockReturnValue("synthetic");
    const response = await handleHomeSchedule(call(), ENVIRONMENT);
    expect(await body(response)).toEqual({ enabled: false, updated: 0, paused: 0 });
    expect(mocks.claim).not.toHaveBeenCalled();
  });

  it("spends nothing on a property that is paused, switched off or not yet due", async () => {
    for (const enrollment of [
      { paused: true },
      { cadence: "off" as const },
      { nextRefreshAt: "2026-11-24T12:00:00.000Z" },
    ]) {
      mocks.claim.mockReset().mockResolvedValueOnce([CLAIM]).mockResolvedValue([]);
      mocks.list.mockResolvedValue([property({ enrollment })]);
      const response = await handleHomeSchedule(call(), ENVIRONMENT);
      expect(await body(response)).toMatchObject({ updated: 0, paused: 1 });
    }
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.connections).not.toHaveBeenCalled();
  });
});

describe("what the monthly job checks before it spends a lookup", () => {
  it("pauses the property, and requests nothing, while the valuation connection is unavailable", async () => {
    mocks.list.mockResolvedValue([property({ association: "property_only" })]);
    mocks.connections.mockResolvedValue({ valuation: null, contacts: null, connectionIssue: null });
    const response = await handleHomeSchedule(call(), ENVIRONMENT);
    expect(await body(response)).toMatchObject({ updated: 0, paused: 1 });
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.advance).toHaveBeenCalledWith(CLAIM.propertyId, DUE, null, "CONNECTION_REQUIRED");
  });

  it("pauses a linked homeowner when communication is not confirmed, before any lookup", async () => {
    const contacts = contactPort(false);
    mocks.list.mockResolvedValue([property()]);
    mocks.connections.mockResolvedValue({ valuation: provider(), contacts, connectionIssue: null });
    const response = await handleHomeSchedule(call(), ENVIRONMENT);
    expect(await body(response)).toMatchObject({ updated: 0, paused: 1 });
    expect(contacts.get).toHaveBeenCalledOnce();
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.advance).toHaveBeenCalledWith(
      CLAIM.propertyId,
      DUE,
      null,
      "CONTACT_COMMUNICATION_BLOCKED",
    );
  });

  it("pauses a linked homeowner whose HighLevel connection is unavailable", async () => {
    mocks.list.mockResolvedValue([property()]);
    mocks.connections.mockResolvedValue({
      valuation: provider(),
      contacts: null,
      connectionIssue: null,
    });
    await handleHomeSchedule(call(), ENVIRONMENT);
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.advance).toHaveBeenCalledWith(CLAIM.propertyId, DUE, null, "CONNECTION_REQUIRED");
  });
});

describe("a monthly refresh that goes ahead", () => {
  it("refreshes a property-only valuation under a stable request, and never hands it to HighLevel", async () => {
    mocks.list.mockResolvedValue([
      property({ association: "property_only", enrollment: { deliverUpdates: true } }),
    ]);
    mocks.connections.mockResolvedValue({
      valuation: provider(),
      contacts: null,
      connectionIssue: null,
    });
    mocks.generate.mockResolvedValue({ id: `hreport_${"c".repeat(32)}` });
    const response = await handleHomeSchedule(call(), ENVIRONMENT);
    expect(await body(response)).toMatchObject({
      enabled: true,
      claimed: 1,
      updated: 1,
      paused: 0,
    });
    expect(mocks.generate).toHaveBeenCalledOnce();
    const [raw, dependencies, options] = mocks.generate.mock.calls[0]!;
    expect(raw.requestId).toBe(scheduledRequestId(CLAIM.propertyId, DUE));
    expect(raw.propertyId).toBe(CLAIM.propertyId);
    expect(options).toEqual({ refresh: true });
    expect(dependencies).toMatchObject({ locationId: LOCATION, monthlyLimit: 5 });
    expect(mocks.handoff).not.toHaveBeenCalled();
    // The next one is the same day of the next UTC calendar month.
    expect(mocks.advance).toHaveBeenCalledWith(
      CLAIM.propertyId,
      DUE,
      "2026-11-24T12:00:00.000Z",
      null,
    );
  });

  it("drops loan details older than 35 days instead of presenting them as current", async () => {
    mocks.list.mockResolvedValue([
      property({ association: "property_only", mortgageAsOf: "2026-09-01" }),
    ]);
    mocks.connections.mockResolvedValue({
      valuation: provider(),
      contacts: null,
      connectionIssue: null,
    });
    mocks.generate.mockResolvedValue({ id: `hreport_${"c".repeat(32)}` });
    await handleHomeSchedule(call(), ENVIRONMENT);
    const [raw] = mocks.generate.mock.calls[0]!;
    expect(raw.mortgage).toMatchObject({
      source: "unknown",
      firstBalanceMinor: null,
      otherBalanceMinor: null,
      allLiensConfirmed: false,
      asOf: "2026-10-24",
    });
  });

  it("hands a linked homeowner's fresh report to HighLevel only while delivery is still switched on", async () => {
    const contacts = contactPort(true);
    mocks.connections.mockResolvedValue({ valuation: provider(), contacts, connectionIssue: null });
    mocks.generate.mockResolvedValue({ id: `hreport_${"c".repeat(32)}` });
    // Delivery is re-read after the report is made, so a switch turned off meanwhile is respected.
    mocks.list
      .mockResolvedValueOnce([property({ enrollment: { deliverUpdates: true } })])
      .mockResolvedValueOnce([property({ enrollment: { deliverUpdates: true } })]);
    await handleHomeSchedule(call(), ENVIRONMENT);
    expect(mocks.handoff).toHaveBeenCalledOnce();
    expect(mocks.handoff.mock.calls[0]?.[2]).toBe(`hreport_${"c".repeat(32)}`);

    mocks.handoff.mockClear();
    mocks.claim.mockReset().mockResolvedValueOnce([CLAIM]).mockResolvedValue([]);
    mocks.list
      .mockResolvedValueOnce([property({ enrollment: { deliverUpdates: true } })])
      .mockResolvedValueOnce([property({ enrollment: { deliverUpdates: false } })]);
    await handleHomeSchedule(call(), ENVIRONMENT);
    expect(mocks.handoff).not.toHaveBeenCalled();
  });
});

describe("a monthly refresh that fails", () => {
  it.each([
    [
      "an uncertain lookup",
      new HomeownerError("VALUATION_UNCERTAIN", 502, "x"),
      "VALUATION_UNCERTAIN",
    ],
    [
      "a refused handoff",
      new HomeownerError("DELIVERY_ALREADY_ATTEMPTED", 409, "x"),
      "DELIVERY_ALREADY_ATTEMPTED",
    ],
    ["an exhausted allowance", new HomeownerStoreError("LOOKUP_LIMIT"), "SCHEDULE_NEEDS_REVIEW"],
  ])("pauses the property after %s and does not try again", async (_name, failure, code) => {
    mocks.list.mockResolvedValue([property({ association: "property_only" })]);
    mocks.connections.mockResolvedValue({
      valuation: provider(),
      contacts: null,
      connectionIssue: null,
    });
    mocks.generate.mockRejectedValue(failure);
    const response = await handleHomeSchedule(call(), ENVIRONMENT);
    expect(await body(response)).toMatchObject({ updated: 0, paused: 1 });
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(mocks.advance).toHaveBeenCalledWith(CLAIM.propertyId, DUE, null, code);
  });
});
