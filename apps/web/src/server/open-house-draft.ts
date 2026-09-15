import { randomUUID } from "node:crypto";

import {
  assertMayExecuteCampaignMutation,
  createCampaignVersion,
  runCampaignPreflight,
  type AuthenticatedPrincipal,
} from "@oalo/application";
import { z } from "zod";

import { UnauthenticatedPrincipalError } from "./authenticated-principal.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";

const OpenHouseDraftInputSchema = z
  .object({
    address: z.string().trim().min(3).max(1_000),
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/u),
    propertyDescription: z.string().trim().min(10).max(10_000),
    openHouseStartsAt: z.iso.datetime({ offset: true }),
    openHouseEndsAt: z.iso.datetime({ offset: true }),
    realtorDisplayName: z.string().trim().min(2).max(300),
    headline: z.string().trim().min(3).max(500),
    body: z.string().trim().min(10).max(20_000),
    callToAction: z.string().trim().min(2).max(160),
    disclosureText: z.string().trim().max(20_000),
    consentText: z.string().trim().max(20_000),
    region: z.string().trim().min(2).max(100),
    dailyBudgetDollars: z.number().min(5).max(1_000),
    totalBudgetDollars: z.number().min(5).max(5_000),
    propertyPermissionConfirmed: z.boolean(),
    realtorPermissionConfirmed: z.boolean(),
  })
  .strict();

export type OpenHouseDraftInput = z.infer<typeof OpenHouseDraftInputSchema>;

function ref(prefix: string, id: string): string {
  return `${prefix}_${id}`;
}

export async function compileOpenHouseDraft(
  untrustedInput: unknown,
  principal: AuthenticatedPrincipal,
  environment: unknown = process.env,
) {
  const mode = authenticatedWorkspaceMode(environment);
  if (principal.authenticationMode === "local_synthetic" && mode !== "synthetic") {
    throw new UnauthenticatedPrincipalError();
  }
  assertMayExecuteCampaignMutation(principal);
  const input = OpenHouseDraftInputSchema.parse(untrustedInput);
  const id = randomUUID().replaceAll("-", "");
  const createdAt = new Date();
  const rulesetVersionRef = "ruleset_openHouseFounding001";
  const campaignRef = ref("campaign", id);
  const campaignVersionRef = ref("campaignversion", id);

  const repository = {
    async run<T>(
      work: (transaction: {
        getByCampaignVersionRef(
          locationRef: string,
          campaignVersionRef: string,
        ): Promise<undefined>;
        getLatestVersionNo(locationRef: string, campaignRef: string): Promise<number>;
        append(version: unknown): Promise<void>;
      }) => Promise<T>,
    ): Promise<T> {
      return work({
        async getByCampaignVersionRef() {
          return undefined;
        },
        async getLatestVersionNo() {
          return 0;
        },
        async append() {
          return undefined;
        },
      });
    },
  };

  const version = await createCampaignVersion(
    {
      createdAt,
      version: {
        schemaVersion: 1,
        locationRef: principal.locationRef,
        campaignRef,
        campaignVersionRef,
        inputVersions: {
          blueprintVersionRef: "blueprint_openHouseBoost001",
          brandProfileVersionRef: "brandprofile_local001",
          complianceProfileVersionRef: "complianceprofile_local001",
          partnerProfileVersionRef: "partnerprofile_local001",
          routingProfileVersionRef: "routingprofile_local001",
          rulesetVersionRef,
        },
        manifest: {
          schemaVersion: 1,
          blueprintId: "open-house-boost",
          property: {
            address: input.address,
            description: input.propertyDescription,
            openHouseStartsAt: input.openHouseStartsAt,
            openHouseEndsAt: input.openHouseEndsAt,
            stateCode: input.stateCode,
            permissionConfirmed: input.propertyPermissionConfirmed,
          },
          content: {
            headline: input.headline,
            callToAction: input.callToAction,
            disclosureText: input.disclosureText,
            consentText: input.consentText,
            body: input.body,
            claims: [],
            mergeTokens: [],
            financingTerms: [],
          },
          images: [
            {
              assetRef: "asset_propertyPlaceholder001",
              approvalStatus: "approved",
              width: 1600,
              height: 1200,
              altText: `Property image placeholder for ${input.address}`,
            },
          ],
          partner: {
            realtorDisplayName: input.realtorDisplayName,
            permissionConfirmed: input.realtorPermissionConfirmed,
          },
          artifacts: {
            pageVersionRef: ref("pageversion", id),
            pdfVersionRef: ref("pdfversion", id),
            creativeVersionRef: ref("creativeversion", id),
            copyVersionRef: ref("copyversion", id),
            emailPackageVersionRef: ref("emailpackageversion", id),
            smsPackageVersionRef: ref("smspackageversion", id),
            disclosureVersionRef: ref("disclosureversion", id),
            formVersionRef: ref("formversion", id),
            destinationVersionRef: ref("destinationversion", id),
            qrDestinationVersionRef: ref("qrdestinationversion", id),
          },
          meta: {
            enabled: true,
            specialAdCategory: "HOUSING",
            platform: "meta",
            targeting: {
              country: "US",
              regions: [input.region],
              zipCodes: [],
              customAudienceRefs: [],
              protectedDimensions: [],
            },
            dailyBudgetMinor: Math.round(input.dailyBudgetDollars * 100),
            totalBudgetMinor: Math.round(input.totalBudgetDollars * 100),
          },
          routing: {
            mappingVersionRef: "routingmapping_local001",
            validationStatus: "valid",
          },
        },
        createdBy: principal.actorRef,
      },
    },
    repository,
  );

  const preflight = runCampaignPreflight(version, {
    schemaVersion: 1,
    rulesetVersionRef,
    evaluatedAt: createdAt.toISOString(),
    minimumImageWidth: 1200,
    minimumImageHeight: 630,
    earliestStartAt: createdAt.toISOString(),
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100_000,
    maximumTotalBudgetMinor: 500_000,
    warnings: [],
  });

  return Object.freeze({ version, preflight });
}
