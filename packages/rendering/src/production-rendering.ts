import { createHash } from "node:crypto";

import {
  ArtifactRecordSchema,
  ArtifactTypeSchema,
  RenderManifestSchema,
  type ArtifactRecord,
  type ArtifactType,
  type RenderManifest,
} from "@oalo/contracts";
import { z } from "zod";

import { renderSourceForManifest, type RenderSourceDocument } from "./campaign-render-sources.js";

type CanonicalJson = z.infer<ReturnType<typeof z.json>>;

function canonicalJson(value: CanonicalJson): string {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value.replace(/\r\n?/gu, "\n").normalize("NFC"));
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([key, item]) => `${JSON.stringify(key.normalize("NFC"))}:${canonicalJson(item)}`)
    .join(",")}}`;
}

export function canonicalRenderBytes(input: unknown): Uint8Array {
  return new TextEncoder().encode(`${canonicalJson(z.json().parse(input))}\n`);
}

export function renderContentHash(input: unknown): string {
  return createHash("sha256").update(canonicalRenderBytes(input)).digest("hex");
}

const BrowserOutputSchema = z
  .object({
    bytes: z.instanceof(Uint8Array),
    mimeType: z.enum(["text/html", "application/pdf", "image/png", "image/jpeg"]),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    pageCount: z.number().int().positive().optional(),
  })
  .strict();

export interface BrowserOutput {
  readonly bytes: Uint8Array<ArrayBufferLike>;
  readonly mimeType: "text/html" | "application/pdf" | "image/png" | "image/jpeg";
  readonly width?: number;
  readonly height?: number;
  readonly pageCount?: number;
}

export interface DeterministicBrowserPort {
  render(
    input: Readonly<{
      manifest: RenderManifest;
      artifactType: ArtifactType;
      source: RenderSourceDocument;
      networkPolicy: "deny-all";
    }>,
  ): Promise<BrowserOutput>;
}

export interface PrivateArtifactPort {
  store(
    input: Readonly<{
      artifactRef: string;
      artifactType: ArtifactType;
      locationRef: string;
      campaignRef: string;
      campaignVersionRef: string;
      sha256: string;
      mimeType: BrowserOutput["mimeType"];
      bytes: Uint8Array;
    }>,
  ): Promise<string>;
}

export interface RenderBatchInput {
  readonly manifest: unknown;
  readonly artifactTypes: readonly ArtifactType[];
  readonly createdAt: Date;
}

function artifactReference(manifest: RenderManifest, artifactType: ArtifactType): string {
  return `artifact_${renderContentHash({ manifest, artifactType }).slice(0, 32)}`;
}

function assertOutputMatchesSource(
  source: RenderSourceDocument,
  output: z.output<typeof BrowserOutputSchema>,
): void {
  switch (source.output.format) {
    case "html":
      if (output.mimeType !== "text/html") {
        throw new Error("Public page renderer returned an unexpected MIME type");
      }
      return;
    case "pdf":
      if (output.mimeType !== "application/pdf" || output.pageCount === undefined) {
        throw new Error("PDF renderer must return a PDF with a positive page count");
      }
      return;
    case "png":
      if (
        output.mimeType !== "image/png" ||
        output.width !== source.output.width ||
        output.height !== source.output.height
      ) {
        throw new Error("Image renderer output does not match the approved dimensions");
      }
  }
}

export async function renderArtifactBatch(
  input: RenderBatchInput,
  ports: Readonly<{ browser: DeterministicBrowserPort; storage: PrivateArtifactPort }>,
): Promise<readonly ArtifactRecord[]> {
  const manifest = RenderManifestSchema.parse(input.manifest);
  const artifactTypes = z.array(ArtifactTypeSchema).min(1).max(5).parse(input.artifactTypes);
  const records: ArtifactRecord[] = [];

  for (const artifactType of artifactTypes) {
    const source = renderSourceForManifest(manifest, artifactType);
    const output = BrowserOutputSchema.parse(
      await ports.browser.render({ manifest, artifactType, source, networkPolicy: "deny-all" }),
    );
    assertOutputMatchesSource(source, output);
    const sha256 = createHash("sha256").update(output.bytes).digest("hex");
    const artifactRef = artifactReference(manifest, artifactType);
    const storageKey = await ports.storage.store({
      artifactRef,
      artifactType,
      locationRef: manifest.locationRef,
      campaignRef: manifest.campaignRef,
      campaignVersionRef: manifest.campaignVersionRef,
      sha256,
      mimeType: output.mimeType,
      bytes: output.bytes,
    });
    records.push(
      ArtifactRecordSchema.parse({
        schemaVersion: 1,
        artifactRef,
        artifactType,
        locationRef: manifest.locationRef,
        campaignRef: manifest.campaignRef,
        campaignVersionRef: manifest.campaignVersionRef,
        manifestRef: manifest.manifestRef,
        blueprintVersionRef: manifest.blueprintVersionRef,
        profileVersions: manifest.profileVersions,
        rendererVersion: manifest.renderer.version,
        browserVersion: manifest.browser.version,
        templateVersion: manifest.template.version,
        fontHashes: manifest.fonts.map((font) => font.sha256),
        sha256,
        mimeType: output.mimeType,
        byteSize: output.bytes.byteLength,
        width: output.width,
        height: output.height,
        pageCount: output.pageCount,
        storageKey,
        status: "ready",
        createdAt: input.createdAt.toISOString(),
      }),
    );
  }
  return Object.freeze(records);
}
