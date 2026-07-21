import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { z } from "zod";

import type { ProductionTaskBindings } from "../core/production-task-bindings.js";
import {
  ProductionPdfRenderTaskRequestSchema,
  runProductionPdfRenderTask,
} from "../core/production-render-campaign-pdf.js";
import {
  ProductionTaskAuthorityProofSchema,
  productionTaskBindings,
} from "../core/production-runtime-composition.js";
import { classifyTaskFailure } from "../core/task-retry-classification.js";

export const ProductionPdfRenderTaskEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    authority: ProductionTaskAuthorityProofSchema,
    request: ProductionPdfRenderTaskRequestSchema,
  })
  .strict()
  .readonly();

export async function executeRenderCampaignPdfTask(
  input: unknown,
  resolveBindings: () => ProductionTaskBindings = productionTaskBindings,
) {
  const envelope = ProductionPdfRenderTaskEnvelopeSchema.parse(input);
  const bindings = resolveBindings();
  return bindings.withDeliveryAuthority(
    envelope.authority,
    envelope.request.delivery,
    envelope.request,
    async () =>
      runProductionPdfRenderTask(envelope.request, {
        guard: bindings.deliveryGuard,
        browser: bindings.pdfBrowser,
        storage: bindings.pdfStorage,
      }),
  );
}

export const renderCampaignPdf = task({
  id: "render-campaign-pdf",
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 4_000,
    factor: 2,
    randomize: false,
  },
  run: async (input: unknown) => {
    try {
      return await executeRenderCampaignPdfTask(input);
    } catch (error) {
      if (classifyTaskFailure(error) === "non-retryable") {
        throw new AbortTaskRunError("Rejected non-retryable PDF task input.");
      }
      throw error;
    }
  },
});
