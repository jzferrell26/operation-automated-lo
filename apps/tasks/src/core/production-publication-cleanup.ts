import { DeliveryReferenceSchema } from "@oalo/contracts";
import {
  reconcilePublicationCleanup,
  type ProductionObjectStoreAdapter,
  type PublicationCleanupReconciliationPort,
} from "@oalo/storage";
import { z } from "zod";

const TaskSchemaVersion = 1 as const;

export const ProductionPublicationCleanupTaskRequestSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    delivery: DeliveryReferenceSchema,
    leaseOwner: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$/u),
    limit: z.number().int().min(1).max(100),
    leaseDurationMilliseconds: z
      .number()
      .int()
      .min(1_000)
      .max(15 * 60 * 1_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.delivery.deliveryKind !== "task") {
      context.addIssue({
        code: "custom",
        message: "Publication cleanup reconciliation requires a task delivery.",
      });
    }
  });

export type ProductionPublicationCleanupTaskRequest = z.infer<
  typeof ProductionPublicationCleanupTaskRequestSchema
>;

export const ProductionPublicationCleanupTaskResultSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    delivery: DeliveryReferenceSchema,
    leased: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    released: z.number().int().nonnegative(),
    deadLettered: z.number().int().nonnegative(),
  })
  .strict()
  .readonly();

export type ProductionPublicationCleanupTaskResult = z.infer<
  typeof ProductionPublicationCleanupTaskResultSchema
>;

export interface ProductionPublicationCleanupTaskPorts {
  readonly reconciliation: PublicationCleanupReconciliationPort;
  readonly objectStore: Pick<ProductionObjectStoreAdapter, "quarantinePartialPublication">;
  readonly now?: () => Date;
}

export async function runProductionPublicationCleanupTask(
  input: unknown,
  ports: ProductionPublicationCleanupTaskPorts,
): Promise<ProductionPublicationCleanupTaskResult> {
  const request = ProductionPublicationCleanupTaskRequestSchema.parse(input);
  const now = ports.now?.() ?? new Date();
  const leaseUntil = new Date(now.getTime() + request.leaseDurationMilliseconds).toISOString();
  const result = await reconcilePublicationCleanup(ports.reconciliation, ports.objectStore, {
    leaseOwner: request.leaseOwner,
    limit: request.limit,
    leaseUntil,
    ...(ports.now === undefined ? {} : { clock: ports.now }),
  });
  return ProductionPublicationCleanupTaskResultSchema.parse({
    schemaVersion: TaskSchemaVersion,
    delivery: request.delivery,
    ...result,
  });
}
