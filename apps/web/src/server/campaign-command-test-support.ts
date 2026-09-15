import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const LOCAL_SYNTHETIC_ENV = Object.freeze({
  OALO_ENVIRONMENT: "local",
  OALO_PROVIDER_MODE: "stub",
  OALO_SYNTHETIC_DATA_ONLY: "true",
});

export const OPEN_HOUSE_DRAFT_INPUT = Object.freeze({
  address: "123 Main Street, Dallas",
  stateCode: "TX",
  propertyDescription: "A fully synthetic property description used for contract testing.",
  openHouseStartsAt: "2026-10-01T18:00:00.000Z",
  openHouseEndsAt: "2026-10-01T20:00:00.000Z",
  realtorDisplayName: "Jordan Smith",
  headline: "Tour this home this weekend",
  body: "Join us for the open house and explore the property in person.",
  callToAction: "Get open house details",
  disclosureText: "Equal Housing Opportunity. Additional lender disclosures apply.",
  consentText: "By submitting, you agree to be contacted about this property.",
  region: "Dallas-Fort Worth",
  dailyBudgetDollars: 25,
  totalBudgetDollars: 125,
  propertyPermissionConfirmed: true,
  realtorPermissionConfirmed: true,
});

export type PersistedDraftSummary = Readonly<{
  campaignRef: string;
  campaignVersionRef: string;
  manifestHash: string;
  resultHash: string;
}>;

export function createTemporaryCampaignStore(prefix: string) {
  let directory: string | undefined;
  let storePath: string | undefined;
  return {
    async enter() {
      directory = await mkdtemp(join(tmpdir(), prefix));
      storePath = join(directory, "local-campaign-store.json");
      return storePath;
    },
    env() {
      if (storePath === undefined) {
        throw new Error("Temporary campaign store was not entered");
      }
      return Object.freeze({
        ...LOCAL_SYNTHETIC_ENV,
        OALO_LOCAL_CAMPAIGN_STORE: storePath,
      });
    },
    async restore() {
      if (directory === undefined) return;
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
      storePath = undefined;
    },
  };
}

export function persistedDraftFromPreflightBody(payload: unknown): PersistedDraftSummary {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Preflight response body must be an object");
  }
  const record = payload as {
    version?: { campaignRef?: unknown; campaignVersionRef?: unknown; manifestHash?: unknown };
    preflight?: { resultHash?: unknown };
  };
  if (
    typeof record.version?.campaignRef !== "string" ||
    typeof record.version.campaignVersionRef !== "string" ||
    typeof record.version.manifestHash !== "string" ||
    typeof record.preflight?.resultHash !== "string"
  ) {
    throw new Error("Preflight response is missing persisted draft fields");
  }
  return {
    campaignRef: record.version.campaignRef,
    campaignVersionRef: record.version.campaignVersionRef,
    manifestHash: record.version.manifestHash,
    resultHash: record.preflight.resultHash,
  };
}
