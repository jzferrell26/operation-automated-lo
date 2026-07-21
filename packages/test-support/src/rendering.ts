import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { z } from "zod";

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const fixtureFileSchema = z.string().regex(/^[a-z0-9-]+\.json$/u);
const canonicalFileSchema = z.string().regex(/^[a-z0-9-]+\.canonical\.json$/u);

export const RenderFixtureManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtureId: z.string().regex(/^[a-z0-9-]+$/u),
    renderer: z
      .object({
        id: z.literal("phase0-canonical-fixture"),
        version: z.string().regex(/^1\.[0-9]+\.[0-9]+$/u),
      })
      .strict(),
    template: z
      .object({
        id: z.string().regex(/^[a-z0-9-]+$/u),
        version: z.string().regex(/^1\.[0-9]+\.[0-9]+$/u),
      })
      .strict(),
    fonts: z
      .array(
        z
          .object({
            family: z.string().trim().min(1).max(80),
            version: z.string().trim().min(1).max(40),
            sha256: sha256Schema,
          })
          .strict(),
      )
      .min(1)
      .max(8),
    content: z
      .object({
        headline: z.string().min(1).max(500),
        address: z.string().min(1).max(1_000),
        disclosure: z.string().min(1).max(20_000),
        partner: z.string().min(1).max(1_000).optional(),
      })
      .strict(),
    assets: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]+$/u),
            kind: z.literal("local-placeholder"),
            mediaType: z.enum(["image/jpeg", "image/png"]),
            sha256: sha256Schema,
          })
          .strict(),
      )
      .max(8),
  })
  .strict();

export type RenderFixtureManifest = z.infer<typeof RenderFixtureManifestSchema>;

export const GoldenFixtureRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    canonicalizer: z.literal("oalo-json-nfc-lf-sorted-v1"),
    fixtures: z
      .array(
        z
          .object({
            file: fixtureFileSchema,
            canonicalFile: canonicalFileSchema,
            sha256: sha256Schema,
          })
          .strict(),
      )
      .min(3)
      .max(16),
  })
  .strict();

export type GoldenFixtureRegistry = z.infer<typeof GoldenFixtureRegistrySchema>;

export interface VerifiedGoldenFixture {
  readonly file: string;
  readonly sha256: string;
  readonly canonicalBytes: Uint8Array;
  readonly manifest: RenderFixtureManifest;
}

function freezeRecursively(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return;
  }

  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    freezeRecursively(Reflect.get(value, key), seen);
  }
  Object.freeze(value);
}

function canonicalJson(value: z.infer<ReturnType<typeof z.json>>): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value.replace(/\r\n?/gu, "\n").normalize("NFC"));
    case "boolean":
    case "number":
      return JSON.stringify(value);
    default:
      break;
  }
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const fields: string[] = [];
  const sortedKeys = Object.keys(value).sort((left, right) => left.localeCompare(right, "en"));
  for (const key of sortedKeys) {
    const entry = value[key];
    if (entry === undefined) throw new Error("Canonical JSON object cannot contain undefined");
    fields.push(`${JSON.stringify(key.normalize("NFC"))}:${canonicalJson(entry)}`);
  }
  return `{${fields.join(",")}}`;
}

export function canonicalBytes(input: unknown): Uint8Array {
  const jsonValue = z.json().parse(input);
  return new TextEncoder().encode(`${canonicalJson(jsonValue)}\n`);
}

export function canonicalSha256(input: unknown): string {
  return createHash("sha256").update(canonicalBytes(input)).digest("hex");
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const source = await readFile(filePath, "utf8");
  try {
    const parsed: unknown = JSON.parse(source);
    return parsed;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown JSON error";
    throw new Error(`Invalid JSON fixture at ${filePath}: ${message}`);
  }
}

function resolveFixtureFile(rootDirectory: string, fileName: string): string {
  const validatedName = fixtureFileSchema.parse(fileName);
  const root = resolve(rootDirectory);
  const target = resolve(root, validatedName);
  if (dirname(target) !== root) {
    throw new Error(`Fixture path escaped its immutable version directory: ${fileName}`);
  }
  return target;
}

export async function loadRenderFixture(
  rootDirectory: string,
  fileName: string,
): Promise<RenderFixtureManifest> {
  const input = await readJsonFile(resolveFixtureFile(rootDirectory, fileName));
  const manifest = RenderFixtureManifestSchema.parse(input);
  freezeRecursively(manifest);
  return manifest;
}

export async function loadGoldenFixtureRegistry(
  rootDirectory: string,
): Promise<GoldenFixtureRegistry> {
  const input = await readJsonFile(resolveFixtureFile(rootDirectory, "golden-manifest.json"));
  const registry = GoldenFixtureRegistrySchema.parse(input);
  freezeRecursively(registry);
  return registry;
}

export async function verifyGoldenFixtureSet(
  rootDirectory: string,
): Promise<readonly VerifiedGoldenFixture[]> {
  const registry = await loadGoldenFixtureRegistry(rootDirectory);
  const verified: VerifiedGoldenFixture[] = [];

  for (const expected of registry.fixtures) {
    const manifest = await loadRenderFixture(rootDirectory, expected.file);
    const bytes = canonicalBytes(manifest);
    const actualSha256 = createHash("sha256").update(bytes).digest("hex");
    if (actualSha256 !== expected.sha256) {
      throw new Error(
        `Golden fixture drift for ${expected.file}: expected ${expected.sha256}, received ${actualSha256}`,
      );
    }
    verified.push(
      Object.freeze({
        file: expected.file,
        sha256: actualSha256,
        canonicalBytes: bytes,
        manifest,
      }),
    );
  }

  return Object.freeze(verified);
}
