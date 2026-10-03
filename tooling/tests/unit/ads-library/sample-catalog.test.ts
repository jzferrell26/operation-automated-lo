import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_SAMPLE_APPROVAL,
  ADS_LIBRARY_TOPICS,
  adsLibraryCatalogSchema,
  type AdsLibraryEntry,
} from "@oalo/contracts";

import {
  SAMPLE_MARK_INK,
  generateSampleAds,
  sampleMarkProbes,
} from "../../../scripts/ads-library/generate-sample-art.mjs";

/**
 * PRD-009c D2, 009C-AC-003. The real catalog ships empty; the sample catalog holds at least eight
 * labelled samples across the five topics, uses only the repository's synthetic identity, and its
 * art is generated, byte for byte reproducibly, with a SAMPLE mark burned into the pixels.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const REAL_CATALOG = join(repositoryRoot, "apps/web/src/features/ads-library/catalog/catalog.json");
const SAMPLE_CATALOG = join(
  repositoryRoot,
  "apps/web/src/fixtures/ads-library/sample-catalog.json",
);
const SAMPLE_ART_ROOT = join(repositoryRoot, "apps/web/src/fixtures/ads-library/art");

const temporaryDirectories: string[] = [];

afterAll(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function sampleEntries(): Promise<readonly AdsLibraryEntry[]> {
  return adsLibraryCatalogSchema("sample").parse(await readJson(SAMPLE_CATALOG));
}

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) found.push(...(await filesUnder(path)));
    else found.push(path);
  }
  return found.sort();
}

async function generateInto(): Promise<Map<string, Buffer>> {
  const directory = await mkdtemp(join(tmpdir(), "oalo-sample-ads-"));
  temporaryDirectories.push(directory);
  await generateSampleAds({
    artRoot: join(directory, "art"),
    catalogFile: join(directory, "sample-catalog.json"),
    lockFile: join(directory, "sample-catalog.lock.json"),
  });
  const files = new Map<string, Buffer>();
  for (const path of await filesUnder(directory)) {
    files.set(relative(directory, path).replaceAll("\\", "/"), await readFile(path));
  }
  return files;
}

function withoutDigests(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value), (key, item: unknown) =>
    key === "sha256" ? "digest" : item,
  );
}

describe("the shipped catalogs (009C-AC-003)", () => {
  it("ships the real catalog as an empty list", async () => {
    expect(await readJson(REAL_CATALOG)).toEqual([]);
  });

  it("holds at least eight labelled samples whose active ads cover all five topics", async () => {
    const entries = await sampleEntries();
    expect(entries.length).toBeGreaterThanOrEqual(8);
    const active = entries.filter((entry) => entry.status === "active");
    expect(active.length).toBeGreaterThanOrEqual(8);
    expect(new Set(active.map((entry) => entry.topic))).toEqual(new Set(ADS_LIBRARY_TOPICS));
    for (const entry of entries) {
      expect(entry.sample).toBe(true);
      expect(entry.name.startsWith("Sample:")).toBe(true);
      expect(entry.approval.approvedBy).toBe(ADS_LIBRARY_SAMPLE_APPROVAL);
    }
    // A retired ad and a replaced version exist, so every library state can be shown and tested.
    expect(entries.some((entry) => entry.status === "retired")).toBe(true);
    expect(entries.some((entry) => entry.status === "replaced")).toBe(true);
  });

  it("uses only the repository's synthetic identity, and never says so in words a page shows", async () => {
    for (const entry of await sampleEntries()) {
      const shown = [
        entry.name,
        entry.images.alt,
        entry.defaults.headline,
        entry.defaults.primaryText,
      ];
      for (const text of shown) {
        expect(text).not.toMatch(/synthetic/iu);
        // No number at all, so no license number that could belong to a real licensee.
        expect(text).not.toMatch(/\d/u);
        for (const outsideIdentity of ["Jordan Rivera", "Sample Home Loans", "Realtor"]) {
          expect(text).not.toContain(outsideIdentity);
        }
      }
    }
  });

  it("burns a SAMPLE mark into every art file", async () => {
    for (const entry of await sampleEntries()) {
      for (const shape of ["tall", "square"] as const) {
        const { data, info } = await sharp(join(SAMPLE_ART_ROOT, entry.images[shape].art))
          .raw()
          .toBuffer({ resolveWithObject: true });
        for (const [x, y] of sampleMarkProbes(shape)) {
          const offset = (y * info.width + x) * info.channels;
          expect(
            [data[offset], data[offset + 1], data[offset + 2]],
            `${entry.id} ${shape}`,
          ).toEqual([...SAMPLE_MARK_INK]);
        }
      }
    }
  });

  it("generates byte-identical files on every run, and the committed catalog is the generator's", async () => {
    const first = await generateInto();
    const second = await generateInto();
    expect([...first.keys()]).toEqual([...second.keys()]);
    for (const [name, bytes] of first) {
      expect(bytes.equals(second.get(name) ?? Buffer.alloc(0)), name).toBe(true);
    }
    const generatedCatalog = JSON.parse(first.get("sample-catalog.json")?.toString("utf8") ?? "[]");
    expect(withoutDigests(generatedCatalog)).toEqual(
      withoutDigests(await readJson(SAMPLE_CATALOG)),
    );
  }, 60_000);
});
