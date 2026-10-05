import { createHash } from "node:crypto";

import {
  assertMayExecuteCampaignMutation,
  canonicalCampaignHash,
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignVersionRepository,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import type { CampaignVersion, PreflightResult } from "@oalo/contracts";

import { PropertyCampaignRequestSchema } from "../features/property-campaigns/model.js";
import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import {
  propertyCampaignBrandIdentity,
  readPropertyCampaignContext,
  type PropertyCampaignContext,
} from "./property-campaign-context.js";

export class PropertyCampaignSaveError extends Error {
  constructor(
    public readonly code:
      | "PROPERTY_CAMPAIGN_BRAND_REQUIRED"
      | "PROPERTY_CAMPAIGN_PARTNER_NOT_FOUND"
      | "PROPERTY_CAMPAIGN_SAVE_CONFLICT"
      | "PROPERTY_CAMPAIGN_EVENT_IN_PAST",
    public readonly status: 400 | 404 | 409,
  ) {
    super(code);
    this.name = "PropertyCampaignSaveError";
  }
}

export interface PropertyCampaignSaveDependencies {
  readonly versionRepository: CampaignVersionRepository;
  readonly readRepository: CampaignWorkspaceReadRepository;
  readonly readContext?: () => Promise<PropertyCampaignContext>;
  readonly now?: () => Date;
}

interface SavedPropertyCampaign {
  readonly version: CampaignVersion;
  readonly preflight: PreflightResult;
}

/** REC-004: the browser's retry key is scoped to both the verified tenant and actor. */
function scopedId(principal: Readonly<AuthenticatedPrincipal>, requestId: string): string {
  return createHash("sha256")
    .update(`${principal.locationRef}:${principal.actorRef}:${requestId}`)
    .digest("hex")
    .slice(0, 32);
}

export async function savePropertyCampaign(
  untrustedInput: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  dependencies: PropertyCampaignSaveDependencies,
): Promise<SavedPropertyCampaign> {
  if (
    principal.authenticationMode === "local_synthetic" &&
    authenticatedWorkspaceMode(environment) !== "synthetic"
  ) {
    throw new UnauthenticatedPrincipalError();
  }
  assertMayExecuteCampaignMutation(principal);
  const input = PropertyCampaignRequestSchema.parse(untrustedInput);
  const requestHash = canonicalCampaignHash(input);
  const id = scopedId(principal, input.requestId);
  const campaignRef = `campaign_${id}`;
  const existing = await dependencies.readRepository.getByCampaignRef(campaignRef);
  if (existing !== undefined) {
    const manifest = existing.version.manifest;
    if (
      manifest.blueprintId !== "open-house-boost" ||
      manifest.preparation?.requestHash !== requestHash
    ) {
      throw new PropertyCampaignSaveError("PROPERTY_CAMPAIGN_SAVE_CONFLICT", 409);
    }
    // A retry returns the already-frozen identity, not a fresh read of Brand or partner settings.
    return { version: existing.version, preflight: existing.preflight };
  }

  const createdAt = (dependencies.now ?? (() => new Date()))();
  if (Date.parse(input.startsAt) <= createdAt.getTime()) {
    throw new PropertyCampaignSaveError("PROPERTY_CAMPAIGN_EVENT_IN_PAST", 400);
  }
  const context = await (
    dependencies.readContext ?? (() => readPropertyCampaignContext(principal, environment))
  )();
  const brand = propertyCampaignBrandIdentity(context.brand);
  if (!context.brand.saved || !brand.success) {
    throw new PropertyCampaignSaveError("PROPERTY_CAMPAIGN_BRAND_REQUIRED", 400);
  }
  const partner = context.partners.find((candidate) => candidate.id === input.partnerId);
  if (partner === undefined) {
    throw new PropertyCampaignSaveError("PROPERTY_CAMPAIGN_PARTNER_NOT_FOUND", 404);
  }

  const rulesetVersionRef = "ruleset_openHouseFounding001";
  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef,
        campaignVersionRef: `campaignversion_${id}`,
        createdBy: principal.actorRef,
        inputVersions: {
          blueprintVersionRef: "blueprint_propertyPreparation001",
          brandProfileVersionRef: context.brand.brandProfileVersionRef,
          complianceProfileVersionRef: "complianceprofile_unverified001",
          partnerProfileVersionRef: `partnerprofile_${canonicalCampaignHash({ id: partner.id, name: partner.name, company: partner.company }).slice(0, 40)}`,
          routingProfileVersionRef: "routingprofile_unconfigured001",
          rulesetVersionRef,
        },
        manifest: {
          schemaVersion: 1,
          blueprintId: "open-house-boost",
          preparation: {
            schemaVersion: 1,
            status: "draft",
            requestHash,
            brand: brand.data,
            partnerRecordId: partner.id,
            partnerCompany: partner.company,
          },
          property: {
            address: input.address,
            stateCode: input.stateCode,
            description: input.description,
            openHouseStartsAt: input.startsAt,
            openHouseEndsAt: input.endsAt,
            permissionConfirmed: input.propertyPermissionConfirmed,
          },
          partner: {
            realtorDisplayName: partner.name,
            permissionConfirmed: input.realtorPermissionConfirmed,
          },
          content: {
            headline: `Property campaign: ${input.address}`,
            body: input.description,
            callToAction: "Get property details",
            disclosureText: context.brand.band.disclosureLine,
            consentText: context.brand.leadFormWording,
            claims: [],
            mergeTokens: [],
            financingTerms: [],
          },
          images: [],
          // These are reserved destinations in the legacy manifest, NOT rendered-output records.
          // Batch A produces no GenerationRecord, public URL, PDF, QR code, or approved creative.
          artifacts: {
            pageVersionRef: `pageversion_${id}`,
            pdfVersionRef: `pdfversion_${id}`,
            creativeVersionRef: `creativeversion_${id}`,
            copyVersionRef: `copyversion_${id}`,
            emailPackageVersionRef: `emailpackageversion_${id}`,
            smsPackageVersionRef: `smspackageversion_${id}`,
            disclosureVersionRef: `disclosureversion_${id}`,
            formVersionRef: `formversion_${id}`,
            destinationVersionRef: `destinationversion_${id}`,
            qrDestinationVersionRef: `qrdestinationversion_${id}`,
          },
          meta: {
            enabled: false,
            specialAdCategory: "HOUSING",
            platform: "meta",
            targeting: {
              country: "US",
              regions: [],
              zipCodes: [],
              customAudienceRefs: [],
              protectedDimensions: [],
            },
            dailyBudgetMinor: 0,
            totalBudgetMinor: 0,
          },
          routing: {
            mappingVersionRef: "routingmapping_unconfigured001",
            validationStatus: "missing",
          },
        },
      },
    },
    dependencies.versionRepository,
  );

  const preflight = runCampaignPreflight(version, {
    schemaVersion: 1,
    rulesetVersionRef,
    evaluatedAt: version.createdAt,
    earliestStartAt: version.createdAt,
    minimumImageWidth: 1200,
    minimumImageHeight: 630,
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
  });
  return { version, preflight };
}
