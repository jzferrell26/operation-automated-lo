import {
  FinancingInputSchema,
  FinancingPropertyFactsSchema,
  FinancingMediaRefSchema,
  FinancingMediaAltTextSchema,
  OpaqueReferenceSchema,
  US_STATES,
  type FinancingCampaignManifest,
} from "@oalo/contracts";
import { z } from "zod";

export const FINANCING_CREATE_PATH = "/marketing/campaigns/financing";
export const FINANCING_API_PATH = "/api/campaigns/property/financing";

/** Show only recognized corrections from the response, never arbitrary server text. */
export const FinancingCorrectionSchema = z
  .object({
    error: z.enum([
      "FINANCING_INVALID",
      "FINANCING_QUOTE_IN_FUTURE",
      "FINANCING_BRAND_REQUIRED",
      "FINANCING_PARTNER_MISSING",
    ]),
  })
  .passthrough();
export const FinancingRequestV1Schema = z
  .object({
    requestId: z.uuid(),
    address: z.string().trim().min(3).max(300),
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine((code) => Object.hasOwn(US_STATES, code)),
    description: z.string().trim().min(10).max(1800),
    partnerId: z.uuid(),
    propertyPermissionConfirmed: z.boolean(),
    realtorPermissionConfirmed: z.boolean(),
    financing: FinancingInputSchema,
  })
  .strict();
export const FinancingMediaPlacementsSchema = z
  .array(
    z
      .object({
        mediaRef: FinancingMediaRefSchema,
        altText: FinancingMediaAltTextSchema,
      })
      .strict(),
  )
  .max(6)
  .refine((items) => new Set(items.map((item) => item.mediaRef)).size === items.length);
export const FinancingRequestV2Schema = FinancingRequestV1Schema.extend({
  schemaVersion: z.literal(2),
  propertyFacts: FinancingPropertyFactsSchema,
  propertyMedia: FinancingMediaPlacementsSchema,
}).strict();
export const FinancingRequestSchema = z.union([FinancingRequestV1Schema, FinancingRequestV2Schema]);
export type FinancingRequest = z.infer<typeof FinancingRequestSchema>;
export type ReusableFinancingInput =
  | Omit<z.infer<typeof FinancingRequestV1Schema>, "requestId">
  | (Omit<z.infer<typeof FinancingRequestV2Schema>, "requestId" | "propertyFacts"> & {
      propertyFacts: Omit<z.infer<typeof FinancingPropertyFactsSchema>, "confirmed"> & {
        confirmed: boolean;
      };
    });
export const FinancingSavedSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema.regex(/^campaign_[a-f0-9]{32}$/u),
    campaignVersionRef: OpaqueReferenceSchema.regex(/^campaignversion_[a-f0-9]{32}$/u),
    providerPublicationAuthorized: z.literal(false),
  })
  .strict();

export interface FinancingFormContext {
  readonly canSave: boolean;
  readonly synthetic: boolean;
  readonly brandReady: boolean;
  readonly brandName: string;
  readonly partners: readonly Readonly<{ id: string; name: string; company: string }>[];
  readonly previous: readonly Readonly<{
    campaignRef: string;
    label: string;
    input: ReusableFinancingInput;
  }>[];
  readonly unavailablePrevious?: readonly Readonly<{ campaignRef: string; label: string }>[];
}

export interface FinancingReportView {
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly versionNo: number;
  readonly createdAt: string;
  readonly manifest: FinancingCampaignManifest;
}

export function financingOutputPath(
  report: Pick<FinancingReportView, "campaignRef" | "campaignVersionRef">,
  output: "site" | "flyer",
) {
  return `${FINANCING_API_PATH}/${encodeURIComponent(report.campaignRef)}/${encodeURIComponent(report.campaignVersionRef)}/${output}`;
}
