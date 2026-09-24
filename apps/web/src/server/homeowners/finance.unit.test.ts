import { describe, expect, it } from "vitest";
import {
  buildHomeReport,
  calculateHomeEquity,
  homeReportFreshness,
} from "@oalo/application/homeowner-reports";
import {
  estimateMortgageBalance,
  estimatedSaleProceeds,
  hypotheticalBorrowingRoom,
  nextMonthlyRefresh,
} from "../../../../../packages/domain/src/homeowner-finance.js";
import { HomeMortgageSchema, HomeReportInputSchema } from "@oalo/contracts";
import { homeownerInput, homeownerValuation } from "./homeowner-fixtures.js";
import { scheduledMortgage, scheduledRequestId, authorizedHomeCron } from "./scheduler.js";
import { HomeEnvironmentSchema } from "./runtime.js";

const now = new Date("2026-09-24T12:00:00Z");
const reportId = `hreport_${"a".repeat(32)}`;
const propertyId = `home_${"a".repeat(32)}`;
describe("homeowner calculations", () => {
  it("distinguishes value, debt, equity, selling costs and hypothetical borrowing", () => {
    const financials = calculateHomeEquity(homeownerInput(now).mortgage, homeownerValuation(now));
    expect(financials).toMatchObject({
      totalDebtMinor: 34_500_000,
      equityMinor: 14_000_000,
      equityLowMinor: 11_700_000,
      equityHighMinor: 16_300_000,
      combinedLtvPercent: 71.13,
      monthlyPrincipalInterestMinor: null,
    });
    expect(estimatedSaleProceeds(48_500_000, 34_500_000, 6)).toBe(11_090_000);
    expect(hypotheticalBorrowingRoom(48_500_000, 34_500_000, 80)).toBe(4_300_000);
    expect(hypotheticalBorrowingRoom(10_000, 20_000, 80)).toBe(0);
    expect(estimatedSaleProceeds(10_000, 20_000, 0)).toBe(-10_000);
  });
  it("never replaces unknown secured debt with zero and preserves negative equity", () => {
    const mortgage = homeownerInput(now).mortgage;
    for (const patch of [
      { otherBalanceMinor: null },
      { allLiensConfirmed: false },
      {
        source: "unknown" as const,
        firstBalanceMinor: null,
        otherBalanceMinor: null,
        allLiensConfirmed: false,
      },
    ])
      expect(
        calculateHomeEquity({ ...mortgage, ...patch }, homeownerValuation(now)).equityMinor,
      ).toBeNull();
    expect(
      calculateHomeEquity({ ...mortgage, firstBalanceMinor: 50_000_000 }, homeownerValuation(now))
        .equityMinor,
    ).toBe(-3_500_000);
    const debtFree = HomeMortgageSchema.parse({
      ...mortgage,
      source: "debt_free",
      firstBalanceMinor: 0,
      otherBalanceMinor: 0,
    });
    expect(calculateHomeEquity(debtFree, homeownerValuation(now)).equityMinor).toBe(48_500_000);
    expect(HomeMortgageSchema.safeParse({ ...debtFree, allLiensConfirmed: false }).success).toBe(
      false,
    );
    expect(HomeMortgageSchema.safeParse({ ...mortgage, source: "unknown" }).success).toBe(false);
    expect(HomeMortgageSchema.safeParse({ ...mortgage, firstBalanceMinor: null }).success).toBe(
      false,
    );
    expect(
      HomeMortgageSchema.safeParse({ ...mortgage, source: "amortized", loan: null }).success,
    ).toBe(false);
  });
  it("calculates fixed-rate scheduled payments, including zero interest and full payoff", () => {
    const loan = {
      originalPrincipalMinor: 30_000_000,
      annualRatePercent: 6,
      termMonths: 360,
      paymentsMade: 60,
    };
    const result = estimateMortgageBalance(loan);
    expect(result.paymentMinor).toBe(179865);
    expect(result.balanceMinor).toBe(27_916_307);
    expect(estimateMortgageBalance({ ...loan, paymentsMade: 0 }).balanceMinor).toBe(30_000_000);
    expect(estimateMortgageBalance({ ...loan, paymentsMade: 360 }).balanceMinor).toBe(0);
    expect(
      estimateMortgageBalance({ ...loan, annualRatePercent: 0, termMonths: 120, paymentsMade: 60 }),
    ).toEqual({ balanceMinor: 15_000_000, paymentMinor: 250000 });
    const finance = calculateHomeEquity(
      { ...homeownerInput(now).mortgage, source: "amortized", firstBalanceMinor: null, loan },
      homeownerValuation(now),
    );
    expect(finance.firstBalanceMinor).toBe(result.balanceMinor);
    expect(finance.monthlyPrincipalInterestMinor).toBe(result.paymentMinor);
    for (const invalid of [
      { paymentsMade: 361 },
      { annualRatePercent: NaN },
      { originalPrincipalMinor: -1 },
      { termMonths: 0 },
      { paymentsMade: 1.5 },
    ])
      expect(() => estimateMortgageBalance({ ...loan, ...invalid })).toThrow();
    expect(() => estimatedSaleProceeds(100, 0, 21)).toThrow();
    expect(() => hypotheticalBorrowingRoom(100, 0, 101)).toThrow();
  });
  it("retains missing valuation ranges and rejects future input dates", () => {
    const input = homeownerInput(now);
    const valuation = { ...homeownerValuation(now), lowMinor: null, highMinor: null };
    const report = buildHomeReport(input, valuation, reportId, propertyId, now);
    expect(report.financials.equityLowMinor).toBeNull();
    expect(report.financials.equityHighMinor).toBeNull();
    expect(() =>
      buildHomeReport(
        { ...input, mortgage: { ...input.mortgage, asOf: "2026-09-25" } },
        valuation,
        reportId,
        propertyId,
        now,
      ),
    ).toThrow("future");
    expect(() =>
      buildHomeReport(
        input,
        { ...valuation, retrievedAt: "2026-09-25T00:00:00Z" },
        reportId,
        propertyId,
        now,
      ),
    ).toThrow("future");
    expect(HomeReportInputSchema.safeParse({ ...input, confirmedProperty: false }).success).toBe(
      false,
    );
    expect(homeReportFreshness(report, now)).toEqual({
      valuationStale: false,
      mortgageStale: false,
    });
    expect(homeReportFreshness(report, new Date("2026-11-01T12:00:00Z"))).toEqual({
      valuationStale: true,
      mortgageStale: true,
    });
    expect(
      homeReportFreshness(
        { ...report, input: { ...input, mortgage: { ...input.mortgage, source: "unknown" } } },
        new Date("2026-11-01T12:00:00Z"),
      ),
    ).toEqual({ valuationStale: true, mortgageStale: false });
    expect(homeReportFreshness(report)).toHaveProperty("valuationStale");
  });
  it("schedules calendar months safely and does not fabricate current mortgage balances", () => {
    expect(nextMonthlyRefresh(new Date("2028-01-31T18:00:00Z"))).toBe("2028-02-29T12:00:00.000Z");
    expect(nextMonthlyRefresh(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01-31T12:00:00.000Z");
    expect(() => nextMonthlyRefresh(now, 32)).toThrow();
    expect(() => nextMonthlyRefresh(new Date("invalid"))).toThrow();
    const input = homeownerInput(now);
    expect(scheduledMortgage(input.mortgage, now)).toEqual(input.mortgage);
    expect(scheduledMortgage(input.mortgage, new Date("2026-11-01T00:00:00Z"))).toMatchObject({
      source: "unknown",
      firstBalanceMinor: null,
      otherBalanceMinor: null,
      allLiensConfirmed: false,
    });
    expect(scheduledRequestId(propertyId, now.toISOString())).toBe(
      scheduledRequestId(propertyId, now.toISOString()),
    );
    expect(scheduledRequestId(propertyId, "2026-10-24T12:00:00Z")).not.toBe(
      scheduledRequestId(propertyId, now.toISOString()),
    );
    const config = HomeEnvironmentSchema.parse({ CRON_SECRET: "s".repeat(40) });
    expect(authorizedHomeCron(new Request("https://app.example.test"), config)).toBe(false);
    expect(
      authorizedHomeCron(
        new Request("https://app.example.test", {
          headers: { Authorization: `Bearer ${"s".repeat(40)}` },
        }),
        config,
      ),
    ).toBe(true);
    expect(
      authorizedHomeCron(
        new Request("https://app.example.test", {
          headers: { Authorization: `Bearer ${"x".repeat(40)}` },
        }),
        config,
      ),
    ).toBe(false);
  });
});
