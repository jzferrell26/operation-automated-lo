import type { DeliveryGuardPort } from "@oalo/application";
import { DeliveryReferenceSchema, type DeliveryReference } from "@oalo/contracts";
import { MetaPublishingProgressResponseSchema } from "@oalo/ghl";
import { z } from "zod";

import { FixtureTaskPermanentError } from "./task-retry-classification.js";
import {
  executeMetaPublishPollingDelivery,
  MetaPublishPollTaskRequestShape,
  refineMetaPollTaskDelivery,
} from "./shared-task-execution.js";

const TaskSchemaVersion = 1 as const;

export const MetaPublishPollTaskRequestSchema = z
  .object({
    ...MetaPublishPollTaskRequestShape,
    fixtureOnly: z.literal(true),
    progressFixtures: z.array(MetaPublishingProgressResponseSchema).min(1).max(30),
  })
  .strict()
  .superRefine((value, context) => {
    refineMetaPollTaskDelivery(value, context);
    if (value.progressFixtures.length > value.maximumPolls) {
      context.addIssue({
        code: "custom",
        message: "Meta progress fixtures exceed the poll budget.",
      });
    }
  });

export type MetaPublishPollTaskRequest = z.infer<typeof MetaPublishPollTaskRequestSchema>;

export const MetaPublishPollTaskResultSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    fixtureOnly: z.literal(true),
    idempotencyScope: z.literal("fixture-worker-process"),
    providerCallsMade: z.literal(0),
    delivery: DeliveryReferenceSchema,
    disposition: z.enum(["terminal-live", "terminal-failed", "duplicate"]),
    finalState: z.enum(["live", "failed"]).optional(),
    polls: z.number().int().nonnegative().max(30),
  })
  .strict()
  .readonly();

export type MetaPublishPollTaskResult = z.infer<typeof MetaPublishPollTaskResultSchema>;

export interface MetaPublishPollingPort {
  poll(): Promise<unknown>;
}

export interface MetaPublishPollTaskPorts {
  readonly guard: DeliveryGuardPort;
  readonly progress: MetaPublishPollingPort;
}

export function createFixtureOnlyMetaPublishPollingPort(
  fixtureProgress: readonly z.input<typeof MetaPublishingProgressResponseSchema>[],
): MetaPublishPollingPort {
  const queue = fixtureProgress.map((value) => MetaPublishingProgressResponseSchema.parse(value));
  return {
    async poll() {
      const next = queue.shift();
      if (next === undefined) throw new Error("Meta fixture poll sequence was exhausted.");
      return next;
    },
  };
}

function result(
  delivery: DeliveryReference,
  disposition: "terminal-live" | "terminal-failed" | "duplicate",
  polls: number,
  finalState?: "live" | "failed",
): MetaPublishPollTaskResult {
  return MetaPublishPollTaskResultSchema.parse({
    schemaVersion: TaskSchemaVersion,
    fixtureOnly: true,
    idempotencyScope: "fixture-worker-process",
    providerCallsMade: 0,
    delivery,
    disposition,
    ...(finalState === undefined ? {} : { finalState }),
    polls,
  });
}

export async function runMetaPublishPollTask(
  input: unknown,
  ports: MetaPublishPollTaskPorts,
): Promise<MetaPublishPollTaskResult> {
  const request = MetaPublishPollTaskRequestSchema.parse(input);
  const deliveryResult = await executeMetaPublishPollingDelivery(request, {
    ...ports,
    pollBudgetError: () =>
      new FixtureTaskPermanentError(
        "Meta publish polling exhausted its bounded fixture poll budget without a terminal state.",
      ),
  });
  return result(
    request.delivery,
    deliveryResult.disposition,
    deliveryResult.polls,
    deliveryResult.finalState,
  );
}
