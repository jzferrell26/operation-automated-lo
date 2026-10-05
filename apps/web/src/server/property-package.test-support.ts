import { randomUUID } from "node:crypto";
import {
  PropertyCampaignSavedSchema,
  type PropertyCampaignRequest,
} from "../features/property-campaigns/model.js";
import {
  createDefaultCampaignCommandPorts,
  createLocalSyntheticPrincipal,
} from "./authenticated-principal.js";
import { createCampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { handlePropertyCampaignSave } from "./property-campaign-handler.js";

export function propertyInput(
  overrides: Partial<PropertyCampaignRequest> = {},
): PropertyCampaignRequest {
  return {
    requestId: randomUUID(),
    address: "615 Example Lane, Dallas, TX",
    stateCode: "TX",
    description:
      "A light-filled home with an open living area, a covered patio, and space to gather. These fictional property details are supplied for internal campaign review.",
    startsAt: "2030-06-12T18:00:00-05:00",
    endsAt: "2030-06-12T20:00:00-05:00",
    partnerId: "00000000-0000-4000-8000-000000000001",
    propertyPermissionConfirmed: false,
    realtorPermissionConfirmed: false,
    ...overrides,
  };
}

export function packagePostRequest(input: unknown): Request {
  return new Request("https://app.operation-automated-lo.test/api/campaigns/property/package", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function savedPropertyFixture(
  environment: unknown,
  overrides: Partial<PropertyCampaignRequest> = {},
) {
  const principal = createLocalSyntheticPrincipal();
  const saved = await handlePropertyCampaignSave(
    packagePostRequest(propertyInput(overrides)),
    environment,
    createDefaultCampaignCommandPorts(),
  );
  if (!saved.ok) throw new Error(`Property fixture save failed (${saved.status})`);
  const refs = PropertyCampaignSavedSchema.parse(await saved.json());
  const campaigns = createCampaignPersistenceAdapter(principal, environment).readRepository;
  const record = await campaigns.getByCampaignRef(refs.campaignRef);
  if (!record) throw new Error("Saved property fixture is missing");
  return {
    principal,
    campaigns,
    version: record.version,
    request: {
      campaignRef: record.version.campaignRef,
      campaignVersionRef: record.version.campaignVersionRef,
      sourceManifestHash: record.version.manifestHash,
    },
  };
}
