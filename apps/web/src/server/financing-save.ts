import { createHash } from "node:crypto";
import {
  assertMayExecuteCampaignMutation,
  calculateFinancingComparison,
  canonicalCampaignHash,
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
  type CampaignVersionRepository,
  type CampaignWorkspaceReadRepository,
} from "@oalo/application";
import { FinancingResultsSchema, type FinancingCampaignManifest } from "@oalo/contracts";
import { FinancingRequestSchema } from "../features/financing/model.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";
import { readFinancingContext, type FinancingContext } from "./financing-context.js";
import { FinancingSaveError, verifyFinancingVersion } from "./financing-verification.js";
export { FinancingSaveError, verifyFinancingVersion } from "./financing-verification.js";

export async function saveFinancingComparison(
  raw: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  dependencies: {
    readonly versions: CampaignVersionRepository;
    readonly campaigns: CampaignWorkspaceReadRepository;
    readonly context?: () => Promise<FinancingContext>;
    readonly now?: () => Date;
  },
) {
  if (
    principal.authenticationMode === "local_synthetic" &&
    authenticatedWorkspaceMode(environment) !== "synthetic"
  )
    throw new UnauthenticatedPrincipalError();
  assertMayExecuteCampaignMutation(principal);
  const input = FinancingRequestSchema.parse(raw);
  const requestHash = canonicalCampaignHash(input);
  const id = createHash("sha256")
    .update(`financing:${principal.locationRef}:${principal.actorRef}:${input.requestId}`)
    .digest("hex")
    .slice(0, 32);
  const campaignRef = `campaign_${id}`;
  const prior = await dependencies.campaigns.getByCampaignRef(campaignRef);
  if (prior) {
    const manifest = verifyFinancingVersion(prior.version);
    if (manifest.preparation.requestHash !== requestHash)
      throw new FinancingSaveError("FINANCING_SAVE_CONFLICT", 409);
    return { version: prior.version, preflight: prior.preflight };
  }
  const now = (dependencies.now ?? (() => new Date()))();
  if (
    input.financing.scenarios.some(
      (scenario) => Date.parse(scenario.quote.quotedAt) > now.getTime(),
    )
  )
    throw new FinancingSaveError("FINANCING_QUOTE_IN_FUTURE", 400);
  const calculated = FinancingResultsSchema.parse(calculateFinancingComparison(input.financing));
  const context = await (
    dependencies.context ?? (() => readFinancingContext(principal, environment))
  )();
  if (!context.brand || !context.lender)
    throw new FinancingSaveError("FINANCING_BRAND_REQUIRED", 400);
  const partner = context.partners.find((item) => item.id === input.partnerId);
  if (!partner) throw new FinancingSaveError("FINANCING_PARTNER_MISSING", 404);
  const rulesetVersionRef = "ruleset_financingDraft001";
  const manifest: FinancingCampaignManifest = {
    schemaVersion: 1,
    blueprintId: "financing-comparison",
    templateVersion: "1.0.0",
    reviewOnly: true,
    preparation: {
      schemaVersion: 1,
      status: "draft",
      requestHash,
      brand: context.brand,
      partnerRecordId: partner.id,
      partnerCompany: partner.company,
    },
    property: {
      address: input.address,
      description: input.description,
      stateCode: input.stateCode,
      permissionConfirmed: input.propertyPermissionConfirmed,
    },
    partner: {
      realtorDisplayName: partner.name,
      permissionConfirmed: input.realtorPermissionConfirmed,
    },
    identities: {
      lender: context.lender,
      realtor: {
        name: partner.name,
        company: partner.company,
        phone: partner.phone,
        email: partner.email,
        license: "",
      },
    },
    financing: input.financing,
    calculated,
    content: {
      headline: `Financing comparison: ${input.address}`,
      body: input.description,
      callToAction: "Review financing comparison",
      disclosureText: context.disclosure,
      consentText: "No public lead collection is available for this private illustration.",
      claims: [],
      mergeTokens: [],
      financingTerms: [],
    },
    images: [],
    meta: {
      enabled: false,
      platform: "meta",
      specialAdCategory: "HOUSING",
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
    routing: { mappingVersionRef: "routingmapping_unconfigured001", validationStatus: "missing" },
  };
  const version = await createCampaignVersion(
    {
      createdAt: now,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef,
        campaignVersionRef: `campaignversion_${id}`,
        createdBy: principal.actorRef,
        inputVersions: {
          blueprintVersionRef: "blueprint_financingComparison001",
          brandProfileVersionRef: context.brandProfileRef,
          partnerProfileVersionRef: `partnerprofile_${canonicalCampaignHash(manifest.identities.realtor).slice(0, 40)}`,
          complianceProfileVersionRef: "complianceprofile_unverified001",
          routingProfileVersionRef: "routingprofile_unconfigured001",
          rulesetVersionRef,
        },
        manifest,
      },
    },
    dependencies.versions,
  );
  const preflight = runCampaignPreflight(version, {
    schemaVersion: 1,
    rulesetVersionRef,
    evaluatedAt: version.createdAt,
    earliestStartAt: version.createdAt,
    minimumImageWidth: 1200,
    minimumImageHeight: 630,
    allowedMergeTokens: [],
    bannedPhrases: [],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
  });
  return { version, preflight };
}
