import { describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_SAMPLES_FLAG,
  loadAdsLibrary,
} from "../../../../../features/ads-library/server/catalog-loader.js";
import { PLACEHOLDER_BAND } from "../../../../../server/launch-an-ad.js";
import { createLocalSyntheticPrincipal } from "../../../../../server/authenticated-principal.js";
import { WorkspacePreferenceError } from "../../../../../server/workspace-preferences.js";
import {
  loadAdsLibraryPage,
  loadPreviewAdsLibraryPage,
  parseLibraryTopic,
} from "./ads-library-page-data.js";

/**
 * PRD-009c part 2, the server read behind the "Ads library" tab: 009C-AC-004 (the library reads the
 * sample guard at request time, so a page can never show a sample a deployment would refuse),
 * 009C-AC-010 (`?topic=` is typed), 009C-AC-011 (the viewer's own brand, or the placeholder), and
 * 009C-AC-013 (display fields only reach the page).
 */

const SAMPLES_ON = Object.freeze({
  OALO_ENVIRONMENT: "local",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});

const principal = createLocalSyntheticPrincipal();

/** The guard cases are about the library, not Brand, and some of their environments are not a workspace at all. */
const NO_BRAND_NEEDED = Object.freeze({
  readBrand: () => Promise.resolve({ band: PLACEHOLDER_BAND }),
});

describe("parseLibraryTopic", () => {
  it.each([
    ["first-time-buyers", "first-time-buyers"],
    ["refinance", "refinance"],
    ["va-loans", "va-loans"],
    ["pre-approval", "pre-approval"],
    ["down-payment-help", "down-payment-help"],
  ] as const)("reads %s", (value, topic) => {
    expect(parseLibraryTopic({ topic: value })).toBe(topic);
  });

  it.each([
    ["an unknown topic", { topic: "x" }],
    ["a topic in the wrong case", { topic: "Refinance" }],
    ["a repeated topic", { topic: ["refinance", "va-loans"] }],
    ["an empty topic", { topic: "" }],
    ["no topic", {}],
    ["a topic that looks like an address", { topic: "https://example.invalid" }],
  ])("ignores %s", (_label, search) => {
    expect(parseLibraryTopic(search)).toBeUndefined();
  });
});

describe("loadAdsLibraryPage", () => {
  it("hands the page every active sample ad at its newest version, and no replaced or retired one", async () => {
    const data = await loadAdsLibraryPage(principal, {}, SAMPLES_ON);

    expect(data.cards).toHaveLength(8);
    const ids = data.cards.map((card) => card.id);
    expect(ids).toContain("sample-first-home");
    expect(ids).not.toContain("sample-spring-search");
    expect(data.cards.find((card) => card.id === "sample-first-home")?.version).toBe(2);
    expect(data.cards.every((card) => card.sample)).toBe(true);
  });

  it("carries the topic named in the address, and no other part of it", async () => {
    const data = await loadAdsLibraryPage(principal, { topic: "va-loans", step: "3" }, SAMPLES_ON);
    expect(data.topic).toBe("va-loans");
    expect(Object.keys(data).sort()).toEqual(["advertiser", "cards", "topic"]);
  });

  it("reads the library's art and words from the catalog, never from the request", async () => {
    const library = await loadAdsLibrary({ environment: SAMPLES_ON });
    const data = await loadAdsLibraryPage(
      principal,
      { ad: "sample-pre-approval", art: "x", name: "y" },
      SAMPLES_ON,
    );
    const loaded = library.find("sample-pre-approval", 1);
    const card = data.cards.find((item) => item.id === "sample-pre-approval");

    expect(card?.alt).toBe(loaded?.entry.images.alt);
    expect(card?.name).toBe(loaded?.entry.name);
    expect(card?.headline).toBe(loaded?.entry.defaults.headline);
    expect(card?.art.tall).toBe(loaded?.art.tall.url);
  });

  it("keeps compliance notes and approval blocks out of what the page receives (009C-AC-013)", async () => {
    const library = await loadAdsLibrary({ environment: SAMPLES_ON });
    const wire = JSON.stringify(await loadAdsLibraryPage(principal, {}, SAMPLES_ON));

    expect(wire).not.toMatch(/compliance|requiredOnAd|blockedInWords|approvedBy|sha256|retired/iu);
    for (const { entry } of library.entries) {
      expect(wire).not.toContain(entry.compliance.notes);
      expect(wire).not.toContain(entry.approval.approvedBy);
    }
  });

  it("is empty without the flag, with the real catalog as shipped (009C-AC-012)", async () => {
    const { [ADS_LIBRARY_SAMPLES_FLAG]: _flag, ...withoutFlag } = SAMPLES_ON;
    const data = await loadAdsLibraryPage(principal, {}, withoutFlag);
    expect(data.cards).toEqual([]);
  });

  /**
   * 009C-AC-004. The page asks the guard on every request: the same process answers differently the
   * moment the environment does, so no answer is baked in by an earlier request or a build.
   */
  it.each([
    ["the flag is `true`, not `enabled`", { [ADS_LIBRARY_SAMPLES_FLAG]: "true" }],
    ["the environment is preview", { OALO_ENVIRONMENT: "preview" }],
    ["the environment is production", { OALO_ENVIRONMENT: "production" }],
    ["the environment is unset", { OALO_ENVIRONMENT: undefined }],
    ["VERCEL is set", { VERCEL: "1" }],
    ["VERCEL_ENV is set", { VERCEL_ENV: "production" }],
    ["a release manifest is set", { OALO_RELEASE_MANIFEST_JSON: "{}" }],
  ])("shows no sample ad when %s, even straight after a request that did", async (_label, change) => {
    expect((await loadAdsLibraryPage(principal, {}, SAMPLES_ON)).cards).toHaveLength(8);

    const refused = { ...SAMPLES_ON, ...change };
    const data = await loadAdsLibraryPage(principal, {}, refused, NO_BRAND_NEEDED);

    expect(data.cards).toEqual([]);
    expect((await loadAdsLibraryPage(principal, {}, SAMPLES_ON)).cards).toHaveLength(8);
  });

  it("puts the viewer's own saved Brand on the band", async () => {
    const data = await loadAdsLibraryPage(principal, {}, SAMPLES_ON);
    expect(data.advertiser).toMatchObject({
      name: "Alex Morgan",
      company: "Prairie Home Lending",
      nmls: "0000000",
    });
  });

  it("falls back to the placeholder band when Brand cannot be read for this person", async () => {
    const data = await loadAdsLibraryPage(principal, {}, SAMPLES_ON, {
      readBrand: () =>
        Promise.reject(
          new WorkspacePreferenceError("WORKSPACE_ACCESS_DENIED", 403, "Support cannot open Brand"),
        ),
    });
    expect(data.advertiser).toBe(PLACEHOLDER_BAND);
  });

  it("lets any other failure of the Brand read through", async () => {
    await expect(
      loadAdsLibraryPage(principal, {}, SAMPLES_ON, {
        readBrand: () => Promise.reject(new Error("the database is down")),
      }),
    ).rejects.toThrow("the database is down");
  });
});

describe("loadPreviewAdsLibraryPage", () => {
  it("is empty in the dashboard preview, which runs as `preview` and never sets the flag", async () => {
    const data = await loadPreviewAdsLibraryPage(
      { topic: "refinance" },
      { OALO_ENVIRONMENT: "preview", OALO_DASHBOARD_PREVIEW: "enabled" },
    );
    expect(data.cards).toEqual([]);
    expect(data.advertiser).toBe(PLACEHOLDER_BAND);
    expect(data.topic).toBe("refinance");
  });
});
