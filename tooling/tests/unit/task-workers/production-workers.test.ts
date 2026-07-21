import { describe, expect, it, vi } from "vitest";

import { FixtureOnlyDeliveryGuard } from "../../../../apps/tasks/src/core/fixture-delivery-guard.js";
import {
  ProductionMetaPublishPollTaskRequestSchema,
  runProductionMetaPublishPollTask,
} from "../../../../apps/tasks/src/core/production-poll-meta-publish.js";
import { runProductionPdfRenderTask } from "../../../../apps/tasks/src/core/production-render-campaign-pdf.js";
import { metaPollingBackoffMilliseconds } from "../../../../apps/tasks/src/core/shared-task-execution.js";
import { classifyFixtureTaskFailure } from "../../../../apps/tasks/src/core/task-retry-classification.js";
import { commonRenderManifest } from "../../fixtures/prd001d-render-manifests.js";

class FakeDatabaseDeliveryGuard extends FixtureOnlyDeliveryGuard {
  public readonly idempotencyStore = "database" as const;
}

const sha = (character: string) => character.repeat(64);

function delivery(deliveryRef: string) {
  return {
    schemaVersion: 1 as const,
    deliveryKind: "task" as const,
    deliveryRef,
    businessOutcomeKey: sha("b"),
    locationRef: commonRenderManifest.locationRef,
    correlationId: "correlation_01ProductionTask",
  };
}

function publishAuthority() {
  return {
    publisherRole: "publisher" as const,
    currentPreflightPassed: true as const,
    currentApprovalPassed: true as const,
    exactVersionMatch: true as const,
    tokenHealth: "healthy" as const,
    connectedAssets: true as const,
    externalCategoryEvidence: "confirmed" as const,
    finalSummaryConfirmed: true as const,
    materialHashMatch: true as const,
  };
}

describe("production Trigger worker cores", () => {
  it("renders through injected ports and converges duplicate delivery without network access", async () => {
    const guard = new FakeDatabaseDeliveryGuard();
    let renders = 0;
    let stores = 0;
    const ports = {
      guard,
      browser: {
        async render() {
          renders += 1;
          return {
            bytes: new TextEncoder().encode("%PDF-1.4\n%%EOF\n"),
            mimeType: "application/pdf" as const,
            pageCount: 1,
          };
        },
      },
      storage: {
        async store() {
          stores += 1;
          return "private/tenant-01/artifact-01.pdf";
        },
      },
    };
    const request = {
      schemaVersion: 1,
      requestedAt: "2026-07-21T12:00:00.000Z",
      delivery: delivery("delivery_01ProductionPdf"),
      manifest: commonRenderManifest,
    };

    const rendered = await runProductionPdfRenderTask(request, ports);
    const duplicate = await runProductionPdfRenderTask(request, ports);

    expect(rendered).toMatchObject({ disposition: "rendered" });
    expect(rendered).not.toHaveProperty("fixtureOnly");
    expect(duplicate).toMatchObject({ disposition: "duplicate", artifacts: [] });
    expect(renders).toBe(1);
    expect(stores).toBe(1);
  });

  it("polls injected provider progress to a terminal state and converges duplicates", async () => {
    const guard = new FakeDatabaseDeliveryGuard();
    let providerPolls = 0;
    const responses = [
      {
        state: "publishing",
        completedSteps: 1,
        totalSteps: 2,
        observedAt: "2026-07-21T12:00:00.000Z",
      },
      {
        state: "live",
        completedSteps: 2,
        totalSteps: 2,
        observedAt: "2026-07-21T12:01:00.000Z",
      },
    ];
    const delays: number[] = [];
    const ports = {
      guard,
      progress: {
        async poll() {
          providerPolls += 1;
          const response = responses.shift();
          if (response === undefined) throw new Error("Unexpected additional production poll.");
          return response;
        },
      },
      wait: async (delayMilliseconds: number) => void delays.push(delayMilliseconds),
      random: () => 0.5,
    };
    const request = {
      schemaVersion: 1,
      delivery: delivery("delivery_01ProductionMeta"),
      campaignId: "campaign_meta_01",
      authority: publishAuthority(),
      maximumPolls: 2,
    };

    const terminal = await runProductionMetaPublishPollTask(request, ports);
    const duplicate = await runProductionMetaPublishPollTask(request, ports);

    expect(terminal).toMatchObject({ disposition: "terminal-live", finalState: "live", polls: 2 });
    expect(terminal).not.toHaveProperty("providerCallsMade");
    expect(duplicate).toMatchObject({ disposition: "duplicate", polls: 0 });
    expect(providerPolls).toBe(2);
    expect(delays).toEqual([1_000]);
  });

  it("uses bounded exponential polling backoff instead of exhausting reads in a tight loop", async () => {
    const guard = new FakeDatabaseDeliveryGuard();
    const delays: number[] = [];
    const poll = vi.fn(async () => ({
      state: "publishing",
      completedSteps: 1,
      totalSteps: 2,
      observedAt: "2026-07-21T12:00:00.000Z",
    }));
    const request = {
      schemaVersion: 1,
      delivery: delivery("delivery_03ProductionMetaBackoff"),
      campaignId: "campaign_meta_03",
      authority: publishAuthority(),
      maximumPolls: 4,
    };
    const ports = {
      guard,
      progress: { poll },
      wait: async (delayMilliseconds: number) => void delays.push(delayMilliseconds),
      random: () => 0.5,
    };

    await expect(runProductionMetaPublishPollTask(request, ports)).rejects.toThrow(
      "bounded poll budget",
    );
    expect(poll).toHaveBeenCalledTimes(4);
    expect(delays).toEqual([1_000, 2_000, 4_000]);
    expect(metaPollingBackoffMilliseconds(20, undefined, 1)).toBe(30_000);
  });

  it("stops polling immediately when an abort signal fires during the bounded wait", async () => {
    const controller = new AbortController();
    controller.abort();
    const poll = vi.fn(async () => ({
      state: "publishing",
      completedSteps: 1,
      totalSteps: 2,
      observedAt: "2026-07-21T12:00:00.000Z",
    }));

    await expect(
      runProductionMetaPublishPollTask(
        {
          schemaVersion: 1,
          delivery: delivery("delivery_04ProductionMetaAbort"),
          campaignId: "campaign_meta_04",
          authority: publishAuthority(),
          maximumPolls: 30,
        },
        {
          guard: new FakeDatabaseDeliveryGuard(),
          progress: { poll },
          abortSignal: controller.signal,
        },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(poll).toHaveBeenCalledOnce();
  });

  it("rejects fixture-only fields as non-retryable production input", () => {
    const parsed = ProductionMetaPublishPollTaskRequestSchema.safeParse({
      schemaVersion: 1,
      fixtureOnly: true,
      delivery: delivery("delivery_02ProductionMeta"),
      campaignId: "campaign_meta_02",
      authority: publishAuthority(),
      maximumPolls: 1,
      progressFixtures: [],
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(classifyFixtureTaskFailure(parsed.error)).toBe("non-retryable");
    }
  });
});
