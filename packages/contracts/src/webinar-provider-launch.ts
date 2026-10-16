import { z } from "zod";

import { OpaqueReferenceSchema, WebinarDestinationSchema } from "./campaign-foundation.js";

export const WebinarPublisherHashSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const WebinarPublisherNativeIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$/u);
const MoneySchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const TimeSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value).toISOString());
const TimezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });
export const WebinarPublisherPublicUrlSchema = z
  .string()
  .max(2048)
  .regex(
    /^https:\/\/(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}\/[A-Za-z0-9_./-]+$/u,
  )
  .refine(
    (value) =>
      !/^https:\/\/[^/]*\.(?:localhost|local|internal)\//iu.test(value) && !value.includes("/../"),
  );

export const WebinarProviderLaunchInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("webinar-provider-launch"),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    projectionRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    campaignRef: OpaqueReferenceSchema,
    campaignVersionRef: OpaqueReferenceSchema,
    manifestHash: WebinarPublisherHashSchema,
    preflightHash: WebinarPublisherHashSchema,
    approvalRef: OpaqueReferenceSchema,
    destination: z
      .object({
        publicationId: z.uuid(),
        sourceRevision: WebinarDestinationSchema.shape.sourceRevision,
        snapshotHash: WebinarPublisherHashSchema,
        destinationHash: WebinarPublisherHashSchema,
        publicUrl: WebinarPublisherPublicUrlSchema,
      })
      .strict()
      .refine(
        (value) =>
          value.publicUrl.endsWith(`/f/${value.publicationId}`) &&
          /^https:\/\/[^/]+\/f\/[a-f0-9-]+$/u.test(value.publicUrl),
      ),
    templateSourceHash: WebinarPublisherHashSchema,
    brandHash: WebinarPublisherHashSchema,
    copyHash: WebinarPublisherHashSchema,
    advertiserIdentity: z
      .object({
        kind: z.enum(["loan_officer", "lender"]),
        displayName: z.string().min(1).max(300),
      })
      .strict(),
    copy: z
      .object({
        primaryText: z.string().min(1).max(5000),
        headline: z.string().min(1).max(500),
        description: z.string().min(1).max(1000),
      })
      .strict(),
    creative: z
      .object({
        shape: z.literal("square"),
        assetRef: OpaqueReferenceSchema,
        digest: WebinarPublisherHashSchema,
        width: z.literal(1080),
        height: z.literal(1080),
        byteLength: z.number().int().positive().max(25_000_000),
        rendererVersion: z.string().regex(/^\d+\.\d+\.\d+$/u),
      })
      .strict(),
    assets: z
      .object({
        locationId: WebinarPublisherNativeIdSchema,
        adAccountId: z.string().regex(/^act_[0-9]+$/u),
        pageId: z.string().regex(/^[0-9]{2,128}$/u),
        discoveryHash: WebinarPublisherHashSchema,
        currency: z.literal("USD"),
        timezone: TimezoneSchema,
      })
      .strict(),
    objective: z.literal("OUTCOME_TRAFFIC"),
    cta: z.literal("LEARN_MORE"),
    placements: z.tuple([z.literal("facebook_feed")]),
    specialAdCategories: z.tuple([z.literal("HOUSING")]),
    geographies: z
      .array(
        z
          .object({
            key: WebinarPublisherNativeIdSchema,
            name: z.string().min(1).max(300),
            type: z.enum(["region", "city"]),
            countryCode: z.literal("US"),
            selectionType: z.enum(["include", "exclude"]),
            discoveryHash: WebinarPublisherHashSchema,
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .refine(
        (values) =>
          values.some((value) => value.selectionType === "include") &&
          new Set(values.map((value) => `${value.type}:${value.key}`)).size === values.length,
      ),
    schedule: z
      .object({ startPolicy: z.literal("immediate"), endsAt: TimeSchema, timezone: TimezoneSchema })
      .strict(),
    budget: z
      .object({
        currency: z.literal("USD"),
        dailyBudgetMinor: MoneySchema,
        totalBudgetMinor: MoneySchema,
        nativeMode: z.literal("DAILY"),
        totalSemantics: z.enum(["estimated_ceiling", "hard_cap"]),
        boundsHash: WebinarPublisherHashSchema,
      })
      .strict(),
    providerContract: z
      .object({
        evidenceRevision: z.literal(1),
        apiVersion: z.literal("v3"),
        wireMappingHash: WebinarPublisherHashSchema,
      })
      .strict(),
    createdBy: OpaqueReferenceSchema,
    createdAt: TimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.schedule.endsAt) <= Date.parse(value.createdAt)) {
      context.addIssue({
        code: "custom",
        path: ["schedule", "endsAt"],
        message: "Campaign end precedes projection creation.",
      });
    }
    if (value.schedule.timezone !== value.assets.timezone) {
      context.addIssue({
        code: "custom",
        path: ["schedule", "timezone"],
        message: "Account timezone differs.",
      });
    }
    const estimate =
      value.budget.dailyBudgetMinor *
      Math.ceil((Date.parse(value.schedule.endsAt) - Date.parse(value.createdAt)) / 86_400_000);
    if (!Number.isSafeInteger(estimate) || estimate > value.budget.totalBudgetMinor) {
      context.addIssue({
        code: "custom",
        path: ["budget", "totalBudgetMinor"],
        message: "Daily estimate exceeds the approved total.",
      });
    }
  });

export const WebinarProviderLaunchSchema = WebinarProviderLaunchInputSchema.safeExtend({
  projectionHash: WebinarPublisherHashSchema,
});
export type WebinarProviderLaunchInput = z.infer<typeof WebinarProviderLaunchInputSchema>;
export type WebinarProviderLaunch = z.infer<typeof WebinarProviderLaunchSchema>;

// A proof is data to be independently authorized, never an activation switch.
export const WebinarPublisherQualificationSchema = z
  .object({
    schemaVersion: z.literal(1),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    kind: z.enum(["local_synthetic", "app_test"]),
    evidenceRef: OpaqueReferenceSchema,
    artifactHash: WebinarPublisherHashSchema,
    projectionHash: WebinarPublisherHashSchema,
    wireMappingHash: WebinarPublisherHashSchema,
    evidenceRevision: z.literal(1),
    locationId: WebinarPublisherNativeIdSchema,
    adAccountId: z.string().regex(/^act_[0-9]+$/u),
    pageId: z.string().regex(/^[0-9]{2,128}$/u),
    currency: z.literal("USD"),
    timezone: TimezoneSchema,
    observedAt: TimeSchema,
    expiresAt: TimeSchema,
    schedule: z
      .object({
        format: z.literal("offset_datetime"),
        requestEnd: TimeSchema,
        observedStop: TimeSchema,
        requestHash: WebinarPublisherHashSchema,
        readBackHash: WebinarPublisherHashSchema,
      })
      .strict(),
    budget: z
      .object({
        mode: z.literal("DAILY"),
        amountMajor: z.number().positive().finite(),
        totalSemantics: z.literal("estimated_ceiling"),
        requestHash: WebinarPublisherHashSchema,
        readBackHash: WebinarPublisherHashSchema,
      })
      .strict(),
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.observedAt));
export type WebinarPublisherQualification = z.infer<typeof WebinarPublisherQualificationSchema>;

export const WebinarPublisherMediaReceiptSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectionRef: OpaqueReferenceSchema,
    projectionHash: WebinarPublisherHashSchema,
    assetRef: OpaqueReferenceSchema,
    digest: WebinarPublisherHashSchema,
    width: z.literal(1080),
    height: z.literal(1080),
    byteLength: z.number().int().positive().max(25_000_000),
    fileId: WebinarPublisherNativeIdSchema,
    url: WebinarPublisherPublicUrlSchema,
    observedAt: TimeSchema,
    expiresAt: TimeSchema,
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.observedAt));
export type WebinarPublisherMediaReceipt = z.infer<typeof WebinarPublisherMediaReceiptSchema>;
