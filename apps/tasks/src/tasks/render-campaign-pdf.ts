import { AbortTaskRunError, task } from "@trigger.dev/sdk";

import { requireProductionTaskBindings } from "../core/production-task-bindings.js";
import {
  ProductionPdfRenderTaskRequestSchema,
  runProductionPdfRenderTask,
} from "../core/production-render-campaign-pdf.js";
import { classifyTaskFailure } from "../core/task-retry-classification.js";

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
      const request = ProductionPdfRenderTaskRequestSchema.parse(input);
      const bindings = requireProductionTaskBindings();
      return await runProductionPdfRenderTask(request, {
        guard: bindings.deliveryGuard,
        browser: bindings.pdfBrowser,
        storage: bindings.pdfStorage,
      });
    } catch (error) {
      if (classifyTaskFailure(error) === "non-retryable") {
        throw new AbortTaskRunError("Rejected non-retryable PDF task input.");
      }
      throw error;
    }
  },
});
