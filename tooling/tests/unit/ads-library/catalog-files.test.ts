import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_ART_SHAPES,
  ADS_LIBRARY_ART_SIZES,
  ADS_LIBRARY_MAX_ART_BYTES,
  adsLibraryArtExtension,
  adsLibraryCatalogSchema,
  type AdsLibraryCatalogKind,
  type AdsLibraryEntry,
} from "@oalo/contracts";
import { evaluateLibraryAdWords } from "@oalo/domain";

import {
  lockProblems,
  lockRewrites,
  type CatalogLockLine,
} from "../../../scripts/ads-library/catalog-lock.mjs";
import { inspectAdsLibraryArt } from "../../../../apps/web/src/features/ads-library/server/art-file.js";

/**
 * PRD-009c D1 and D7, 009C-AC-002. The schema test over both catalogs and every file they name.
 *
 * For every entry: the schema, each `(id, version)` once, and for each art file that it exists under
 * its catalog's fixed root as a regular file (not a link out of the root), is PNG or JPEG by its
 * magic bytes, is exactly the size D1 states, is at most 1 MiB, carries no EXIF, XMP, IPTC, or PNG
 * text metadata, and has the digest the entry records. Real entries use only the real art root and
 * samples only the sample root, and neither root holds a file no entry names. The default words pass
 * the word checks. The immutability test compares each catalog with its committed append-only lock
 * offline, and with `origin/main`'s lock when that ref has been fetched.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const webRoot = join(repositoryRoot, "apps/web");

const CATALOGS: Readonly<
  Record<AdsLibraryCatalogKind, Readonly<{ catalog: string; lock: string; artRoot: string }>>
> = {
  real: {
    catalog: join(webRoot, "src/features/ads-library/catalog/catalog.json"),
    lock: join(webRoot, "src/features/ads-library/catalog/catalog.lock.json"),
    artRoot: join(webRoot, "public/ads-library"),
  },
  sample: {
    catalog: join(webRoot, "src/fixtures/ads-library/sample-catalog.json"),
    lock: join(webRoot, "src/fixtures/ads-library/sample-catalog.lock.json"),
    artRoot: join(webRoot, "src/fixtures/ads-library/art"),
  },
};

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function entriesOf(kind: AdsLibraryCatalogKind): Promise<readonly AdsLibraryEntry[]> {
  return adsLibraryCatalogSchema(kind).parse(await readJson(CATALOGS[kind].catalog));
}

async function filesUnder(directory: string): Promise<string[]> {
  let items;
  try {
    items = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const found: string[] = [];
  for (const item of items) {
    const path = join(directory, item.name);
    if (item.isDirectory()) found.push(...(await filesUnder(path)));
    else found.push(path);
  }
  return found;
}

/**
 * 009C-AC-002's last clause: a curated default passes the word checks of 009d D5. These are the
 * domain's own checks (`packages/domain/src/library-ad-words.ts`), the same ones a person's edited
 * words meet at "Save and check", so an ad cannot ship words its own campaigns would be sent back
 * for. The default sits in the headline or ad text slot it fills, and every Brand slot holds the
 * repository's clean sample identity, so a finding can only come from the default itself.
 */
const CLEAN_BRAND = Object.freeze({
  name: "Alex Morgan",
  title: "Loan officer",
  company: "Prairie Home Lending",
  disclosureLine: "Equal Housing Opportunity.",
  leadFormWording:
    "By submitting, you agree to be contacted about home financing and related mortgage services.",
});

function wordFindings(headline: string, primaryText = "Send me a message."): string[] {
  return evaluateLibraryAdWords({ ...CLEAN_BRAND, headline, primaryText }, []).map(
    (finding) => `${finding.ruleCode}: ${finding.remediation}`,
  );
}

describe("ads library catalogs and their files (009C-AC-002)", () => {
  for (const kind of ["real", "sample"] as const) {
    describe(`the ${kind} catalog`, () => {
      it("passes the schema, and each entry names only its own catalog's kind and art", async () => {
        const entries = await entriesOf(kind);
        const keys = entries.map((entry) => `${entry.id}@${String(entry.version)}`);
        expect(new Set(keys).size).toBe(keys.length);
        for (const entry of entries) {
          expect(entry.sample).toBe(kind === "sample");
        }
      });

      it("names art files that exist inside the fixed root and are exactly what D1 allows", async () => {
        const { artRoot } = CATALOGS[kind];
        const named = new Set<string>();
        for (const entry of await entriesOf(kind)) {
          for (const shape of ADS_LIBRARY_ART_SHAPES) {
            const art = entry.images[shape].art;
            const path = resolve(artRoot, art);
            named.add(path);
            const label = `${entry.id} v${String(entry.version)} ${shape}`;
            const stat = await lstat(path);
            expect(stat.isFile(), `${label} is a regular file`).toBe(true);
            const realRoot = await realpath(artRoot);
            expect((await realpath(path)).startsWith(`${realRoot}${sep}`), label).toBe(true);
            expect(stat.size, label).toBeLessThanOrEqual(ADS_LIBRARY_MAX_ART_BYTES);
            const bytes = await readFile(path);
            const inspection = inspectAdsLibraryArt(bytes);
            expect(inspection.ok, label).toBe(true);
            if (!inspection.ok) continue;
            expect(inspection.type, label).toBe(
              adsLibraryArtExtension(art) === "jpg" ? "jpeg" : "png",
            );
            expect({ width: inspection.width, height: inspection.height }, label).toEqual(
              ADS_LIBRARY_ART_SIZES[shape],
            );
            expect(inspection.metadata, label).toEqual([]);
            expect(createHash("sha256").update(bytes).digest("hex"), label).toBe(
              entry.images[shape].sha256,
            );
          }
        }
        // Nothing sits under a root that no entry names: a stray file under public/ would be served.
        const present = (await filesUnder(artRoot)).filter((path) => !path.endsWith(".gitkeep"));
        expect(
          present.filter((path) => !named.has(path)).map((path) => relative(artRoot, path)),
        ).toEqual([]);
      });

      it("has default words that pass the word checks", async () => {
        for (const entry of await entriesOf(kind)) {
          const label = `${entry.id} v${String(entry.version)}`;
          expect(
            wordFindings(entry.defaults.headline, entry.defaults.primaryText),
            `${label}: ${entry.defaults.headline} / ${entry.defaults.primaryText}`,
          ).toEqual([]);
          // The name is the card's title and the campaign's name, so it is held to the same words.
          expect(wordFindings(entry.name), `${label}: ${entry.name}`).toEqual([]);
        }
      });

      it("matches its committed append-only lock line for line", async () => {
        const lock = (await readJson(CATALOGS[kind].lock)) as CatalogLockLine[];
        expect(lockProblems(lock, await entriesOf(kind))).toEqual([]);
      });

      it("has not rewritten or dropped a line of origin/main's lock, when that ref is fetched", async () => {
        const lockPath = relative(repositoryRoot, CATALOGS[kind].lock).replaceAll("\\", "/");
        let base: string;
        try {
          base = execFileSync("git", ["show", `origin/main:${lockPath}`], {
            cwd: repositoryRoot,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
          });
        } catch {
          // origin/main is not fetched here, or the lock is not on it yet. The offline lock above
          // still holds; CI fetches main and runs this comparison.
          return;
        }
        const current = (await readJson(CATALOGS[kind].lock)) as CatalogLockLine[];
        expect(lockRewrites(JSON.parse(base) as CatalogLockLine[], current)).toEqual([]);
      });
    });
  }

  it("checks the defaults with 009d's own detector, which reads what a stand-in would miss", () => {
    for (const text of [
      "Send me your SSN",
      "Have your date of birth ready",
      "Ask about our r a t e s",
      "Down payment of a few thousand",
      "Mortgage brokers association member",
      "Ten percent down",
    ]) {
      expect(wordFindings(text), text).not.toEqual([]);
    }
    expect(wordFindings("Down payment help may be closer than you think.")).toEqual([]);
  });

  it("keeps the two catalogs' ids apart, so an id names one kind of ad", async () => {
    const real = new Set((await entriesOf("real")).map((entry) => entry.id));
    for (const entry of await entriesOf("sample")) {
      expect(real.has(entry.id)).toBe(false);
    }
  });
});
