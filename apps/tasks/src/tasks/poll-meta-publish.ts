import { AbortTaskRunError, task } from "@trigger.dev/sdk";

import { requireProductionTaskBindings } from "../core/production-task-bindings.js";
import {
  ProductionMetaPublishPollTaskRequestSchema,
  runProductionMetaPublishPollTask,
} from "../core/production-poll-meta-publish.js";
import { classifyTaskFailure } from "../core/task-retry-classification.js";

export const pollMetaPublish = task({
  id: "poll-meta-publish",
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
      const request = ProductionMetaPublishPollTaskRequestSchema.parse(input);
      const bindings = requireProductionTaskBindings();
      return await runProductionMetaPublishPollTask(request, {
        guard: bindings.deliveryGuard,
        progress: await bindings.createMetaPublishPollingPort(request),
      });
    } catch (error) {
      if (classifyTaskFailure(error) === "non-retryable") {
        throw new AbortTaskRunError("Rejected non-retryable Meta polling input.");
      }
      throw error;
    }
  },
});
