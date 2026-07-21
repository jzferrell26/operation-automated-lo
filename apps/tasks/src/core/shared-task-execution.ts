import { processDelivery, type DeliveryGuardPort } from "@oalo/application";
import {
  DeliveryReferenceSchema,
  RenderManifestSchema,
  type ArtifactRecord,
  type DeliveryReference,
  type RenderManifest,
} from "@oalo/contracts";
import {
  MetaPublishAuthoritySchema,
  MetaPublishingProgressResponseSchema,
  advanceMetaPublishProgress,
  assertMetaPublishAuthorized,
  normalizeMetaPublishingProgress,
} from "@oalo/ghl";
import {
  renderArtifactBatch,
  type DeterministicBrowserPort,
  type PrivateArtifactPort,
} from "@oalo/rendering";
import { z } from "zod";

const TaskSchemaVersion = 1 as const;
const IsoDateTimeSchema = z.string().datetime({ offset: true });

export function refineTaskDeliveryLocation(
  value: Readonly<{ delivery: DeliveryReference; manifest: RenderManifest }>,
  context: z.RefinementCtx,
): void {
  if (value.delivery.deliveryKind !== "task") {
    context.addIssue({ code: "custom", message: "PDF rendering requires a task delivery." });
  }
  if (value.delivery.locationRef !== value.manifest.locationRef) {
    context.addIssue({
      code: "custom",
      message: "PDF delivery and manifest locations must match.",
    });
  }
}

export const PdfRenderTaskRequestShape = {
  schemaVersion: z.literal(TaskSchemaVersion),
  requestedAt: IsoDateTimeSchema,
  delivery: DeliveryReferenceSchema,
  manifest: RenderManifestSchema,
};

export const MetaPublishPollTaskRequestShape = {
  schemaVersion: z.literal(TaskSchemaVersion),
  delivery: DeliveryReferenceSchema,
  authority: MetaPublishAuthoritySchema,
  maximumPolls: z.number().int().min(1).max(30),
};

export function refineMetaPollTaskDelivery(
  value: Readonly<{ delivery: DeliveryReference }>,
  context: z.RefinementCtx,
): void {
  if (value.delivery.deliveryKind !== "task") {
    context.addIssue({ code: "custom", message: "Meta publish polling requires a task delivery." });
  }
}

export { MetaPublishingProgressResponseSchema };

export interface SharedPdfRenderPorts {
  readonly guard: DeliveryGuardPort;
  readonly browser: DeterministicBrowserPort;
  readonly storage: PrivateArtifactPort;
}

export async function executePdfRenderDelivery(
  input: Readonly<{ delivery: DeliveryReference; manifest: RenderManifest; requestedAt: string }>,
  ports: SharedPdfRenderPorts,
): Promise<
  Readonly<{ disposition: "rendered" | "duplicate"; artifacts: readonly ArtifactRecord[] }>
> {
  const deliveryResult = await processDelivery(input.delivery, ports.guard, async () => {
    return renderArtifactBatch(
      {
        manifest: input.manifest,
        artifactTypes: ["pdf"],
        createdAt: new Date(input.requestedAt),
      },
      { browser: ports.browser, storage: ports.storage },
    );
  });
  if (deliveryResult.kind === "duplicate") return { disposition: "duplicate", artifacts: [] };
  return { disposition: "rendered", artifacts: deliveryResult.value };
}

export interface SharedMetaPollingPort {
  poll(signal?: AbortSignal): Promise<unknown>;
}

export interface SharedMetaPollingPorts {
  readonly guard: DeliveryGuardPort;
  readonly progress: SharedMetaPollingPort;
  readonly pollBudgetError: () => Error;
  readonly wait?: (delayMilliseconds: number, signal?: AbortSignal) => Promise<void>;
  readonly random?: () => number;
  readonly abortSignal?: AbortSignal;
  readonly backoff?: Readonly<{
    baseDelayMilliseconds: number;
    maximumDelayMilliseconds: number;
    jitterRatio: number;
  }>;
}

const DEFAULT_META_POLL_BACKOFF = Object.freeze({
  baseDelayMilliseconds: 1_000,
  maximumDelayMilliseconds: 30_000,
  jitterRatio: 0.2,
});

function abortError(): Error {
  const error = new Error("Meta publish polling was aborted during backoff.");
  error.name = "AbortError";
  return error;
}

async function waitWithAbort(delayMilliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) throw abortError();
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMilliseconds);
    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function metaPollingBackoffMilliseconds(
  completedPolls: number,
  policy: SharedMetaPollingPorts["backoff"] = DEFAULT_META_POLL_BACKOFF,
  randomValue = Math.random(),
): number {
  if (!Number.isInteger(completedPolls) || completedPolls < 1) {
    throw new Error("Completed Meta poll count must be a positive integer.");
  }
  const resolved = policy ?? DEFAULT_META_POLL_BACKOFF;
  if (
    !Number.isFinite(resolved.baseDelayMilliseconds) ||
    resolved.baseDelayMilliseconds < 1 ||
    !Number.isFinite(resolved.maximumDelayMilliseconds) ||
    resolved.maximumDelayMilliseconds < resolved.baseDelayMilliseconds ||
    !Number.isFinite(resolved.jitterRatio) ||
    resolved.jitterRatio < 0 ||
    resolved.jitterRatio > 1 ||
    !Number.isFinite(randomValue) ||
    randomValue < 0 ||
    randomValue > 1
  ) {
    throw new Error("Meta poll backoff policy or random value is invalid.");
  }
  const exponential = Math.min(
    resolved.maximumDelayMilliseconds,
    resolved.baseDelayMilliseconds * 2 ** (completedPolls - 1),
  );
  const jitterMultiplier = 1 + (randomValue * 2 - 1) * resolved.jitterRatio;
  return Math.min(
    resolved.maximumDelayMilliseconds,
    Math.max(1, Math.round(exponential * jitterMultiplier)),
  );
}

export async function executeMetaPublishPollingDelivery(
  input: Readonly<{
    delivery: DeliveryReference;
    authority: unknown;
    maximumPolls: number;
  }>,
  ports: SharedMetaPollingPorts,
): Promise<
  Readonly<{
    disposition: "terminal-live" | "terminal-failed" | "duplicate";
    polls: number;
    finalState?: "live" | "failed";
  }>
> {
  const deliveryResult = await processDelivery(input.delivery, ports.guard, async () => {
    assertMetaPublishAuthorized(input.authority);
    let polls = 0;
    while (polls < input.maximumPolls) {
      const progress = normalizeMetaPublishingProgress(
        await ports.progress.poll(ports.abortSignal),
      );
      polls += 1;
      if (!progress.terminal) {
        if (polls < input.maximumPolls) {
          const delayMilliseconds = metaPollingBackoffMilliseconds(
            polls,
            ports.backoff,
            ports.random?.(),
          );
          await (ports.wait ?? waitWithAbort)(delayMilliseconds, ports.abortSignal);
        }
        continue;
      }
      if (progress.state === "live") {
        advanceMetaPublishProgress("publishing", "provider_confirmed_live");
        return { disposition: "terminal-live" as const, polls, finalState: "live" as const };
      }
      advanceMetaPublishProgress("publishing", "provider_failed");
      return { disposition: "terminal-failed" as const, polls, finalState: "failed" as const };
    }
    throw ports.pollBudgetError();
  });
  if (deliveryResult.kind === "duplicate") return { disposition: "duplicate", polls: 0 };
  return deliveryResult.value;
}
