import { z } from "zod";
import {
  WebinarPublisherNativeIdSchema as Id,
  WebinarPublisherPublicUrlSchema as Url,
} from "@oalo/contracts";

export const WebinarPublisherStatusSchema = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHING",
  "PUBLISHED",
  "PAUSED",
  "IN_REVIEW",
  "WITH_ISSUES",
  "REJECTED",
  "ARCHIVED",
  "FAILED",
]);
const Variant = z.object({ text: z.string().max(5000) });
const Media = z
  .object({ src: Url, type: z.literal("image"), name: z.string().max(300).optional() })
  .strict();
const MediaResponse = Media.extend({ _id: Id.optional() }).transform(
  ({ _id: _discarded, ...value }) => value,
);
const Geo = z
  .object({
    key: Id,
    name: z.string().max(300),
    type: z.enum(["region", "city"]),
    selectionType: z.enum(["include", "exclude"]),
    countryCode: z.literal("US").optional(),
  })
  .strict();
const Budget = z.object({
  budgetType: z.literal("DAILY"),
  amount: z.number().positive().finite(),
  scheduleEndDate: z.string().min(1).max(100),
});
const Audience = z
  .object({
    geoLocations: z.array(Geo).min(1).max(50),
    placementType: z.literal("manual"),
    placements: z.object({ facebook: z.tuple([z.literal("feed")]) }).strict(),
  })
  .strict();
const Campaign = z.object({
  id: Id,
  name: z.string().max(120),
  locationId: Id,
  fbAdAccountId: z.string().regex(/^act_[0-9]+$/u),
  fbCampaignId: Id.optional(),
  objective: z.string().max(100),
  specialAdCategories: z.array(z.string().max(100)).max(10),
  publishingStatus: WebinarPublisherStatusSchema,
});
const Ad = z.object({
  id: Id,
  campaignId: Id,
  adsetId: Id,
  name: z.string().max(120),
  fbAdId: Id.optional(),
  publishingStatus: WebinarPublisherStatusSchema,
  mediaType: z.literal("SINGLE"),
  cta: z.string().max(100),
  multiAdvertiserAds: z.boolean(),
  primaryTexts: z.array(Variant).max(10),
  headlines: z.array(Variant).max(10),
  descriptions: z.array(Variant).max(10),
  media: z.array(MediaResponse).max(10),
  destinationLink: Url.nullable(),
  unpublishedChanges: z.boolean().optional(),
});
const Adset = z.object({
  id: Id,
  name: z.string().max(120),
  campaignId: Id,
  fbAdSetId: Id.optional(),
  publishingStatus: WebinarPublisherStatusSchema,
  pageId: Id,
  budget: Budget,
  audience: Audience,
  unpublishedChanges: z.boolean().optional(),
});
const Linked = Campaign.extend({
  adsets: z.array(Adset.extend({ ads: z.array(Ad).max(100) })).max(100),
});
const DecimalString = z
  .string()
  .max(32)
  .regex(/^\d+(?:\.\d+)?$/u)
  .refine((value) => Number.isFinite(Number(value)) && Number(value) <= Number.MAX_SAFE_INTEGER);

const Page = z.object({ id: Id, name: z.string().max(300), isConnected: z.boolean() });
export const WebinarPublisherResponseSchemas = {
  integration: z.object({
    locationId: Id,
    status: z.enum(["connected", "expired", "disconnected"]),
    pricingModel: z.enum(["done_for_you", "connect_your_bm"]),
    fbAdAccountId: z
      .string()
      .regex(/^act_[0-9]+$/u)
      .optional(),
    fbDefaultPageId: Id.optional(),
    pages: z.array(z.object({ id: Id, name: z.string().max(300) })).max(1000),
  }),
  accounts: z
    .array(
      z.object({
        id: z.string().regex(/^act_[0-9]+$/u),
        name: z.string().max(300),
        accountStatus: z.string().max(100),
        currency: z.string().regex(/^[A-Z]{3}$/u),
        fundingType: z.string().max(100),
        integrationConnected: z.boolean(),
      }),
    )
    .max(1000),
  account: z.object({
    id: z.string().regex(/^act_[0-9]+$/u),
    name: z.string().max(300),
    accountStatus: z.string().max(100),
    currency: z.string().regex(/^[A-Z]{3}$/u),
    fundingType: z.string().max(100),
    timezoneName: z.string().max(100),
  }),
  pages: z.union([
    z.array(Page).max(1000),
    z.object({
      pages: z.array(Page).max(50),
      paging: z.object({ next: z.string().max(2048).optional() }),
    }),
  ]),
  geography: z
    .array(
      z.object({
        key: Id,
        name: z.string().max(300),
        type: z.string().max(100),
        country_code: z
          .string()
          .regex(/^[A-Z]{2}$/u)
          .optional(),
      }),
    )
    .max(1000),
  campaign: Campaign,
  adset: Adset,
  ad: Ad,
  linked: Linked,
  publish: Linked,
  progress: z.object({
    campaignId: Id,
    publishingStatus: WebinarPublisherStatusSchema,
    total: z.number().int().nonnegative(),
    processed: z.number().int().nonnegative(),
    isComplete: z.boolean(),
    hasFailed: z.boolean(),
  }),
  pause: z.object({ success: z.literal(true) }),
  resume: z.object({ success: z.literal(true) }),
  upload: z.object({ fileId: Id, url: Url }),
  reporting: z.object({
    _id: Id,
    name: z.string().max(120),
    objective: z.string().max(100),
    publishingStatus: WebinarPublisherStatusSchema,
    fbCampaignId: Id,
    clicks: DecimalString.optional(),
    impressions: DecimalString.optional(),
    spend: DecimalString.optional(),
    reach: DecimalString.optional(),
    frequency: DecimalString.optional(),
    cpc: DecimalString.optional(),
    cpm: DecimalString.optional(),
    ctr: DecimalString.optional(),
    conversions: DecimalString.optional(),
    costPerConversion: DecimalString.optional(),
    leads: DecimalString.optional(),
    results: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,63}$/u), DecimalString).optional(),
  }),
} as const;
export type WebinarPublisherResponseOperation = keyof typeof WebinarPublisherResponseSchemas;

export function decodeWebinarPublisherResponse(
  operation: WebinarPublisherResponseOperation,
  raw: unknown,
  expected: Readonly<{
    locationId: string;
    campaignId?: string;
    adsetId?: string;
    adAccountId?: string;
  }>,
): unknown {
  // Zod object schemas strip every unknown property, including page accessToken.
  const decoded = WebinarPublisherResponseSchemas[operation].parse(raw);
  const object = decoded as Record<string, unknown>;
  if (object.locationId !== undefined && object.locationId !== expected.locationId)
    throw new Error("Webinar provider location mismatch.");
  if (
    expected.adAccountId !== undefined &&
    (object.fbAdAccountId ?? (operation === "account" ? object.id : undefined)) !==
      expected.adAccountId
  )
    throw new Error("Webinar provider account mismatch.");
  if (expected.campaignId !== undefined && operation !== "pause" && operation !== "resume") {
    const id =
      operation === "reporting"
        ? object._id
        : ["linked", "publish", "campaign"].includes(operation)
          ? object.id
          : object.campaignId;
    if (id !== expected.campaignId) throw new Error("Webinar provider campaign mismatch.");
  }
  if (expected.adsetId !== undefined && object.adsetId !== expected.adsetId)
    throw new Error("Webinar provider adset mismatch.");
  return decoded;
}

export const WebinarPublisherCampaignRequestSchema = z
  .object({
    locationId: Id,
    id: Id.optional(),
    name: z.string().min(1).max(120),
    objective: z.literal("OUTCOME_TRAFFIC"),
    specialAdCategories: z.tuple([z.literal("HOUSING")]),
    isCampaignBudget: z.literal(false),
    adsetBudgetSharing: z.literal(false),
  })
  .strict();
export const WebinarPublisherAdsetRequestSchema = z
  .object({
    locationId: Id,
    id: Id.optional(),
    name: z.string().min(1).max(120),
    campaignId: Id,
    pageId: Id,
    audience: Audience.strict()
      .extend({
        geoLocations: z.array(Geo.strict()).min(1).max(50),
        placements: Audience.shape.placements.strict(),
      })
      .strict(),
    budget: Budget.strict(),
  })
  .strict();
export const WebinarPublisherAdRequestSchema = z
  .object({
    locationId: Id,
    id: Id.optional(),
    name: z.string().min(1).max(120),
    campaignId: Id,
    adsetId: Id,
    mediaType: z.literal("SINGLE"),
    media: z.tuple([Media.strict()]),
    multiAdvertiserAds: z.literal(false),
    primaryTexts: z.tuple([Variant.strict()]),
    headlines: z.tuple([Variant.strict()]),
    descriptions: z.tuple([Variant.strict()]),
    cta: z.literal("LEARN_MORE"),
    destinationLink: Url,
  })
  .strict();
