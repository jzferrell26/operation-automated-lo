import { AbortTaskRunError, task } from "@trigger.dev/sdk";
import { z } from "zod";

import type { ProductionTaskBindings } from "../core/production-task-bindings.js";
import {
  ProductionMetaPublishPollTaskRequestSchema,
  runProductionMetaPublishPollTask,
} from "../core/production-poll-meta-publish.js";
import {
  ProductionTaskAuthorityProofSchema,
  productionTaskBindings,
} from "../core/production-runtime-composition.js";
import { classifyTaskFailure } from "../core/task-retry-classification.js";

export const ProductionMetaPublishPollTaskEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(1),
    authority: ProductionTaskAuthorityProofSchema,
    request: ProductionMetaPublishPollTaskRequestSchema,
  })
  .strict()
  .readonly();

export async function executePollMetaPublishTask(
  input: unknown,
  resolveBindings: () => ProductionTaskBindings = productionTaskBindings,
  abortSignal?: AbortSignal,
) {
  const envelope = ProductionMetaPublishPollTaskEnvelopeSchema.parse(input);
  const bindings = resolveBindings();
  return bindings.withDeliveryAuthority(
    envelope.authority,
    envelope.request.delivery,
    envelope.request,
    async () =>
      runProductionMetaPublishPollTask(envelope.request, {
        guard: bindings.deliveryGuard,
        progress: await bindings.createMetaPublishPollingPort(envelope.request),
        ...(abortSignal === undefined ? {} : { abortSignal }),
      }),
  );
}

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
  run: async (input: unknown, { signal }) => {
    try {
      return await executePollMetaPublishTask(input, productionTaskBindings, signal);
    } catch (error) {
      if (classifyTaskFailure(error) === "non-retryable") {
        throw new AbortTaskRunError("Rejected non-retryable Meta polling input.");
      }
      throw error;
    }
  },
});
