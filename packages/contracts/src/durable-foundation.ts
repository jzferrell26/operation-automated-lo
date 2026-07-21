import { z } from "zod";

export const durableContractVersion = 1 as const;

const OpaqueReferenceSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);

const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const CommandNameSchema = z.enum([
  "configuration.save",
  "onboarding.verify",
  "campaign.generate",
  "campaign.render",
  "campaign.publish",
  "campaign.pause",
  "campaign.resume",
  "lead.route",
  "provider.reconcile",
  "location.export",
  "location.delete",
]);

export const CommandEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(durableContractVersion),
    commandId: OpaqueReferenceSchema,
    commandName: CommandNameSchema,
    locationRef: OpaqueReferenceSchema,
    actorRef: OpaqueReferenceSchema,
    aggregateType: z.enum(["configuration", "onboarding", "campaign", "lead", "location"]),
    aggregateRef: OpaqueReferenceSchema,
    expectedVersion: z.number().int().nonnegative(),
    idempotencyKey: Sha256Schema,
    inputHash: Sha256Schema,
    correlationId: OpaqueReferenceSchema,
  })
  .strict();

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;

export const OutboxEventSchema = z
  .object({
    schemaVersion: z.literal(durableContractVersion),
    eventId: OpaqueReferenceSchema,
    eventName: z.enum([
      "onboarding.verification-requested",
      "campaign.generation-requested",
      "campaign.render-requested",
      "campaign.publish-requested",
      "campaign.pause-requested",
      "campaign.resume-requested",
      "lead.routing-requested",
      "provider.reconciliation-requested",
      "location.export-requested",
      "location.deletion-requested",
    ]),
    locationRef: OpaqueReferenceSchema,
    aggregateType: z.enum(["onboarding", "campaign", "lead", "provider-operation", "location"]),
    aggregateRef: OpaqueReferenceSchema,
    aggregateVersion: z.number().int().nonnegative(),
    commandRef: OpaqueReferenceSchema,
    correlationId: OpaqueReferenceSchema,
    availableAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export type OutboxEvent = z.infer<typeof OutboxEventSchema>;

export const TaskReferenceSchema = z
  .object({
    schemaVersion: z.literal(durableContractVersion),
    taskName: z.enum([
      "dispatch-outbox",
      "verify-onboarding-step",
      "generate-campaign-copy",
      "render-campaign-artifacts",
      "publish-meta-campaign",
      "pause-meta-campaign",
      "resume-meta-campaign",
      "route-public-lead",
      "reconcile-provider-operation",
      "export-location-data",
      "delete-location-data",
    ]),
    resourceRef: OpaqueReferenceSchema,
    locationRef: OpaqueReferenceSchema,
    commandRef: OpaqueReferenceSchema,
    correlationId: OpaqueReferenceSchema,
  })
  .strict();

export type TaskReference = z.infer<typeof TaskReferenceSchema>;

export const DeliveryReferenceSchema = z
  .object({
    schemaVersion: z.literal(durableContractVersion),
    deliveryKind: z.enum(["command", "event", "task", "webhook"]),
    deliveryRef: OpaqueReferenceSchema,
    businessOutcomeKey: Sha256Schema,
    locationRef: OpaqueReferenceSchema,
    correlationId: OpaqueReferenceSchema,
  })
  .strict();

export type DeliveryReference = z.infer<typeof DeliveryReferenceSchema>;

export const AuthoritySnapshotSchema = z
  .object({
    installationActive: z.boolean(),
    entitlementActive: z.boolean(),
    actorAuthorized: z.boolean(),
    tokenHealth: z.enum(["healthy", "unavailable", "reconnect-required"]),
  })
  .strict();

export type AuthoritySnapshot = z.infer<typeof AuthoritySnapshotSchema>;

export const ProviderOperationSchema = z
  .object({
    schemaVersion: z.literal(durableContractVersion),
    operationRef: OpaqueReferenceSchema,
    operation: z.enum([
      "ghl.meta.draft.upsert",
      "ghl.meta.publish",
      "ghl.meta.pause",
      "ghl.meta.resume",
      "ghl.contact.upsert",
      "ghl.opportunity.upsert",
      "ghl.workflow.enroll",
      "stripe.entitlement.reconcile",
    ]),
    locationRef: OpaqueReferenceSchema,
    aggregateRef: OpaqueReferenceSchema,
    commandRef: OpaqueReferenceSchema,
    idempotencyKey: Sha256Schema,
    safeRequestHash: Sha256Schema,
    correlationId: OpaqueReferenceSchema,
  })
  .strict();

export type ProviderOperation = z.infer<typeof ProviderOperationSchema>;
