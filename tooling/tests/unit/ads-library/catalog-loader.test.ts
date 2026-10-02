import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  ADS_LIBRARY_SAMPLES_FLAG,
  AdsLibraryArtRefusedError,
  defaultAdsLibraryRoots,
  loadAdsLibrary,
  readContainedArt,
  type AdsLibraryRoots,
} from "../../../../apps/web/src/features/ads-library/server/catalog-loader.js";

/**
 * PRD-009c D1 and D2. The loader joins each derived art name to its fixed root, resolves the real
 * path, refuses it unless it stays inside the root and is a regular file, and checks the bytes'
 * SHA-256 against the entry, refusing an entry whose bytes differ. The sample catalog is read from
 * disk only after the guard passes.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SAMPLES_ON = Object.freeze({
  OALO_ENVIRONMENT: "local",
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

/** A copy of the sample fixtures in a temporary directory, so a test can damage it. */
async function copiedSamples(): Promise<AdsLibraryRoots & { directory: string }> {
  const directory = await mkdtemp(join(tmpdir(), "oalo-ads-loader-"));
  temporary.push(directory);
  const fixtures = join(repositoryRoot, "apps/web/src/fixtures/ads-library");
  await cp(fixtures, join(directory, "fixtures"), { recursive: true });
  await mkdir(join(directory, "public"), { recursive: true });
  return {
    directory,
    realArtRoot: join(directory, "public"),
    sampleCatalogFile: join(directory, "fixtures/sample-catalog.json"),
    sampleArtRoot: join(directory, "fixtures/art"),
  };
}

describe("the ads library loader", () => {
  it("resolves its fixed roots from the web application, whichever directory it runs in", () => {
    const fromRepository = defaultAdsLibraryRoots(repositoryRoot);
    const fromApplication = defaultAdsLibraryRoots(join(repositoryRoot, "apps/web"));
    expect(fromRepository).toEqual(fromApplication);
    expect(fromRepository.realArtRoot).toBe(join(repositoryRoot, "apps/web/public/ads-library"));
    expect(fromRepository.sampleArtRoot).toBe(
      join(repositoryRoot, "apps/web/src/fixtures/ads-library/art"),
    );
  });

  it("loads the real catalog alone without the guard, and both catalogs with it", async () => {
    const realOnly = await loadAdsLibrary({ environment: {} });
    expect(realOnly.samplesIncluded).toBe(false);
    expect(realOnly.entries).toEqual([]);
    expect(realOnly.refused).toEqual([]);

    const withSamples = await loadAdsLibrary({ environment: SAMPLES_ON });
    expect(withSamples.samplesIncluded).toBe(true);
    expect(withSamples.entries.length).toBeGreaterThanOrEqual(8);
    expect(withSamples.refused).toEqual([]);
    const first = withSamples.find("sample-first-home", 2);
    expect(first?.source).toBe("sample");
    expect(first?.art.tall).toEqual({
      url: "/api/ads-library/samples/sample-first-home/2/tall",
      contentType: "image/png",
    });
    expect(Object.isFrozen(first?.entry)).toBe(true);
  });

  it("reports where each ad stands: found, its status, and its highest version", async () => {
    const library = await loadAdsLibrary({ environment: SAMPLES_ON });
    const current = library.find("sample-first-home", 2);
    expect(library.standingOf({ id: "sample-first-home", version: 2 })).toEqual({
      status: "active",
      highestVersion: 2,
      highestStatus: "active",
      tallSha256: current?.entry.images.tall.sha256,
      squareSha256: current?.entry.images.square.sha256,
    });
    expect(library.standingOf({ id: "sample-first-home", version: 1 })).toMatchObject({
      status: "replaced",
      highestVersion: 2,
      highestStatus: "active",
    });
    expect(library.standingOf({ id: "sample-spring-search", version: 1 })).toMatchObject({
      status: "retired",
      highestStatus: "retired",
    });
    expect(library.standingOf({ id: "sample-first-home", version: 3 })).toBeUndefined();
    expect(library.standingOf({ id: "not-in-the-library", version: 1 })).toBeUndefined();
    const withoutSamples = await loadAdsLibrary({ environment: {} });
    expect(withoutSamples.standingOf({ id: "sample-first-home", version: 2 })).toBeUndefined();
  });

  it("refuses an entry whose bytes differ from its digest and keeps the rest", async () => {
    const roots = await copiedSamples();
    const target = join(roots.sampleArtRoot, "sample-va-home-loans/v1/square.png");
    const bytes = await readFile(target);
    bytes[bytes.length - 20] = (bytes[bytes.length - 20] ?? 0) ^ 0xff;
    await writeFile(target, bytes);
    const library = await loadAdsLibrary({ environment: SAMPLES_ON, roots });
    expect(library.find("sample-va-home-loans", 1)).toBeUndefined();
    expect(library.refused).toEqual([
      { id: "sample-va-home-loans", version: 1, reason: "art-digest-mismatch" },
    ]);
    expect(library.find("sample-first-home", 2)).toBeDefined();
  });

  it("refuses a missing art file and art that is a directory", async () => {
    const roots = await copiedSamples();
    await rm(join(roots.sampleArtRoot, "sample-pre-approval/v1/tall.png"));
    await rm(join(roots.sampleArtRoot, "sample-loan-review/v1/square.png"));
    await mkdir(join(roots.sampleArtRoot, "sample-loan-review/v1/square.png"));
    const library = await loadAdsLibrary({ environment: SAMPLES_ON, roots });
    expect(library.refused).toEqual(
      expect.arrayContaining([
        { id: "sample-pre-approval", version: 1, reason: "art-missing" },
        { id: "sample-loan-review", version: 1, reason: "art-not-regular-file" },
      ]),
    );
  });

  it("refuses art that resolves outside its root through a link", async (context) => {
    const roots = await copiedSamples();
    const outside = join(roots.directory, "outside.png");
    const target = join(roots.sampleArtRoot, "sample-stronger-offer/v1/tall.png");
    await cp(target, outside);
    await rm(target);
    try {
      await symlink(outside, target);
    } catch (error) {
      // Windows refuses file links without a developer setting; the Linux CI runner makes them.
      if ((error as NodeJS.ErrnoException).code === "EPERM") context.skip();
      throw error;
    }
    const library = await loadAdsLibrary({ environment: SAMPLES_ON, roots });
    expect(library.refused).toContainEqual({
      id: "sample-stronger-offer",
      version: 1,
      reason: "art-outside-root",
    });
  });

  it("reads only a derived name, contained in the root, with the expected digest", async () => {
    const roots = defaultAdsLibraryRoots(repositoryRoot);
    const name = "sample-first-home/v2/tall.png";
    const bytes = await readFile(join(roots.sampleArtRoot, name));
    const digest = createHash("sha256").update(bytes).digest("hex");
    const art = await readContainedArt(roots.sampleArtRoot, name, digest);
    expect(art.contentType).toBe("image/png");
    expect(Buffer.from(art.bytes).equals(bytes)).toBe(true);

    for (const name of [
      "../sample-catalog.json",
      "..\\sample-catalog.json",
      "/etc/passwd",
      "C:/Windows/win.ini",
      "c:x.png",
      "sample-first-home/v2/../../../sample-catalog.json",
      "https://example.invalid/a.png",
      "sample-first-home/v2/tall.svg",
      "sample-first-home/v2/tall.png\u0000.svg",
      "",
    ]) {
      await expect(
        readContainedArt(roots.sampleArtRoot, name, digest),
        name,
      ).rejects.toBeInstanceOf(AdsLibraryArtRefusedError);
    }
    await expect(readContainedArt(roots.sampleArtRoot, name, "0".repeat(64))).rejects.toMatchObject(
      {
        reason: "art-digest-mismatch",
      },
    );
  });
});
