import { describe, expect, it } from "vitest";

import {
  AD_PLACE_AUDIENCE_WORDS,
  AD_PLACE_DISTANCE_UNITS,
  AD_PLACE_LIMITS,
  AD_PLACE_NAMED_EXCEPTIONS,
  AD_PLACE_NUMBER_WORDS,
  AdPlacesInputSchema,
  US_STATES,
  adPlaceLabel,
  parseAdPlace,
} from "@oalo/contracts";
import {
  LIBRARY_AD_PLACE_AUDIENCE_WORDS,
  LIBRARY_AD_PLACE_DISTANCE_UNITS,
  LIBRARY_AD_PLACE_NAMED_EXCEPTIONS,
  LIBRARY_AD_PLACE_NUMBER_WORDS,
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
  // The distance rule: a unit beside a number or closing a longer name is refused, in every form.
  "Detroit within 10 mi",
  "Detroit within 10 mi, MI",
  "Austin 5mi",
  "Austin 5mi, TX",
  "10 mi, MI",
  "Austin miles, TX",
  "Ten miles, TX",
  // W-1 of the pre-redraw verification: a distance written with a number word beside a unit.
  "ten miles around Austin, TX",
  "Five Miles From Austin, TX",
  "five mi from Dallas, TX",
  "twenty miles of Houston, TX",
  "Several miles from Waco, TX",
  "A few miles outside Tyler, TX",
  "a hundred miles of Dallas, TX",
  "A dozen miles from Waco, TX",
  "Dozens of miles from Waco, TX",
  "Twenty-five kilometres around Austin, TX",
  "thirty km from Austin, TX",
  "Fifty kms from Austin, TX",
  "One mile from Austin, TX",
  "ten miles around Austin",
  // A unit followed by a full stop still closes the name.
  "Austin Mi., TX",
  "Austin Miles., TX",
  "Austin km., TX",
  // Audience and distance phrases stay refused.
  "gay neighborhoods in Austin, TX",
  "veterans near Killeen, TX",
  // A named exception is exact: the same name in another state is not a place it names.
  "Gay, TX",
  "Gay, VT",
  "Miles, VA",
  "Veteran, TX",
  "Zip City, TX",
  "Seven Mile, TX",
  "Fort Gay, TX",
  "Pass Christian, TX",
  "Boomer, TX",
  "Boys Town, TX",
  "Six Mile, TX",
  // The PRD-009 security review, SEC-009-05: race, color, national origin, and religion words in a
  // city name, with another word or a different state, are refused (fair housing).
  "Black Austin, TX",
  "Indian Houston, TX",
  "Mexican Austin, TX",
  "Arab Dearborn, MI",
  "Hindu Edison, NJ",
  "White Houston, TX",
  "Chinese Houston, TX",
  "Korean Dallas, TX",
  "African Atlanta, GA",
  "Sikh Fresno, CA",
  "Buddhist Austin, TX",
  "Native Tulsa, OK",
  "Church Austin, TX",
  "Mosque Dearborn, MI",
  "Synagogue Brooklyn, NY",
  "black austin, tx",
  "BLACK AUSTIN, TX",
  "Blacks of Austin, TX",
  "Caucasian Plano, TX",
  "Mormon Provo, UT",
  // A real place's name in a state that does not hold it is not that place.
  "White Plains, TX",
  "Indian Wells, TX",
  "Black Mountain, TX",
  "Mexican Hat, TX",
  "Arab, TX",
  "Falls Church, TX",
  "Indian Trail, SC",
  "Church Hill, NY",
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
  // Michigan: "mi" is a distance word only where it reads as a distance, never as the state code.
  ["MI", "MI"],
  ["mi", "MI"],
  ["Mi", "MI"],
  ["Michigan", "MI"],
  ["Detroit, MI", "Detroit, MI"],
  ["Grand Rapids, MI", "Grand Rapids, MI"],
  ["Lansing, MI", "Lansing, MI"],
  ["detroit, mi", "detroit, MI"],
  ["Detroit,MI", "Detroit, MI"],
  // A distance word inside a place name that is not a distance.
  ["Miles City, MT", "Miles City, MT"],
  ["Miles, TX", "Miles, TX"],
  ["Miles, IA", "Miles, IA"],
  ["Nine Mile Falls, WA", "Nine Mile Falls, WA"],
  ["Mi-Wuk Village, CA", "Mi-Wuk Village, CA"],
  ["Miami, FL", "Miami, FL"],
  // Real places whose names hold a refused word, passed by exact match.
  ["Gay, GA", "Gay, GA"],
  ["Gay, MI", "Gay, MI"],
  ["gay, ga", "gay, GA"],
  ["Boomer, NC", "Boomer, NC"],
  ["Boomer, WV", "Boomer, WV"],
  ["Boys Town, NE", "Boys Town, NE"],
  ["Boys Ranch, TX", "Boys Ranch, TX"],
  ["Ages, KY", "Ages, KY"],
  ["Six Mile, SC", "Six Mile, SC"],
  ["Eight Mile, AL", "Eight Mile, AL"],
  ["Ten Mile, TN", "Ten Mile, TN"],
  ["Twelve Mile, IN", "Twelve Mile, IN"],
  // W-2 of the pre-redraw verification: real places the first list missed, each an exact pair.
  ["Seven Mile, OH", "Seven Mile, OH"],
  ["Miles, WA", "Miles, WA"],
  ["Miles, WI", "Miles, WI"],
  ["Miles, NC", "Miles, NC"],
  ["Miles, WV", "Miles, WV"],
  ["Miles, CA", "Miles, CA"],
  ["Miles, LA", "Miles, LA"],
  ["Miles, OH", "Miles, OH"],
  ["Gay, WV", "Gay, WV"],
  ["Gay, OK", "Gay, OK"],
  ["Gay, NC", "Gay, NC"],
  ["Gay, ID", "Gay, ID"],
  ["Veteran, WY", "Veteran, WY"],
  ["Veteran, NY", "Veteran, NY"],
  ["Zip City, AL", "Zip City, AL"],
  ["Boomer, TN", "Boomer, TN"],
  ["Fort Gay, WV", "Fort Gay, WV"],
  ["Mount Gay, WV", "Mount Gay, WV"],
  ["Mount Gay-Shamrock, WV", "Mount Gay-Shamrock, WV"],
  ["Pass Christian, MS", "Pass Christian, MS"],
  ["pass christian, ms", "pass christian, MS"],
  // A number word and the singular "Mile" inside a longer real name is not a distance.
  ["Three Mile Bay, NY", "Three Mile Bay, NY"],
  ["Eleven Mile Corner, AZ", "Eleven Mile Corner, AZ"],
  ["Four Mile Prairie, TX", "Four Mile Prairie, TX"],
  // SEC-009-05: real places whose names hold a race, national origin, or religion word, each an
  // exact pair from the Census Bureau's incorporated places and census designated places.
  ["Indian Wells, CA", "Indian Wells, CA"],
  ["Indian Trail, NC", "Indian Trail, NC"],
  ["Indian Hill, OH", "Indian Hill, OH"],
  ["Indian Rocks Beach, FL", "Indian Rocks Beach, FL"],
  ["Black Mountain, NC", "Black Mountain, NC"],
  ["Black Hawk, CO", "Black Hawk, CO"],
  ["Black, AL", "Black, AL"],
  ["Mexican Hat, UT", "Mexican Hat, UT"],
  ["Chinese Camp, CA", "Chinese Camp, CA"],
  ["Mormon Lake, AZ", "Mormon Lake, AZ"],
  ["Arab, AL", "Arab, AL"],
  ["Falls Church, VA", "Falls Church, VA"],
  ["Church Hill, TN", "Church Hill, TN"],
  ["Church Point, LA", "Church Point, LA"],
  ["White Bear Lake, MN", "White Bear Lake, MN"],
  ["White Settlement, TX", "White Settlement, TX"],
  ["White, GA", "White, GA"],
  ["white plains, ny", "white plains, NY"],
  // Words that merely contain a refused word are not refused: only whole words are.
  ["Whitefish, MT", "Whitefish, MT"],
  ["Indianapolis, IN", "Indianapolis, IN"],
  ["Blackfoot, ID", "Blackfoot, ID"],
  ["Churchville, NY", "Churchville, NY"],
  ["Whitehall, MI", "Whitehall, MI"],
];

/**
 * 009D-AC-008 and defect D-1 of the Wave 3 verification: the audience and distance words once held
 * "mi", so the state code "MI", every "City, MI", and Michigan itself were refused. One or more
 * sample cities for each of the 50 states and the District of Columbia. The sweep at the end of
 * this file runs each through both checks, so a word list that collides with any code goes red
 * for that code.
 */
const SAMPLE_CITIES: Readonly<Record<string, readonly string[]>> = {
  AL: ["Birmingham", "Fairhope"],
  AK: ["Anchorage", "Homer"],
  AZ: ["Phoenix", "Page"],
  AR: ["Little Rock", "Hot Springs"],
  CA: ["Los Angeles", "Ojai"],
  CO: ["Denver", "Aspen"],
  CT: ["Hartford", "Old Saybrook"],
  DE: ["Wilmington", "Lewes"],
  DC: ["Washington"],
  FL: ["Miami", "Tampa"],
  GA: ["Atlanta", "Savannah"],
  HI: ["Honolulu", "Hilo"],
  ID: ["Boise", "Coeur d'Alene"],
  IL: ["Chicago", "Peoria"],
  IN: ["Indianapolis", "Fort Wayne"],
  IA: ["Des Moines", "Cedar Rapids"],
  KS: ["Wichita", "Topeka"],
  KY: ["Louisville", "Lexington"],
  LA: ["New Orleans", "Baton Rouge"],
  ME: ["Portland", "Bangor"],
  MD: ["Baltimore", "Annapolis"],
  MA: ["Boston", "Worcester"],
  MI: ["Detroit", "Grand Rapids", "Lansing", "Ann Arbor"],
  MN: ["Minneapolis", "Mendota Heights"],
  MS: ["Jackson", "Biloxi"],
  MO: ["Kansas City", "St. Louis"],
  MT: ["Billings", "Miles City"],
  NE: ["Omaha", "Lincoln"],
  NV: ["Las Vegas", "Reno"],
  NH: ["Manchester", "Concord"],
  NJ: ["Newark", "Princeton"],
  NM: ["Albuquerque", "Santa Fe"],
  NY: ["New York", "White Plains"],
  NC: ["Charlotte", "Winston-Salem"],
  ND: ["Fargo", "Bismarck"],
  OH: ["Columbus", "Cleveland"],
  OK: ["Oklahoma City", "Tulsa"],
  OR: ["Portland", "Bend"],
  PA: ["Philadelphia", "Pittsburgh"],
  RI: ["Providence", "Newport"],
  SC: ["Charleston", "Greenville"],
  SD: ["Sioux Falls", "Rapid City"],
  TN: ["Nashville", "Memphis"],
  TX: ["Austin", "Houston"],
  UT: ["Salt Lake City", "Provo"],
  VT: ["Burlington", "Montpelier"],
  VA: ["Richmond", "Norfolk"],
  WA: ["Seattle", "Spokane"],
  WV: ["Charleston", "Morgantown"],
  WI: ["Milwaukee", "Madison"],
  WY: ["Cheyenne", "Jackson"],
};

function storedPlace(kind: "state" | "city", value: string) {
  return kind === "state" ? { states: [value], cities: [] } : { states: [], cities: [value] };
}

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

  it("holds one vocabulary in the contract and the domain", () => {
    expect([...AD_PLACE_AUDIENCE_WORDS]).toEqual([...LIBRARY_AD_PLACE_AUDIENCE_WORDS]);
    expect([...AD_PLACE_DISTANCE_UNITS]).toEqual([...LIBRARY_AD_PLACE_DISTANCE_UNITS]);
    expect([...AD_PLACE_NAMED_EXCEPTIONS]).toEqual([...LIBRARY_AD_PLACE_NAMED_EXCEPTIONS]);
    expect([...AD_PLACE_NUMBER_WORDS]).toEqual([...LIBRARY_AD_PLACE_NUMBER_WORDS]);
    expect(AD_PLACE_NUMBER_WORDS).toEqual(
      expect.arrayContaining(["one", "ten", "twenty", "hundred", "dozen", "few", "several"]),
    );
    expect(AD_PLACE_AUDIENCE_WORDS).toEqual(
      expect.arrayContaining(["zip", "within", "radius", "seniors", "moms", "single"]),
    );
    expect(AD_PLACE_DISTANCE_UNITS).toEqual(expect.arrayContaining(["mi", "mile", "miles", "km"]));
  });

  it("refuses the race, national origin, and religion words in a city's name (SEC-009-05)", () => {
    expect(AD_PLACE_AUDIENCE_WORDS).toEqual(
      expect.arrayContaining([
        "black",
        "white",
        "african",
        "arab",
        "indian",
        "native",
        "mexican",
        "chinese",
        "korean",
        "hindu",
        "sikh",
        "buddhist",
        "church",
        "mosque",
        "synagogue",
      ]),
    );
    expect(LIBRARY_AD_PLACE_AUDIENCE_WORDS).toEqual(expect.arrayContaining(["black", "white"]));
  });

  it("lists each named exception once", () => {
    const lower = AD_PLACE_NAMED_EXCEPTIONS.map((place) => place.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it("keeps every audience word off the state codes, and the units out of the audience list", () => {
    // The audience words are matched against a city name, never a code, and none of them is a code.
    expect(
      AD_PLACE_AUDIENCE_WORDS.filter((word) => Object.hasOwn(US_STATES, word.toUpperCase())),
    ).toEqual([]);
    // "mi" is the one unit that is also a code (Michigan); it is why a unit is not refused as a bare word.
    expect(
      AD_PLACE_DISTANCE_UNITS.filter((unit) => Object.hasOwn(US_STATES, unit.toUpperCase())),
    ).toEqual(["mi"]);
    for (const unit of AD_PLACE_DISTANCE_UNITS) {
      expect(AD_PLACE_AUDIENCE_WORDS, unit).not.toContain(unit);
    }
  });

  it("names each exception as a place that is refused in any other state", () => {
    for (const place of AD_PLACE_NAMED_EXCEPTIONS) {
      const [name, code] = place.split(", ");
      expect(parseAdPlace(place)?.value, place).toBe(place);
      expect(libraryAdPlacesProblem(storedPlace("city", place)), place).toBeUndefined();
      const elsewhere = `${name ?? ""}, ${code === "VT" ? "WY" : "VT"}`;
      expect(parseAdPlace(elsewhere), elsewhere).toBeUndefined();
      expect(libraryAdPlacesProblem(storedPlace("city", elsewhere)), elsewhere).toBeDefined();
    }
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
    // Every typed value the contract refuses is refused by the domain too, as a state and as a city.
    for (const typed of REFUSED) {
      expect(libraryAdPlacesProblem(storedPlace("state", typed)), typed).toBeDefined();
      expect(libraryAdPlacesProblem(storedPlace("city", typed)), typed).toBeDefined();
    }
    expect(libraryAdPlacesProblem({ states: ["ZZ"], cities: [] })).toBeDefined();
    expect(
      libraryAdPlacesProblem({ states: ["TX", "OK", "NM", "LA", "AR", "KS"], cities: [] }),
    ).toBeDefined();
    expect(libraryAdPlacesProblem({ states: [], cities: [] })).toBeDefined();
  });
});

describe("every state and the District of Columbia, through both checks (the Michigan defect)", () => {
  const codes = Object.keys(US_STATES);

  it("has a sample city for each of the 51 codes, and no other code", () => {
    expect(Object.keys(SAMPLE_CITIES).sort()).toEqual([...codes].sort());
    expect(codes).toHaveLength(51);
  });

  it.each(codes)("accepts %s by its code, in lower case, and by its full name", (code) => {
    const name = US_STATES[code] ?? "";
    for (const typed of [code, code.toLowerCase(), name, name.toLowerCase()]) {
      expect(parseAdPlace(typed), typed).toEqual({ kind: "state", value: code });
    }
    expect(libraryAdPlacesProblem(storedPlace("state", code)), code).toBeUndefined();
  });

  it.each(codes)("accepts a plain city and the sample cities in %s", (code) => {
    for (const city of ["Springfield", ...(SAMPLE_CITIES[code] ?? [])]) {
      const typed = `${city}, ${code}`;
      expect(parseAdPlace(typed)?.value, typed).toBe(typed);
      expect(parseAdPlace(`${city},${code.toLowerCase()}`)?.value, typed).toBe(typed);
      expect(libraryAdPlacesProblem(storedPlace("city", typed)), typed).toBeUndefined();
    }
  });

  it("saves Michigan, and cities in it, as places", () => {
    expect(AdPlacesInputSchema.safeParse(codes.slice(0, 5)).success).toBe(true);
    expect(AdPlacesInputSchema.safeParse(["MI", "Detroit, MI", "Lansing, MI"]).success).toBe(true);
    expect(AdPlacesInputSchema.parse(["Michigan", "Detroit, MI", "mi"])).toEqual({
      states: ["MI"],
      cities: ["Detroit, MI"],
    });
    expect(
      libraryAdPlacesProblem({ states: ["MI"], cities: ["Detroit, MI", "Grand Rapids, MI"] }),
    ).toBeUndefined();
  });
});
