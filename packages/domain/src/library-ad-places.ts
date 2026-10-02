/**
 * PRD-009d D4. Where a library ad shows: places, not people.
 *
 * The request schema in `@oalo/contracts` (`ad-places.ts`) turns what a person types into a state
 * code or a "City, ST" and refuses anything else with 400. This is the domain's half: the extended
 * `TARGETING_NOT_ALLOWED` reads the stored version and refuses any state or city that the request
 * schema would not have produced, so a ZIP code, a radius, or a demographic can never reach a saved
 * version by another path. The domain package depends on nothing, so the code list lives here as
 * well, and a unit test holds the two lists to one answer.
 */

export const US_STATE_CODES: readonly string[] = Object.freeze([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]);

const STATE_CODES: ReadonlySet<string> = new Set(US_STATE_CODES);

/** D4: at most 5 states and 10 cities. */
export const LIBRARY_AD_PLACE_LIMITS = Object.freeze({ states: 5, cities: 10 });

const CITY = /^([A-Za-z][A-Za-z .'-]{1,59}), ([A-Z]{2})$/u;

/**
 * Whole words (delimited by non-letters) that aim at people, a ZIP code, or a radius rather than a
 * place: the same list as `AD_PLACE_AUDIENCE_WORDS` in `@oalo/contracts`, held equal by a unit test.
 * They are matched against a city's name only, never against its state code.
 */
export const LIBRARY_AD_PLACE_AUDIENCE_WORDS: readonly string[] = Object.freeze(
  [
    // Postal codes and radii: places are cities and states, never a radius or a ZIP code.
    "zip zips zipcode zipcodes postal radius within",
    // Age.
    "age ages aged senior seniors elderly retiree retirees retired teen teens teenager teenagers youth adult adults millennial millennials boomer boomers kids children student students",
    // Gender.
    "male males female females men women woman ladies gentlemen girls boys mom moms mothers dad dads fathers gay lesbian lgbt lgbtq transgender nonbinary",
    // Family.
    "single singles married divorced widowed widow widows widower widowers parent parents family families couple couples newlyweds pregnant",
    // Status, and the protected classes Meta's Housing category forbids aiming at.
    "income wealthy affluent poor unemployed disabled disability veteran veterans military immigrant immigrants renters homeowners hispanic latino latinos latina latinas asian asians christian christians muslim muslims jewish catholic catholics",
  ]
    .join(" ")
    .split(" "),
);

/**
 * Units of distance: the same list as `AD_PLACE_DISTANCE_UNITS` in `@oalo/contracts`. "mi" is also
 * Michigan and "Miles City" is a city, so a unit is refused only where it reads as a distance: beside a
 * digit (every digit is refused), beside a number word (below), after "within" (a refused word), or as
 * the last word of the city name, with or without a full stop after it ("Austin mi", "Mile", "Austin Mi.").
 */
export const LIBRARY_AD_PLACE_DISTANCE_UNITS: readonly string[] = Object.freeze(
  "mi mile miles km kms kilometer kilometers kilometre kilometres".split(" "),
);

/**
 * Number words that spell a radius beside a unit of distance ("ten miles around Austin", "five mi",
 * "a few miles"): the same list as `AD_PLACE_NUMBER_WORDS` in `@oalo/contracts`. Beside mi, miles, km,
 * kms, kilometers and kilometres any of them is refused; beside the singular "mile", "kilometer" and
 * "kilometre" only "one" is, because real names hold a number word and "Mile" (Nine Mile Falls, WA).
 */
export const LIBRARY_AD_PLACE_NUMBER_WORDS: readonly string[] = Object.freeze(
  "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred hundreds thousand thousands dozen dozens few several".split(
    " ",
  ),
);

/**
 * Real places whose names hold a refused word, passed by exact match on "Name, ST": the same list as
 * `AD_PLACE_NAMED_EXCEPTIONS` in `@oalo/contracts`, which cites the source (the USGS Geographic Names
 * Information System, read on 2026-10-02).
 */
export const LIBRARY_AD_PLACE_NAMED_EXCEPTIONS: readonly string[] = Object.freeze(
  "Gay, GA|Gay, ID|Gay, MI|Gay, NC|Gay, OK|Gay, WV|Fort Gay, WV|Mount Gay, WV|Mount Gay-Shamrock, WV|Boomer, NC|Boomer, TN|Boomer, WV|Boys Town, NE|Boys Ranch, TX|Ages, KY|Miles, CA|Miles, IA|Miles, LA|Miles, NC|Miles, OH|Miles, TX|Miles, WA|Miles, WI|Miles, WV|Six Mile, SC|Seven Mile, OH|Eight Mile, AL|Ten Mile, TN|Twelve Mile, IN|Pass Christian, MS|Veteran, NY|Veteran, WY|Zip City, AL".split(
    "|",
  ),
);

const PEOPLE_WORDS = new RegExp(
  `(?<!\\p{L})(?:${LIBRARY_AD_PLACE_AUDIENCE_WORDS.join("|")})(?!\\p{L})`,
  "iu",
);
const UNIT_CLOSES_NAME = new RegExp(
  `(?:^|\\p{L}[^\\p{L}]+)(?:${LIBRARY_AD_PLACE_DISTANCE_UNITS.join("|")})[^\\p{L}]*$`,
  "iu",
);
const SINGULAR_UNITS: readonly string[] = ["mile", "kilometer", "kilometre"];
const COUNTED_UNITS = LIBRARY_AD_PLACE_DISTANCE_UNITS.filter(
  (unit) => !SINGULAR_UNITS.includes(unit),
);
// "ten miles", "five mi", "a few km", "dozens of miles": a number word, an optional "of", a plural or
// abbreviated unit. Or "one" and a singular unit ("one mile"); any other number beside "Mile" is a
// name (Nine Mile Falls).
const NUMBER_BESIDE_UNIT = new RegExp(
  `(?<!\\p{L})(?:${LIBRARY_AD_PLACE_NUMBER_WORDS.join("|")})(?:[^\\p{L}]+of)?[^\\p{L}]+(?:${COUNTED_UNITS.join("|")})(?!\\p{L})` +
    `|(?<!\\p{L})one[^\\p{L}]+(?:${SINGULAR_UNITS.join("|")})(?!\\p{L})`,
  "iu",
);
const NAMED_EXCEPTIONS: ReadonlySet<string> = new Set(
  LIBRARY_AD_PLACE_NAMED_EXCEPTIONS.map((place) => place.toLowerCase()),
);

/** Why a stored state or city falls outside D4, or `undefined` when it does not. */
function placeProblem(kind: "state" | "city", value: string): string | undefined {
  if (/\p{N}/u.test(value)) return "people";
  if (kind === "state") return STATE_CODES.has(value) ? undefined : "unknown state";
  const city = CITY.exec(value);
  if (city === null || !STATE_CODES.has(city[2] ?? "")) return "not a city";
  // The words are matched against the name only: the code after the comma is a state, never a word.
  if (NAMED_EXCEPTIONS.has(value.toLowerCase())) return undefined;
  const name = city[1] ?? "";
  return PEOPLE_WORDS.test(name) || UNIT_CLOSES_NAME.test(name) || NUMBER_BESIDE_UNIT.test(name)
    ? "people"
    : undefined;
}

/**
 * Why the stored places of a library ad fall outside D4, or `undefined` when every state and city
 * is one the request schema would have produced, there is at least one, and the counts are within
 * the limits.
 */
export function libraryAdPlacesProblem(
  places: Readonly<{ states: readonly string[]; cities: readonly string[] }>,
): string | undefined {
  if (places.states.length + places.cities.length === 0) return "no places";
  if (
    places.states.length > LIBRARY_AD_PLACE_LIMITS.states ||
    places.cities.length > LIBRARY_AD_PLACE_LIMITS.cities
  ) {
    return "too many places";
  }
  for (const state of places.states) {
    const problem = placeProblem("state", state);
    if (problem !== undefined) return problem;
  }
  for (const city of places.cities) {
    const problem = placeProblem("city", city);
    if (problem !== undefined) return problem;
  }
  return undefined;
}
