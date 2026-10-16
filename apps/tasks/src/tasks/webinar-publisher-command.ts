import { AbortTaskRunError, logger, task } from "@trigger.dev/sdk";
import {
  WebinarPublisherWorkerEnvelopeSchema,
  unboundWebinarPublisherRuntime,
  type WebinarPublisherWorkerRuntime,
} from "../core/webinar-publisher-runtime.js";

export async function executeWebinarPublisherTask(
  input: unknown,
  resolveRuntime: () => WebinarPublisherWorkerRuntime = unboundWebinarPublisherRuntime,
  signal?: AbortSignal,
) {
  const envelope = WebinarPublisherWorkerEnvelopeSchema.parse(input);
  return resolveRuntime().execute(envelope, signal);
}
export const webinarPublisherCommand = task({
  id: "webinar-publisher-command",
  maxDuration: 60,
  // No automatic resend. Persisted outbox/lease reconciliation owns later delivery.
  retry: { maxAttempts: 1 },
  run: async (input: unknown, { signal }) => {
    try {
      const result = await executeWebinarPublisherTask(
        input,
        unboundWebinarPublisherRuntime,
        signal,
      );
      logger.info("Webinar publisher delivery finished", {
        disposition: result.disposition,
        state: result.state,
        stage: result.stage,
        operationRef: result.operationRef,
      });
      return result;
    } catch {
      // SDK must not log raw provider errors, tokens, payloads or source data.
      throw new AbortTaskRunError(
        "Webinar publisher requires qualified current runtime authority or reconciliation.",
      );
    }
  },
});
