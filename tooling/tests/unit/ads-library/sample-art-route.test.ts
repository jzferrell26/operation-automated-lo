import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ADS_LIBRARY_SAMPLES_FLAG } from "../../../../apps/web/src/features/ads-library/server/catalog-loader.js";
import { handleSampleArtRequest } from "../../../../apps/web/src/features/ads-library/server/sample-art-route.js";
import { GET } from "../../../../apps/web/src/app/api/ads-library/samples/[adId]/[version]/[shape]/route.js";

/**
 * PRD-009c D2, 009C-AC-016. The sample art route takes exactly three typed parts, looks the entry
 * up in the loaded sample catalog, serves only that entry's derived art through the loader's
 * contained read, and answers 404 for anything else. Nothing from the request becomes a path.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SAMPLES_ON = Object.freeze({
  OALO_ENVIRONMENT: "local",
  [ADS_LIBRARY_SAMPLES_FLAG]: "enabled",
});
const ROUTE_ROOT = join(repositoryRoot, "apps/web/src/app/api/ads-library");

function parts(adId: string, version: string, shape: string) {
  return { adId, version, shape };
}

async function directoriesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const path = join(directory, item.name);
    found.push(path, ...(await directoriesUnder(path)));
  }
  return found;
}

describe("the sample art route (009C-AC-016)", () => {
  it("serves a known sample's bytes with the stored content type", async () => {
    const response = await handleSampleArtRequest(
      parts("sample-first-home", "2", "tall"),
      SAMPLES_ON,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const bytes = Buffer.from(await response.arrayBuffer());
    const catalog = JSON.parse(
      await readFile(
        join(repositoryRoot, "apps/web/src/fixtures/ads-library/sample-catalog.json"),
        "utf8",
      ),
    ) as Array<{ id: string; version: number; images: { tall: { sha256: string } } }>;
    const entry = catalog.find((item) => item.id === "sample-first-home" && item.version === 2);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(entry?.images.tall.sha256);
    expect(response.headers.get("content-length")).toBe(String(bytes.length));

    const square = await handleSampleArtRequest(
      parts("sample-first-home", "1", "square"),
      SAMPLES_ON,
    );
    expect(square.status).toBe(200);
    const retired = await handleSampleArtRequest(
      parts("sample-spring-search", "1", "tall"),
      SAMPLES_ON,
    );
    expect(retired.status).toBe(200);
  });

  it("answers 404 for every path trick, unknown id, bad version, and bad shape", async () => {
    const refused: ReadonlyArray<readonly [string, string, string]> = [
      ["..%2f..%2fpackage.json", "1", "tall"],
      ["../../package.json", "1", "tall"],
      ["%2e%2e", "1", "tall"],
      ["%2e%2e/", "1", "tall"],
      ["..", "1", "tall"],
      ["/etc/passwd", "1", "tall"],
      ["%2Fetc%2Fpasswd", "1", "tall"],
      ["C:\\Windows\\win.ini", "1", "tall"],
      ["sample-first-home\\..\\..", "1", "tall"],
      ["sample-first-home%5c..", "1", "tall"],
      ["sample-first-home", "1%2f..", "tall"],
      ["sample-first-home", "2", "tall%2f..%2f..%2fsample-catalog.json"],
      ["not-in-the-library", "1", "tall"],
      ["Sample-First-Home", "2", "tall"],
      ["sample-first-home", "0", "tall"],
      ["sample-first-home", "1.5", "tall"],
      ["sample-first-home", "02", "tall"],
      ["sample-first-home", "-1", "tall"],
      ["sample-first-home", "3", "tall"],
      ["sample-first-home", " 2", "tall"],
      ["sample-first-home", "2", "wide"],
      ["sample-first-home", "2", "tall.png"],
      ["sample-first-home", "2", "TALL"],
      ["sample-first-home", "2", ""],
    ];
    for (const [adId, version, shape] of refused) {
      const response = await handleSampleArtRequest(parts(adId, version, shape), SAMPLES_ON);
      expect(response.status, `${adId} ${version} ${shape}`).toBe(404);
    }
    for (const malformed of [
      undefined,
      null,
      "sample-first-home",
      { adId: "sample-first-home" },
      { adId: ["sample-first-home"], version: "2", shape: "tall" },
    ]) {
      expect((await handleSampleArtRequest(malformed, SAMPLES_ON)).status).toBe(404);
    }
  });

  it("is reachable only through the three typed parts, with no catch-all segment", async () => {
    const directories = (await directoriesUnder(ROUTE_ROOT)).map((path) =>
      relative(ROUTE_ROOT, path).replaceAll("\\", "/"),
    );
    expect(directories).toEqual(expect.arrayContaining(["samples/[adId]/[version]/[shape]"]));
    expect(directories.filter((path) => path.includes("[..."))).toEqual([]);
    expect(directories.filter((path) => path.includes("[[..."))).toEqual([]);
    const route = await readFile(
      join(ROUTE_ROOT, "samples/[adId]/[version]/[shape]/route.ts"),
      "utf8",
    );
    expect(route).toContain('export const dynamic = "force-dynamic";');
    expect(route).not.toMatch(/readFile|join\(|resolve\(/u);
  });

  it("wires the exported GET to the handler, which reads the process environment", async () => {
    const previous = process.env[ADS_LIBRARY_SAMPLES_FLAG];
    delete process.env[ADS_LIBRARY_SAMPLES_FLAG];
    try {
      const response = await GET(
        new Request("http://127.0.0.1/api/ads-library/samples/sample-first-home/2/tall"),
        {
          params: Promise.resolve(parts("sample-first-home", "2", "tall")),
        },
      );
      expect(response.status).toBe(404);
    } finally {
      if (previous !== undefined) process.env[ADS_LIBRARY_SAMPLES_FLAG] = previous;
    }
  });
});
