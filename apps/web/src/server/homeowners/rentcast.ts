import { HomeValuationSchema, type HomeAddress, type HomeValuation } from "@oalo/contracts";
import { z } from "zod";
import { HomeownerError, readBoundedJson } from "./errors.js";

const nullableNumber = z.number().finite().nullish();
const PropertyFields = z.object({
  formattedAddress: z.string().min(3).max(400),
  addressLine1: z.string().optional(),
  addressLine2: z.string().nullish(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  propertyType: z.string().nullish(),
  bedrooms: nullableNumber,
  bathrooms: nullableNumber,
  squareFootage: nullableNumber,
  yearBuilt: nullableNumber,
});
const RentCastResponse = z.object({
  price: z.number().positive().max(1_000_000_000),
  priceRangeLow: z.number().positive().max(1_000_000_000).nullish(),
  priceRangeHigh: z.number().positive().max(1_000_000_000).nullish(),
  subjectProperty: PropertyFields,
  comparables: z
    .array(
      PropertyFields.extend({
        price: z.number().positive().max(1_000_000_000),
        distance: nullableNumber,
        status: z.string().nullish(),
        lastSeenDate: z.string().nullish(),
      }),
    )
    .max(100)
    .default([]),
});

export function addressText(address: HomeAddress): string {
  return `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
}
export function canonicalAddress(address: HomeAddress): string {
  return addressText(address)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function streetTokens(value: string): string {
  const aliases: Record<string, string> = {
    street: "st",
    road: "rd",
    drive: "dr",
    avenue: "ave",
    boulevard: "blvd",
    lane: "ln",
    court: "ct",
    circle: "cir",
    place: "pl",
    parkway: "pkwy",
    north: "n",
    south: "s",
    east: "e",
    west: "w",
    apartment: "apt",
    suite: "ste",
  };
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .map((token) => aliases[token] ?? token)
    .join(" ");
}

export function normalizeRentCastValuation(
  raw: unknown,
  requested: HomeAddress,
  now = new Date(),
): HomeValuation {
  const parsed = RentCastResponse.safeParse(raw);
  if (!parsed.success)
    throw new HomeownerError(
      "VALUATION_INVALID",
      502,
      "The valuation service returned incomplete data. No report was generated.",
    );
  const data = parsed.data;
  const subject = data.subjectProperty;
  // A city-level or nearby match must never become this home's report.
  const returnedStreet = [subject.addressLine1, subject.addressLine2].filter(Boolean).join(" ");
  if (
    !subject.state ||
    subject.state.toUpperCase() !== requested.state ||
    !subject.zipCode ||
    subject.zipCode.slice(0, 5) !== requested.postalCode.slice(0, 5) ||
    !returnedStreet ||
    streetTokens(returnedStreet) !== streetTokens(requested.street)
  )
    throw new HomeownerError(
      "PROPERTY_MATCH_REQUIRED",
      422,
      "The matched property differs from the address entered. Confirm the street and unit before trying again.",
    );
  const normalized = HomeValuationSchema.safeParse({
    source: "rentcast",
    retrievedAt: now.toISOString(),
    valueMinor: Math.round(data.price * 100),
    lowMinor: data.priceRangeLow == null ? null : Math.round(data.priceRangeLow * 100),
    highMinor: data.priceRangeHigh == null ? null : Math.round(data.priceRangeHigh * 100),
    matchedAddress: subject.formattedAddress,
    propertyType: subject.propertyType ?? null,
    bedrooms: subject.bedrooms ?? null,
    bathrooms: subject.bathrooms ?? null,
    squareFeet: subject.squareFootage ?? null,
    yearBuilt: subject.yearBuilt ?? null,
    comparables: data.comparables.slice(0, 5).map((comp) => ({
      address: comp.formattedAddress,
      priceMinor: Math.round(comp.price * 100),
      bedrooms: comp.bedrooms ?? null,
      bathrooms: comp.bathrooms ?? null,
      squareFeet: comp.squareFootage ?? null,
      distanceMiles: comp.distance ?? null,
      listingStatus: comp.status ?? null,
      lastSeenAt:
        comp.lastSeenDate && Number.isFinite(Date.parse(comp.lastSeenDate))
          ? new Date(comp.lastSeenDate).toISOString()
          : null,
      priceKind: "listing",
    })),
  });
  if (!normalized.success)
    throw new HomeownerError(
      "VALUATION_INVALID",
      502,
      "The valuation could not be validated. No report was generated.",
    );
  return normalized.data;
}

export interface HomeValuationPort {
  estimate(address: HomeAddress): Promise<HomeValuation>;
}

export function createRentCastValuationPort(
  apiKey: string,
  fetcher: typeof fetch = fetch,
  clock = () => new Date(),
): HomeValuationPort {
  if (!apiKey.trim())
    throw new HomeownerError(
      "VALUATION_NOT_CONFIGURED",
      503,
      "Connect the valuation service to generate a live report.",
    );
  return {
    async estimate(address) {
      const url = new URL("https://api.rentcast.io/v1/avm/value");
      url.searchParams.set("address", addressText(address));
      url.searchParams.set("compCount", "5");
      url.searchParams.set("lookupSubjectAttributes", "true");
      try {
        const response = await fetcher(url, {
          headers: { "X-Api-Key": apiKey, Accept: "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(12_000),
        });
        if (response.status === 404)
          throw new HomeownerError(
            "VALUATION_NOT_FOUND",
            422,
            "No valuation is available for this property. Your existing reports have been kept.",
          );
        if (response.status === 429)
          throw new HomeownerError(
            "VALUATION_RATE_LIMITED",
            429,
            "The valuation service is at its request limit. Try a new lookup later.",
          );
        if (!response.ok)
          throw new HomeownerError(
            "VALUATION_UNAVAILABLE",
            502,
            "The valuation service could not complete the lookup. Your existing reports have been kept.",
          );
        return normalizeRentCastValuation(
          await readBoundedJson(response, 300_000),
          address,
          clock(),
        );
      } catch (error) {
        if (error instanceof HomeownerError) throw error;
        throw new HomeownerError(
          "VALUATION_UNCERTAIN",
          502,
          "The valuation lookup did not return a result. It will not be repeated automatically.",
        );
      }
    },
  };
}
