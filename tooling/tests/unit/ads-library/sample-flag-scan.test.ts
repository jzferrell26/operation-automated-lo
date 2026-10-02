import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009c D3, 009C-AC-004 (the source scan and the record check). The sample flag is spelled out
 * only where a local run or a test sets it, or where a document says never to set it on a
 * deployment. A deployment configuration, a workflow, or a product file that set it would put sample
 * ads in front of real users, so its name appearing anywhere else fails this test.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const FLAG = ["OALO", "ADS", "LIBRARY", "SAMPLES"].join("_");

/** Where the flag's name may appear, and why. */
const ALLOWED: Readonly<Record<string, string>> = {
  "apps/web/src/features/ads-library/server/catalog-loader.ts": "the loader and its guard",
  "tooling/scripts/database/review-browser-run.mjs": "the review test run, a local run",
  "playwright.config.ts": "the synthetic browser suite's local server",
  "tooling/tests/database/review-browser-run.test.ts": "the review run's own assertion",
  "tooling/tests/unit/ads-library/sample-guard.test.ts": "the guard's test",
  "README.md": "the synthetic demo section, which says never to set it on a deployment",
  "docs/production-environments.md": "the environment contract, which says never to set it",
};

/** Directories that hold no source, configuration, or deployment input. */
const SKIPPED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
  // Requirements, research, and QA records describe the flag; they configure nothing.
  "library",
]);

const BINARY = /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|zip|tgz|gz)$/iu;

async function filesUnder(directory: string): Promise<string[]> {
  const found: string[] = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(item.name))
        found.push(...(await filesUnder(join(directory, item.name))));
    } else if (item.isFile() && !BINARY.test(item.name)) {
      found.push(join(directory, item.name));
    }
  }
  return found;
}

/** The execution ledgers at the root are records the orchestrator writes, not configuration. */
function isRootLedger(path: string): boolean {
  return /^[A-Z_]*LEDGER\.md$/u.test(path);
}

describe("where the sample flag may appear (009C-AC-004)", () => {
  it("appears only in the allowlist", async () => {
    const hits: string[] = [];
    for (const path of await filesUnder(repositoryRoot)) {
      const name = relative(repositoryRoot, path).replaceAll("\\", "/");
      if (
        isRootLedger(name) ||
        name === "tooling/tests/unit/ads-library/sample-flag-scan.test.ts"
      ) {
        continue;
      }
      if ((await readFile(path, "utf8")).includes(FLAG)) hits.push(name);
    }
    expect(hits.filter((name) => !(name in ALLOWED)).sort()).toEqual([]);
    // The loader, the two local runs, and the environment contract always carry it.
    for (const required of [
      "apps/web/src/features/ads-library/server/catalog-loader.ts",
      "tooling/scripts/database/review-browser-run.mjs",
      "playwright.config.ts",
      "docs/production-environments.md",
    ]) {
      expect(hits).toContain(required);
    }
  }, 120_000);

  it("is set, with a raw local environment, by the synthetic browser suite's server", async () => {
    const config = await readFile(join(repositoryRoot, "playwright.config.ts"), "utf8");
    const webServer = config.slice(config.indexOf("webServer: {"), config.indexOf("projects: ["));
    expect(webServer).toMatch(new RegExp(`${FLAG}: "enabled"`, "u"));
    expect(webServer).toMatch(/OALO_ENVIRONMENT: "local"/u);
    expect(webServer).not.toMatch(/VERCEL|OALO_RELEASE_MANIFEST_JSON/u);
  });

  it("is never set by the dashboard preview server, which runs as preview, so its library is empty", async () => {
    const config = await readFile(
      join(repositoryRoot, "playwright.dashboard-preview.config.ts"),
      "utf8",
    );
    expect(config).not.toContain(FLAG);
    expect(config).toMatch(/OALO_ENVIRONMENT: "preview"/u);
  });

  it("is named in the environment contract with the rule that no deployment sets it", async () => {
    const contract = await readFile(
      join(repositoryRoot, "docs/production-environments.md"),
      "utf8",
    );
    const section = contract.slice(contract.indexOf(FLAG) - 400, contract.indexOf(FLAG) + 1_600);
    expect(section).toContain(FLAG);
    expect(section).toMatch(/never set (?:it )?on (?:a|any) deployment/iu);
    expect(section).toMatch(/OALO_ENVIRONMENT/u);
    expect(section).toMatch(/VERCEL_ENV/u);
  });
});
