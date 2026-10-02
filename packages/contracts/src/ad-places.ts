import { z } from "zod";

/**
 * PRD-009d D4. "Where it shows": places, not people.
 *
 * A place is a state (one of the 50 states or the District of Columbia, typed by full name or by its
 * two-letter code, stored as the code) or a city ("Austin, TX"). No value may hold a digit or one of
 * the whole words zip, radius, mile, miles, within, age, male, female, men, or women, so "Page, AZ"
 * and "Mendota Heights, MN" pass and "78701", "10 miles around Austin", and "women 25-40" do not.
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

const PEOPLE_WORDS = /(?<!\p{L})(?:zip|radius|miles?|within|age|male|female|men|women)(?!\p{L})/iu;
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
  if (/\p{N}/u.test(value) || PEOPLE_WORDS.test(value)) return undefined;
  const comma = /^(.+?) ?, ?([A-Za-z]{2})$/u.exec(value);
  if (comma !== null) {
    const name = comma[1] ?? "";
    const code = (comma[2] ?? "").toUpperCase();
    if (!CITY_NAME.test(name) || !Object.hasOwn(US_STATES, code)) return undefined;
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
