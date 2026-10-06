import type { FinancingScenario } from "@oalo/contracts";
import type { FinancingRequest } from "./model.js";

export interface CostDraft {
  id: string;
  label: string;
  category: "closing" | "prepaid" | "escrow";
  amount: string;
  paidBeforeClosing: boolean;
}
export interface ScenarioDraft {
  originalQuoteDates?: Readonly<{ quotedAt: string; expiresAt: string }>;
  id: string;
  label: string;
  program: FinancingScenario["program"];
  termMonths: string;
  downPayment: string;
  rate: string;
  apr: string;
  quoteSource: string;
  quotedOn: string;
  expiresOn: string;
  quoteConfirmed: boolean;
  fee: string;
  feeTreatment: "none" | "cash" | "financed";
  mi: string;
  costs: CostDraft[];
  costsComplete: boolean;
  sellerCredit: string;
  lenderCredit: string;
  deposit: string;
  assumptions: string;
}
export interface FinancingFormDraft {
  address: string;
  stateCode: string;
  description: string;
  partnerId: string;
  price: string;
  taxes: string;
  insurance: string;
  hoa: string;
  other: string;
  propertyPermissionConfirmed: boolean;
  realtorPermissionConfirmed: boolean;
  scenarios: ScenarioDraft[];
}
export function newScenario(id: string): ScenarioDraft {
  return {
    id,
    label: "Conventional option",
    program: "conventional",
    termMonths: "360",
    downPayment: "",
    rate: "",
    apr: "",
    quoteSource: "",
    quotedOn: "",
    expiresOn: "",
    quoteConfirmed: false,
    fee: "0",
    feeTreatment: "none",
    mi: "",
    costs: [],
    costsComplete: false,
    sellerCredit: "",
    lenderCredit: "",
    deposit: "",
    assumptions: "",
  };
}
/** Pure initializer avoids hydration-dependent random values. Real request and row keys are made on interaction. */
export function emptyFinancingDraft(): FinancingFormDraft {
  return {
    address: "",
    stateCode: "",
    description: "",
    partnerId: "",
    price: "",
    taxes: "",
    insurance: "",
    hoa: "",
    other: "",
    propertyPermissionConfirmed: false,
    realtorPermissionConfirmed: false,
    scenarios: [newScenario("00000000-0000-4000-8000-000000000010")],
  };
}
/** No Number('') => 0, exponents, implicit truncation or binary-float multiplication of dollars. */
export function parseScaledInput(value: string, places: number): number | null {
  const text = value.trim();
  if (text === "") return null;
  if (!new RegExp(`^\\d{1,11}(?:\\.\\d{1,${places}})?$`, "u").test(text)) return Number.NaN;
  const [whole = "", fraction = ""] = text.split(".");
  const scaled = BigInt(whole) * 10n ** BigInt(places) + BigInt(fraction.padEnd(places, "0"));
  return scaled <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(scaled) : Number.NaN;
}
function dateInstant(value: string, end = false): string {
  return /^\d{4}-\d{2}-\d{2}$/u.test(value)
    ? `${value}T${end ? "23:59:59" : "00:00:00"}.000Z`
    : value;
}

function quoteInstant(scenario: ScenarioDraft, end = false): string {
  const day = end ? scenario.expiresOn : scenario.quotedOn;
  const original = end
    ? scenario.originalQuoteDates?.expiresAt
    : scenario.originalQuoteDates?.quotedAt;
  // A reused intraday quote must not gain extra valid hours just because the editor displays a date.
  return original && new Date(original).toISOString().slice(0, 10) === day
    ? original
    : dateInstant(day, end);
}
export function financingFormInput(draft: FinancingFormDraft, requestId: string): unknown {
  return {
    requestId,
    address: draft.address,
    stateCode: draft.stateCode,
    description: draft.description,
    partnerId: draft.partnerId,
    propertyPermissionConfirmed: draft.propertyPermissionConfirmed,
    realtorPermissionConfirmed: draft.realtorPermissionConfirmed,
    financing: {
      purchasePriceMinor: parseScaledInput(draft.price, 2),
      housing: {
        propertyTaxMinor: parseScaledInput(draft.taxes, 2),
        homeownersInsuranceMinor: parseScaledInput(draft.insurance, 2),
        hoaMinor: parseScaledInput(draft.hoa, 2),
        otherMinor: parseScaledInput(draft.other, 2),
      },
      scenarios: draft.scenarios.map((s) => ({
        id: s.id,
        label: s.label,
        program: s.program,
        structure: "fixed-purchase",
        termMonths: /^\d{1,3}$/u.test(s.termMonths) ? Number(s.termMonths) : Number.NaN,
        downPaymentBps: parseScaledInput(s.downPayment, 2),
        quote: {
          noteRateMilliPercent: parseScaledInput(s.rate, 3),
          aprMilliPercent: parseScaledInput(s.apr, 3),
          source: s.quoteSource,
          quotedAt: quoteInstant(s),
          expiresAt: quoteInstant(s, true),
          confirmed: s.quoteConfirmed,
        },
        upfrontFee: { amountMinor: parseScaledInput(s.fee, 2), treatment: s.feeTreatment },
        monthlyMortgageInsuranceMinor: parseScaledInput(s.mi, 2),
        costs: s.costs.map((cost) => ({
          id: cost.id,
          label: cost.label,
          category: cost.category,
          amountMinor: parseScaledInput(cost.amount, 2),
          paidBeforeClosing: cost.paidBeforeClosing,
        })),
        costsComplete: s.costsComplete,
        sellerCreditMinor: parseScaledInput(s.sellerCredit, 2),
        lenderCreditMinor: parseScaledInput(s.lenderCredit, 2),
        depositMinor: parseScaledInput(s.deposit, 2),
        assumptions: s.assumptions,
      })),
    },
  };
}
const amount = (value: number | null, places = 2) =>
  value === null ? "" : (value / 10 ** places).toFixed(places);
export function reusedFinancingDraft(
  input: Omit<FinancingRequest, "requestId">,
): FinancingFormDraft {
  const { housing } = input.financing;
  return {
    address: input.address,
    stateCode: input.stateCode,
    description: input.description,
    partnerId: input.partnerId,
    price: amount(input.financing.purchasePriceMinor),
    taxes: amount(housing.propertyTaxMinor),
    insurance: amount(housing.homeownersInsuranceMinor),
    hoa: amount(housing.hoaMinor),
    other: amount(housing.otherMinor),
    propertyPermissionConfirmed: false,
    realtorPermissionConfirmed: false,
    scenarios: input.financing.scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      program: s.program,
      termMonths: String(s.termMonths),
      downPayment: amount(s.downPaymentBps),
      rate: amount(s.quote.noteRateMilliPercent, 3),
      apr: amount(s.quote.aprMilliPercent, 3),
      quoteSource: s.quote.source,
      quotedOn: new Date(s.quote.quotedAt).toISOString().slice(0, 10),
      expiresOn: new Date(s.quote.expiresAt).toISOString().slice(0, 10),
      originalQuoteDates: { quotedAt: s.quote.quotedAt, expiresAt: s.quote.expiresAt },
      quoteConfirmed: false,
      fee: amount(s.upfrontFee.amountMinor),
      feeTreatment: s.upfrontFee.treatment,
      mi: amount(s.monthlyMortgageInsuranceMinor),
      costs: s.costs.map((cost) => ({ ...cost, amount: amount(cost.amountMinor) })),
      costsComplete: false,
      sellerCredit: amount(s.sellerCreditMinor),
      lenderCredit: amount(s.lenderCreditMinor),
      deposit: amount(s.depositMinor),
      assumptions: s.assumptions,
    })),
  };
}
