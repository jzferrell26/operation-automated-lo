import { HomeReportInputSchema, type HomeValuation } from "@oalo/contracts";

/** Fictional test fixtures. No consumer record or live provider response is stored here. */
export function homeownerInput(now = new Date()) {
  return HomeReportInputSchema.parse({
    requestId: "00000000-0000-4000-8000-000000000001",
    contactId: "fixture-contact",
    contactName: "Fixture Homeowner",
    address: { street: "214 Cedar Street", city: "Dallas", state: "TX", postalCode: "75201" },
    mortgage: {
      source: "confirmed",
      firstBalanceMinor: 32_500_000,
      otherBalanceMinor: 2_000_000,
      allLiensConfirmed: true,
      asOf: now.toISOString().slice(0, 10),
      loan: null,
    },
    brand: {
      name: "Fixture Loan Officer",
      company: "Fixture Lending",
      email: "officer@example.test",
      phone: "",
      nmls: "123456",
      companyNmls: "",
      tagline: "A clear next step.",
    },
    communicationBasis: "requested_report",
    confirmedProperty: true,
  });
}
export function homeownerValuation(now = new Date()): HomeValuation {
  return {
    source: "rentcast",
    retrievedAt: now.toISOString(),
    valueMinor: 48_500_000,
    lowMinor: 46_200_000,
    highMinor: 50_800_000,
    matchedAddress: "214 Cedar Street, Dallas, TX 75201",
    propertyType: "Single Family",
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2480,
    yearBuilt: 2017,
    comparables: [],
  };
}
export function rentCastFixture() {
  return {
    price: 485000,
    priceRangeLow: 462000,
    priceRangeHigh: 508000,
    subjectProperty: {
      formattedAddress: "214 Cedar St, Dallas, TX 75201",
      addressLine1: "214 Cedar St",
      city: "Dallas",
      state: "TX",
      zipCode: "75201",
      bedrooms: 4,
      bathrooms: 3,
      squareFootage: 2480,
      yearBuilt: 2017,
    },
    comparables: [
      {
        formattedAddress: "228 Cedar St, Dallas, TX 75201",
        price: 479000,
        bedrooms: 4,
        bathrooms: 3,
        squareFootage: 2410,
        distance: 0.3,
        status: "Active",
        lastSeenDate: "2026-09-01T00:00:00Z",
      },
    ],
  };
}
