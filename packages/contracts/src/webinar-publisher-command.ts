import { z } from "zod";
import { OpaqueReferenceSchema } from "./campaign-foundation.js";
import {
  WebinarProviderLaunchSchema,
  WebinarPublisherHashSchema,
  WebinarPublisherNativeIdSchema,
} from "./webinar-provider-launch.js";

const Ref = OpaqueReferenceSchema;
const Hash = WebinarPublisherHashSchema;
const Time = z.iso.datetime({ offset: true }).transform((value) => new Date(value).toISOString());
export const WebinarPublisherActionSchema = z.enum([
  "draft",
  "publish",
  "cancel",
  "pause",
  "resume",
]);
export const WebinarPublisherStateSchema = z.enum([
  "reserved",
  "drafting",
  "draft_ready",
  "publish_queued",
  "publishing",
  "in_review",
  "live",
  "pause_pending",
  "paused",
  "resume_pending",
  "cancelled",
  "blocked",
  "failed",
  "uncertain",
]);
export const WebinarPublisherStageSchema = z.enum([
  "queued",
  "campaign",
  "adset",
  "ad",
  "parity",
  "publish",
  "progress",
  "pause",
  "resume",
  "reconcile",
  "complete",
]);
export const WebinarPublisherSelectionSchema = z
  .object({
    adAccountRef: Ref,
    pageRef: Ref,
    creativeAssetRef: Ref,
    geographyRefs: z
      .array(Ref)
      .min(1)
      .max(50)
      .refine((values) => new Set(values).size === values.length),
  })
  .strict();
export const WebinarPublisherSummaryRequestSchema = z
  .object({
    campaignRef: Ref,
    campaignVersionRef: Ref,
    expectedManifestHash: Hash,
    expectedPreflightHash: Hash,
    selection: WebinarPublisherSelectionSchema,
  })
  .strict();
export const WebinarPublisherCommandSchema = z
  .object({
    requestId: z.uuid(),
    projectionRef: Ref,
    expectedProjectionHash: Hash,
    expectedRowVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    action: WebinarPublisherActionSchema,
    confirmationHash: Hash,
  })
  .strict();
export const WebinarPublisherNativeIdsSchema = z
  .object({
    campaignId: WebinarPublisherNativeIdSchema.nullable(),
    adsetId: WebinarPublisherNativeIdSchema.nullable(),
    adId: WebinarPublisherNativeIdSchema.nullable(),
  })
  .strict()
  .refine(
    (value) =>
      (value.adsetId === null || value.campaignId !== null) &&
      (value.adId === null || value.adsetId !== null),
  );
export const WebinarPublisherReadinessCodeSchema = z.enum([
  "PROVIDER_CONTRACT_UNQUALIFIED",
  "MEDIA_UNQUALIFIED",
  "RELEASE_UNQUALIFIED",
]);
export const WebinarPublisherPauseQualificationSchema = z
  .object({
    schemaVersion: z.literal(1),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    kind: z.enum(["app_test", "local_synthetic"]),
    action: z.literal("pause"),
    evidenceRef: Ref,
    artifactHash: Hash,
    projectionHash: Hash,
    wireMappingHash: Hash,
    locationId: WebinarPublisherNativeIdSchema,
    adAccountId: z.string().regex(/^act_[0-9]+$/u),
    campaignId: WebinarPublisherNativeIdSchema,
    observedAt: Time,
    expiresAt: Time,
  })
  .strict()
  .refine((value) => Date.parse(value.expiresAt) > Date.parse(value.observedAt));
export const WebinarPublisherSummarySchema = z
  .object({
    schemaVersion: z.literal(1),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    projection: WebinarProviderLaunchSchema,
    selection: WebinarPublisherSelectionSchema,
    accountLabel: z.string().min(1).max(300),
    pageLabel: z.string().min(1).max(300),
    readiness: z.array(WebinarPublisherReadinessCodeSchema).max(3),
    summaryHash: Hash,
  })
  .strict();
export const WebinarPublisherLaunchRecordSchema = z
  .object({
    summary: WebinarPublisherSummarySchema,
    rowVersion: z.number().int().positive(),
    state: WebinarPublisherStateSchema,
    nativeIds: WebinarPublisherNativeIdsSchema,
  })
  .strict();
export const WebinarPublisherOperationSchema = z
  .object({
    schemaVersion: z.literal(1),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    operationRef: Ref,
    projectionRef: Ref,
    projectionHash: Hash,
    locationRef: Ref,
    actorRef: Ref,
    actorRoleVersion: z.number().int().positive(),
    requestId: z.uuid(),
    expectedRowVersion: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    requestHash: Hash,
    confirmationHash: Hash,
    summaryHash: Hash,
    nativeIdsAtConfirmation: WebinarPublisherNativeIdsSchema,
    action: WebinarPublisherActionSchema,
    state: WebinarPublisherStateSchema,
    stage: WebinarPublisherStageSchema,
    correlationRef: Ref,
    createdAt: Time,
    leaseGeneration: z.number().int().nonnegative(),
    providerObservedAt: Time.nullable(),
    lastSafeFailure: z
      .enum([
        "AUTHORITY_WITHDRAWN",
        "EVIDENCE_CHANGED",
        "PROVIDER_UNQUALIFIED",
        "WRITE_UNCERTAIN",
        "PARITY_MISMATCH",
        "CANCEL_PENDING",
      ])
      .nullable(),
  })
  .strict();
export const WebinarPublisherTaskSchema = z
  .object({
    schemaVersion: z.literal(1),
    contractId: z.literal("CTR-003"),
    contractRevision: z.literal(1),
    kind: z.literal("webinar-publisher-command"),
    operationRef: Ref,
    locationRef: Ref,
    projectionHash: Hash,
    action: WebinarPublisherActionSchema,
    correlationRef: Ref,
  })
  .strict();
export const WebinarPublisherCommandResultSchema = z
  .object({
    operationRef: Ref,
    action: WebinarPublisherActionSchema,
    state: WebinarPublisherStateSchema,
    duplicate: z.boolean(),
    correlationRef: Ref,
  })
  .strict();
// CAS fields for the concrete fenced repository consumer. Never a provider response or token.
export const WebinarPublisherCheckpointSchema = z
  .object({
    operationRef: Ref,
    workerRef: Ref,
    leaseGeneration: z.number().int().positive(),
    expectedStage: WebinarPublisherStageSchema,
    stage: WebinarPublisherStageSchema,
    state: WebinarPublisherStateSchema,
    nativeIds: WebinarPublisherNativeIdsSchema,
    providerObservedAt: Time.nullable(),
    requestHash: Hash.nullable(),
    readBackHash: Hash.nullable(),
  })
  .strict();

export type WebinarPublisherAction = z.infer<typeof WebinarPublisherActionSchema>;
export type WebinarPublisherSelection = z.infer<typeof WebinarPublisherSelectionSchema>;
export type WebinarPublisherSummaryRequest = z.infer<typeof WebinarPublisherSummaryRequestSchema>;
export type WebinarPublisherSummary = z.infer<typeof WebinarPublisherSummarySchema>;
export type WebinarPublisherCommand = z.infer<typeof WebinarPublisherCommandSchema>;
export type WebinarPublisherNativeIds = z.infer<typeof WebinarPublisherNativeIdsSchema>;
export type WebinarPublisherLaunchRecord = z.infer<typeof WebinarPublisherLaunchRecordSchema>;
export type WebinarPublisherOperation = z.infer<typeof WebinarPublisherOperationSchema>;
export type WebinarPublisherTask = z.infer<typeof WebinarPublisherTaskSchema>;
export type WebinarPublisherCommandResult = z.infer<typeof WebinarPublisherCommandResultSchema>;
export type WebinarPublisherCheckpoint = z.infer<typeof WebinarPublisherCheckpointSchema>;
