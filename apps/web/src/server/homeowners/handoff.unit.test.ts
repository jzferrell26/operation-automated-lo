import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { HomeownerError } from "./errors.js";
import { homeownerInput, homeownerValuation } from "./homeowner-fixtures.js";
import { HomeEnvironmentSchema } from "./runtime.js";
import { handoffHomeReport } from "./service.js";

/**
 * PRD-007 acceptance item 9, at the service: handing a saved report to a HighLevel workflow.
 *
 * The adapter's own checks (the contact's location, do-not-disturb, one field, read-back before the
 * workflow) are in `adapters.unit.test.ts`. This is the part around it: when the one allowed attempt
 * is spent, what is held for review, and what is never sent twice. Nothing here reaches HighLevel.
 */

const REPORT_ID = `hreport_${"a".repeat(32)}`;
const PROPERTY_ID = `home_${"a".repeat(32)}`;
const CONTACT = "fixture-contact";
const SHARE_ID = "00000000-0000-4000-8000-0000000000aa";

function savedReport(overrides: { association?: "property_only" | "ghl_contact"; at?: Date } = {}) {
  const at = overrides.at ?? new Date();
  const base = homeownerInput(at);
  const propertyOnly = overrides.association === "property_only";
  return buildHomeReport(
    propertyOnly
      ? {
          ...base,
          association: "property_only",
          contactId: "property-only",
          contactName: "Property valuation",
        }
      : base,
    homeownerValuation(at),
    REPORT_ID,
    PROPERTY_ID,
    at,
  );
}

function repository(report: ReturnType<typeof savedReport> | null = savedReport()) {
  return {
    getReport: vi.fn().mockResolvedValue(report),
    createShare: vi.fn().mockResolvedValue(SHARE_ID),
    reserveDelivery: vi.fn().mockResolvedValue(true),
    finishDelivery: vi.fn().mockResolvedValue(undefined),
  };
}
type Repository = ReturnType<typeof repository>;
const asRepository = (value: Repository) =>
  value as unknown as Parameters<typeof handoffHomeReport>[0];

function contacts(communicationAllowed = true) {
  return {
    get: vi
      .fn()
      .mockResolvedValue({ id: CONTACT, name: "Owner", email: null, communicationAllowed }),
    search: vi.fn(),
    handoff: vi.fn().mockResolvedValue(undefined),
  };
}

const ENABLED = HomeEnvironmentSchema.parse({
  OALO_HOMEOWNER_DELIVERY_ENABLED: "enabled",
  OALO_APP_URL: "https://app.example.test",
});

beforeEach(() => vi.clearAllMocks());

describe("a HighLevel handoff that is refused before anything is spent", () => {
  it("does nothing while delivery is not switched on or no HighLevel connection exists", async () => {
    const store = repository();
    await expect(
      handoffHomeReport(
        asRepository(store),
        contacts(),
        REPORT_ID,
        HomeEnvironmentSchema.parse({ OALO_APP_URL: "https://app.example.test" }),
      ),
    ).rejects.toMatchObject({ code: "DELIVERY_NOT_CONFIGURED" });
    await expect(
      handoffHomeReport(asRepository(store), null, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "DELIVERY_NOT_CONFIGURED" });
    expect(store.reserveDelivery).not.toHaveBeenCalled();
  });

  it("refuses a report with no homeowner contact behind it", async () => {
    const store = repository(savedReport({ association: "property_only" }));
    const port = contacts();
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "CONTACT_CONNECTION_REQUIRED" });
    expect(port.get).not.toHaveBeenCalled();
    expect(store.reserveDelivery).not.toHaveBeenCalled();
  });

  it("refuses when HighLevel does not confirm that this contact may be messaged", async () => {
    const store = repository();
    const port = contacts(false);
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "CONTACT_COMMUNICATION_BLOCKED" });
    expect(store.reserveDelivery).not.toHaveBeenCalled();
    expect(port.handoff).not.toHaveBeenCalled();
  });

  it("refuses a report whose value or loan details have aged past 35 days", async () => {
    const store = repository(savedReport({ at: new Date(Date.now() - 40 * 86_400_000) }));
    const port = contacts();
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "REPORT_STALE" });
    expect(store.reserveDelivery).not.toHaveBeenCalled();
    expect(port.handoff).not.toHaveBeenCalled();
  });

  it("does not spend the report's one attempt when the report link cannot be made", async () => {
    const store = repository();
    const port = contacts();
    await expect(
      handoffHomeReport(
        asRepository(store),
        port,
        REPORT_ID,
        HomeEnvironmentSchema.parse({ OALO_HOMEOWNER_DELIVERY_ENABLED: "enabled" }),
      ),
    ).rejects.toMatchObject({ code: "REPORT_URL_NOT_CONFIGURED" });
    // Nothing was written or sent, so the same report can still be handed off once this is fixed.
    expect(store.reserveDelivery).not.toHaveBeenCalled();
    expect(store.finishDelivery).not.toHaveBeenCalled();
    expect(port.handoff).not.toHaveBeenCalled();
  });
});

describe("a HighLevel handoff that goes ahead", () => {
  it("reserves the one attempt, makes one link, hands off once, and records it as sent", async () => {
    const store = repository();
    const port = contacts();
    await handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED);
    expect(store.reserveDelivery).toHaveBeenCalledOnce();
    expect(store.createShare).toHaveBeenCalledOnce();
    expect(port.handoff).toHaveBeenCalledOnce();
    const [contactId, url] = port.handoff.mock.calls[0]!;
    expect(contactId).toBe(CONTACT);
    expect(url).toMatch(/^https:\/\/app\.example\.test\/home-report\/[a-f0-9]{64}$/u);
    expect(store.finishDelivery).toHaveBeenCalledWith(REPORT_ID, "sent", null, SHARE_ID);
    // The attempt is taken before the link or the call, so a crash cannot leave it unspent.
    expect(store.reserveDelivery.mock.invocationCallOrder[0]).toBeLessThan(
      port.handoff.mock.invocationCallOrder[0]!,
    );
  });

  it("never hands the same report off a second time", async () => {
    const store = repository();
    store.reserveDelivery.mockResolvedValue(false);
    const port = contacts();
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "DELIVERY_ALREADY_ATTEMPTED" });
    expect(store.createShare).not.toHaveBeenCalled();
    expect(port.handoff).not.toHaveBeenCalled();
  });

  it("holds a handoff HighLevel did not confirm for review, and does not repeat it", async () => {
    const store = repository();
    const port = contacts();
    port.handoff.mockRejectedValue(new HomeownerError("HANDOFF_UNCERTAIN", 502, "x"));
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toMatchObject({ code: "HANDOFF_UNCERTAIN" });
    expect(port.handoff).toHaveBeenCalledOnce();
    expect(store.finishDelivery).toHaveBeenCalledOnce();
    expect(store.finishDelivery).toHaveBeenCalledWith(
      REPORT_ID,
      "uncertain",
      "HANDOFF_UNCERTAIN",
      SHARE_ID,
    );
  });

  it("closes the attempt as blocked when no link was made, so nothing could have been sent", async () => {
    const store = repository();
    store.createShare.mockRejectedValue(new Error("the store is unavailable"));
    const port = contacts();
    await expect(
      handoffHomeReport(asRepository(store), port, REPORT_ID, ENABLED),
    ).rejects.toThrow();
    expect(port.handoff).not.toHaveBeenCalled();
    expect(store.finishDelivery).toHaveBeenCalledWith(
      REPORT_ID,
      "blocked",
      expect.any(String),
      null,
    );
  });
});
