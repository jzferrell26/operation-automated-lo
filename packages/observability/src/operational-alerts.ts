import { z } from "zod";

const CorrelationIdSchema = z.string().regex(/^corr_[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/u);
const OpaqueReferenceSchema = z.string().regex(/^[a-z][a-z0-9]*(?:_[A-Za-z0-9]+)+$/u);

export const OperationalAlertTaxonomy = Object.freeze({
  privateTransferRejected: "storage.private_transfer.rejected",
  publicProjectionRejected: "storage.public_projection.rejected",
  projectionWithdrawalAuditFailed: "storage.projection_withdrawal_audit.failed",
  durableDeliveryFailed: "delivery.durable_processing.failed",
} as const);

export type OperationalAlertKind =
  (typeof OperationalAlertTaxonomy)[keyof typeof OperationalAlertTaxonomy];

const ResponseLinkByKind: Readonly<Record<OperationalAlertKind, string>> = Object.freeze({
  [OperationalAlertTaxonomy.privateTransferRejected]:
    "docs/operations/alert-response.md#storage-private-transfer",
  [OperationalAlertTaxonomy.publicProjectionRejected]:
    "docs/operations/alert-response.md#public-projection",
  [OperationalAlertTaxonomy.projectionWithdrawalAuditFailed]:
    "docs/operations/alert-response.md#projection-withdrawal-audit",
  [OperationalAlertTaxonomy.durableDeliveryFailed]:
    "docs/operations/alert-response.md#durable-delivery",
});

const OperationalAlertKindSchema = z.enum([
  OperationalAlertTaxonomy.privateTransferRejected,
  OperationalAlertTaxonomy.publicProjectionRejected,
  OperationalAlertTaxonomy.projectionWithdrawalAuditFailed,
  OperationalAlertTaxonomy.durableDeliveryFailed,
]);

export const OperationalAlertRecordSchema = z
  .object({
    schemaVersion: z.literal(1),
    alertRef: OpaqueReferenceSchema,
    kind: OperationalAlertKindSchema,
    severity: z.enum(["warning", "critical"]),
    correlationId: CorrelationIdSchema,
    resourceRef: OpaqueReferenceSchema,
    reasonCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,95}$/u),
    responseLink: z.string().min(1).max(256),
    occurredAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.responseLink !== ResponseLinkByKind[value.kind]) {
      context.addIssue({
        code: "custom",
        message: "Operational alert responseLink must match its documented runbook response.",
      });
    }
  })
  .readonly();

export type OperationalAlertRecord = z.infer<typeof OperationalAlertRecordSchema>;

export function documentedResponseLink(kind: OperationalAlertKind): string {
  return ResponseLinkByKind[kind];
}

export function createOperationalAlert(input: unknown): OperationalAlertRecord {
  return OperationalAlertRecordSchema.parse(input);
}
