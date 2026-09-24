export interface AmortizationInput {
  originalPrincipalMinor: number;
  annualRatePercent: number;
  termMonths: number;
  paymentsMade: number;
}

/** Fixed-rate, scheduled-payment estimate; excludes fees, arrears and extra principal. */
export function estimateMortgageBalance(input: AmortizationInput): {
  balanceMinor: number;
  paymentMinor: number;
} {
  const { originalPrincipalMinor: principal, annualRatePercent, termMonths, paymentsMade } = input;
  if (
    !Number.isSafeInteger(principal) ||
    principal <= 0 ||
    principal > 100_000_000_000 ||
    !Number.isFinite(annualRatePercent) ||
    annualRatePercent < 0 ||
    annualRatePercent > 30 ||
    !Number.isInteger(termMonths) ||
    termMonths < 1 ||
    termMonths > 600 ||
    !Number.isInteger(paymentsMade) ||
    paymentsMade < 0 ||
    paymentsMade > termMonths
  )
    throw new Error("Invalid mortgage estimate inputs");
  const rate = annualRatePercent / 1200;
  if (rate === 0)
    return {
      balanceMinor: Math.round(principal * (1 - paymentsMade / termMonths)),
      paymentMinor: Math.round(principal / termMonths),
    };
  const factor = Math.expm1(termMonths * Math.log1p(rate));
  const payment = (principal * rate * (factor + 1)) / factor;
  const elapsed = Math.expm1(paymentsMade * Math.log1p(rate));
  const balance =
    paymentsMade === termMonths ? 0 : principal * (elapsed + 1) - (payment * elapsed) / rate;
  return { balanceMinor: Math.max(0, Math.round(balance)), paymentMinor: Math.round(payment) };
}

export function estimatedSaleProceeds(
  valueMinor: number,
  debtMinor: number,
  costPercent: number,
): number {
  if (
    ![valueMinor, debtMinor].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    !Number.isFinite(costPercent) ||
    costPercent < 0 ||
    costPercent > 20
  )
    throw new Error("Invalid sale scenario inputs");
  return Math.round(valueMinor * (1 - costPercent / 100)) - debtMinor;
}

export function hypotheticalBorrowingRoom(
  valueMinor: number,
  debtMinor: number,
  maximumLtvPercent: number,
): number {
  if (
    ![valueMinor, debtMinor].every((value) => Number.isSafeInteger(value) && value >= 0) ||
    !Number.isFinite(maximumLtvPercent) ||
    maximumLtvPercent < 1 ||
    maximumLtvPercent > 100
  )
    throw new Error("Invalid borrowing scenario inputs");
  return Math.max(0, Math.round((valueMinor * maximumLtvPercent) / 100) - debtMinor);
}

export function nextMonthlyRefresh(now: Date, anchorDay = now.getUTCDate()): string {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isInteger(anchorDay) ||
    anchorDay < 1 ||
    anchorDay > 31
  )
    throw new Error("Invalid monthly refresh date");
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12));
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(anchorDay, lastDay));
  return next.toISOString();
}
