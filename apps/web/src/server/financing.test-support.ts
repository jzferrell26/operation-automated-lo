import { randomUUID } from "node:crypto";
import type { FinancingRequest, FinancingReportView } from "../features/financing/model.js";
import type { FinancingScenario } from "@oalo/contracts";
import {
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
} from "./authenticated-principal.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { saveFinancingComparison, verifyFinancingVersion } from "./financing-save.js";

export function financingScenario(change: Partial<FinancingScenario> = {}): FinancingScenario {
  return {
    id: randomUUID(),
    label: "Conventional 20% down",
    program: "conventional",
    structure: "fixed-purchase",
    termMonths: 360,
    downPaymentBps: 2000,
    quote: {
      noteRateMilliPercent: 6000,
      aprMilliPercent: 6250,
      source: "Synthetic lender quote Q-001",
      quotedAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2090-01-01T00:00:00.000Z",
      confirmed: true,
    },
    upfrontFee: { amountMinor: 0, treatment: "none" },
    monthlyMortgageInsuranceMinor: 0,
    costs: [
      {
        id: randomUUID(),
        label: "Lender and settlement costs",
        category: "closing",
        amountMinor: 400_000,
        paidBeforeClosing: false,
      },
      {
        id: randomUUID(),
        label: "Prepaid insurance and interest",
        category: "prepaid",
        amountMinor: 150_000,
        paidBeforeClosing: false,
      },
      {
        id: randomUUID(),
        label: "Initial escrow deposit",
        category: "escrow",
        amountMinor: 200_000,
        paidBeforeClosing: false,
      },
    ],
    costsComplete: true,
    sellerCreditMinor: 100_000,
    lenderCreditMinor: 0,
    depositMinor: 200_000,
    assumptions: "Synthetic fixed-rate purchase illustration. Not an eligibility determination.",
    ...change,
  };
}

export function financingInput(change: Partial<FinancingRequest> = {}): FinancingRequest {
  return {
    requestId: randomUUID(),
    address: "123 Example Lane, Dallas",
    stateCode: "TX",
    description: "A synthetic property with room to make yourself at home.",
    partnerId: "00000000-0000-4000-8000-000000000001",
    propertyPermissionConfirmed: false,
    realtorPermissionConfirmed: false,
    financing: {
      purchasePriceMinor: 40_000_000,
      housing: {
        propertyTaxMinor: 45_000,
        homeownersInsuranceMinor: 15_000,
        hoaMinor: 5_000,
        otherMinor: 0,
      },
      scenarios: [financingScenario()],
    },
    ...change,
  };
}
export function financingRequest(body: unknown, headers: HeadersInit = {}) {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/property/financing", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}
export const financingPorts = () => createDefaultCampaignCommandPorts();
export async function savedFinancingReport(
  environment: unknown,
  input = financingInput(),
): Promise<FinancingReportView> {
  const principal = createLocalSyntheticPrincipal();
  const adapter = createCampaignPersistenceAdapter(principal, environment);
  const saved = await saveFinancingComparison(input, principal, environment, {
    versions: adapter.versionRepository,
    campaigns: adapter.readRepository,
    now: () => new Date("2026-10-05T12:00:00.000Z"),
  });
  await adapter.persistDraft(saved.version, saved.preflight);
  return {
    campaignRef: saved.version.campaignRef,
    campaignVersionRef: saved.version.campaignVersionRef,
    versionNo: saved.version.versionNo,
    createdAt: saved.version.createdAt,
    manifest: verifyFinancingVersion(saved.version),
  };
}
