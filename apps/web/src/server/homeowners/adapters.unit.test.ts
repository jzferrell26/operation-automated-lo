import { describe, expect, it, vi } from "vitest";
import { createRentCastValuationPort, normalizeRentCastValuation } from "./rentcast.js";
import { createHomeHighLevelPort, type HomeGhlConnection } from "./highlevel.js";
import { homeownerInput, rentCastFixture } from "./homeowner-fixtures.js";
const config: HomeGhlConnection = {
  ghlLocationId: "location-one",
  accessToken: "fixture-server-token-never-live",
  reportUrlFieldId: "report-field",
  workflowId: "report-workflow",
};
const contact = (overrides: Record<string, unknown> = {}) => ({
  id: "contact-one",
  locationId: "location-one",
  firstName: "Fictional",
  lastName: "Owner",
  email: "owner@example.test",
  dnd: false,
  dndSettings: { Email: { status: "inactive" }, SMS: { status: "inactive" } },
  customFields: [],
  ...overrides,
});
describe("RentCast valuation adapter", () => {
  it("normalizes listed comparables and makes one bounded fixed-host request", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(rentCastFixture()));
    const port = createRentCastValuationPort(
      "fixture-key",
      fetcher,
      () => new Date("2026-09-24T12:00:00Z"),
    );
    const result = await port.estimate(homeownerInput().address);
    expect(result.valueMinor).toBe(48_500_000);
    expect(result.comparables[0]).toMatchObject({
      priceMinor: 47_900_000,
      priceKind: "listing",
      listingStatus: "Active",
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain("https://api.rentcast.io/v1/avm/value?");
    expect(String(url)).not.toContain("fixture-key");
    expect(options?.headers).toMatchObject({ "X-Api-Key": "fixture-key" });
    expect(options?.redirect).toBe("error");
  });
  it("rejects mismatched properties, wrong units and invalid ranges without inventing missing data", () => {
    const raw = rentCastFixture(),
      address = homeownerInput().address;
    expect(() =>
      normalizeRentCastValuation(
        { ...raw, subjectProperty: { ...raw.subjectProperty, addressLine1: "216 Cedar St" } },
        address,
      ),
    ).toThrow("matched property");
    expect(() =>
      normalizeRentCastValuation(raw, { ...address, street: "214 Cedar Street Apt 2" }),
    ).toThrow("matched property");
    expect(() => normalizeRentCastValuation({ ...raw, priceRangeLow: 900000 }, address)).toThrow(
      "validated",
    );
    const result = normalizeRentCastValuation(
      { ...raw, priceRangeLow: undefined, priceRangeHigh: undefined, comparables: [] },
      address,
    );
    expect(result.lowMinor).toBeNull();
    expect(result.highMinor).toBeNull();
    expect(result.propertyType).toBeNull();
    expect(result.comparables).toEqual([]);
    expect(() => normalizeRentCastValuation({ price: 10 }, address)).toThrow("incomplete");
  });
  it("never retries failed or uncertain valuation requests", async () => {
    for (const status of [404, 429, 500]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("private upstream body", { status }));
      await expect(
        createRentCastValuationPort("fixture-key", fetcher).estimate(homeownerInput().address),
      ).rejects.not.toThrow("private upstream body");
      expect(fetcher).toHaveBeenCalledOnce();
    }
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network timeout"));
    await expect(
      createRentCastValuationPort("fixture-key", fetcher).estimate(homeownerInput().address),
    ).rejects.toMatchObject({ code: "VALUATION_UNCERTAIN" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(() => createRentCastValuationPort("")).toThrow();
  });
});
describe("HighLevel report handoff", () => {
  it("rejects contacts from a different location and missing communication permission", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ contact: contact({ locationId: "other-location" }) }));
    await expect(createHomeHighLevelPort(config, fetcher).get("contact-one")).rejects.toMatchObject(
      { code: "CONTACT_NOT_ACCESSIBLE" },
    );
    for (const patch of [
      { dnd: true },
      { dnd: undefined },
      { dndSettings: undefined },
      { dndSettings: {} },
      { dndSettings: { Email: { status: "inactive" } } },
      { dndSettings: { SMS: { status: "inactive" } } },
      { dndSettings: { Email: { status: "active" } } },
    ]) {
      const block = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ contact: contact(patch) }));
      await expect(
        createHomeHighLevelPort(config, block).handoff(
          "contact-one",
          `https://app.example.test/home-report/${"a".repeat(64)}`,
        ),
      ).rejects.toMatchObject({ code: "CONTACT_COMMUNICATION_BLOCKED" });
      expect(block).toHaveBeenCalledOnce();
    }
  });
  it("updates only the configured field and verifies readback before starting the configured workflow", async () => {
    const url = `https://app.example.test/home-report/${"a".repeat(64)}`;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ contact: contact() }))
      .mockResolvedValueOnce(Response.json({ succeeded: true }))
      .mockResolvedValueOnce(
        Response.json({ contact: contact({ customFields: [{ id: "report-field", value: url }] }) }),
      )
      .mockResolvedValueOnce(Response.json({ succeeded: true }));
    await createHomeHighLevelPort(config, fetcher).handoff("contact-one", url);
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(JSON.parse(String(fetcher.mock.calls[1]?.[1]?.body))).toEqual({
      customFields: [{ id: "report-field", fieldValue: url }],
    });
    expect(fetcher.mock.calls[3]?.[0]).toBe(
      "https://services.leadconnectorhq.com/contacts/contact-one/workflow/report-workflow",
    );
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ Version: "v3" });
  });
  it("never triggers a workflow after failed readback or unconfirmed writes", async () => {
    const url = `https://app.example.test/home-report/${"a".repeat(64)}`;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ contact: contact() }))
      .mockResolvedValueOnce(Response.json({ succeeded: true }))
      .mockResolvedValueOnce(Response.json({ contact: contact() }));
    await expect(
      createHomeHighLevelPort(config, fetcher).handoff("contact-one", url),
    ).rejects.toMatchObject({ code: "HANDOFF_UNCERTAIN" });
    expect(fetcher).toHaveBeenCalledTimes(3);
    await expect(
      createHomeHighLevelPort(config, fetcher).handoff(
        "contact-one",
        "https://untrusted.example.test/path",
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_LINK" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
