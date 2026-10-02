import { describe, expect, it } from "vitest";

import {
  AD_PLACE_AUDIENCE_WORDS,
  AD_PLACE_LIMITS,
  AdPlacesInputSchema,
  US_STATES,
  adPlaceLabel,
  parseAdPlace,
} from "@oalo/contracts";
import {
  LIBRARY_AD_PLACE_AUDIENCE_WORDS,
  US_STATE_CODES,
  libraryAdPlacesProblem,
} from "@oalo/domain";

/**
 * PRD-009d D4 and 009D-AC-008. Places, not people: each value is a state (stored as its code) or a
 * "City, ST", and nothing else gets in. The contract parses what a person types; the domain's
 * extended `TARGETING_NOT_ALLOWED` refuses a stored value the contract would not have produced.
 * The two are kept apart (the domain package depends on nothing), so the last test holds them to
 * one answer for every value in the table.
 */

const REFUSED: readonly string[] = [
  "78701",
  "Austin 78701",
  "10 miles around Austin",
  "within 5 miles",
  "women 25-40",
  "men",
  "Austin",
  "Austin, ZZ",
  "Women, TX",
  "Radius, TX",
  "Zip, TX",
  "Male, TX",
  "Austin, Texas",
  "",
  "   ",
  "A, TX",
  // The independent verifier's bypasses of 2026-10-02: audience words and distance tokens.
  "Seniors, TX",
  "Single Moms, TX",
  "Austin mi, TX",
  "Austin km, TX",
  "Retirees, FL",
  "Young Families, TX",
  "Veterans, TX",
  "Married Couples, TX",
  "Teens, TX",
  "Low Income, TX",
  "Hispanic, TX",
  "Austin kilometers, TX",
];

const ACCEPTED: readonly Readonly<[typed: string, stored: string]>[] = [
  ["Texas", "TX"],
  ["tx", "TX"],
  ["TX", "TX"],
  ["district of columbia", "DC"],
  ["Austin, TX", "Austin, TX"],
  ["austin, tx", "austin, TX"],
  ["  Austin,   TX ", "Austin, TX"],
  ["Page, AZ", "Page, AZ"],
  ["Mendota Heights, MN", "Mendota Heights, MN"],
  ["Savage, MN", "Savage, MN"],
  ["St. Louis, MO", "St. Louis, MO"],
  ["Coeur d'Alene, ID", "Coeur d'Alene, ID"],
  ["Winston-Salem, NC", "Winston-Salem, NC"],
  // Real towns whose names hold words a looser vocabulary would refuse.
  ["Old Saybrook, CT", "Old Saybrook, CT"],
  ["Young Harris, GA", "Young Harris, GA"],
  ["Man, WV", "Man, WV"],
  ["White Plains, NY", "White Plains, NY"],
];

describe("the place rules (009D-AC-008)", () => {
  it("has a table of at least 15 values", () => {
    expect(REFUSED.length + ACCEPTED.length).toBeGreaterThanOrEqual(15);
  });

  it.each(REFUSED)("refuses %j", (typed) => {
    expect(parseAdPlace(typed)).toBeUndefined();
  });

  it.each(ACCEPTED)("accepts %j and stores it as %j", (typed, stored) => {
    expect(parseAdPlace(typed)?.value).toBe(stored);
  });

  it("knows the 50 states and the District of Columbia, and nothing else", () => {
    expect(Object.keys(US_STATES)).toHaveLength(51);
    expect(US_STATES.DC).toBe("District of Columbia");
    expect(US_STATES.TX).toBe("Texas");
    expect(Object.keys(US_STATES).sort()).toEqual([...US_STATE_CODES].sort());
  });

  it("allows at most 5 states and 10 cities, and refuses a sixth state and an eleventh city", () => {
    expect(AD_PLACE_LIMITS).toEqual({ states: 5, cities: 10 });
    const states = ["TX", "OK", "NM", "LA", "AR"];
    const cities = [
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
    ];
    expect(AdPlacesInputSchema.safeParse([...states, ...cities]).success).toBe(true);
    expect(AdPlacesInputSchema.safeParse([...states, "KS", ...cities]).success).toBe(false);
    expect(AdPlacesInputSchema.safeParse([...states, ...cities, "Killeen, TX"]).success).toBe(
      false,
    );
    expect(AdPlacesInputSchema.safeParse([]).success).toBe(false);
    expect(AdPlacesInputSchema.safeParse(["Austin, TX", "78701"]).success).toBe(false);
  });

  it("splits the parsed places into states and cities, each once", () => {
    expect(AdPlacesInputSchema.parse(["Texas", "Austin, TX", "tx", "Page, AZ"])).toEqual({
      states: ["TX"],
      cities: ["Austin, TX", "Page, AZ"],
    });
  });

  it("says a city with everything within 15 miles, and a state by its full name", () => {
    expect(adPlaceLabel({ kind: "city", value: "Austin, TX" })).toBe(
      "Austin, TX and everything within 15 miles",
    );
    expect(adPlaceLabel({ kind: "state", value: "TX" })).toBe("Texas");
  });

  it("holds one audience vocabulary in the contract and the domain", () => {
    expect([...AD_PLACE_AUDIENCE_WORDS]).toEqual([...LIBRARY_AD_PLACE_AUDIENCE_WORDS]);
    expect(AD_PLACE_AUDIENCE_WORDS).toEqual(
      expect.arrayContaining(["mi", "km", "seniors", "moms", "single"]),
    );
  });

  it("agrees with the domain's stored-value rule on every value", () => {
    for (const [typed] of ACCEPTED) {
      const place = parseAdPlace(typed);
      expect(place, typed).toBeDefined();
      if (place === undefined) continue;
      const stored =
        place.kind === "state"
          ? { states: [place.value], cities: [] }
          : { states: [], cities: [place.value] };
      expect(libraryAdPlacesProblem(stored), typed).toBeUndefined();
    }
    for (const value of [
      "ZZ",
      "Austin, ZZ",
      "Women, TX",
      "Mile, TX",
      "Austin 78701, TX",
      "Seniors, TX",
      "Single Moms, TX",
      "Austin mi, TX",
    ]) {
      expect(libraryAdPlacesProblem({ states: [], cities: [value] }), value).toBeDefined();
    }
    expect(libraryAdPlacesProblem({ states: ["ZZ"], cities: [] })).toBeDefined();
    expect(
      libraryAdPlacesProblem({ states: ["TX", "OK", "NM", "LA", "AR", "KS"], cities: [] }),
    ).toBeDefined();
    expect(libraryAdPlacesProblem({ states: [], cities: [] })).toBeDefined();
  });
});
