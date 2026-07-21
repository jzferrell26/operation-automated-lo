import type { DeliveryGuardPort } from "@oalo/application";
import {
  ArtifactRecordSchema,
  DeliveryReferenceSchema,
  type ArtifactRecord,
  type DeliveryReference,
} from "@oalo/contracts";
import { type DeterministicBrowserPort, type PrivateArtifactPort } from "@oalo/rendering";
import { z } from "zod";

import {
  PdfRenderTaskRequestShape,
  executePdfRenderDelivery,
  refineTaskDeliveryLocation,
} from "./shared-task-execution.js";

const TaskSchemaVersion = 1 as const;
export const ProductionPdfRenderTaskRequestSchema = z
  .object(PdfRenderTaskRequestShape)
  .strict()
  .superRefine(refineTaskDeliveryLocation);

export type ProductionPdfRenderTaskRequest = z.infer<typeof ProductionPdfRenderTaskRequestSchema>;

export const ProductionPdfRenderTaskResultSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    delivery: DeliveryReferenceSchema,
    disposition: z.enum(["rendered", "duplicate"]),
    artifacts: z.array(ArtifactRecordSchema).max(1),
  })
  .strict()
  .readonly();

export type ProductionPdfRenderTaskResult = z.infer<typeof ProductionPdfRenderTaskResultSchema>;

export interface ProductionPdfRenderTaskPorts {
  readonly guard: DeliveryGuardPort;
  readonly browser: DeterministicBrowserPort;
  readonly storage: PrivateArtifactPort;
}

function result(
  delivery: DeliveryReference,
  disposition: "rendered" | "duplicate",
  artifacts: readonly ArtifactRecord[],
): ProductionPdfRenderTaskResult {
  return ProductionPdfRenderTaskResultSchema.parse({
    schemaVersion: TaskSchemaVersion,
    delivery,
    disposition,
    artifacts,
  });
}

export async function runProductionPdfRenderTask(
  input: unknown,
  ports: ProductionPdfRenderTaskPorts,
): Promise<ProductionPdfRenderTaskResult> {
  const request = ProductionPdfRenderTaskRequestSchema.parse(input);
  const deliveryResult = await executePdfRenderDelivery(request, ports);
  return result(request.delivery, deliveryResult.disposition, deliveryResult.artifacts);
}
