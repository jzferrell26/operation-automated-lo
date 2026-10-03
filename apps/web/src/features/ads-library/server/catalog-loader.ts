import "server-only";

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

import type { LibraryAdCatalogStanding } from "@oalo/application";
import {
  ADS_LIBRARY_ART_SHAPES,
  ADS_LIBRARY_ART_SIZES,
  ADS_LIBRARY_MAX_ART_BYTES,
  adsLibraryArtExtension,
  adsLibraryCatalogSchema,
  type AdsLibraryArtShape,
  type AdsLibraryCatalogKind,
  type AdsLibraryEntry,
} from "@oalo/contracts";

import realCatalog from "../catalog/catalog.json" with { type: "json" };
import { contentTypeForArt, inspectAdsLibraryArt } from "./art-file.js";

/**
 * PRD-009c D1 to D3. The ads library loader: the fail-closed sample guard, the contained art read,
 * and the catalog as the server sees it.
 *
 * The real catalog is imported statically, so a deployment always carries it. The sample catalog is
 * never imported: it is read from disk only after the guard passes, and its paths are marked for
 * the build's file tracer to ignore, so a deployment's output holds neither its entries nor its art.
 *
 * Nothing here is reachable from a client component (009C-AC-013): it reads the file system, and
 * the entries it returns carry `compliance` and `approval`, which no browser needs. The `server-only`
 * import makes that a build error rather than a convention: Next aliases it to an empty module for
 * the server and to one that throws for the browser, with no package installed, and the Vitest
 * config aliases it to an empty module (`apps/web/src/testing/server-only.ts`).
 */

/** The one switch for the samples. It is set by local runs and tests, and never by a deployment. */
export const ADS_LIBRARY_SAMPLES_FLAG = "OALO_ADS_LIBRARY_SAMPLES";

/**
 * Signals that the process is a deployment. Vercel sets `VERCEL=1` only when a project exposes its
 * system environment variables (a per-project setting), so it is one signal among three: any one of
 * them, set to anything at all, refuses the samples.
 */
const DEPLOYMENT_SIGNALS = ["VERCEL", "VERCEL_ENV", "OALO_RELEASE_MANIFEST_JSON"] as const;

function rawValue(environment: unknown, name: string): string | undefined {
  if (typeof environment !== "object" || environment === null) return undefined;
  const value: unknown = Reflect.get(environment, name);
  return typeof value === "string" ? value : undefined;
}

/**
 * PRD-009c D3, 009C-AC-004. True only when the flag is exactly `enabled`, `OALO_ENVIRONMENT` is
 * exactly `local`, and no deployment-shaped signal is set. Each value is read raw: the existing
 * schemas default an unset `OALO_ENVIRONMENT` to `local`, so reading through one of them would let
 * a deployment that never set it pass. Unset is not local.
 */
export function adsLibrarySamplesEnabled(environment: unknown = process.env): boolean {
  if (rawValue(environment, ADS_LIBRARY_SAMPLES_FLAG) !== "enabled") return false;
  if (rawValue(environment, "OALO_ENVIRONMENT") !== "local") return false;
  return DEPLOYMENT_SIGNALS.every((name) => rawValue(environment, name) === undefined);
}

export interface AdsLibraryRoots {
  readonly realArtRoot: string;
  readonly sampleCatalogFile: string;
  readonly sampleArtRoot: string;
}

/**
 * The fixed roots, under the web application. `next start` runs with the application as its working
 * directory and the test runner with the repository root, so both resolve to the same folders.
 */
export function defaultAdsLibraryRoots(workingDirectory: string = process.cwd()): AdsLibraryRoots {
  const application = existsSync(
    join(/* turbopackIgnore: true */ workingDirectory, "next.config.ts"),
  )
    ? workingDirectory
    : join(/* turbopackIgnore: true */ workingDirectory, "apps", "web");
  return Object.freeze({
    realArtRoot: join(/* turbopackIgnore: true */ application, "public", "ads-library"),
    sampleCatalogFile: join(
      /* turbopackIgnore: true */ application,
      "src",
      "fixtures",
      "ads-library",
      "sample-catalog.json",
    ),
    sampleArtRoot: join(
      /* turbopackIgnore: true */ application,
      "src",
      "fixtures",
      "ads-library",
      "art",
    ),
  });
}

export type AdsLibraryArtRefusalReason =
  | "art-name-not-derived"
  | "art-missing"
  | "art-outside-root"
  | "art-not-regular-file"
  | "art-too-large"
  | "art-type"
  | "art-digest-mismatch";

export class AdsLibraryArtRefusedError extends Error {
  public readonly reason: AdsLibraryArtRefusalReason;

  public constructor(reason: AdsLibraryArtRefusalReason) {
    super(`Ads library art was refused: ${reason}`);
    this.name = "AdsLibraryArtRefusedError";
    this.reason = reason;
  }
}

/**
 * The only shape an art name can have: `<id>/v<version>/<tall|square>.<png|jpg>`. The catalog schema
 * already requires the name derived from the entry's own fields; the read checks it again, so a
 * caller that passed anything else (a `..`, a separator, a drive, a scheme) is refused before the
 * file system is touched.
 */
const DERIVED_ART_NAME =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/v[1-9][0-9]{0,2}\/(?:tall|square)\.(?:png|jpg)$/u;

export interface ContainedArt {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly contentType: "image/png" | "image/jpeg";
}

/**
 * PRD-009c D1. Joins a derived name to a fixed root, resolves the real path (following any link),
 * refuses it unless it stays inside the root's real path and is a regular file of at most 1 MiB,
 * whose magic bytes match its extension and whose SHA-256 is the one the catalog records.
 */
export async function readContainedArt(
  root: string,
  artName: string,
  expectedSha256: string,
): Promise<ContainedArt> {
  if (!DERIVED_ART_NAME.test(artName)) throw new AdsLibraryArtRefusedError("art-name-not-derived");
  let realRoot: string;
  let realTarget: string;
  try {
    realRoot = await realpath(/* turbopackIgnore: true */ root);
    realTarget = await realpath(resolve(/* turbopackIgnore: true */ root, artName));
  } catch {
    throw new AdsLibraryArtRefusedError("art-missing");
  }
  if (!realTarget.startsWith(`${realRoot}${sep}`)) {
    throw new AdsLibraryArtRefusedError("art-outside-root");
  }
  const info = await stat(realTarget);
  if (!info.isFile()) throw new AdsLibraryArtRefusedError("art-not-regular-file");
  if (info.size > ADS_LIBRARY_MAX_ART_BYTES) throw new AdsLibraryArtRefusedError("art-too-large");
  const bytes = await readFile(realTarget);
  const inspection = inspectAdsLibraryArt(bytes);
  const expectedType = adsLibraryArtExtension(artName) === "jpg" ? "jpeg" : "png";
  if (!inspection.ok || inspection.type !== expectedType) {
    throw new AdsLibraryArtRefusedError("art-type");
  }
  const shape: AdsLibraryArtShape = artName.includes("/tall.") ? "tall" : "square";
  if (
    inspection.width !== ADS_LIBRARY_ART_SIZES[shape].width ||
    inspection.height !== ADS_LIBRARY_ART_SIZES[shape].height
  ) {
    throw new AdsLibraryArtRefusedError("art-type");
  }
  if (createHash("sha256").update(bytes).digest("hex") !== expectedSha256) {
    throw new AdsLibraryArtRefusedError("art-digest-mismatch");
  }
  return Object.freeze({
    bytes: new Uint8Array(bytes),
    contentType: contentTypeForArt(inspection.type),
  });
}

export interface LoadedAdsLibraryEntry {
  readonly entry: AdsLibraryEntry;
  readonly source: AdsLibraryCatalogKind;
  readonly art: Readonly<
    Record<AdsLibraryArtShape, Readonly<{ url: string; contentType: "image/png" | "image/jpeg" }>>
  >;
}

export interface AdsLibraryRefusedEntry {
  readonly id: string;
  readonly version: number;
  readonly reason: AdsLibraryArtRefusalReason;
}

export interface LoadedAdsLibrary {
  readonly samplesIncluded: boolean;
  /** Every entry whose art was found and verified, retired and replaced versions included. */
  readonly entries: readonly LoadedAdsLibraryEntry[];
  readonly refused: readonly AdsLibraryRefusedEntry[];
  find(id: string, version: number): LoadedAdsLibraryEntry | undefined;
  /** Where an `(id, version)` stands, for the approval command's catalog port (D4). */
  standingOf(ad: Readonly<{ id: string; version: number }>): LibraryAdCatalogStanding | undefined;
}

function artUrl(source: AdsLibraryCatalogKind, entry: AdsLibraryEntry, shape: AdsLibraryArtShape) {
  return source === "real"
    ? `/ads-library/${entry.images[shape].art}`
    : `/api/ads-library/samples/${entry.id}/${String(entry.version)}/${shape}`;
}

async function verifyEntry(
  entry: AdsLibraryEntry,
  source: AdsLibraryCatalogKind,
  artRoot: string,
): Promise<LoadedAdsLibraryEntry | AdsLibraryRefusedEntry> {
  const art: Partial<
    Record<AdsLibraryArtShape, { url: string; contentType: "image/png" | "image/jpeg" }>
  > = {};
  for (const shape of ADS_LIBRARY_ART_SHAPES) {
    try {
      const contained = await readContainedArt(
        artRoot,
        entry.images[shape].art,
        entry.images[shape].sha256,
      );
      art[shape] = Object.freeze({
        url: artUrl(source, entry, shape),
        contentType: contained.contentType,
      });
    } catch (error) {
      if (error instanceof AdsLibraryArtRefusedError) {
        return Object.freeze({ id: entry.id, version: entry.version, reason: error.reason });
      }
      throw error;
    }
  }
  return Object.freeze({
    entry: deepFreeze(entry),
    source,
    art: Object.freeze(
      art as Record<AdsLibraryArtShape, { url: string; contentType: "image/png" | "image/jpeg" }>,
    ),
  });
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

async function readSampleCatalog(file: string): Promise<readonly AdsLibraryEntry[]> {
  const text = await readFile(/* turbopackIgnore: true */ file, "utf8");
  return adsLibraryCatalogSchema("sample").parse(JSON.parse(text));
}

const loaded = new Map<string, Promise<LoadedAdsLibrary>>();

/** Clears the per-process cache, for tests that load the library under different conditions. */
export function resetAdsLibraryCacheForTests(): void {
  loaded.clear();
}

/**
 * Loads the real catalog and, only when the sample guard passes, the sample catalog, verifying every
 * art file each entry names. A catalog that fails its schema fails the load: a broken catalog is a
 * bug to fix, never a reason to show a partial library. An entry whose art is missing, outside its
 * root, or not the recorded bytes is refused and left out, and listed in `refused`.
 *
 * Deployment files do not change while a process runs, so one verified load is kept per process for
 * each guard outcome and set of roots; the sample art route still re-reads and re-verifies the
 * bytes it serves.
 */
export function loadAdsLibrary(
  options: Readonly<{ environment?: unknown; roots?: AdsLibraryRoots }> = {},
): Promise<LoadedAdsLibrary> {
  const samplesIncluded = adsLibrarySamplesEnabled(
    "environment" in options ? options.environment : process.env,
  );
  const roots = options.roots ?? defaultAdsLibraryRoots();
  const key = JSON.stringify({ samplesIncluded, roots });
  const cached = loaded.get(key);
  if (cached !== undefined) return cached;
  const loading = buildLibrary(samplesIncluded, roots);
  loaded.set(key, loading);
  loading.catch(() => loaded.delete(key));
  return loading;
}

async function buildLibrary(
  samplesIncluded: boolean,
  roots: AdsLibraryRoots,
): Promise<LoadedAdsLibrary> {
  const real = adsLibraryCatalogSchema("real").parse(realCatalog);
  const samples = samplesIncluded ? await readSampleCatalog(roots.sampleCatalogFile) : [];
  const realIds = new Set(real.map((entry) => entry.id));
  if (samples.some((entry) => realIds.has(entry.id))) {
    throw new Error("A sample entry reuses an id from the real catalog.");
  }
  const sources: ReadonlyArray<
    readonly [AdsLibraryCatalogKind, readonly AdsLibraryEntry[], string]
  > = [
    ["real", real, roots.realArtRoot],
    ["sample", samples, roots.sampleArtRoot],
  ];
  const entries: LoadedAdsLibraryEntry[] = [];
  const refused: AdsLibraryRefusedEntry[] = [];
  const highest = new Map<string, AdsLibraryEntry>();
  for (const [source, catalog, artRoot] of sources) {
    for (const entry of catalog) {
      const current = highest.get(entry.id);
      if (current === undefined || entry.version > current.version) highest.set(entry.id, entry);
      const verified = await verifyEntry(entry, source, artRoot);
      if ("entry" in verified) entries.push(verified);
      else refused.push(verified);
    }
  }
  const library: LoadedAdsLibrary = {
    samplesIncluded,
    entries: Object.freeze(entries),
    refused: Object.freeze(refused),
    find(id, version) {
      return entries.find((item) => item.entry.id === id && item.entry.version === version);
    },
    standingOf(ad) {
      const found = library.find(ad.id, ad.version);
      const top = highest.get(ad.id);
      if (found === undefined || top === undefined) return undefined;
      return Object.freeze({
        status: found.entry.status,
        highestVersion: top.version,
        highestStatus: top.status,
        tallSha256: found.entry.images.tall.sha256,
        squareSha256: found.entry.images.square.sha256,
      });
    },
  };
  return Object.freeze(library);
}
