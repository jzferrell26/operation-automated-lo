import { afterEach, describe, expect, it } from "vitest";

import { createDefaultCampaignCommandPorts } from "./authenticated-principal.js";
import {
  LIBRARY_AD_SAVE_INPUT,
  LOCAL_SYNTHETIC_ENV,
  SAMPLE_LIBRARY_ENV,
  createTemporaryCampaignStore,
} from "./campaign-command-test-support.js";
import { handleCampaignPreflight } from "./campaign-preflight-handler.js";
import { loadLocalCampaign } from "./local-campaign-store.js";

/**
 * PRD-009d "Save and check" through the route handler, against the local demo's file store:
 * 009D-AC-008 (the request half), 009D-AC-011, 009D-AC-020, 009D-AC-021, and 009D-AC-024. The same
 * proofs against a real Postgres are `library-ad-save.postgres.test.ts`.
 */

const store = createTemporaryCampaignStore("oalo-preflight-");

afterEach(async () => {
  await store.restore();
});

function environment() {
  return { ...store.env(), ...SAMPLE_LIBRARY_ENV };
}

function post(body: unknown, headers: HeadersInit = {}): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/preflight", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function save(body: unknown, headers: HeadersInit = {}) {
  return handleCampaignPreflight(
    post(body, headers),
    environment(),
    createDefaultCampaignCommandPorts(),
  );
}

interface SavedBody {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
  readonly state: string;
  readonly blocking: boolean;
  readonly reviewHref: string;
  readonly persistenceKind: string;
  readonly providerPublicationAuthorized: boolean;
  readonly findings: readonly { ruleCode: string; remediation: string }[];
}

describe("Save and check (009D-AC-011)", () => {
  it("saves a library-ad version for the local principal and points at step 3", async () => {
    await store.enter();
    const response = await save(LIBRARY_AD_SAVE_INPUT);
    expect(response.status).toBe(200);
    const body = (await response.json()) as SavedBody;
    expect(body.state).toBe("awaiting_approval");
    expect(body.blocking).toBe(false);
    expect(body.versionNo).toBe(1);
    expect(body.persistenceKind).toBe("filesystem");
    expect(body.providerPublicationAuthorized).toBe(false);
    expect(body.campaignRef).toMatch(/^campaign_[0-9a-f]{32}$/u);
    expect(body.reviewHref).toBe(`/marketing/campaigns/new?step=3&campaign=${body.campaignRef}`);
    expect(response.headers.get("x-oalo-correlation-ref")).toMatch(
      /^correlation_preflight_[0-9a-f]+$/u,
    );

    const stored = await loadLocalCampaign(body.campaignRef, environment());
    const manifest = stored?.version.manifest;
    if (manifest?.blueprintId !== "library-ad") throw new Error("Not a library-ad version");
    expect(manifest.libraryAd).toEqual({ id: "sample-first-home", version: 2 });
    expect(manifest.meta.targeting).toMatchObject({ regions: ["TX"], cities: ["Austin, TX"] });
    expect(manifest.meta.placements).toEqual(["facebook_feed"]);
    expect(manifest.schedule).toEqual({ startsAt: null, endsAt: "2030-06-12T23:59:59.000Z" });
    expect(manifest.meta).toMatchObject({ dailyBudgetMinor: 2_500, totalBudgetMinor: 35_000 });
  });

  it("echoes an accepted x-correlation-id tracing header alongside the canonical reference", async () => {
    await store.enter();
    const response = await save(LIBRARY_AD_SAVE_INPUT, { "x-correlation-id": "trace-123" });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-correlation-id")).toBe("trace-123");
  });

  it.each([
    ["an unknown ad", { adId: "not-in-the-library", adVersion: 1 }],
    ["a replaced version", { adId: "sample-first-home", adVersion: 1 }],
    ["a version that does not exist", { adId: "sample-first-home", adVersion: 3 }],
    ["a retired ad", { adId: "sample-spring-search", adVersion: 1 }],
  ])("refuses %s, and stores nothing", async (_label, ad) => {
    const path = await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, ...ad });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "LIBRARY_AD_NOT_AVAILABLE" });
    await expect(
      import("node:fs/promises").then(({ readFile }) => readFile(path)),
    ).rejects.toThrow();
  });

  it("refuses a sample ad on a run that has no samples", async () => {
    await store.enter();
    const response = await handleCampaignPreflight(
      post(LIBRARY_AD_SAVE_INPUT),
      store.env(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "LIBRARY_AD_NOT_AVAILABLE" });
  });

  it.each([
    ["a headline over 120 characters", { headline: "h".repeat(121) }],
    ["primary text over 600 characters", { primaryText: "p".repeat(601) }],
    ["an unknown field", { surprise: true }],
    ["a tenant field", { locationRef: "location_otherTenant001" }],
    ["a start date", { startsAt: "2030-06-01T00:00:00.000Z" }],
    ["a call to action", { callToAction: "APPLY_NOW" }],
    ["a budget below the floor", { dailyBudgetDollars: 4 }],
    ["a total above the ceiling", { totalBudgetDollars: 5_001 }],
    ["an end date that is not a date", { endsOn: "next week" }],
    ["no places", { places: [] }],
  ])("refuses %s with 400 before anything is stored", async (_label, change) => {
    const path = await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, ...change });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "INVALID_CAMPAIGN_DRAFT" });
    await expect(
      import("node:fs/promises").then(({ readFile }) => readFile(path)),
    ).rejects.toThrow();
  });

  it("stores a headline over the ad's own limit and sends it back with a plain fix", async () => {
    await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, headline: "h".repeat(61) });
    expect(response.status).toBe(200);
    const body = (await response.json()) as SavedBody;
    expect(body.state).toBe("preflight_failed");
    expect(body.findings).toContainEqual(
      expect.objectContaining({
        ruleCode: "WORDS_TOO_LONG",
        remediation: "Shorten the headline to 60 characters or fewer.",
      }),
    );
  });

  it("reads the body through a bound and refuses a larger one with 413", async () => {
    await store.enter();
    const response = await save(
      JSON.stringify({ ...LIBRARY_AD_SAVE_INPUT, primaryText: "p".repeat(20_000) }),
    );
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ error: "INVALID_CAMPAIGN_DRAFT" });
  });

  it("refuses a body that is not JSON", async () => {
    await store.enter();
    const response = await handleCampaignPreflight(
      new Request("https://app.operation-automated-lo.test/api/campaigns/preflight", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "adId=sample-first-home",
      }),
      environment(),
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(415);
  });
});

describe("where it shows, as the request schema reads it (009D-AC-008)", () => {
  it.each([
    "78701",
    "Austin 78701",
    "10 miles around Austin",
    "within 5 miles",
    "women 25-40",
    "men",
    "Austin",
    "Austin, ZZ",
  ])("refuses %j with 400", async (place) => {
    await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, places: ["TX", place] });
    expect(response.status).toBe(400);
  });

  it("refuses a sixth state and an eleventh city", async () => {
    await store.enter();
    const sixStates = ["TX", "OK", "NM", "LA", "AR", "KS"];
    expect((await save({ ...LIBRARY_AD_SAVE_INPUT, places: sixStates })).status).toBe(400);
    const elevenCities = [
      "Austin, TX",
      "Dallas, TX",
      "Houston, TX",
      "Tulsa, OK",
      "Waco, TX",
      "Plano, TX",
      "Frisco, TX",
      "Denton, TX",
      "Tyler, TX",
      "Temple, TX",
      "Killeen, TX",
    ];
    expect((await save({ ...LIBRARY_AD_SAVE_INPUT, places: elevenCities })).status).toBe(400);
  });

  it("stores each place normalised: a state by its code, a city with its code", async () => {
    await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, places: ["texas", "page, az", "TX"] });
    const body = (await response.json()) as SavedBody;
    const manifest = (await loadLocalCampaign(body.campaignRef, environment()))?.version.manifest;
    if (manifest?.blueprintId !== "library-ad") throw new Error("Not a library-ad version");
    expect(manifest.meta.targeting.regions).toEqual(["TX"]);
    expect(manifest.meta.targeting.cities).toEqual(["page, AZ"]);
  });
});

describe("the brand comes from saved Brand, never from the request (009D-AC-024)", () => {
  it.each([
    ["the brand", { brand: { name: "Someone Else" } }],
    ["a name", { name: "Someone Else" }],
    ["a title", { title: "Realtor" }],
    ["a company", { company: "Oakline Realty" }],
    ["an NMLS number", { nmls: "1234567" }],
    ["a colour", { colorPresetId: "plum" }],
    ["a disclosure", { disclosureText: "No disclosure" }],
    ["a disclosure line", { disclosureLine: "No disclosure" }],
    ["a consent", { consentText: "Anything" }],
    ["lead form wording", { leadFormWording: "Anything" }],
    ["an advertiser block", { advertiser: { name: "Someone Else" } }],
    ["a partner", { partner: { realtorDisplayName: "Priya Nadeem" } }],
  ])("refuses a request that carries %s", async (_label, field) => {
    await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, ...field });
    expect(response.status).toBe(400);
  });

  it("freezes the saved brand into the version, with derived and fixed profile references (009D-AC-021)", async () => {
    await store.enter();
    const body = (await (await save(LIBRARY_AD_SAVE_INPUT)).json()) as SavedBody;
    const version = (await loadLocalCampaign(body.campaignRef, environment()))?.version;
    if (version?.manifest.blueprintId !== "library-ad") throw new Error("Not a library-ad version");
    expect(version.manifest.advertiser).toEqual({
      name: "Alex Morgan",
      title: "Loan officer",
      company: "Prairie Home Lending",
      nmls: "0000000",
      companyNmls: "0000000",
      colorPresetId: "navy",
    });
    expect(version.manifest.content.disclosureText).toBe("Equal Housing Opportunity.");
    expect(version.manifest.content.consentText).not.toMatch(/property/u);
    expect(version.inputVersions.brandProfileVersionRef).toMatch(/^brandprofile_[0-9a-f]{40}$/u);
    expect(version.inputVersions.partnerProfileVersionRef).toBe("partnerprofile_none001");
    expect(version.inputVersions.rulesetVersionRef).toBe("ruleset_libraryAd001");
  });

  it("checks the words and sends a claim back with its plain fix (009D-AC-010)", async () => {
    await store.enter();
    const response = await save({ ...LIBRARY_AD_SAVE_INPUT, headline: "Ask about our low rates" });
    const body = (await response.json()) as SavedBody;
    expect(body.state).toBe("preflight_failed");
    expect(body.findings).toContainEqual(
      expect.objectContaining({
        ruleCode: "WORDS_RATE_PAYMENT_OR_TERM_CLAIM",
        remediation: "Take 'low rates' out of the headline. Ads can't state rate claims.",
      }),
    );
  });
});

describe("a new version of a campaign (009D-AC-020)", () => {
  it("appends version 2 to the same campaign instead of minting a new reference", async () => {
    await store.enter();
    const first = (await (await save(LIBRARY_AD_SAVE_INPUT)).json()) as SavedBody;
    const second = await save({
      ...LIBRARY_AD_SAVE_INPUT,
      campaignRef: first.campaignRef,
      headline: "Ready for your first home? Start here.",
    });
    expect(second.status).toBe(200);
    const body = (await second.json()) as SavedBody;
    expect(body.campaignRef).toBe(first.campaignRef);
    expect(body.versionNo).toBe(2);
    expect(body.campaignVersionRef).not.toBe(first.campaignVersionRef);
    const stored = await loadLocalCampaign(first.campaignRef, environment());
    expect(stored?.version.versionNo).toBe(2);
    expect(stored?.rowVersion).toBe(2);
    expect(stored?.approval).toBeUndefined();
  });

  it("answers an unknown campaign reference as not found, and stores nothing", async () => {
    const path = await store.enter();
    const response = await save({
      ...LIBRARY_AD_SAVE_INPUT,
      campaignRef: "campaign_00000000000000000000000000000000",
    });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "NOT_FOUND" });
    await expect(
      import("node:fs/promises").then(({ readFile }) => readFile(path)),
    ).rejects.toThrow();
  });
});

describe("who may save", () => {
  it("returns 401 when review mode has no verified session", async () => {
    const response = await handleCampaignPreflight(
      post(LIBRARY_AD_SAVE_INPUT),
      { ...LOCAL_SYNTHETIC_ENV, OALO_ENVIRONMENT: "production", OALO_REVIEW_SURFACE: "authorized" },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "UNAUTHENTICATED" });
  });

  it("returns 403 when staging cannot use local synthetic identity", async () => {
    const response = await handleCampaignPreflight(
      post(LIBRARY_AD_SAVE_INPUT),
      { OALO_ENVIRONMENT: "staging", OALO_PROVIDER_MODE: "stub", OALO_SYNTHETIC_DATA_ONLY: "true" },
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "WORKSPACE_UNAVAILABLE" });
  });

  it("returns 401 when cookie and bearer are both present", async () => {
    const response = await handleCampaignPreflight(
      post(LIBRARY_AD_SAVE_INPUT, {
        authorization: "Bearer aaa.bbb.ccc",
        cookie: "__Host-oalo_session=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      }),
      LOCAL_SYNTHETIC_ENV,
      createDefaultCampaignCommandPorts(),
    );
    expect(response.status).toBe(401);
  });
});
