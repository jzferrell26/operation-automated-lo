import { OpaqueReferenceSchema, US_STATES } from "@oalo/contracts";
import { z } from "zod";

/** Preparation accepts facts and attestations, never authority, brand identity, or a launch command. */
export const PropertyCampaignRequestSchema = z
  .object({
    requestId: z.uuid(),
    address: z.string().trim().min(3).max(300),
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine((code) => Object.hasOwn(US_STATES, code)),
    description: z.string().trim().min(10).max(3000),
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    partnerId: z.uuid(),
    propertyPermissionConfirmed: z.boolean(),
    realtorPermissionConfirmed: z.boolean(),
  })
  .strict()
  .refine((value) => Date.parse(value.endsAt) > Date.parse(value.startsAt), {
    path: ["endsAt"],
    message: "The open house must end after it starts.",
  });

export type PropertyCampaignRequest = z.infer<typeof PropertyCampaignRequestSchema>;

export const PropertyCampaignSavedSchema = z
  .object({
    campaignRef: OpaqueReferenceSchema.regex(/^campaign_[a-f0-9]{32}$/u),
    versionNo: z.number().int().positive(),
    providerPublicationAuthorized: z.literal(false),
  })
  .strict();

export interface PropertyCampaignFormData {
  readonly canSave: boolean;
  readonly synthetic: boolean;
  readonly brandReady: boolean;
  readonly brandName: string;
  readonly partners: readonly Readonly<{ id: string; name: string; company: string }>[];
}

export const PROPERTY_CAMPAIGN_PATH = "/marketing/campaigns/property";
export const PROPERTY_CAMPAIGN_API_PATH = "/api/campaigns/property";
