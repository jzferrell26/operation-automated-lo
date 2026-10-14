import { z } from "zod";

import type { PostgresAcquisitionObserver } from "@oalo/db";

const TimingEnvironmentSchema = z.object({ OALO_RUNTIME_TIMING_DIAGNOSTICS: z.literal("true") });
const TimingEventSchema = z
  .object({
    stage: z.enum([
      "authentication_pool",
      "campaign_pool",
      "principal",
      "shell_display",
      "shell_email_verification",
      "saved_brand",
    ]),
    outcome: z.enum([
      "started",
      "succeeded",
      "failed",
      "timed_out",
      "closed",
      "late_released",
      "cleanup_failed",
    ]),
    elapsedMilliseconds: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

type TimingStage = z.infer<typeof TimingEventSchema>["stage"];
type TimingOutcome = z.infer<typeof TimingEventSchema>["outcome"];

function emit(
  environment: unknown,
  stage: TimingStage,
  outcome: TimingOutcome,
  elapsedMilliseconds: number,
): void {
  if (!TimingEnvironmentSchema.safeParse(environment).success) return;
  const event = TimingEventSchema.safeParse({ stage, outcome, elapsedMilliseconds });
  if (!event.success) return;
  try {
    // An explicit allowlist is reconstructed here. No error, operation inputs or outputs are logged.
    console.info("oalo-runtime-timing", event.data);
  } catch {
    // A diagnostic sink failure cannot alter authentication, reads or reservation cleanup.
  }
}

export function runtimePoolObserver(
  environment: unknown,
  stage: "authentication_pool" | "campaign_pool",
): PostgresAcquisitionObserver {
  return (observation) =>
    emit(environment, stage, observation.outcome, observation.elapsedMilliseconds);
}

export async function observeRuntimeStage<T>(
  environment: unknown,
  stage: TimingStage,
  operation: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  emit(environment, stage, "started", 0);
  const elapsed = () => Math.max(0, Math.round(performance.now() - started));
  try {
    const result = await operation();
    emit(environment, stage, "succeeded", elapsed());
    return result;
  } catch (error: unknown) {
    emit(environment, stage, "failed", elapsed());
    throw error;
  }
}
