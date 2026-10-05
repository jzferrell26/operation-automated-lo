import type { AuthenticatedPrincipal } from "@oalo/application";
import { PropertyCampaignPreparationSchema } from "@oalo/contracts";

import type { PropertyCampaignFormData } from "../features/property-campaigns/model.js";
import type { WorkspacePartner } from "../features/workspace/model.js";
import { readSavedAdBrand, type SavedAdBrand } from "./ad-brand-read.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";

export interface PropertyCampaignContext {
  readonly brand: SavedAdBrand;
  readonly partners: readonly WorkspacePartner[];
}

/** An explicit local-demo record, never a fallback for an authenticated customer's missing partner. */
const LOCAL_PARTNERS: readonly WorkspacePartner[] = Object.freeze([
  Object.freeze({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Jordan Sample",
    company: "Example Realty",
    email: "",
    phone: "",
  }),
]);

export function propertyCampaignBrandIdentity(brand: SavedAdBrand) {
  const { disclosureLine: _disclosureLine, ...identity } = brand.band;
  return PropertyCampaignPreparationSchema.shape.brand.safeParse(identity);
}

export async function readPropertyCampaignContext(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<PropertyCampaignContext> {
  const brand = await readSavedAdBrand(principal, environment);
  const local =
    principal.authenticationMode === "local_synthetic" &&
    authenticatedWorkspaceMode(environment) === "synthetic";
  const partners = local
    ? LOCAL_PARTNERS
    : ((await readWorkspacePreferences(principal, campaignDatabasePool(environment))).partners
        ?.value.items ?? []);
  return { brand, partners };
}

export function propertyCampaignFormData(
  context: PropertyCampaignContext,
  principal: Readonly<AuthenticatedPrincipal>,
): PropertyCampaignFormData {
  return {
    canSave: principal.role === "location_admin" || principal.role === "campaign_creator",
    synthetic: principal.authenticationMode === "local_synthetic",
    brandReady: context.brand.saved && propertyCampaignBrandIdentity(context.brand).success,
    brandName: context.brand.band.name,
    partners: context.partners.map(({ id, name, company }) => ({ id, name, company })),
  };
}
