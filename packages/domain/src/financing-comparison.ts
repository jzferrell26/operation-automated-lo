import { estimateMortgageBalance } from "./homeowner-finance.js";

// The domain remains dependency-free. Runtime schemas are checked by the application boundary.
interface Cost {
  readonly id: string;
  readonly category: "closing" | "prepaid" | "escrow";
  readonly amountMinor: number;
  readonly paidBeforeClosing: boolean;
}
export interface FixedPurchaseScenario {
  readonly id: string;
  readonly downPaymentBps: number;
  readonly termMonths: number;
  readonly quote: { readonly noteRateMilliPercent: number };
  readonly upfrontFee: {
    readonly treatment: "none" | "cash" | "financed";
    readonly amountMinor: number | null;
  };
  readonly monthlyMortgageInsuranceMinor: number | null;
  readonly costs: readonly Cost[];
  readonly costsComplete: boolean;
  readonly sellerCreditMinor: number | null;
  readonly lenderCreditMinor: number | null;
  readonly depositMinor: number | null;
}
export interface FixedPurchaseInput {
  readonly purchasePriceMinor: number;
  readonly housing: Readonly<
    Record<
      "propertyTaxMinor" | "homeownersInsuranceMinor" | "hoaMinor" | "otherMinor",
      number | null
    >
  >;
  readonly scenarios: readonly FixedPurchaseScenario[];
}

export class FinancingCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancingCalculationError";
  }
}

function money(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_000_000_000)
    throw new FinancingCalculationError(
      "Amounts must be nonnegative integer cents within the supported range.",
    );
  return value;
}
function sum(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  let total = 0;
  for (const value of values) if (value !== null) total += money(value);
  if (!Number.isSafeInteger(total))
    throw new FinancingCalculationError("Total exceeds supported precision.");
  return total;
}

/** Integer half-up rounding for price x down-payment basis points, without a binary-float product. */
export function downPaymentMinor(priceMinor: number, basisPoints: number): number {
  money(priceMinor);
  if (priceMinor === 0 || !Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 9999)
    throw new FinancingCalculationError("Invalid purchase price or down payment.");
  return Number((BigInt(priceMinor) * BigInt(basisPoints) + 5000n) / 10000n);
}

/**
 * Explicit cash accounting. A program fee is either in principal or cash, never both. Ordinary
 * costs are never financed. Credits cannot fund the down payment; negative cash-back is unsupported.
 * This does not quote fees, calculate APR, evaluate eligibility, or model changing-payment loans.
 */
export function calculateFinancingComparison(input: FixedPurchaseInput) {
  if (input.scenarios.length < 1 || input.scenarios.length > 5)
    throw new FinancingCalculationError("Use one to five scenarios.");
  if (new Set(input.scenarios.map((item) => item.id)).size !== input.scenarios.length)
    throw new FinancingCalculationError("Scenario identifiers must be unique.");
  const housing = Object.values(input.housing);
  const housingTotal = sum(housing);
  const scenarios = input.scenarios.map((item) => {
    if (new Set(item.costs.map((cost) => cost.id)).size !== item.costs.length)
      throw new FinancingCalculationError("A cost must not be counted twice.");
    const down = downPaymentMinor(input.purchasePriceMinor, item.downPaymentBps);
    const base = input.purchasePriceMinor - down;
    const fee = item.upfrontFee.amountMinor;
    if (fee !== null) money(fee);
    if (item.upfrontFee.treatment === "none" && fee !== 0)
      throw new FinancingCalculationError("No program fee must be recorded as an explicit zero.");
    const financedFee = item.upfrontFee.treatment === "financed" ? fee : 0;
    const cashFee = item.upfrontFee.treatment === "cash" ? fee : 0;
    const totalLoan = financedFee === null ? null : base + financedFee;
    if (base <= 0 || (totalLoan !== null && totalLoan > 10_000_000_000))
      throw new FinancingCalculationError("Loan principal is outside the supported range.");
    if (
      !Number.isInteger(item.quote.noteRateMilliPercent) ||
      item.quote.noteRateMilliPercent < 0 ||
      item.quote.noteRateMilliPercent > 30000 ||
      !Number.isInteger(item.termMonths) ||
      item.termMonths < 12 ||
      item.termMonths > 360
    )
      throw new FinancingCalculationError("Unsupported fixed-rate terms.");
    const pi =
      totalLoan === null
        ? null
        : estimateMortgageBalance({
            originalPrincipalMinor: totalLoan,
            annualRatePercent: item.quote.noteRateMilliPercent / 1000,
            termMonths: item.termMonths,
            paymentsMade: 0,
          }).paymentMinor;
    const monthly = sum([pi, housingTotal, item.monthlyMortgageInsuranceMinor]);
    const category = (kind: Cost["category"]) =>
      item.costsComplete
        ? sum(item.costs.filter((cost) => cost.category === kind).map((cost) => cost.amountMinor))
        : null;
    const closing = category("closing"),
      prepaids = category("prepaid"),
      escrow = category("escrow");
    const paidCosts = item.costsComplete
      ? sum(item.costs.filter((cost) => cost.paidBeforeClosing).map((cost) => cost.amountMinor))
      : null;
    const credit = sum([item.sellerCreditMinor, item.lenderCreditMinor]);
    const alreadyPaid = sum([paidCosts, item.depositMinor]);
    const chargeTotal = sum([closing, prepaids, escrow, cashFee]);
    if (credit !== null && chargeTotal !== null && credit > chargeTotal)
      throw new FinancingCalculationError(
        "Credits exceed the supplied costs; down-payment assistance is not supported here.",
      );
    const gross = sum([down, chargeTotal]);
    const cash =
      gross === null || credit === null || alreadyPaid === null
        ? null
        : gross - credit - alreadyPaid;
    if (cash !== null && cash < 0)
      throw new FinancingCalculationError(
        "Credits and amounts already paid exceed funds required; cash-back scenarios need separate review.",
      );
    const missing: string[] = [];
    for (const [key, value] of Object.entries(input.housing)) if (value === null) missing.push(key);
    if (fee === null) missing.push("upfrontFee");
    if (item.monthlyMortgageInsuranceMinor === null) missing.push("mortgageInsurance");
    if (!item.costsComplete) missing.push("costs");
    for (const [key, value] of [
      ["sellerCredit", item.sellerCreditMinor],
      ["lenderCredit", item.lenderCreditMinor],
      ["deposit", item.depositMinor],
    ] as const)
      if (value === null) missing.push(key);
    return {
      id: item.id,
      downPaymentMinor: down,
      baseLoanMinor: base,
      financedFeeMinor: financedFee,
      totalLoanMinor: totalLoan,
      principalInterestMinor: pi,
      totalHousingMinor: monthly,
      closingCostsMinor: closing,
      prepaidsMinor: prepaids,
      initialEscrowMinor: escrow,
      cashProgramFeeMinor: cashFee,
      grossCashMinor: gross,
      creditsMinor: credit,
      costsPaidBeforeMinor: paidCosts,
      alreadyPaidMinor: alreadyPaid,
      cashToCloseMinor: cash,
      missing,
    };
  });
  return { calculationVersion: "1.0.0" as const, scenarios };
}
