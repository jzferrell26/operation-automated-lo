import { describe, expect, it, vi } from "vitest";
import { buildHomeReport } from "@oalo/application/homeowner-reports";
import { HomeReportSchema } from "@oalo/contracts";
import { generateHomeReport, shareHomeReport, type GenerateHomeDependencies } from "./service.js";
import { HomeownerError, readBoundedJson } from "./errors.js";
import { HomeEnvironmentSchema, homeConnectionsFor } from "./runtime.js";
import { homeownerInput, homeownerValuation } from "./homeowner-fixtures.js";
import { createHomeReportPdf } from "../../features/homeowners/report-pdf.js";
import { PDFDocument } from "pdf-lib";
const now = new Date("2026-09-24T12:00:00Z");
const input = () => homeownerInput(now);
function dependencies(): GenerateHomeDependencies {
  return {
    repository: {
      reserve: vi
        .fn()
        .mockResolvedValue({ kind: "reserved", status: "pending", cached: null, report: null }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    },
    contacts: {
      get: vi.fn().mockResolvedValue({
        id: "fixture-contact",
        name: "Verified Fictional Owner",
        email: null,
        communicationAllowed: true,
      }),
      search: vi.fn(),
      handoff: vi.fn(),
    },
    valuation: { estimate: vi.fn().mockResolvedValue(homeownerValuation(now)) },
    locationId: "00000000-0000-4000-8000-000000000011",
    monthlyLimit: 100,
    now: () => now,
  };
}
describe("homeowner report commands", () => {
  it("creates a standalone AVM report without HighLevel and cannot attach an unverified contact", async () => {
    const deps = dependencies();
    const propertyInput = {
      ...input(),
      association: "property_only" as const,
      contactId: "property-only",
      contactName: "Property valuation",
    };
    const report = await generateHomeReport(propertyInput, { ...deps, contacts: null });
    expect(report.input.association).toBe("property_only");
    expect(report.input.contactId).toBe("property-only");
    expect(report.valuation.valueMinor).toBe(48_500_000);
    expect(deps.valuation!.estimate).toHaveBeenCalledOnce();
    expect(deps.contacts!.get).not.toHaveBeenCalled();
    await expect(
      generateHomeReport(
        { ...propertyInput, contactId: "unverified-contact" },
        { ...deps, contacts: null },
      ),
    ).rejects.toMatchObject({ code: "INVALID_REPORT_DETAILS" });
    expect(deps.valuation!.estimate).toHaveBeenCalledOnce();
  });
  it("keeps AVM available when optional HighLevel configuration is absent or invalid", async () => {
    const repository = { ghlLocation: vi.fn().mockResolvedValue(null) };
    const config = HomeEnvironmentSchema.parse({
      OALO_HOMEOWNER_LIVE_DATA: "enabled",
      OALO_RENTCAST_API_KEY: "fixture-key",
      OALO_HOMEOWNER_GHL_CONNECTIONS_JSON: "invalid",
    });
    const connections = await homeConnectionsFor(
      "00000000-0000-4000-8000-000000000001",
      repository,
      config,
    );
    expect(connections.contacts).toBeNull();
    expect(connections.valuation).not.toBeNull();
    expect(connections.connectionIssue).toContain("HighLevel");
    expect(repository.ghlLocation).not.toHaveBeenCalled();
  });
  it("uses verified contact identity, stores one snapshot and records no extra valuation on replay", async () => {
    const deps = dependencies();
    const report = await generateHomeReport(input(), deps);
    expect(report.input.contactName).toBe("Verified Fictional Owner");
    expect(deps.valuation!.estimate).toHaveBeenCalledOnce();
    expect(deps.repository.complete).toHaveBeenCalledWith(report);
    vi.mocked(deps.repository.reserve).mockResolvedValue({
      kind: "existing",
      status: "ready",
      cached: null,
      report,
    });
    expect(await generateHomeReport(input(), deps)).toEqual(report);
    expect(deps.valuation!.estimate).toHaveBeenCalledOnce();
  });
  it("reuses cached valuations and does not retry pending, failed or uncertain requests", async () => {
    const deps = dependencies();
    vi.mocked(deps.repository.reserve).mockResolvedValue({
      kind: "reserved",
      status: "pending",
      cached: homeownerValuation(now),
      report: null,
    });
    await generateHomeReport(input(), deps);
    expect(deps.valuation!.estimate).not.toHaveBeenCalled();
    for (const status of ["pending", "failed", "uncertain"] as const) {
      vi.mocked(deps.repository.reserve).mockResolvedValue({
        kind: "existing",
        status,
        cached: null,
        report: null,
      });
      await expect(generateHomeReport(input(), deps)).rejects.toMatchObject({
        code: "LOOKUP_ALREADY_ATTEMPTED",
      });
    }
    expect(deps.valuation!.estimate).not.toHaveBeenCalled();
  });
  it("refuses missing connections, bad contacts and future balances before paid work", async () => {
    const deps = dependencies();
    await expect(generateHomeReport(input(), { ...deps, contacts: null })).rejects.toMatchObject({
      code: "CONTACT_CONNECTION_REQUIRED",
    });
    await expect(generateHomeReport(input(), { ...deps, valuation: null })).rejects.toMatchObject({
      code: "VALUATION_NOT_CONFIGURED",
    });
    await expect(
      generateHomeReport(
        { ...input(), mortgage: { ...input().mortgage, asOf: "2030-01-01" } },
        deps,
      ),
    ).rejects.toMatchObject({ code: "FUTURE_BALANCE_DATE" });
    vi.mocked(deps.contacts!.get).mockResolvedValue({
      id: "wrong-contact",
      name: "Other",
      email: null,
      communicationAllowed: true,
    });
    await expect(generateHomeReport(input(), deps)).rejects.toMatchObject({
      code: "CONTACT_NOT_ACCESSIBLE",
    });
    expect(deps.repository.reserve).not.toHaveBeenCalled();
    expect(deps.valuation!.estimate).not.toHaveBeenCalled();
  });
  it("records uncertain lookups without inventing a report or falling back to sample data", async () => {
    const deps = dependencies();
    vi.mocked(deps.valuation!.estimate).mockRejectedValue(
      new HomeownerError("VALUATION_UNCERTAIN", 502, "Lookup uncertain"),
    );
    await expect(generateHomeReport(input(), deps)).rejects.toMatchObject({
      code: "VALUATION_UNCERTAIN",
    });
    expect(deps.repository.complete).not.toHaveBeenCalled();
    expect(deps.repository.fail).toHaveBeenCalledWith(
      input().requestId,
      expect.any(String),
      "VALUATION_UNCERTAIN",
      true,
    );
    vi.mocked(deps.valuation!.estimate).mockResolvedValue({
      ...homeownerValuation(now),
      source: "sample",
    });
    await expect(generateHomeReport(input(), deps)).rejects.toMatchObject({
      code: "INVALID_VALUATION_SOURCE",
    });
    expect(deps.repository.complete).not.toHaveBeenCalled();
  });
  it("creates hashed, expiring links and blocks stale snapshots", async () => {
    const report = buildHomeReport(
      input(),
      homeownerValuation(now),
      `hreport_${"a".repeat(32)}`,
      `home_${"a".repeat(32)}`,
      now,
    );
    const repo = {
      getReport: vi.fn().mockResolvedValue(report),
      createShare: vi.fn().mockResolvedValue("share-1"),
    };
    const config = HomeEnvironmentSchema.parse({ OALO_APP_URL: "https://app.example.test" });
    const share = await shareHomeReport(repo, report.id, config, now);
    expect(share.url).toMatch(/^https:\/\/app\.example\.test\/home-report\/[a-f0-9]{64}$/u);
    expect(share.url).not.toContain(input().contactName);
    expect(share.expiresAt).toBe("2026-10-24T12:00:00.000Z");
    expect(repo.createShare.mock.calls[0]?.[1]).not.toBe(share.url.split("/").at(-1));
    await expect(
      shareHomeReport(repo, report.id, config, new Date("2026-11-01T00:00:00Z")),
    ).rejects.toMatchObject({ code: "REPORT_STALE" });
    repo.getReport.mockResolvedValue(null);
    await expect(shareHomeReport(repo, report.id, config, now)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
  it("renders a real multi-page PDF from the snapshot and bounds untrusted response bodies", async () => {
    const report = buildHomeReport(
      input(),
      homeownerValuation(now),
      `hreport_${"a".repeat(32)}`,
      `home_${"a".repeat(32)}`,
      now,
    );
    const bytes = await createHomeReportPdf(report);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
    const unicode = HomeReportSchema.parse({
      ...report,
      input: { ...report.input, brand: { ...report.input.brand, name: "住宅担当者" } },
    });
    await expect(createHomeReportPdf(unicode)).rejects.toThrow("Print");
    await expect(readBoundedJson(new Response("x".repeat(200)), 100)).rejects.toMatchObject({
      code: "BODY_TOO_LARGE",
    });
    await expect(readBoundedJson(new Response("invalid"))).rejects.toMatchObject({
      code: "INVALID_BODY",
    });
  });
});
