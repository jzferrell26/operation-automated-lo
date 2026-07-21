import { z } from "zod";

const ReferenceSchema = z
  .string()
  .min(8)
  .max(160)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);
const SafeCodeSchema = z.string().regex(/^[a-z][a-z0-9_]{2,99}$/u);

export const ReadinessDependencySchema = z.enum([
  "installation",
  "permissions",
  "brand_compliance",
  "ghl_routing",
  "meta_connection",
  "team_roles",
  "synthetic_lead",
]);
export type ReadinessDependency = z.infer<typeof ReadinessDependencySchema>;

export const ReadinessStepStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "blocked",
  "complete",
  "stale",
]);
export type ReadinessStepStatus = z.infer<typeof ReadinessStepStatusSchema>;

export const ReadinessBlockSchema = z
  .object({
    code: SafeCodeSchema,
    explanation: z.string().trim().min(1).max(1_000),
    responsibleParty: z.enum([
      "customer",
      "lender_compliance",
      "highlevel",
      "meta",
      "cuantico_support",
    ]),
    remediation: z.string().trim().min(1).max(2_000),
    retryAction: SafeCodeSchema,
    correlationRef: ReferenceSchema,
  })
  .strict();
export type ReadinessBlock = z.infer<typeof ReadinessBlockSchema>;

export const ReadinessEvidenceSchema = z
  .object({
    dependency: ReadinessDependencySchema,
    status: ReadinessStepStatusSchema,
    observed: z.boolean(),
    verifierVersion: z.string().trim().min(1).max(100),
    verifiedAt: z.iso.datetime({ offset: true }),
    evidenceSummary: z.string().trim().min(1).max(2_000),
    providerIds: z.array(z.string().trim().min(1).max(300)).max(20),
    block: ReadinessBlockSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status === "complete" && !value.observed) {
      context.addIssue({ code: "custom", message: "complete evidence must be observed" });
    }
    if (value.status === "blocked" && value.block === undefined) {
      context.addIssue({ code: "custom", message: "blocked evidence requires remediation" });
    }
    if (value.status !== "blocked" && value.block !== undefined) {
      context.addIssue({
        code: "custom",
        message: "only blocked evidence may contain remediation",
      });
    }
  });
export type ReadinessEvidence = z.infer<typeof ReadinessEvidenceSchema>;

export const LaunchReadinessResultSchema = z
  .object({
    readinessRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    state: z.enum(["not_ready", "launch_ready", "attention_required"]),
    verifierVersion: z.string().trim().min(1).max(100),
    evaluatedAt: z.iso.datetime({ offset: true }),
    evidence: z.array(ReadinessEvidenceSchema).min(1).max(20),
    evidenceSummary: z.string().trim().min(1).max(4_000),
    nextAction: SafeCodeSchema,
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
export type LaunchReadinessResult = z.infer<typeof LaunchReadinessResultSchema>;

export const ApplicationRoleSchema = z.enum([
  "location_admin",
  "campaign_creator",
  "campaign_approver",
  "campaign_publisher",
  "viewer",
  "platform_support",
]);
export type ApplicationRole = z.infer<typeof ApplicationRoleSchema>;

export const OnboardingEventSchema = z
  .object({
    eventRef: ReferenceSchema,
    locationRef: ReferenceSchema,
    actorRef: ReferenceSchema,
    event: z.enum([
      "viewed",
      "started",
      "item_completed",
      "blocked",
      "resumed",
      "dismissed_guidance",
      "launch_ready",
      "attention_required",
    ]),
    itemCode: SafeCodeSchema.optional(),
    blockerCode: SafeCodeSchema.optional(),
    correlationRef: ReferenceSchema,
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type OnboardingEvent = z.infer<typeof OnboardingEventSchema>;
