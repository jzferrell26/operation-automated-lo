import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FixtureOnlyDeliveryGuard } from "../../../../apps/tasks/src/core/fixture-delivery-guard.js";
import { requireProductionTaskBindings } from "../../../../apps/tasks/src/core/production-task-bindings.js";
import {
  createFixtureOnlyPdfRenderPorts,
  runPdfRenderTask,
} from "../../../../apps/tasks/src/core/render-campaign-pdf.js";
import {
  createFixtureOnlyMetaPublishPollingPort,
  runMetaPublishPollTask,
} from "../../../../apps/tasks/src/core/poll-meta-publish.js";
import {
  FixtureTaskPermanentError,
  classifyFixtureTaskFailure,
} from "../../../../apps/tasks/src/core/task-retry-classification.js";
import { commonRenderManifest } from "../../fixtures/prd001d-render-manifests.js";

const sha = (character: string) => character.repeat(64);

function delivery(deliveryRef: string) {
  return {
    schemaVersion: 1 as const,
    deliveryKind: "task" as const,
    deliveryRef,
    businessOutcomeKey: sha("a"),
    locationRef: commonRenderManifest.locationRef,
    correlationId: "correlation_01FixtureTask",
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

describe("fixture-only Trigger worker cores", () => {
  it("refuses registered runtime work until durable production bindings are installed", () => {
    expect(() => requireProductionTaskBindings()).toThrow(
      "Production task bindings are not configured",
    );
  });

  it("classifies deterministic fixture failures as non-retryable", () => {
    expect(
      classifyFixtureTaskFailure(new FixtureTaskPermanentError("fixture contract failure")),
    ).toBe("non-retryable");
    expect(classifyFixtureTaskFailure(new Error("transient worker outage"))).toBe("retryable");
  });

  it("renders one PDF in the worker, validates its manifest, and deduplicates the delivery", async () => {
    const guard = new FixtureOnlyDeliveryGuard();
    const result = await runPdfRenderTask(
      {
        schemaVersion: 1,
        fixtureOnly: true,
        requestedAt: "2026-07-21T12:00:00.000Z",
        delivery: delivery("delivery_01PdfRender"),
        manifest: commonRenderManifest,
      },
      { guard, ...createFixtureOnlyPdfRenderPorts() },
    );

    expect(result).toMatchObject({
      disposition: "rendered",
      fixtureOnly: true,
      idempotencyScope: "fixture-worker-process",
      networkAccessRequired: false,
    });
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]).toMatchObject({ artifactType: "pdf", mimeType: "application/pdf" });

    const duplicate = await runPdfRenderTask(
      {
        schemaVersion: 1,
        fixtureOnly: true,
        requestedAt: "2026-07-21T12:00:00.000Z",
        delivery: delivery("delivery_01PdfRender"),
        manifest: commonRenderManifest,
      },
      { guard, ...createFixtureOnlyPdfRenderPorts() },
    );
    expect(duplicate).toMatchObject({ disposition: "duplicate", artifacts: [] });

    await expect(
      runPdfRenderTask(
        {
          schemaVersion: 1,
          fixtureOnly: true,
          requestedAt: "2026-07-21T12:00:00.000Z",
          delivery: { ...delivery("delivery_02PdfRender"), locationRef: "location_02Other" },
          manifest: commonRenderManifest,
        },
        { guard: new FixtureOnlyDeliveryGuard(), ...createFixtureOnlyPdfRenderPorts() },
      ),
    ).rejects.toThrow("locations must match");
  });

  it("polls only fixture progress to a terminal state and fails closed when no terminal state arrives", async () => {
    const live = await runMetaPublishPollTask(
      {
        schemaVersion: 1,
        fixtureOnly: true,
        delivery: delivery("delivery_01MetaPublish"),
        authority: publishAuthority(),
        maximumPolls: 2,
        progressFixtures: [
          {
            state: "publishing",
            completedSteps: 2,
            totalSteps: 4,
            observedAt: "2026-07-21T12:00:00.000Z",
          },
          {
            state: "live",
            completedSteps: 4,
            totalSteps: 4,
            observedAt: "2026-07-21T12:01:00.000Z",
          },
        ],
      },
      {
        guard: new FixtureOnlyDeliveryGuard(),
        progress: createFixtureOnlyMetaPublishPollingPort([
          {
            state: "publishing",
            completedSteps: 2,
            totalSteps: 4,
            observedAt: "2026-07-21T12:00:00.000Z",
          },
          {
            state: "live",
            completedSteps: 4,
            totalSteps: 4,
            observedAt: "2026-07-21T12:01:00.000Z",
          },
        ]),
      },
    );
    expect(live).toMatchObject({
      disposition: "terminal-live",
      finalState: "live",
      polls: 2,
      providerCallsMade: 0,
    });

    await expect(
      runMetaPublishPollTask(
        {
          schemaVersion: 1,
          fixtureOnly: true,
          delivery: delivery("delivery_02MetaPublish"),
          authority: publishAuthority(),
          maximumPolls: 1,
          progressFixtures: [
            {
              state: "publishing",
              completedSteps: 2,
              totalSteps: 4,
              observedAt: "2026-07-21T12:00:00.000Z",
            },
          ],
        },
        {
          guard: new FixtureOnlyDeliveryGuard(),
          progress: createFixtureOnlyMetaPublishPollingPort([
            {
              state: "publishing",
              completedSteps: 2,
              totalSteps: 4,
              observedAt: "2026-07-21T12:00:00.000Z",
            },
          ]),
        },
      ),
    ).rejects.toThrow("bounded fixture poll budget");
  });

  it("keeps registered workers production-bound and free of direct provider network calls", async () => {
    const [pdfTask, metaTask] = await Promise.all([
      readFile(resolve("apps/tasks/src/tasks/render-campaign-pdf.ts"), "utf8"),
      readFile(resolve("apps/tasks/src/tasks/poll-meta-publish.ts"), "utf8"),
    ]);

    expect(pdfTask).toContain('id: "render-campaign-pdf"');
    expect(metaTask).toContain('id: "poll-meta-publish"');
    expect(`${pdfTask}\n${metaTask}`).toContain("requireProductionTaskBindings");
    expect(`${pdfTask}\n${metaTask}`).not.toContain("FixtureOnlyDeliveryGuard");
    expect(`${pdfTask}\n${metaTask}`).not.toContain("fixtureOnly");
    expect(metaTask).not.toContain("progressFixtures");
    expect(metaTask).not.toContain("providerCallsMade");
    expect(`${pdfTask}\n${metaTask}`).not.toMatch(/\bfetch\s*\(|https?:\/\//u);
  });
});
