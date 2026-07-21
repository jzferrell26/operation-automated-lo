import type { DeliveryGuardPort } from "@oalo/application";
import { DeliveryReferenceSchema, type DeliveryReference } from "@oalo/contracts";
import { z } from "zod";

import {
  executeMetaPublishPollingDelivery,
  MetaPublishPollTaskRequestShape,
  refineMetaPollTaskDelivery,
} from "./shared-task-execution.js";

const TaskSchemaVersion = 1 as const;

export const ProductionMetaPublishPollTaskRequestSchema = z
  .object({
    ...MetaPublishPollTaskRequestShape,
    campaignId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{1,127}$/u),
  })
  .strict()
  .superRefine(refineMetaPollTaskDelivery);

export type ProductionMetaPublishPollTaskRequest = z.infer<
  typeof ProductionMetaPublishPollTaskRequestSchema
>;

export const ProductionMetaPublishPollTaskResultSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    delivery: DeliveryReferenceSchema,
    disposition: z.enum(["terminal-live", "terminal-failed", "duplicate"]),
    finalState: z.enum(["live", "failed"]).optional(),
    polls: z.number().int().nonnegative().max(30),
  })
  .strict()
  .readonly();

export type ProductionMetaPublishPollTaskResult = z.infer<
  typeof ProductionMetaPublishPollTaskResultSchema
>;

export interface ProductionMetaPublishPollingPort {
  poll(signal?: AbortSignal): Promise<unknown>;
}

export interface ProductionMetaPublishPollTaskPorts {
  readonly guard: DeliveryGuardPort;
  readonly progress: ProductionMetaPublishPollingPort;
  readonly abortSignal?: AbortSignal;
}

function result(
  delivery: DeliveryReference,
  disposition: "terminal-live" | "terminal-failed" | "duplicate",
  polls: number,
  finalState?: "live" | "failed",
): ProductionMetaPublishPollTaskResult {
  return ProductionMetaPublishPollTaskResultSchema.parse({
    schemaVersion: TaskSchemaVersion,
    delivery,
    disposition,
    ...(finalState === undefined ? {} : { finalState }),
    polls,
  });
}

export async function runProductionMetaPublishPollTask(
  input: unknown,
  ports: ProductionMetaPublishPollTaskPorts,
): Promise<ProductionMetaPublishPollTaskResult> {
  const request = ProductionMetaPublishPollTaskRequestSchema.parse(input);
  const deliveryResult = await executeMetaPublishPollingDelivery(request, {
    ...ports,
    pollBudgetError: () =>
      new Error("Meta publish polling reached its bounded poll budget without a terminal state."),
  });
  return result(
    request.delivery,
    deliveryResult.disposition,
    deliveryResult.polls,
    deliveryResult.finalState,
  );
}
