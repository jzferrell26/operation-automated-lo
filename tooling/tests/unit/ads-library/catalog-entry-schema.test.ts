import { describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_CALLS_TO_ACTION,
  ADS_LIBRARY_TOPICS,
  AdsLibraryEntrySchema,
  adsLibraryCatalogSchema,
  adsLibraryArtName,
} from "@oalo/contracts";

import { realEntry, sampleEntry, type MutableEntry } from "./catalog-fixtures.js";

/**
 * PRD-009c D1, 009C-AC-001. One strict schema for a catalog entry, and one for a whole catalog,
 * with every rule of D1 refusing a bad value. Each case changes exactly one thing about an entry
 * that otherwise passes, so a refusal can only come from the rule under test.
 */

const ZERO_WIDTH_SPACE = String.fromCodePoint(0x200b);
const RIGHT_TO_LEFT_OVERRIDE = String.fromCodePoint(0x202e);

function entryAccepts(entry: unknown): boolean {
  return AdsLibraryEntrySchema.safeParse(entry).success;
}

function realCatalogAccepts(entries: readonly unknown[]): boolean {
  return adsLibraryCatalogSchema("real").safeParse(entries).success;
}

function sampleCatalogAccepts(entries: readonly unknown[]): boolean {
  return adsLibraryCatalogSchema("sample").safeParse(entries).success;
}

function withArt(entry: MutableEntry, shape: "tall" | "square", art: string): MutableEntry {
  return { ...entry, images: { ...entry.images, [shape]: { ...entry.images[shape], art } } };
}

describe("ads library catalog entry schema (009C-AC-001)", () => {
  it("accepts a well-formed real entry and a well-formed sample entry", () => {
    expect(entryAccepts(realEntry())).toBe(true);
    expect(entryAccepts(sampleEntry())).toBe(true);
    expect(realCatalogAccepts([realEntry()])).toBe(true);
    expect(sampleCatalogAccepts([sampleEntry()])).toBe(true);
    expect(realCatalogAccepts([])).toBe(true);
  });

  it("fixes the topic list and the call-to-action list", () => {
    expect(ADS_LIBRARY_TOPICS).toEqual([
      "first-time-buyers",
      "refinance",
      "va-loans",
      "pre-approval",
      "down-payment-help",
    ]);
    // 009D-AC-012 E4: exactly the six values Meta allows on a lead-form ad (Meta rules check,
    // section 5), in the order the record lists them.
    expect(ADS_LIBRARY_CALLS_TO_ACTION).toEqual([
      "APPLY_NOW",
      "DOWNLOAD",
      "GET_QUOTE",
      "LEARN_MORE",
      "SIGN_UP",
      "SUBSCRIBE",
    ]);
  });

  it("refuses an id that is not lower-case kebab case or is longer than 60 characters", () => {
    for (const id of [
      "First-Home",
      "first_home",
      "first home",
      "-first-home",
      "first-home-",
      "first--home",
      "1first-home",
      "",
      `a${"-b".repeat(30)}`,
    ]) {
      expect(entryAccepts(realEntry(id)), id).toBe(false);
    }
    expect(entryAccepts(realEntry(`a${"b".repeat(59)}`))).toBe(true);
  });

  it("refuses a reused (id, version) and a non-contiguous version", () => {
    expect(realCatalogAccepts([realEntry("a-home", 1), realEntry("a-home", 1)])).toBe(false);
    expect(
      realCatalogAccepts([realEntry("a-home", 1, "replaced"), realEntry("a-home", 3, "active")]),
    ).toBe(false);
    expect(realCatalogAccepts([realEntry("a-home", 2)])).toBe(false);
    expect(
      realCatalogAccepts([realEntry("a-home", 1, "replaced"), realEntry("a-home", 2, "active")]),
    ).toBe(true);
    expect(entryAccepts({ ...realEntry(), version: 0 })).toBe(false);
    expect(entryAccepts({ ...realEntry(), version: 1.5 })).toBe(false);
  });

  it("refuses an active or retired lower version and a replaced highest version", () => {
    expect(
      realCatalogAccepts([realEntry("a-home", 1, "active"), realEntry("a-home", 2, "active")]),
    ).toBe(false);
    expect(
      realCatalogAccepts([realEntry("a-home", 1, "retired"), realEntry("a-home", 2, "active")]),
    ).toBe(false);
    expect(realCatalogAccepts([realEntry("a-home", 1, "replaced")])).toBe(false);
    expect(
      realCatalogAccepts([realEntry("a-home", 1, "replaced"), realEntry("a-home", 2, "retired")]),
    ).toBe(true);
  });

  it("requires the retired block exactly when the status is retired", () => {
    const retired = realEntry("a-home", 1, "retired");
    expect(entryAccepts(retired)).toBe(true);
    const { retired: _block, ...withoutBlock } = retired;
    expect(entryAccepts(withoutBlock)).toBe(false);
    expect(
      entryAccepts({
        ...realEntry(),
        retired: { on: "2026-10-02", reason: "Taken out.", replacedBy: null },
      }),
    ).toBe(false);
    expect(entryAccepts({ ...retired, retired: { on: "2026-10-02", reason: "Taken out." } })).toBe(
      false,
    );
    expect(
      entryAccepts({
        ...retired,
        retired: { on: "October 2", reason: "Taken out.", replacedBy: null },
      }),
    ).toBe(false);
  });

  it("requires retired.replacedBy to name another id that exists in the catalog", () => {
    const retired = realEntry("old-home", 1, "retired");
    const pointing = (replacedBy: string) => ({
      ...retired,
      retired: { on: "2026-10-02", reason: "Replaced by a newer ad.", replacedBy },
    });
    expect(realCatalogAccepts([pointing("new-home"), realEntry("new-home")])).toBe(true);
    expect(realCatalogAccepts([pointing("missing-home"), realEntry("new-home")])).toBe(false);
    expect(realCatalogAccepts([pointing("old-home")])).toBe(false);
  });

  it("refuses a sample mismatch in either catalog", () => {
    expect(realCatalogAccepts([sampleEntry()])).toBe(false);
    expect(sampleCatalogAccepts([realEntry()])).toBe(false);
    expect(entryAccepts({ ...realEntry(), sample: true })).toBe(false);
    expect(entryAccepts({ ...sampleEntry(), sample: false })).toBe(false);
    expect(entryAccepts({ ...sampleEntry(), name: "First home, start here" })).toBe(false);
    expect(entryAccepts({ ...realEntry(), name: "Sample: First home" })).toBe(false);
    expect(entryAccepts(sampleEntry("first-home-start-here"))).toBe(false);
    expect(entryAccepts(realEntry("sample-first-home"))).toBe(false);
  });

  it("binds the approval record to the kind of catalog", () => {
    expect(
      entryAccepts({
        ...realEntry(),
        approval: { approvedBy: "Somebody", approvedOn: "2026-10-01" },
      }),
    ).toBe(false);
    expect(
      entryAccepts({
        ...sampleEntry(),
        approval: { approvedBy: "jzferrell26", approvedOn: "2026-10-01" },
      }),
    ).toBe(false);
    expect(
      entryAccepts({
        ...realEntry(),
        approval: { approvedBy: "jzferrell26", approvedOn: "today" },
      }),
    ).toBe(false);
  });

  it("refuses an unknown topic", () => {
    expect(entryAccepts({ ...realEntry(), topic: "reverse-mortgages" })).toBe(false);
    for (const topic of ADS_LIBRARY_TOPICS) {
      expect(entryAccepts({ ...realEntry(), topic })).toBe(true);
    }
  });

  it("refuses an over-limit editable and defaults beyond the editable limits", () => {
    expect(
      entryAccepts({
        ...realEntry(),
        editable: { headline: { maxLength: 61 }, primaryText: { maxLength: 300 } },
      }),
    ).toBe(false);
    expect(
      entryAccepts({
        ...realEntry(),
        editable: { headline: { maxLength: 60 }, primaryText: { maxLength: 301 } },
      }),
    ).toBe(false);
    expect(
      entryAccepts({
        ...realEntry(),
        editable: { headline: { maxLength: 20 }, primaryText: { maxLength: 300 } },
      }),
    ).toBe(false);
    expect(
      entryAccepts({
        ...realEntry(),
        defaults: { headline: "A plan", primaryText: "x".repeat(301) },
      }),
    ).toBe(false);
  });

  it("refuses an unlisted call to action and defaults a missing one to LEARN_MORE", () => {
    expect(entryAccepts({ ...realEntry(), callToAction: "BUY_NOW" })).toBe(false);
    expect(entryAccepts({ ...realEntry(), callToAction: "learn_more" })).toBe(false);
    // Not on Meta's lead-form list, so never a library ad's button: CONTACT_US and the message
    // buttons (Meta rules check, section 5).
    for (const refused of ["CONTACT_US", "MESSAGE_PAGE", "SEND_MESSAGE", "CALL_NOW"]) {
      expect(entryAccepts({ ...realEntry(), callToAction: refused }), refused).toBe(false);
    }
    for (const allowed of ADS_LIBRARY_CALLS_TO_ACTION) {
      expect(entryAccepts({ ...realEntry(), callToAction: allowed }), allowed).toBe(true);
    }
    const { callToAction: _omitted, ...withoutCallToAction } = realEntry();
    const parsed = AdsLibraryEntrySchema.parse(withoutCallToAction);
    expect(parsed.callToAction).toBe("LEARN_MORE");
  });

  it("refuses a special ad category other than HOUSING", () => {
    for (const category of ["NONE", "CREDIT", "FINANCIAL_PRODUCTS_SERVICES", "housing"]) {
      expect(entryAccepts({ ...realEntry(), specialAdCategory: category }), category).toBe(false);
    }
  });

  it("refuses an art value other than the name derived from the entry's own id and version", () => {
    const base = realEntry("first-home", 2, "active");
    for (const art of [
      "../x.png",
      "/etc/x.png",
      "a\\b.png",
      "c:x.png",
      "https://x/a.png",
      "file:///first-home/v2/tall.png",
      "other-home/v2/tall.png",
      "first-home/v1/tall.png",
      "first-home/v2/square.png",
      "first-home/v2/tall.svg",
      "first-home/v2/tall.PNG",
      "first-home/v2/tall.jpeg",
      "first-home/v2/../v2/tall.png",
      "./first-home/v2/tall.png",
      "first-home/v2/tall.png ",
      "first-home%2fv2%2ftall.png",
    ]) {
      expect(entryAccepts(withArt(base, "tall", art)), art).toBe(false);
    }
    expect(entryAccepts(withArt(base, "tall", "first-home/v2/tall.jpg"))).toBe(true);
    expect(entryAccepts(withArt(base, "square", "first-home/v2/tall.png"))).toBe(false);
    expect(entryAccepts(withArt(base, "square", "first-home/v2/square.jpg"))).toBe(true);
    expect(adsLibraryArtName("first-home", 2, "square", "jpg")).toBe("first-home/v2/square.jpg");
  });

  it("refuses a digest that is not 64 lower-case hexadecimal characters", () => {
    const base = realEntry();
    for (const sha256 of ["A".repeat(64), "a".repeat(63), "a".repeat(65), "g".repeat(64), ""]) {
      expect(
        entryAccepts({
          ...base,
          images: { ...base.images, tall: { ...base.images.tall, sha256 } },
        }),
        sha256,
      ).toBe(false);
    }
  });

  it("requires the NMLS and Equal Housing marks and refuses unknown or repeated compliance values", () => {
    const base = realEntry();
    const compliance = (overrides: Record<string, unknown>) => ({
      ...base,
      compliance: { ...base.compliance, ...overrides },
    });
    expect(entryAccepts(compliance({ requiredOnAd: ["nmls"] }))).toBe(false);
    expect(entryAccepts(compliance({ requiredOnAd: ["equal-housing"] }))).toBe(false);
    expect(entryAccepts(compliance({ requiredOnAd: ["nmls", "equal-housing", "nmls"] }))).toBe(
      false,
    );
    expect(entryAccepts(compliance({ blockedInWords: ["rate-claims", "lender-x"] }))).toBe(false);
    expect(entryAccepts(compliance({ notes: "" }))).toBe(false);
  });

  it("refuses unknown keys, hidden characters, and surrounding whitespace", () => {
    expect(entryAccepts({ ...realEntry(), partner: "Taylor Reed" })).toBe(false);
    expect(entryAccepts({ ...realEntry(), name: " First home" })).toBe(false);
    expect(entryAccepts({ ...realEntry(), name: `First${ZERO_WIDTH_SPACE}home` })).toBe(false);
    const base = realEntry();
    expect(
      entryAccepts({
        ...base,
        images: { ...base.images, alt: `A house${RIGHT_TO_LEFT_OVERRIDE}and a key` },
      }),
    ).toBe(false);
    expect(entryAccepts({ ...base, defaults: { ...base.defaults, headline: "Two\nlines" } })).toBe(
      false,
    );
  });
});
