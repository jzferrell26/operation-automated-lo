import type { DeliveryGuardPort } from "@oalo/application";
import {
  DeliveryReferenceSchema,
  ArtifactRecordSchema,
  type ArtifactRecord,
  type DeliveryReference,
  type RenderManifest,
} from "@oalo/contracts";
import {
  renderContentHash,
  type DeterministicBrowserPort,
  type PrivateArtifactPort,
} from "@oalo/rendering";
import { z } from "zod";

import {
  PdfRenderTaskRequestShape,
  executePdfRenderDelivery,
  refineTaskDeliveryLocation,
} from "./shared-task-execution.js";

const TaskSchemaVersion = 1 as const;

export const PdfRenderTaskRequestSchema = z
  .object({
    ...PdfRenderTaskRequestShape,
    fixtureOnly: z.literal(true),
  })
  .strict()
  .superRefine(refineTaskDeliveryLocation);

export type PdfRenderTaskRequest = z.infer<typeof PdfRenderTaskRequestSchema>;

export const PdfRenderTaskResultSchema = z
  .object({
    schemaVersion: z.literal(TaskSchemaVersion),
    fixtureOnly: z.literal(true),
    idempotencyScope: z.literal("fixture-worker-process"),
    networkAccessRequired: z.literal(false),
    delivery: DeliveryReferenceSchema,
    disposition: z.enum(["rendered", "duplicate"]),
    artifacts: z.array(ArtifactRecordSchema).max(1),
  })
  .strict()
  .readonly();

export type PdfRenderTaskResult = z.infer<typeof PdfRenderTaskResultSchema>;

export interface PdfRenderTaskPorts {
  readonly guard: DeliveryGuardPort;
  readonly browser: DeterministicBrowserPort;
  readonly storage: PrivateArtifactPort;
}

function fixturePdfBytes(manifest: RenderManifest): Uint8Array {
  const digest = renderContentHash({ manifest, artifactType: "pdf" });
  return new TextEncoder().encode(
    `%PDF-1.4\n% Phase 0 fixture-only render\n% ${digest}\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  );
}

export function createFixtureOnlyPdfRenderPorts(): Readonly<{
  browser: DeterministicBrowserPort;
  storage: PrivateArtifactPort;
}> {
  const browser: DeterministicBrowserPort = {
    async render(input) {
      if (input.artifactType !== "pdf" || input.networkPolicy !== "deny-all") {
        throw new Error("Fixture PDF worker accepts only a no-network PDF render request.");
      }
      return {
        bytes: fixturePdfBytes(input.manifest),
        mimeType: "application/pdf",
        pageCount: 1,
      };
    },
  };
  const storage: PrivateArtifactPort = {
    async store(input) {
      const storageDigest = renderContentHash({
        artifactRef: input.artifactRef,
        locationRef: input.locationRef,
        campaignRef: input.campaignRef,
        campaignVersionRef: input.campaignVersionRef,
        sha256: input.sha256,
      });
      return `fixture-only/${input.locationRef}/${input.artifactRef}/${storageDigest}.pdf`;
    },
  };
  return Object.freeze({ browser, storage });
}

function result(
  delivery: DeliveryReference,
  disposition: "rendered" | "duplicate",
  artifacts: readonly ArtifactRecord[],
): PdfRenderTaskResult {
  return PdfRenderTaskResultSchema.parse({
    schemaVersion: TaskSchemaVersion,
    fixtureOnly: true,
    idempotencyScope: "fixture-worker-process",
    networkAccessRequired: false,
    delivery,
    disposition,
    artifacts,
  });
}

export async function runPdfRenderTask(
  input: unknown,
  ports: PdfRenderTaskPorts,
): Promise<PdfRenderTaskResult> {
  const request = PdfRenderTaskRequestSchema.parse(input);
  const deliveryResult = await executePdfRenderDelivery(request, ports);
  return result(request.delivery, deliveryResult.disposition, deliveryResult.artifacts);
}
