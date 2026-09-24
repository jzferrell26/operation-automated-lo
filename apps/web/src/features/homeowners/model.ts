import { buildHomeReport } from "@oalo/application/homeowner-reports";
import {
  HomeReportInputSchema,
  HomeValuationSchema,
  type HomeAddress,
  type HomeBrand,
  type HomeMortgage,
  type HomeProperty,
  type HomeReport,
  type HomeReportInput,
} from "@oalo/contracts";

export const sampleHomeAddress: HomeAddress = {
  street: "214 Cedar Street",
  city: "Dallas",
  state: "TX",
  postalCode: "75201",
};
export const homeAddressText = (address: HomeAddress) =>
  `${address.street}, ${address.city}, ${address.state} ${address.postalCode}`;
export const homeMoney = (minor: number | null) =>
  minor === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(minor / 100);
export const homeDate = (date: string) =>
  new Date(date.length === 10 ? `${date}T12:00:00Z` : date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
export const blankHomeBrand: HomeBrand = {
  name: "",
  company: "",
  email: "",
  phone: "",
  nmls: "",
  companyNmls: "",
  tagline: "",
};
export const emptyMortgage = (): HomeMortgage => ({
  source: "unknown",
  firstBalanceMinor: null,
  otherBalanceMinor: null,
  allLiensConfirmed: false,
  asOf: new Date().toISOString().slice(0, 10),
  loan: null,
});
export function parseDollarInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/u.test(trimmed))
    throw new Error("Enter a dollar amount with at most two decimal places.");
  const cents = Math.round(Number(trimmed) * 100);
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000)
    throw new Error("The dollar amount is too large.");
  return cents;
}
export function sampleHomeValuation(now = new Date()) {
  return HomeValuationSchema.parse({
    source: "sample",
    retrievedAt: now.toISOString(),
    valueMinor: 48_500_000,
    lowMinor: 46_200_000,
    highMinor: 50_800_000,
    matchedAddress: homeAddressText(sampleHomeAddress),
    propertyType: "Single Family",
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2480,
    yearBuilt: 2017,
    comparables: [
      {
        address: "228 Cedar Street · Fictional example",
        priceMinor: 47_900_000,
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2410,
        distanceMiles: 0.3,
        listingStatus: "Example listing",
        lastSeenAt: now.toISOString(),
        priceKind: "listing",
      },
      {
        address: "105 Maple Court · Fictional example",
        priceMinor: 49_500_000,
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2530,
        distanceMiles: 0.6,
        listingStatus: "Example listing",
        lastSeenAt: now.toISOString(),
        priceKind: "listing",
      },
      {
        address: "312 Oak Lane · Fictional example",
        priceMinor: 46_800_000,
        bedrooms: 3,
        bathrooms: 2.5,
        squareFeet: 2305,
        distanceMiles: 0.8,
        listingStatus: "Example listing",
        lastSeenAt: now.toISOString(),
        priceKind: "listing",
      },
    ],
  });
}

export function createSampleHomeReport(
  raw: HomeReportInput,
  properties: readonly HomeProperty[],
  reuse?: HomeReport,
): HomeReport {
  const input = HomeReportInputSchema.parse(raw);
  if (
    homeAddressText(input.address).toLowerCase() !==
    homeAddressText(sampleHomeAddress).toLowerCase()
  )
    throw new Error(
      "Use the fictional Cedar Street property in this demo. Live address lookups require a connected workspace.",
    );
  const duplicate = properties
    .flatMap((property) => property.reports)
    .find((report) => report.input.requestId === input.requestId);
  if (duplicate) return duplicate;
  const existing = properties.find(
    (property) =>
      property.contactId === input.contactId &&
      homeAddressText(property.address) === homeAddressText(input.address),
  );
  const propertyId =
    reuse?.propertyId ?? existing?.id ?? `home_${crypto.randomUUID().replaceAll("-", "")}`;
  return buildHomeReport(
    input,
    reuse?.valuation ?? sampleHomeValuation(),
    `hreport_${crypto.randomUUID().replaceAll("-", "")}`,
    propertyId,
    new Date(),
  );
}
export function storeSampleHomeReport(
  properties: readonly HomeProperty[],
  report: HomeReport,
): HomeProperty[] {
  const existing = properties.find((property) => property.id === report.propertyId);
  if (existing?.reports.some((item) => item.id === report.id)) return [...properties];
  const property: HomeProperty = {
    id: report.propertyId,
    contactId: report.input.contactId,
    contactName: report.input.contactName,
    address: report.input.address,
    createdAt: existing?.createdAt ?? report.createdAt,
    updatedAt: report.createdAt,
    enrollment: existing?.enrollment ?? {
      cadence: "off",
      paused: false,
      nextRefreshAt: null,
      deliverUpdates: false,
    },
    reports: [report, ...(existing?.reports ?? [])].slice(0, 120),
    reviewRequestedAt: existing?.reviewRequestedAt ?? null,
    lastError: null,
  };
  return [property, ...properties.filter((item) => item.id !== property.id)];
}
