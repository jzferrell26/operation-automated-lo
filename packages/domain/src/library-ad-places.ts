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

const CITY = /^[A-Za-z][A-Za-z .'-]{1,59}, ([A-Z]{2})$/u;

/**
 * Whole words (delimited by non-letters) that aim at people or a distance rather than a place: the
 * same list as `AD_PLACE_AUDIENCE_WORDS` in `@oalo/contracts`, held equal by a unit test.
 */
export const LIBRARY_AD_PLACE_AUDIENCE_WORDS: readonly string[] = Object.freeze([
  // Distance and postal codes: places are cities and states, never a radius or a ZIP code.
  "zip",
  "zips",
  "zipcode",
  "zipcodes",
  "postal",
  "radius",
  "within",
  "mile",
  "miles",
  "mi",
  "km",
  "kms",
  "kilometer",
  "kilometers",
  "kilometre",
  "kilometres",
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

const PEOPLE_WORDS = new RegExp(
  `(?<!\\p{L})(?:${LIBRARY_AD_PLACE_AUDIENCE_WORDS.join("|")})(?!\\p{L})`,
  "iu",
);

/** Why a stored state or city falls outside D4, or `undefined` when it does not. */
function placeProblem(kind: "state" | "city", value: string): string | undefined {
  if (/\p{N}/u.test(value) || PEOPLE_WORDS.test(value)) return "people";
  if (kind === "state") return STATE_CODES.has(value) ? undefined : "unknown state";
  const city = CITY.exec(value);
  return city !== null && STATE_CODES.has(city[1] ?? "") ? undefined : "not a city";
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
