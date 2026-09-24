import {
  HomeFinancialsSchema,
  HomeReportInputSchema,
  HomeReportSchema,
  HomeValuationSchema,
  type HomeFinancials,
  type HomeMortgage,
  type HomeReport,
  type HomeReportInput,
  type HomeValuation,
} from "@oalo/contracts";
import { estimateMortgageBalance } from "@oalo/domain";
export { estimatedSaleProceeds, hypotheticalBorrowingRoom, nextMonthlyRefresh } from "@oalo/domain";

export function calculateHomeEquity(
  mortgage: HomeMortgage,
  valuation: HomeValuation,
): HomeFinancials {
  const modeled =
    mortgage.source === "amortized" && mortgage.loan !== null
      ? estimateMortgageBalance(mortgage.loan)
      : null;
  const first =
    mortgage.source === "unknown" ? null : (modeled?.balanceMinor ?? mortgage.firstBalanceMinor);
  const total =
    mortgage.allLiensConfirmed && first !== null && mortgage.otherBalanceMinor !== null
      ? first + mortgage.otherBalanceMinor
      : null;
  return HomeFinancialsSchema.parse({
    firstBalanceMinor: first,
    totalDebtMinor: total,
    equityMinor: total === null ? null : valuation.valueMinor - total,
    equityLowMinor:
      total === null || valuation.lowMinor === null ? null : valuation.lowMinor - total,
    equityHighMinor:
      total === null || valuation.highMinor === null ? null : valuation.highMinor - total,
    combinedLtvPercent:
      total === null ? null : Math.round((total / valuation.valueMinor) * 10_000) / 100,
    monthlyPrincipalInterestMinor: modeled?.paymentMinor ?? null,
    calculationVersion: "home-equity-v1",
  });
}

export function buildHomeReport(
  input: HomeReportInput,
  valuation: HomeValuation,
  id: string,
  propertyId: string,
  now: Date,
): HomeReport {
  const parsedInput = HomeReportInputSchema.parse(input);
  const parsedValuation = HomeValuationSchema.parse(valuation);
  if (parsedInput.mortgage.asOf > now.toISOString().slice(0, 10))
    throw new Error("Mortgage input date cannot be in the future");
  if (Date.parse(parsedValuation.retrievedAt) > now.getTime() + 60_000)
    throw new Error("Valuation date cannot be in the future");
  return HomeReportSchema.parse({
    id,
    propertyId,
    createdAt: now.toISOString(),
    input: parsedInput,
    valuation: parsedValuation,
    financials: calculateHomeEquity(parsedInput.mortgage, parsedValuation),
  });
}

export function homeReportFreshness(
  report: HomeReport,
  now = new Date(),
): { valuationStale: boolean; mortgageStale: boolean } {
  const days = (date: string) => (now.getTime() - Date.parse(date)) / 86_400_000;
  return {
    valuationStale: days(report.valuation.retrievedAt) > 35,
    mortgageStale:
      report.input.mortgage.source !== "unknown" && days(report.input.mortgage.asOf) > 35,
  };
}
