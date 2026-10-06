import {
  FinancingInputSchema,
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
export const FinancingRequestSchema = z
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
export type FinancingRequest = z.infer<typeof FinancingRequestSchema>;
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
    input: Omit<FinancingRequest, "requestId">;
  }>[];
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
