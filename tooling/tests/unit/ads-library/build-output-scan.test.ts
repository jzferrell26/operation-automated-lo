import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findSampleTraces } from "../../../scripts/ads-library/scan-build-output.mjs";

/**
 * PRD-009c D2 and D3, 009C-AC-004 (the build-output scan). A production build must hold no sample
 * catalog entry and no sample art. The scan looks for every sample id and name
 * in the build's text files, and for every sample art file by its digest, whatever it is called.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SAMPLE_CATALOG = join(
  repositoryRoot,
  "apps/web/src/fixtures/ads-library/sample-catalog.json",
);
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function fakeBuild(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "oalo-build-scan-"));
  temporary.push(directory);
  await mkdir(join(directory, "server/app"), { recursive: true });
  await writeFile(
    join(directory, "server/app/page.js"),
    'export default function Page(){return "Ads library"}',
  );
  await writeFile(join(directory, "BUILD_ID"), "local");
  return directory;
}

describe("the build-output scan", () => {
  it("finds nothing in a build that holds no sample", async () => {
    expect(await findSampleTraces(await fakeBuild(), SAMPLE_CATALOG)).toEqual([]);
  });

  it("finds a sample's name or id in any text file", async () => {
    const build = await fakeBuild();
    await writeFile(
      join(build, "server/app/chunk.js"),
      'const ads=[{name:"Sample: First home, start here"}]',
    );
    await writeFile(join(build, "server/app/other.js"), 'fetch("/x/sample-va-home-loans")');
    await writeFile(join(build, "server/app/third.json"), '{"id":"sample-spring-search"}');
    // The schema's own constants are in every build by design, and are not entries.
    await writeFile(
      join(build, "server/app/schema.js"),
      'const a="Sample catalog, not a real approval",b="sample-",c="sample-catalog.json"',
    );
    const traces = await findSampleTraces(build, SAMPLE_CATALOG);
    expect(traces.map((trace) => trace.file).sort()).toEqual([
      "server/app/chunk.js",
      "server/app/other.js",
      "server/app/third.json",
    ]);
  });

  it("finds sample art by its bytes, under any name", async () => {
    const build = await fakeBuild();
    await mkdir(join(build, "static/media"), { recursive: true });
    await cp(
      join(repositoryRoot, "apps/web/src/fixtures/ads-library/art/sample-first-home/v2/tall.png"),
      join(build, "static/media/abc123.png"),
    );
    const traces = await findSampleTraces(build, SAMPLE_CATALOG);
    expect(traces).toEqual([{ file: "static/media/abc123.png", marker: "sample art bytes" }]);
  });

  it("reads the sample catalog it is given", async () => {
    const catalog = JSON.parse(await readFile(SAMPLE_CATALOG, "utf8")) as unknown[];
    expect(catalog.length).toBeGreaterThanOrEqual(8);
  });
});
