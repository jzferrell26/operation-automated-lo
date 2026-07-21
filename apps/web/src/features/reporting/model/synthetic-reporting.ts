import { z } from "zod";

import {
  deepFreeze,
  runtimeSafetySchema,
  type DeepReadonly,
} from "../../ui-foundation/model/synthetic-ui.js";

const isoTimestamp = z.string().datetime({ offset: true });

const campaignHistoryEntrySchema = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(["approved", "superseded"]),
    recordedAt: isoTimestamp,
    summary: z.string().min(1),
  })
  .strict();

const artifactCommonShape = {
  id: z.string().startsWith("synthetic-artifact-"),
  label: z.string().min(1),
  version: z.number().int().positive(),
  previewTitle: z.string().min(1),
  previewSummary: z.string().min(1),
  sourceProfileVersion: z.string().min(1),
} as const;

const artifactVersionSchema = z.discriminatedUnion("status", [
  z
    .object({
      ...artifactCommonShape,
      status: z.literal("approved"),
      publicHref: z.string().startsWith("/public/"),
    })
    .strict(),
  z
    .object({
      ...artifactCommonShape,
      status: z.literal("superseded"),
    })
    .strict(),
]);

const creativeSchema = z
  .object({
    id: z.string().startsWith("synthetic-creative-"),
    label: z.string().min(1),
    placement: z.enum(["feed", "story"]),
    version: z.string().startsWith("creative-v"),
    previewHref: z.string().startsWith("/synthetic-assets/"),
    downloadHref: z.string().startsWith("/synthetic-assets/"),
    downloadFileName: z.string().endsWith(".svg"),
    mimeType: z.literal("image/svg+xml"),
    dimensions: z.string().regex(/^\d+x\d+$/u),
  })
  .strict();

const exactMetaAssetSchema = (
  kind: "ad_account" | "page" | "instagram_identity" | "lead_form" | "pixel",
  optional: boolean,
) =>
  z
    .object({
      kind: z.literal(kind),
      label: z.string().min(1),
      providerId: z.string().startsWith("synthetic-provider-"),
      displayName: z.string().min(1),
      selection: z.literal("selected"),
      optional: z.literal(optional),
    })
    .strict();

const approvalSnapshotSchema = z
  .object({
    status: z.literal("approved"),
    campaignVersion: z.number().int().positive(),
    approvedAt: isoTimestamp,
    approver: z.string().min(1),
    versions: z
      .object({
        page: z.string().min(1),
        pdf: z.string().min(1),
        creative: z.string().min(1),
        copy: z.string().min(1),
        disclosure: z.string().min(1),
        targeting: z.string().min(1),
        budget: z.string().min(1),
        dates: z.string().min(1),
        form: z.string().min(1),
        destination: z.string().min(1),
      })
      .strict(),
  })
  .strict();

const launchSummarySchema = z
  .object({
    policyClassification: z.string().min(1),
    targets: z.array(z.string().min(1)).min(1),
    exclusions: z.array(z.string().min(1)).min(1),
    budget: z
      .object({
        amount: z.number().positive(),
        currency: z.literal("USD"),
        cadence: z.literal("daily"),
      })
      .strict(),
    schedule: z
      .object({
        startDate: z.string().date(),
        endDate: z.string().date(),
        timezone: z.string().min(1),
      })
      .strict(),
    confirmation: z
      .object({
        title: z.string().min(1),
        effect: z.string().min(1),
        result: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export const syntheticCampaignSchema = z
  .object({
    id: z.string().startsWith("synthetic-campaign-"),
    title: z.string().min(1),
    propertyLabel: z.string().min(1),
    currentVersion: z.number().int().positive(),
    history: z.array(campaignHistoryEntrySchema).min(2),
    artifacts: z.array(artifactVersionSchema).min(2),
    creatives: z.array(creativeSchema).min(2),
    metaConnection: z
      .object({
        activeLocationId: z.string().startsWith("synthetic-location-"),
        activeLocationName: z.string().min(1),
        state: z.literal("connected"),
        source: z.string().min(1),
        freshness: z.string().min(1),
        assets: z.tuple([
          exactMetaAssetSchema("ad_account", false),
          exactMetaAssetSchema("page", false),
          exactMetaAssetSchema("instagram_identity", true),
          exactMetaAssetSchema("lead_form", false),
          exactMetaAssetSchema("pixel", false),
        ]),
      })
      .strict(),
    approvalSnapshot: approvalSnapshotSchema,
    launchSummary: launchSummarySchema,
  })
  .strict();

const authorizedLocationSchema = z
  .object({
    state: z.literal("authorized"),
    id: z.string().startsWith("synthetic-location-"),
    displayName: z.string().min(1),
    authorizationSource: z.string().min(1),
    campaigns: z.number().int().nonnegative(),
    exceptions: z.number().int().nonnegative(),
    exceptionHref: z.string().startsWith("#"),
    campaignHref: z.string().startsWith("/marketing/campaigns/"),
  })
  .strict();

const restrictedLocationSchema = z
  .object({
    state: z.literal("restricted"),
    label: z.literal("Location not included"),
    reason: z.string().min(1),
  })
  .strict();

const reportingSchema = z
  .object({
    safety: runtimeSafetySchema,
    campaign: syntheticCampaignSchema,
    supportEntry: z
      .object({
        activityOptions: z
          .array(z.enum(["Setup guidance", "Campaign review", "Exception triage"]))
          .length(3),
        defaultMinutes: z.number().int().positive().multipleOf(5),
      })
      .strict(),
    portfolio: z
      .object({
        title: z.string().min(1),
        source: z.string().min(1),
        freshness: z.string().min(1),
        authorizedLocationCount: z.number().int().nonnegative(),
        totalCampaigns: z.number().int().nonnegative(),
        totalExceptions: z.number().int().nonnegative(),
        locations: z.array(
          z.discriminatedUnion("state", [authorizedLocationSchema, restrictedLocationSchema]),
        ),
      })
      .strict(),
  })
  .strict();

const rawSyntheticReporting: unknown = {
  safety: {
    dataMode: "synthetic",
    writesEnabled: false,
    disclosure:
      "Synthetic reporting workspace. Provider reads, provider writes, and saved support records are disabled.",
  },
  campaign: {
    id: "synthetic-campaign-open-house-001",
    title: "Cedar Street Open House Boost",
    propertyLabel: "214 Cedar Street",
    currentVersion: 3,
    history: [
      {
        version: 1,
        status: "superseded",
        recordedAt: "2026-07-21T11:00:00.000Z",
        summary: "Initial synthetic property package.",
      },
      {
        version: 2,
        status: "superseded",
        recordedAt: "2026-07-21T12:00:00.000Z",
        summary: "Disclosure copy revised in a separate immutable version.",
      },
      {
        version: 3,
        status: "approved",
        recordedAt: "2026-07-21T13:00:00.000Z",
        summary: "Approved synthetic public page projection.",
      },
    ],
    artifacts: [
      {
        id: "synthetic-artifact-public-page-v1",
        label: "Public page",
        version: 1,
        status: "superseded",
        previewTitle: "Cedar Street open house, original draft",
        previewSummary: "Original synthetic page copy retained for history review.",
        sourceProfileVersion: "brand-v2",
      },
      {
        id: "synthetic-artifact-public-page-v2",
        label: "Public page",
        version: 2,
        status: "superseded",
        previewTitle: "Cedar Street open house, disclosure revision",
        previewSummary: "Synthetic disclosure revision retained without changing version 1.",
        sourceProfileVersion: "brand-v3",
      },
      {
        id: "synthetic-artifact-public-page-v3",
        label: "Public page",
        version: 3,
        status: "approved",
        previewTitle: "Tour 214 Cedar Street",
        previewSummary:
          "Approved synthetic public-page projection with no provider-backed behavior.",
        sourceProfileVersion: "brand-v3",
        publicHref: "/public/synthetic-open-house-v3",
      },
    ],
    creatives: [
      {
        id: "synthetic-creative-feed-v3",
        label: "Open House feed creative",
        placement: "feed",
        version: "creative-v3-feed",
        previewHref: "/synthetic-assets/open-house-feed-v3.svg",
        downloadHref: "/synthetic-assets/open-house-feed-v3.svg",
        downloadFileName: "synthetic-open-house-feed-v3.svg",
        mimeType: "image/svg+xml",
        dimensions: "1080x1080",
      },
      {
        id: "synthetic-creative-story-v3",
        label: "Open House story creative",
        placement: "story",
        version: "creative-v3-story",
        previewHref: "/synthetic-assets/open-house-story-v3.svg",
        downloadHref: "/synthetic-assets/open-house-story-v3.svg",
        downloadFileName: "synthetic-open-house-story-v3.svg",
        mimeType: "image/svg+xml",
        dimensions: "1080x1920",
      },
    ],
    metaConnection: {
      activeLocationId: "synthetic-location-prairie-home",
      activeLocationName: "Prairie Home Lending",
      state: "connected",
      source: "Synthetic HighLevel Meta asset projection",
      freshness: "Verified locally for UI evidence",
      assets: [
        {
          kind: "ad_account",
          label: "Ad account",
          providerId: "synthetic-provider-ad-account-001",
          displayName: "Prairie Home Ads, synthetic",
          selection: "selected",
          optional: false,
        },
        {
          kind: "page",
          label: "Facebook Page",
          providerId: "synthetic-provider-page-001",
          displayName: "Prairie Home Lending, synthetic",
          selection: "selected",
          optional: false,
        },
        {
          kind: "instagram_identity",
          label: "Instagram identity",
          providerId: "synthetic-provider-instagram-001",
          displayName: "@prairiehome.synthetic",
          selection: "selected",
          optional: true,
        },
        {
          kind: "lead_form",
          label: "Lead form",
          providerId: "synthetic-provider-form-001",
          displayName: "Open House Interest v4, synthetic",
          selection: "selected",
          optional: false,
        },
        {
          kind: "pixel",
          label: "Pixel",
          providerId: "synthetic-provider-pixel-001",
          displayName: "Prairie Home Main Pixel, synthetic",
          selection: "selected",
          optional: false,
        },
      ],
    },
    approvalSnapshot: {
      status: "approved",
      campaignVersion: 3,
      approvedAt: "2026-07-21T13:05:00.000Z",
      approver: "Synthetic Compliance Approver",
      versions: {
        page: "page-v3",
        pdf: "pdf-v3",
        creative: "creative-v3",
        copy: "copy-v4",
        disclosure: "disclosure-v4",
        targeting: "targeting-v2",
        budget: "budget-v2",
        dates: "dates-v3",
        form: "form-v4",
        destination: "destination-v3",
      },
    },
    launchSummary: {
      policyClassification: "Synthetic lender-approved housing policy fixture",
      targets: [
        "Austin metro geography class",
        "Facebook Feed placement",
        "Instagram Stories placement",
      ],
      exclusions: [
        "ZIP targeting unavailable",
        "Protected dimensions unavailable",
        "Custom and lookalike audiences unavailable",
      ],
      budget: {
        amount: 25,
        currency: "USD",
        cadence: "daily",
      },
      schedule: {
        startDate: "2026-07-25",
        endDate: "2026-07-27",
        timezone: "America/Chicago",
      },
      confirmation: {
        title: "Confirm the exact synthetic launch summary",
        effect: "Stage a local confirmation for campaign version 3 only.",
        result: "No provider draft, publication, spend, or campaign history changes.",
      },
    },
  },
  supportEntry: {
    activityOptions: ["Setup guidance", "Campaign review", "Exception triage"],
    defaultMinutes: 10,
  },
  portfolio: {
    title: "Synthetic agency portfolio",
    source: "Synthetic agency authorization projection",
    freshness: "Verified locally for UI evidence",
    authorizedLocationCount: 1,
    totalCampaigns: 3,
    totalExceptions: 2,
    locations: [
      {
        state: "authorized",
        id: "synthetic-location-prairie-home",
        displayName: "Prairie Home Lending",
        authorizationSource: "Synthetic agency role plus active installation evidence",
        campaigns: 3,
        exceptions: 2,
        exceptionHref: "#authorized-exceptions",
        campaignHref: "/marketing/campaigns/synthetic-open-house-001",
      },
      {
        state: "restricted",
        label: "Location not included",
        reason:
          "No explicit synthetic agency authorization is present, so no totals or links render.",
      },
    ],
  },
};

export type SyntheticCampaign = z.infer<typeof syntheticCampaignSchema>;
export type SyntheticReporting = z.infer<typeof reportingSchema>;

let cachedReporting: DeepReadonly<SyntheticReporting> | undefined;

export function loadSyntheticReporting(): DeepReadonly<SyntheticReporting> {
  cachedReporting ??= deepFreeze(reportingSchema.parse(rawSyntheticReporting));
  return cachedReporting;
}
