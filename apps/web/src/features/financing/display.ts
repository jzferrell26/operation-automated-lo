import type {
  FinancingCampaignManifest,
  FinancingResults,
  FinancingScenario,
} from "@oalo/contracts";
import { FINANCING_COPY } from "../../copy/financing-messages.js";

export function financingMoney(value: number | null): string {
  return value === null
    ? FINANCING_COPY.unknown
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      }).format(value / 100);
}
export const financingRate = (value: number | null) =>
  value === null ? FINANCING_COPY.unknown : `${(value / 1000).toFixed(3)}%`;
export const financingDate = (value: string) =>
  `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value))} UTC`;
export const programNames = { conventional: "Conventional", fha: "FHA", va: "VA" } as const;

export interface ComparisonRow {
  readonly label: string;
  readonly values: readonly string[];
  readonly emphasis?: boolean;
}
export interface ComparisonGroup {
  readonly title: string;
  readonly rows: readonly ComparisonRow[];
}

/** No calculations in a renderer: these rows are a projection of the saved inputs/results only. */
export function financingGroups(manifest: FinancingCampaignManifest): readonly ComparisonGroup[] {
  const pairs = manifest.financing.scenarios.map((scenario, index) => {
    const result = manifest.calculated.scenarios[index];
    if (!result || result.id !== scenario.id)
      throw new Error("Saved financing result order is invalid.");
    return { scenario, result };
  });
  const row = (
    label: string,
    value: (scenario: FinancingScenario, result: FinancingResults["scenarios"][number]) => string,
    emphasis = false,
  ): ComparisonRow => ({
    label,
    values: pairs.map(({ scenario, result }) => value(scenario, result)),
    emphasis,
  });
  const resultRow = (
    label: string,
    key: Exclude<keyof FinancingResults["scenarios"][number], "id" | "missing">,
    emphasis = false,
  ) => row(label, (_s, r) => financingMoney(r[key]), emphasis);
  const housing = manifest.financing.housing;
  return [
    {
      title: "Financing assumptions",
      rows: [
        row("Program", (s) => programNames[s.program]),
        row("Purchase price", () => financingMoney(manifest.financing.purchasePriceMinor)),
        row("Down payment %", (s) => `${(s.downPaymentBps / 100).toFixed(2)}%`),
        resultRow("Down payment", "downPaymentMinor"),
        resultRow("Base loan", "baseLoanMinor"),
        resultRow("Program fee financed", "financedFeeMinor"),
        resultRow("Total loan", "totalLoanMinor"),
        row("Fixed term", (s) =>
          s.termMonths % 12 === 0 ? `${s.termMonths / 12} years` : `${s.termMonths} months`,
        ),
        row("Note rate", (s) => financingRate(s.quote.noteRateMilliPercent)),
        row("APR (supplied)", (s) => financingRate(s.quote.aprMilliPercent)),
      ],
    },
    {
      title: "Cash to close",
      rows: [
        resultRow("Down payment", "downPaymentMinor"),
        resultRow("Closing costs", "closingCostsMinor"),
        resultRow("Prepaids", "prepaidsMinor"),
        resultRow("Initial escrow", "initialEscrowMinor"),
        resultRow("Program fee paid in cash", "cashProgramFeeMinor"),
        resultRow("Gross funds required", "grossCashMinor"),
        row("Less seller credit", (s) => financingMoney(s.sellerCreditMinor)),
        row("Less lender credit", (s) => financingMoney(s.lenderCreditMinor)),
        resultRow("Less costs already paid", "costsPaidBeforeMinor"),
        row("Less deposit already paid", (s) => financingMoney(s.depositMinor)),
        resultRow("Estimated cash at closing", "cashToCloseMinor", true),
      ],
    },
    {
      title: "Housing expense",
      rows: [
        resultRow("Principal and interest", "principalInterestMinor"),
        row("Property taxes", () => financingMoney(housing.propertyTaxMinor)),
        row("Homeowners insurance", () => financingMoney(housing.homeownersInsuranceMinor)),
        row("Mortgage insurance", (s) => financingMoney(s.monthlyMortgageInsuranceMinor)),
        row("HOA", () => financingMoney(housing.hoaMinor)),
        row("Other housing costs", () => financingMoney(housing.otherMinor)),
        resultRow("Estimated monthly housing", "totalHousingMinor", true),
      ],
    },
  ];
}

export function quoteWarnings(scenario: FinancingScenario, now: number): readonly string[] {
  return [
    ...(Date.parse(scenario.quote.expiresAt) <= now ? [FINANCING_COPY.quoteExpired] : []),
    ...(!scenario.quote.confirmed ? [FINANCING_COPY.quoteUnconfirmed] : []),
    ...(scenario.quote.aprMilliPercent === null ? [FINANCING_COPY.aprMissing] : []),
  ];
}
