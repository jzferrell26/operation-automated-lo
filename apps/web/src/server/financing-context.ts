import { canonicalCampaignHash, type AuthenticatedPrincipal } from "@oalo/application";
import { PropertyCampaignPreparationSchema, type FinancingCampaignManifest } from "@oalo/contracts";
import type { FinancingFormContext, FinancingRequest } from "../features/financing/model.js";
import { DEFAULT_AD_BRAND } from "../features/workspace/ad-brand.js";
import type { WorkspacePartner } from "../features/workspace/model.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import {
  campaignDatabasePool,
  createCampaignPersistenceAdapter,
} from "./campaign-persistence-runtime.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";
import { verifyFinancingVersion } from "./financing-verification.js";

export interface FinancingContext {
  readonly brand: FinancingCampaignManifest["preparation"]["brand"] | null;
  readonly lender: FinancingCampaignManifest["identities"]["lender"] | null;
  readonly partners: readonly WorkspacePartner[];
  readonly disclosure: string;
  readonly brandProfileRef: string;
}

/** One saved-preferences read supplies identity and contact data together. No browser identity override. */
export async function readFinancingContext(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<FinancingContext> {
  if (
    principal.authenticationMode === "local_synthetic" &&
    authenticatedWorkspaceMode(environment) === "synthetic"
  ) {
    return {
      brand: {
        name: "Alex Morgan",
        company: "Prairie Home Lending",
        title: "Loan officer",
        nmls: "0000000",
        companyNmls: "0000000",
        colorPresetId: DEFAULT_AD_BRAND.colorPresetId,
      },
      lender: {
        name: "Alex Morgan",
        company: "Prairie Home Lending",
        phone: "555-010-0100",
        email: "alex@example.invalid",
        license: "NMLS 0000000 | Company NMLS 0000000",
      },
      partners: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Jordan Sample",
          company: "Example Realty",
          phone: "555-010-0200",
          email: "jordan@example.invalid",
        },
      ],
      disclosure: "Synthetic illustration for internal testing only. Not a loan offer.",
      brandProfileRef: "brandprofile_financingDemo001",
    };
  }
  const saved = await readWorkspacePreferences(principal, campaignDatabasePool(environment));
  const identity = saved.brand?.value;
  const ad = saved.adBrand?.value ?? DEFAULT_AD_BRAND;
  const parsed = PropertyCampaignPreparationSchema.shape.brand.safeParse({
    name: identity?.name,
    company: identity?.company,
    nmls: identity?.nmls,
    companyNmls: identity?.companyNmls,
    title: ad.title,
    colorPresetId: ad.colorPresetId,
  });
  return {
    brand: parsed.success ? parsed.data : null,
    lender:
      identity && parsed.success
        ? {
            name: identity.name,
            company: identity.company,
            phone: identity.phone,
            email: identity.email,
            license: `NMLS ${identity.nmls} | Company NMLS ${identity.companyNmls}`,
          }
        : null,
    partners: saved.partners?.value.items ?? [],
    disclosure: ad.disclosureLine,
    brandProfileRef: `brandprofile_${canonicalCampaignHash({ brand: saved.brand, adBrand: saved.adBrand }).slice(0, 40)}`,
  };
}

export function reusableFinancingInput(
  manifest: FinancingCampaignManifest,
): Omit<FinancingRequest, "requestId"> {
  return {
    address: manifest.property.address,
    stateCode: manifest.property.stateCode,
    description: manifest.property.description,
    partnerId: manifest.preparation.partnerRecordId,
    // A copied campaign does not transfer permission, confirmation or approval.
    propertyPermissionConfirmed: false,
    realtorPermissionConfirmed: false,
    financing: {
      ...manifest.financing,
      scenarios: manifest.financing.scenarios.map((scenario) => ({
        ...scenario,
        quote: { ...scenario.quote, confirmed: false },
      })),
    },
  };
}

export async function readFinancingFormContext(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): Promise<FinancingFormContext> {
  const canSave = principal.role === "location_admin" || principal.role === "campaign_creator";
  if (!canSave)
    return {
      canSave: false,
      brandReady: false,
      brandName: "",
      synthetic: false,
      partners: [],
      previous: [],
    };
  const context = await readFinancingContext(principal, environment);
  const records = await createCampaignPersistenceAdapter(
    principal,
    environment,
  ).readRepository.listForLocation();
  const previous = records
    .filter((record) => record.version.createdBy === principal.actorRef)
    .sort((a, b) => b.version.createdAt.localeCompare(a.version.createdAt))
    .flatMap((record) =>
      record.version.manifest.blueprintId === "financing-comparison"
        ? [
            {
              campaignRef: record.version.campaignRef,
              label: record.version.manifest.property.address,
              input: reusableFinancingInput(verifyFinancingVersion(record.version)),
            },
          ]
        : [],
    )
    .slice(0, 20);
  return {
    canSave,
    brandReady: context.brand !== null && context.lender !== null,
    brandName: context.brand?.name ?? "",
    synthetic: principal.authenticationMode === "local_synthetic",
    partners: context.partners.map(({ id, name, company }) => ({ id, name, company })),
    previous,
  };
}
