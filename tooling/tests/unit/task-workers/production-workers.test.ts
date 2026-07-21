import { describe, expect, it } from "vitest";

import { FixtureOnlyDeliveryGuard } from "../../../../apps/tasks/src/core/fixture-delivery-guard.js";
import {
  ProductionMetaPublishPollTaskRequestSchema,
  runProductionMetaPublishPollTask,
} from "../../../../apps/tasks/src/core/production-poll-meta-publish.js";
import { runProductionPdfRenderTask } from "../../../../apps/tasks/src/core/production-render-campaign-pdf.js";
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
