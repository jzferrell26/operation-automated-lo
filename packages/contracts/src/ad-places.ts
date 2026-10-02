import { z } from "zod";

/**
 * PRD-009d D4. "Where it shows": places, not people.
 *
 * A place is a state (one of the 50 states or the District of Columbia, typed by full name or by its
 * two-letter code, stored as the code) or a city ("Austin, TX"). No value may hold a digit, and no
 * city NAME may hold a whole word from `AD_PLACE_AUDIENCE_WORDS` (postal and radius words, and the
 * age, gender, family, and status words the targeting rule refuses) or end in a unit of distance
 * (`AD_PLACE_DISTANCE_UNITS`), so "Page, AZ" and "Mendota Heights, MN" pass and "78701",
 * "10 miles around Austin", "women 25-40", "Seniors, TX", and "Austin mi, TX" do not. The words are
 * matched against the city name only, never against the state code, so "MI" is Michigan and
 * "Detroit, MI" is Detroit. A distance unit is refused only where it reads as a distance (beside a
 * digit, in a phrase with "within", or as the last word of the name), so "Miles City, MT" passes. A short
 * list of real places whose names hold a refused word (`AD_PLACE_NAMED_EXCEPTIONS`) passes by exact
 * match. A list of every real place would be stricter still; it is not used because it would be a
 * large new data dependency the product does not have.
 * At most 5 states and 10 cities. The domain's extended `TARGETING_NOT_ALLOWED` refuses a stored
 * value outside these rules (`packages/domain/src/library-ad-places.ts`).
 *
 * The module is pure (no `node:` import) because the step 2 form parses each place as it is added.
 */

export const US_STATES: Readonly<Record<string, string>> = Object.freeze({
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
});

export const AD_PLACE_LIMITS = Object.freeze({ states: 5, cities: 10 });

/** Meta requires the area around a selected city to include everything within 15 miles (E1). */
export const AD_CITY_RADIUS_MILES = 15;

export type AdPlace = Readonly<{ kind: "state" | "city"; value: string }>;

/**
 * Whole words that aim at people, a ZIP code, or a radius rather than at a place. The domain holds the
 * same list (`LIBRARY_AD_PLACE_AUDIENCE_WORDS`), and a unit test keeps the two equal. Real town names
 * that hold a common word (Old Saybrook, Young Harris, Man, White Plains) are not refused, so "old",
 * "young", "man", and colour words are not on it. No word here is a two-letter state code, and the
 * words are never matched against the state code at all.
 */
export const AD_PLACE_AUDIENCE_WORDS: readonly string[] = Object.freeze([
  // Postal codes and radii: places are cities and states, never a radius or a ZIP code.
  "zip",
  "zips",
  "zipcode",
  "zipcodes",
  "postal",
  "radius",
  "within",
  // Age.
  "age",
  "ages",
  "aged",
  "senior",
  "seniors",
  "elderly",
  "retiree",
  "retirees",
  "retired",
  "teen",
  "teens",
  "teenager",
  "teenagers",
  "youth",
  "adult",
  "adults",
  "millennial",
  "millennials",
  "boomer",
  "boomers",
  "kids",
  "children",
  "student",
  "students",
  // Gender.
  "male",
  "males",
  "female",
  "females",
  "men",
  "women",
  "woman",
  "ladies",
  "gentlemen",
  "girls",
  "boys",
  "mom",
  "moms",
  "mothers",
  "dad",
  "dads",
  "fathers",
  "gay",
  "lesbian",
  "lgbt",
  "lgbtq",
  "transgender",
  "nonbinary",
  // Family.
  "single",
  "singles",
  "married",
  "divorced",
  "widowed",
  "widow",
  "widows",
  "widower",
  "widowers",
  "parent",
  "parents",
  "family",
  "families",
  "couple",
  "couples",
  "newlyweds",
  "pregnant",
  // Status, and the protected classes Meta's Housing category forbids aiming at.
  "income",
  "wealthy",
  "affluent",
  "poor",
  "unemployed",
  "disabled",
  "disability",
  "veteran",
  "veterans",
  "military",
  "immigrant",
  "immigrants",
  "renters",
  "homeowners",
  "hispanic",
  "latino",
  "latinos",
  "latina",
  "latinas",
  "asian",
  "asians",
  "christian",
  "christians",
  "muslim",
  "muslims",
  "jewish",
  "catholic",
  "catholics",
]);

/**
 * Units of distance. "mi" is also Michigan, and "Miles City" is a city, so a unit is not refused as a
 * bare word. It is refused where it reads as a distance: beside a digit (every digit is refused),
 * after "within" (a refused word), or as the last word of the name ("Austin mi", "Austin km", "Mile").
 * The domain holds the same list (`LIBRARY_AD_PLACE_DISTANCE_UNITS`), held equal by a unit test.
 */
export const AD_PLACE_DISTANCE_UNITS: readonly string[] = Object.freeze([
  "mi",
  "mile",
  "miles",
  "km",
  "kms",
  "kilometer",
  "kilometers",
  "kilometre",
  "kilometres",
]);

/**
 * Real places (checked against Wikipedia on 2026-10-02) whose names hold a refused word, passed by
 * exact match on "Name, ST" and nothing looser: a person who serves Gay, GA is not refused, and
 * "Gay, TX" still is. The domain holds the same list (`LIBRARY_AD_PLACE_NAMED_EXCEPTIONS`).
 */
export const AD_PLACE_NAMED_EXCEPTIONS: readonly string[] = Object.freeze([
  "Gay, GA",
  "Gay, MI",
  "Boomer, NC",
  "Boomer, WV",
  "Boys Town, NE",
  "Boys Ranch, TX",
  "Ages, KY",
  "Miles, TX",
  "Miles, IA",
  "Six Mile, SC",
  "Eight Mile, AL",
  "Ten Mile, TN",
  "Twelve Mile, IN",
]);

const PEOPLE_WORDS = new RegExp(
  `(?<!\\p{L})(?:${AD_PLACE_AUDIENCE_WORDS.join("|")})(?!\\p{L})`,
  "iu",
);
const UNIT_CLOSES_NAME = new RegExp(
  `(?:^|\\p{L}[^\\p{L}]+)(?:${AD_PLACE_DISTANCE_UNITS.join("|")})$`,
  "iu",
);
const NAMED_EXCEPTIONS: ReadonlySet<string> = new Set(
  AD_PLACE_NAMED_EXCEPTIONS.map((place) => place.toLowerCase()),
);
const CITY_NAME = /^[A-Za-z][A-Za-z .'-]{1,59}$/u;

const CODE_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(US_STATES).map(([code, name]) => [name.toLowerCase(), code]),
);

function stateCode(typed: string): string | undefined {
  const upper = typed.toUpperCase();
  if (Object.hasOwn(US_STATES, upper)) return upper;
  return CODE_BY_NAME.get(typed.toLowerCase());
}

/**
 * What a person typed, as a place, or `undefined` when it is not one. Whitespace is trimmed and
 * collapsed; a state is stored as its code and a city as "Name, ST" with the code in capitals.
 */
export function parseAdPlace(typed: string): AdPlace | undefined {
  const value = typed.trim().replace(/\s+/gu, " ");
  if (value.length === 0 || value.length > 64) return undefined;
  if (/\p{N}/u.test(value)) return undefined;
  const comma = /^(.+?) ?, ?([A-Za-z]{2})$/u.exec(value);
  if (comma !== null) {
    const name = comma[1] ?? "";
    const code = (comma[2] ?? "").toUpperCase();
    if (!CITY_NAME.test(name) || !Object.hasOwn(US_STATES, code)) return undefined;
    // The words are matched against the name only: the code after the comma is a state, never a word.
    if (!NAMED_EXCEPTIONS.has(`${name}, ${code}`.toLowerCase())) {
      if (PEOPLE_WORDS.test(name) || UNIT_CLOSES_NAME.test(name)) return undefined;
    }
    return Object.freeze({ kind: "city", value: `${name}, ${code}` });
  }
  const code = stateCode(value);
  return code === undefined ? undefined : Object.freeze({ kind: "state", value: code });
}

/** How step 3 says a place: a city with everything within 15 miles, a state by its full name. */
export function adPlaceLabel(place: AdPlace): string {
  return place.kind === "city"
    ? `${place.value} and everything within ${String(AD_CITY_RADIUS_MILES)} miles`
    : (US_STATES[place.value] ?? place.value);
}

/** The places of a request, refused whole (400) when any value is not a place or a limit is passed. */
export const AdPlacesInputSchema = z
  .array(z.string().max(80))
  .min(1)
  .max(AD_PLACE_LIMITS.states + AD_PLACE_LIMITS.cities)
  .transform((typed, context) => {
    const states: string[] = [];
    const cities: string[] = [];
    for (const [index, value] of typed.entries()) {
      const place = parseAdPlace(value);
      if (place === undefined) {
        context.addIssue({ code: "custom", path: [index], message: "Not a city or state" });
        return z.NEVER;
      }
      const list = place.kind === "state" ? states : cities;
      if (!list.includes(place.value)) list.push(place.value);
    }
    if (states.length > AD_PLACE_LIMITS.states || cities.length > AD_PLACE_LIMITS.cities) {
      context.addIssue({ code: "custom", path: [], message: "Too many places" });
      return z.NEVER;
    }
    return { states, cities };
  });
export type AdPlacesInput = z.output<typeof AdPlacesInputSchema>;
