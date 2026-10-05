import type { PropertyCampaignFormData } from "../features/property-campaigns/model.js";
import {
  resolveAuthenticatedReadPrincipal,
  UnauthenticatedPrincipalError,
  type CampaignCommandPorts,
} from "./authenticated-principal.js";
import {
  propertyCampaignFormData,
  readPropertyCampaignContext,
} from "./property-campaign-context.js";
import { resolveRuntimeCampaignCommandPorts } from "./runtime-authentication.js";

export const READ_ONLY_PROPERTY_FORM: PropertyCampaignFormData = Object.freeze({
  canSave: false,
  synthetic: false,
  brandReady: false,
  brandName: "",
  partners: Object.freeze([]),
});

type PropertyPageRead =
  | Readonly<{ authenticated: false }>
  | Readonly<{ authenticated: true; data: PropertyCampaignFormData }>;

export async function readPropertyCampaignPage(
  request: Request,
  environment: unknown = process.env,
  ports: CampaignCommandPorts = resolveRuntimeCampaignCommandPorts(environment),
): Promise<PropertyPageRead> {
  try {
    const principal = await resolveAuthenticatedReadPrincipal(request, environment, ports);
    if (principal.role !== "location_admin" && principal.role !== "campaign_creator") {
      return { authenticated: true, data: READ_ONLY_PROPERTY_FORM };
    }
    const context = await readPropertyCampaignContext(principal, environment);
    return { authenticated: true, data: propertyCampaignFormData(context, principal) };
  } catch (error) {
    if (error instanceof UnauthenticatedPrincipalError) return { authenticated: false };
    throw error;
  }
}
