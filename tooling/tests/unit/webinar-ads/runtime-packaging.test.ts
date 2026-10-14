import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../../../apps/web/next.config.js";
import { WEBINAR_ADS } from "../../../../apps/web/src/features/webinar-ads/catalog.js";
import {
  readContainedWebinarFile,
  webinarPublicRoot,
} from "../../../../apps/web/src/server/webinar-ad-art.js";

const webRoot = resolve(import.meta.dirname, "../../../../apps/web");
const requireNext = createRequire(join(webRoot, "package.json"));
const picomatch = requireNext("next/dist/compiled/picomatch") as (
  pattern: string,
  options: { dot: boolean; contains: boolean },
) => (path: string) => boolean;
const glob = requireNext("next/dist/compiled/glob") as {
  sync(pattern: string, options: { cwd: string; nodir: boolean; dot: boolean }): string[];
};
const consumers = [
  "/api/campaigns/webinar-ads",
  "/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]",
  "/api/campaigns/webinar-ads/[campaignRef]/[campaignVersionRef]/[shape]",
  "/api/campaigns/approve",
  "/marketing/campaigns",
  "/marketing/campaigns/[campaignRef]",
  "/marketing/campaigns/[campaignRef]/versions/[versionNo]",
  "/overview",
];
const requiredFiles = [
  "next.config.ts",
  "public/fonts/LICENSE.txt",
  "public/fonts/webinar/AutomatedLOWebinarInter.ttf",
  "public/fonts/webinar/glyph-ranges.json",
  ...WEBINAR_ADS.flatMap((ad) =>
    ["tall", "square"].map((shape) => `public/webinar-ads/${ad.id}/v${ad.version}/${shape}.png`),
  ),
].sort();

/** Use the installed Next trace collector's route matcher and filesystem glob implementation. */
function includedFiles(route: string): string[] {
  const matchingFiles = (configuration: Record<string, string[]>): string[] =>
    Object.entries(configuration)
      .filter(([pattern]) => picomatch(pattern, { dot: true, contains: true })(route))
      .flatMap(([, paths]) => paths)
      .flatMap((pattern) =>
        glob.sync(pattern, {
          cwd: webRoot,
          nodir: true,
          dot: true,
        }),
      );
  return [...new Set(matchingFiles(nextConfig.outputFileTracingIncludes ?? {}))]
    .map((file) => file.replaceAll("\\", "/").replace(/^\.\//u, ""))
    .sort();
}

async function withPackagedAssets(
  layout: "application" | "monorepo",
  includeMarker: boolean,
  work: (cwd: string, publicRoot: string) => Promise<void>,
) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "oalo-webinar-packaging-"));
  const confined = relative(tmpdir(), temporaryRoot);
  if (confined.startsWith(`..${sep}`) || !confined.startsWith("oalo-webinar-packaging-"))
    throw new Error("Temporary packaging cleanup escaped its fixture directory.");
  const application = layout === "application" ? temporaryRoot : join(temporaryRoot, "apps", "web");
  try {
    for (const file of requiredFiles.filter((file) => includeMarker || file !== "next.config.ts")) {
      const destination = join(application, file);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(webRoot, file), destination);
    }
    await work(temporaryRoot, join(application, "public"));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

describe("webinar native renderer runtime packaging", () => {
  it.each(consumers)("includes all required filesystem assets for %s", (route) => {
    expect(includedFiles(route)).toEqual(requiredFiles);
  });

  it("does not add runtime assets to unrelated account and public capture routes", () => {
    expect(includedFiles("/settings/account")).toEqual([]);
    expect(includedFiles("/f/[publicationId]")).toEqual([]);
  });

  it("records the collector's descendant matching rather than claiming exact-route isolation", () => {
    for (const route of [
      "/marketing/campaigns/funnels/[kind]/preview",
      "/marketing/campaigns/property",
      "/marketing/campaigns/library",
      "/api/campaigns/webinar-ads/context",
    ]) {
      expect(includedFiles(route)).toEqual(requiredFiles);
    }
  });

  it.each(["application", "monorepo"] as const)(
    "preserves the loader's relative paths after a %s bundle relocation",
    async (layout) => {
      await withPackagedAssets(layout, true, async (cwd, publicRoot) => {
        expect(webinarPublicRoot(cwd)).toBe(publicRoot);
        for (const file of requiredFiles.filter((file) => file.startsWith("public/"))) {
          const loaded = await readContainedWebinarFile(
            publicRoot,
            file.slice(7).split("/"),
            1024 * 1024,
          );
          expect(loaded.bytes.byteLength).toBeGreaterThan(0);
          expect(loaded.path).toBe(join(publicRoot, file.slice(7)));
        }
      });
    },
  );

  it("detects the missing application-root marker instead of treating static assets as packaged", async () => {
    await withPackagedAssets("application", false, async (cwd, publicRoot) => {
      expect(webinarPublicRoot(cwd)).not.toBe(publicRoot);
      await expect(
        readContainedWebinarFile(
          webinarPublicRoot(cwd),
          ["fonts", "webinar", "glyph-ranges.json"],
          32 * 1024,
        ),
      ).rejects.toThrow();
    });
  });
});
