import { z } from "zod";

/** Fixed-rate purchase illustrations only. Values are inputs, never a program-eligibility decision. */
export const FINANCING_CALCULATION_VERSION = "1.0.0" as const;
export const FinancingMoneySchema = z.number().int().min(0).max(10_000_000_000);
const RateSchema = z.number().int().min(0).max(30_000); // Thousandths of one percent, e.g. 6.125% = 6125.
const Text = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .refine(
    (value) =>
      Array.from(value).every((character) => {
        const code = character.codePointAt(0) ?? 0;
        return !(
          code < 32 ||
          code === 127 ||
          (code >= 0x202a && code <= 0x202e) ||
          (code >= 0x2066 && code <= 0x2069)
        );
      }),
    "Use ordinary printable text.",
  );

export const FinancingCostSchema = z
  .object({
    id: z.uuid(),
    label: Text,
    category: z.enum(["closing", "prepaid", "escrow"]),
    amountMinor: FinancingMoneySchema,
    paidBeforeClosing: z.boolean(),
  })
  .strict();

export const FinancingScenarioSchema = z
  .object({
    id: z.uuid(),
    label: Text,
    program: z.enum(["conventional", "fha", "va"]),
    structure: z.literal("fixed-purchase"),
    termMonths: z.number().int().min(12).max(360),
    downPaymentBps: z.number().int().min(0).max(9999),
    quote: z
      .object({
        noteRateMilliPercent: RateSchema,
        aprMilliPercent: RateSchema.nullable(),
        source: Text,
        quotedAt: z.iso.datetime({ offset: true }),
        expiresAt: z.iso.datetime({ offset: true }),
        confirmed: z.boolean(),
      })
      .strict()
      .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.quotedAt), {
        path: ["expiresAt"],
        message: "The quote must expire after it was issued.",
      }),
    upfrontFee: z
      .object({
        amountMinor: FinancingMoneySchema.nullable(),
        treatment: z.enum(["none", "cash", "financed"]),
      })
      .strict(),
    monthlyMortgageInsuranceMinor: FinancingMoneySchema.nullable(),
    costs: z.array(FinancingCostSchema).max(20),
    costsComplete: z.boolean(),
    sellerCreditMinor: FinancingMoneySchema.nullable(),
    lenderCreditMinor: FinancingMoneySchema.nullable(),
    depositMinor: FinancingMoneySchema.nullable(),
    assumptions: z.string().trim().max(1000),
  })
  .strict()
  .superRefine((value, context) => {
    const error = (path: (string | number)[], message: string) =>
      context.addIssue({ code: "custom", path, message });
    if (value.upfrontFee.treatment === "none" && value.upfrontFee.amountMinor !== 0)
      error(["upfrontFee"], "Confirm zero when no upfront program fee applies.");
    if (
      value.program === "conventional" &&
      (value.upfrontFee.treatment !== "none" || value.upfrontFee.amountMinor !== 0)
    )
      error(
        ["upfrontFee"],
        "Conventional costs belong in the cash-paid cost list; financed costs are not supported.",
      );
    if (
      value.program === "va" &&
      value.monthlyMortgageInsuranceMinor !== null &&
      value.monthlyMortgageInsuranceMinor !== 0
    )
      error(
        ["monthlyMortgageInsuranceMinor"],
        "A VA purchase illustration does not carry monthly mortgage insurance.",
      );
    if (new Set(value.costs.map((cost) => cost.id)).size !== value.costs.length)
      error(["costs"], "A cost item can appear only once.");
    if (new Set(value.costs.map((cost) => cost.label.toLowerCase())).size !== value.costs.length)
      error(["costs"], "Give each distinct cost a distinct label.");
  });
export type FinancingScenario = z.infer<typeof FinancingScenarioSchema>;

/** Monthly equivalents for all housing costs, including those paid separately from the mortgage. */
export const FinancingHousingSchema = z
  .object({
    propertyTaxMinor: FinancingMoneySchema.nullable(),
    homeownersInsuranceMinor: FinancingMoneySchema.nullable(),
    hoaMinor: FinancingMoneySchema.nullable(),
    otherMinor: FinancingMoneySchema.nullable(),
  })
  .strict();

export const FinancingInputSchema = z
  .object({
    purchasePriceMinor: FinancingMoneySchema.refine((value) => value > 0),
    housing: FinancingHousingSchema,
    scenarios: z.array(FinancingScenarioSchema).min(1).max(5),
  })
  .strict()
  .superRefine((value, context) => {
    for (const key of ["id", "label"] as const) {
      if (
        new Set(value.scenarios.map((scenario) => scenario[key].toLowerCase())).size !==
        value.scenarios.length
      )
        context.addIssue({
          code: "custom",
          path: ["scenarios"],
          message: `Scenario ${key}s must be unique.`,
        });
    }
  });
export type FinancingInput = z.infer<typeof FinancingInputSchema>;

const ResultMoney = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable();
export const FinancingScenarioResultSchema = z
  .object({
    id: z.uuid(),
    downPaymentMinor: ResultMoney,
    baseLoanMinor: ResultMoney,
    financedFeeMinor: ResultMoney,
    totalLoanMinor: ResultMoney,
    principalInterestMinor: ResultMoney,
    totalHousingMinor: ResultMoney,
    closingCostsMinor: ResultMoney,
    prepaidsMinor: ResultMoney,
    initialEscrowMinor: ResultMoney,
    cashProgramFeeMinor: ResultMoney,
    grossCashMinor: ResultMoney,
    creditsMinor: ResultMoney,
    costsPaidBeforeMinor: ResultMoney,
    alreadyPaidMinor: ResultMoney,
    cashToCloseMinor: ResultMoney,
    missing: z.array(z.string()).max(30),
  })
  .strict();
export const FinancingResultsSchema = z
  .object({
    calculationVersion: z.literal(FINANCING_CALCULATION_VERSION),
    scenarios: z.array(FinancingScenarioResultSchema).min(1).max(5),
  })
  .strict();
export type FinancingResults = z.infer<typeof FinancingResultsSchema>;

export const FinancingIdentitySchema = z
  .object({
    name: Text,
    company: Text,
    phone: z.string().trim().max(80),
    email: z.union([z.literal(""), z.email().max(200)]),
    license: z.string().trim().max(100),
  })
  .strict();
