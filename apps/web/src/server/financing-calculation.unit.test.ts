import { describe, expect, it } from "vitest";
import {
  calculateFinancingComparison,
  downPaymentMinor,
  FinancingCalculationError,
} from "@oalo/application";
import { FinancingInputSchema, FinancingScenarioSchema } from "@oalo/contracts";
import { financingInput, financingScenario } from "./financing.test-support.js";

describe("fixed purchase comparison arithmetic", () => {
  it("matches an independently calculated 320000 loan at 6% for 360 months", () => {
    const result = calculateFinancingComparison(financingInput().financing).scenarios[0];
    // Decimal amortization reference: P*r/(1-(1+r)^-n), rounded half-up to cents.
    expect(result).toMatchObject({
      downPaymentMinor: 8_000_000,
      baseLoanMinor: 32_000_000,
      totalLoanMinor: 32_000_000,
      principalInterestMinor: 191_856,
      totalHousingMinor: 256_856,
      closingCostsMinor: 400_000,
      prepaidsMinor: 150_000,
      initialEscrowMinor: 200_000,
      grossCashMinor: 8_750_000,
      creditsMinor: 100_000,
      alreadyPaidMinor: 200_000,
      cashToCloseMinor: 8_450_000,
      missing: [],
    });
  });
  it("rounds the down payment at half a cent using integer arithmetic", () => {
    expect(downPaymentMinor(10_001, 5000)).toBe(5001);
    expect(downPaymentMinor(10_001, 350)).toBe(350);
  });
  it("handles a zero note rate without NaN or dividing by zero", () => {
    const input = financingInput().financing;
    input.scenarios[0]!.quote.noteRateMilliPercent = 0;
    expect(calculateFinancingComparison(input).scenarios[0]?.principalInterestMinor).toBe(88_889);
  });
  it("adds a supplied financed program fee to principal, not cash costs", () => {
    const input = financingInput().financing;
    input.scenarios = [
      financingScenario({
        program: "fha",
        downPaymentBps: 500,
        upfrontFee: { amountMinor: 675_500, treatment: "financed" },
        monthlyMortgageInsuranceMinor: 17_000,
        quote: { ...financingScenario().quote, noteRateMilliPercent: 6250 },
      }),
    ];
    const result = calculateFinancingComparison(input).scenarios[0];
    expect(result).toMatchObject({
      baseLoanMinor: 38_000_000,
      totalLoanMinor: 38_675_500,
      financedFeeMinor: 675_500,
      cashProgramFeeMinor: 0,
      principalInterestMinor: 238_132,
      grossCashMinor: 2_750_000,
      cashToCloseMinor: 2_450_000,
      totalHousingMinor: 320_132,
    });
  });
  it("puts a cash-paid program fee in funds required, not principal", () => {
    const input = financingInput().financing;
    input.scenarios[0] = financingScenario({
      program: "va",
      downPaymentBps: 0,
      upfrontFee: { amountMinor: 860_000, treatment: "cash" },
    });
    const result = calculateFinancingComparison(input).scenarios[0];
    expect(result).toMatchObject({
      totalLoanMinor: 40_000_000,
      financedFeeMinor: 0,
      cashProgramFeeMinor: 860_000,
      grossCashMinor: 1_610_000,
      cashToCloseMinor: 1_310_000,
    });
  });
  it("subtracts a deposit and costs already paid only once", () => {
    const input = financingInput().financing;
    input.scenarios[0]!.costs[0]!.paidBeforeClosing = true;
    expect(calculateFinancingComparison(input).scenarios[0]).toMatchObject({
      closingCostsMinor: 400_000,
      grossCashMinor: 8_750_000,
      costsPaidBeforeMinor: 400_000,
      alreadyPaidMinor: 600_000,
      cashToCloseMinor: 8_050_000,
    });
  });
  it.each(["propertyTaxMinor", "homeownersInsuranceMinor", "hoaMinor", "otherMinor"] as const)(
    "does not turn missing %s into a zero total",
    (key) => {
      const input = financingInput().financing;
      input.housing[key] = null;
      const result = calculateFinancingComparison(input).scenarios[0];
      expect(result?.totalHousingMinor).toBeNull();
      expect(result?.missing).toContain(key);
      expect(result?.cashToCloseMinor).toBe(8_450_000);
    },
  );
  it("preserves unknown MI, costs, credits, and financed fee", () => {
    const input = financingInput().financing;
    input.scenarios[0] = financingScenario({
      upfrontFee: { amountMinor: null, treatment: "financed" },
      monthlyMortgageInsuranceMinor: null,
      costsComplete: false,
      sellerCreditMinor: null,
    });
    const result = calculateFinancingComparison(input).scenarios[0];
    expect(result?.totalLoanMinor).toBeNull();
    expect(result?.principalInterestMinor).toBeNull();
    expect(result?.totalHousingMinor).toBeNull();
    expect(result?.cashToCloseMinor).toBeNull();
    expect(result?.missing).toEqual(
      expect.arrayContaining(["upfrontFee", "mortgageInsurance", "costs", "sellerCredit"]),
    );
  });
  it("refuses excess credits rather than treating them as down-payment assistance", () => {
    const input = financingInput().financing;
    input.scenarios[0]!.sellerCreditMinor = 900_000;
    expect(() => calculateFinancingComparison(input)).toThrow(/Credits exceed/);
  });
  it("refuses negative cash at closing instead of clamping it to zero", () => {
    const input = financingInput().financing;
    input.scenarios[0]!.depositMinor = 10_000_000;
    expect(() => calculateFinancingComparison(input)).toThrow(/cash-back/);
  });
  it("supports five scenarios of the same program with distinct down-payment choices", () => {
    const input = financingInput().financing;
    input.scenarios = [500, 1000, 1500, 2000, 2500].map((bps) =>
      financingScenario({ label: `${bps / 100}% down`, downPaymentBps: bps }),
    );
    expect(FinancingInputSchema.parse(input).scenarios).toHaveLength(5);
    expect(
      calculateFinancingComparison(input).scenarios.map((result) => result.downPaymentMinor),
    ).toEqual([2_000_000, 4_000_000, 6_000_000, 8_000_000, 10_000_000]);
  });
  it("refuses duplicate cost IDs and invalid precision in the domain", () => {
    const input = financingInput().financing;
    const cost = input.scenarios[0]!.costs[0]!;
    input.scenarios[0]!.costs.push(cost);
    expect(() => calculateFinancingComparison(input)).toThrow(FinancingCalculationError);
    expect(() => downPaymentMinor(1.1, 2000)).toThrow();
    expect(() => downPaymentMinor(0, 2000)).toThrow();
  });
  it.each([
    { program: "va", monthlyMortgageInsuranceMinor: 1000 },
    { upfrontFee: { amountMinor: 100, treatment: "financed" } },
    { termMonths: 0 },
    { downPaymentBps: 10000 },
    { structure: "temporary-buydown" },
  ])("rejects unsupported scenario input %j", (change) => {
    expect(FinancingScenarioSchema.safeParse({ ...financingScenario(), ...change }).success).toBe(
      false,
    );
  });
  it("refuses duplicate labels and more than five scenarios", () => {
    const input = financingInput().financing;
    input.scenarios.push(financingScenario());
    expect(FinancingInputSchema.safeParse(input).success).toBe(false);
    input.scenarios = Array.from({ length: 6 }, (_, index) =>
      financingScenario({ label: `Option ${index}` }),
    );
    expect(FinancingInputSchema.safeParse(input).success).toBe(false);
    expect(() => calculateFinancingComparison(input)).toThrow();
  });
});
