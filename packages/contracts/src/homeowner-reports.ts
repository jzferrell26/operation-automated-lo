import { z } from "zod";

const money = z.number().int().min(0).max(100_000_000_000);
const signedMoney = z.number().int().min(-100_000_000_000).max(100_000_000_000);
export const HomePropertyIdSchema = z.string().regex(/^home_[a-f0-9]{32}$/u);
export const HomeReportIdSchema = z.string().regex(/^hreport_[a-f0-9]{32}$/u);
export const HomeContactIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/u);
export const HomeAddressSchema = z
  .object({
    street: z.string().trim().min(3).max(200),
    city: z.string().trim().min(2).max(100),
    state: z.string().regex(/^[A-Z]{2}$/u),
    postalCode: z.string().regex(/^\d{5}(?:-\d{4})?$/u),
  })
  .strict();
export const HomeBrandSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    company: z.string().trim().min(2).max(160),
    email: z.union([z.literal(""), z.email().max(200)]),
    phone: z.string().max(40),
    nmls: z.string().regex(/^\d{0,12}$/u),
    companyNmls: z.string().regex(/^\d{0,12}$/u),
    tagline: z.string().max(300),
  })
  .strict();
export const HomeLoanTermsSchema = z
  .object({
    originalPrincipalMinor: money.positive(),
    annualRatePercent: z.number().min(0).max(30),
    termMonths: z.number().int().min(1).max(600),
    paymentsMade: z.number().int().min(0).max(600),
  })
  .strict()
  .refine(
    (loan) => loan.paymentsMade <= loan.termMonths,
    "Completed payments cannot exceed the loan term",
  );
export const HomeMortgageSchema = z
  .object({
    source: z.enum(["confirmed", "amortized", "debt_free", "unknown"]),
    firstBalanceMinor: money.nullable(),
    otherBalanceMinor: money.nullable(),
    allLiensConfirmed: z.boolean(),
    asOf: z.iso.date(),
    loan: HomeLoanTermsSchema.nullable(),
  })
  .strict()
  .superRefine((mortgage, context) => {
    if (mortgage.source === "confirmed" && mortgage.firstBalanceMinor === null)
      context.addIssue({
        code: "custom",
        path: ["firstBalanceMinor"],
        message: "Enter a confirmed first-mortgage balance",
      });
    if (mortgage.source === "amortized" && mortgage.loan === null)
      context.addIssue({
        code: "custom",
        path: ["loan"],
        message: "Enter the loan terms for the estimate",
      });
    if (
      mortgage.source === "debt_free" &&
      (!mortgage.allLiensConfirmed ||
        mortgage.firstBalanceMinor !== 0 ||
        mortgage.otherBalanceMinor !== 0)
    )
      context.addIssue({
        code: "custom",
        message: "Confirm that there are no mortgages or other secured loans",
      });
    if (
      mortgage.source === "unknown" &&
      (mortgage.firstBalanceMinor !== null ||
        mortgage.otherBalanceMinor !== null ||
        mortgage.allLiensConfirmed)
    )
      context.addIssue({
        code: "custom",
        message: "Unknown debt cannot include a confirmed balance",
      });
  });
export const HomeReportInputSchema = z
  .object({
    requestId: z.uuid(),
    propertyId: HomePropertyIdSchema.optional(),
    association: z.enum(["property_only", "ghl_contact"]).default("ghl_contact"),
    contactId: HomeContactIdSchema,
    contactName: z.string().trim().min(2).max(160),
    address: HomeAddressSchema,
    mortgage: HomeMortgageSchema,
    brand: HomeBrandSchema,
    communicationBasis: z.enum(["requested_report", "existing_relationship"]),
    confirmedProperty: z.literal(true),
  })
  .strict();
export const HomeComparableSchema = z
  .object({
    address: z.string().min(1).max(400),
    priceMinor: money.positive(),
    bedrooms: z.number().min(0).max(100).nullable(),
    bathrooms: z.number().min(0).max(100).nullable(),
    squareFeet: z.number().positive().max(1_000_000).nullable(),
    distanceMiles: z.number().min(0).max(1000).nullable(),
    listingStatus: z.string().max(80).nullable(),
    lastSeenAt: z.iso.datetime().nullable(),
    priceKind: z.literal("listing"),
  })
  .strict();
export const HomeValuationSchema = z
  .object({
    source: z.enum(["rentcast", "sample"]),
    retrievedAt: z.iso.datetime(),
    valueMinor: money.positive(),
    lowMinor: money.positive().nullable(),
    highMinor: money.positive().nullable(),
    matchedAddress: z.string().min(3).max(400),
    propertyType: z.string().max(80).nullable(),
    bedrooms: z.number().min(0).max(100).nullable(),
    bathrooms: z.number().min(0).max(100).nullable(),
    squareFeet: z.number().positive().max(1_000_000).nullable(),
    yearBuilt: z.number().int().min(1600).max(2200).nullable(),
    comparables: z.array(HomeComparableSchema).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.lowMinor !== null && value.lowMinor > value.valueMinor) ||
      (value.highMinor !== null && value.highMinor < value.valueMinor)
    )
      context.addIssue({
        code: "custom",
        message: "The estimated value must lie within its supplied range",
      });
  });
export const HomeFinancialsSchema = z
  .object({
    firstBalanceMinor: money.nullable(),
    totalDebtMinor: money.nullable(),
    equityMinor: signedMoney.nullable(),
    equityLowMinor: signedMoney.nullable(),
    equityHighMinor: signedMoney.nullable(),
    combinedLtvPercent: z.number().nonnegative().max(1_000_000).nullable(),
    monthlyPrincipalInterestMinor: money.nullable(),
    calculationVersion: z.literal("home-equity-v1"),
  })
  .strict();
export const HomeReportSchema = z
  .object({
    id: HomeReportIdSchema,
    propertyId: HomePropertyIdSchema,
    createdAt: z.iso.datetime(),
    input: HomeReportInputSchema,
    valuation: HomeValuationSchema,
    financials: HomeFinancialsSchema,
  })
  .strict();
export const HomeEnrollmentSchema = z
  .object({
    cadence: z.enum(["off", "monthly"]),
    paused: z.boolean(),
    nextRefreshAt: z.iso.datetime().nullable(),
    deliverUpdates: z.boolean(),
  })
  .strict();
export const HomePropertySchema = z
  .object({
    id: HomePropertyIdSchema,
    contactId: HomeContactIdSchema,
    contactName: z.string().max(160),
    address: HomeAddressSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    enrollment: HomeEnrollmentSchema,
    reports: z.array(HomeReportSchema).max(120),
    reviewRequestedAt: z.iso.datetime().nullable(),
    lastError: z.string().max(300).nullable(),
  })
  .strict();
export const HomeWorkspaceSchema = z
  .object({
    mode: z.enum(["demo", "live", "unconfigured"]),
    canWrite: z.boolean(),
    valuationConnected: z.boolean(),
    ghlConnected: z.boolean(),
    deliveryEnabled: z.boolean().default(false),
    monthlyLookupLimit: z.number().int().nonnegative(),
    lookupsThisMonth: z.number().int().nonnegative(),
    properties: z.array(HomePropertySchema).max(200),
  })
  .strict();
export type HomeAddress = z.infer<typeof HomeAddressSchema>;
export type HomeBrand = z.infer<typeof HomeBrandSchema>;
export type HomeMortgage = z.infer<typeof HomeMortgageSchema>;
export type HomeReportInput = z.infer<typeof HomeReportInputSchema>;
export type HomeValuation = z.infer<typeof HomeValuationSchema>;
export type HomeFinancials = z.infer<typeof HomeFinancialsSchema>;
export type HomeReport = z.infer<typeof HomeReportSchema>;
export type HomeProperty = z.infer<typeof HomePropertySchema>;
export type HomeEnrollment = z.infer<typeof HomeEnrollmentSchema>;
export type HomeWorkspace = z.infer<typeof HomeWorkspaceSchema>;
