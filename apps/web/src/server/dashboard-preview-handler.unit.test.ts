import { describe, expect, it } from "vitest";
import {
  campaignCheckSchema,
  initialPreviewState,
  previewStateSchema,
} from "../features/dashboard-preview/model.js";
import { canRenderDashboardPreview } from "./dashboard-preview.js";
import { handleDashboardPreviewCheck } from "./dashboard-preview-handler.js";

const environment = {
  OALO_ENVIRONMENT: "preview",
  OALO_DASHBOARD_PREVIEW: "enabled",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  OALO_PRODUCTION_TRAFFIC: "disabled",
};
const origin = "https://preview.example.test";
function draft() {
  return {
    address: "214 Cedar Street, Dallas, TX",
    stateCode: "TX",
    propertyDescription: "Sample home with an open living area and a covered patio.",
    openHouseStartsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    openHouseEndsAt: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
    realtorDisplayName: "Jordan Avery",
    headline: "Tour a place to call home",
    body: "Explore the home and meet the team at the upcoming open house.",
    callToAction: "Plan your visit",
    disclosureText: "Sample content. Equal Housing Opportunity.",
    consentText: "I agree to be contacted about this property.",
    region: "Dallas, TX",
    dailyBudgetDollars: 25,
    totalBudgetDollars: 75,
    propertyPermissionConfirmed: true,
    realtorPermissionConfirmed: true,
  };
}
function request(body: unknown = draft(), requestOrigin: string = origin) {
  return new Request(`${origin}/api/preview/campaigns/check`, {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("dashboard preview boundary", () => {
  it.each([
    { ...environment, OALO_DASHBOARD_PREVIEW: undefined },
    { ...environment, OALO_DASHBOARD_PREVIEW: "true" },
    { ...environment, OALO_ENVIRONMENT: "production" },
    { ...environment, OALO_ENVIRONMENT: "staging" },
    { ...environment, OALO_REVIEW_SURFACE: "authorized" },
    { ...environment, OALO_PROVIDER_MODE: "live" },
    { ...environment, OALO_SYNTHETIC_DATA_ONLY: "false" },
  ])("refuses to enable a visual test surface outside synthetic preview", async (env) => {
    expect(canRenderDashboardPreview(env)).toBe(false);
    expect((await handleDashboardPreviewCheck(request(), env)).status).toBe(404);
  });

  it("refuses cross-origin calls and does not allow missing origin", async () => {
    expect(
      (
        await handleDashboardPreviewCheck(
          request(draft(), "https://outside.example.test"),
          environment,
        )
      ).status,
    ).toBe(403);
    const missing = request();
    missing.headers.delete("origin");
    expect((await handleDashboardPreviewCheck(missing, environment)).status).toBe(403);
  });

  it("bounds untrusted input before compilation", async () => {
    const oversized = request({ address: "x".repeat(100001) });
    expect((await handleDashboardPreviewCheck(oversized, environment)).status).toBe(413);
    const invalid = await handleDashboardPreviewCheck(
      request({ ...draft(), headline: "x" }),
      environment,
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      error: "INVALID_CAMPAIGN_DRAFT",
      issues: expect.arrayContaining([{ path: ["headline"] }]),
    });
  });

  it("uses the browser destination host when Next exposes an internal request URL", async () => {
    const proxied = new Request("http://localhost:3210/api/preview/campaigns/check", {
      method: "POST",
      headers: { origin, host: "preview.example.test", "content-type": "application/json" },
      body: JSON.stringify(draft()),
    });
    expect((await handleDashboardPreviewCheck(proxied, environment)).status).toBe(200);
    const foreign = request();
    foreign.headers.set("host", "another.example.test");
    expect((await handleDashboardPreviewCheck(foreign, environment)).status).toBe(403);
  });

  it("runs actual checks without server persistence and returns a browser-scoped draft", async () => {
    const response = await handleDashboardPreviewCheck(request(), environment);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const saved = campaignCheckSchema.parse(await response.json());
    expect(saved.blocking).toBe(false);
    expect(saved.persistenceKind).toBe("browser");
    expect(saved.providerPublicationAuthorized).toBe(false);
    expect(saved.dailyBudgetMinor).toBe(2500);
    expect(saved.detailHref).toBe(`/marketing/campaigns/${saved.campaignRef}`);
  });

  it("blocks disallowed copy and cannot store it as an approved test", async () => {
    const response = await handleDashboardPreviewCheck(
      request({ ...draft(), headline: "Guaranteed approval" }),
      environment,
    );
    expect(response.status).toBe(200);
    const saved = campaignCheckSchema.parse(await response.json());
    expect(saved.blocking).toBe(true);
    expect(saved.findings.some((finding) => finding.severity === "blocking")).toBe(true);
    expect(campaignCheckSchema.safeParse({ ...saved, state: "approved" }).success).toBe(false);
  });

  it("rejects unversioned browser data, foreign links, and unsupported stage values", async () => {
    expect(previewStateSchema.safeParse({ ...initialPreviewState(), version: 99 }).success).toBe(
      false,
    );
    expect(
      previewStateSchema.safeParse({
        ...initialPreviewState(),
        leadStages: { "sample-lead-1": "Published" },
      }).success,
    ).toBe(false);
    const saved = await (await handleDashboardPreviewCheck(request(), environment)).json();
    expect(
      campaignCheckSchema.safeParse({ ...saved, detailHref: "https://outside.example.test" })
        .success,
    ).toBe(false);
    expect(
      campaignCheckSchema.safeParse({ ...saved, providerPublicationAuthorized: true }).success,
    ).toBe(false);
  });
});
