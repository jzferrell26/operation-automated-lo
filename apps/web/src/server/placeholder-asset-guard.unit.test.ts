import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-008b 008B-AC-001. The property placeholder asset is a synthetic fixture. It stood in for an
 * approved image on every saved Open House Boost version, and the loan officer never supplied it.
 * No source file outside a test or a synthetic fixture may name it again.
 *
 * The scan reads files rather than importing them, because the failure it prevents is a string
 * typed into a file nobody was looking at. The roots are everything that ships or seeds data; the
 * only exclusions are the two places the asset is allowed to live.
 */

const PLACEHOLDER_ASSET = "asset_propertyPlaceholder001";

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

const SCANNED_ROOTS: readonly string[] = ["apps", "packages", "supabase", "tooling/scripts"];

const SOURCE_EXTENSIONS: ReadonlySet<string> = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".sql",
]);

const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".turbo",
  ".git",
]);

/** A test names the asset to forbid it, and a synthetic fixture is where the asset belongs. */
function isTestOrSyntheticFixture(path: string): boolean {
  const segments = path.split(sep);
  const name = segments[segments.length - 1] ?? "";
  return (
    /\.(test|spec)\./u.test(name) ||
    segments.includes("fixtures") ||
    segments.includes("__fixtures__") ||
    /fixture/iu.test(name)
  );
}

async function collectSourceFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return SKIPPED_DIRECTORIES.has(entry.name) ? [] : collectSourceFiles(path);
      }
      return SOURCE_EXTENSIONS.has(extname(entry.name)) && !isTestOrSyntheticFixture(path)
        ? [path]
        : [];
    }),
  );
  return nested.flat();
}

/** Every `file:line` under the roots that names the placeholder asset, outside tests and fixtures. */
async function findPlaceholderAssetHits(
  base: string,
  roots: readonly string[],
): Promise<readonly string[]> {
  const files = (await Promise.all(roots.map((root) => collectSourceFiles(join(base, root))))).flat();
  const hits = await Promise.all(
    files.map(async (file) => {
      const lines = (await readFile(file, "utf8")).split(/\r?\n/u);
      return lines.flatMap((line, index) =>
        line.includes(PLACEHOLDER_ASSET)
          ? [`${relative(base, file).split(sep).join("/")}:${String(index + 1)}`]
          : [],
      );
    }),
  );
  return hits.flat();
}

describe("the property placeholder asset", () => {
  it("is named by no source file outside tests and synthetic fixtures", async () => {
    expect(await findPlaceholderAssetHits(repositoryRoot, SCANNED_ROOTS)).toEqual([]);
  });

  /**
   * A guard that cannot fail is not a guard. This plants the string where a real regression would
   * put it, and beside it in a test file and a fixture directory where it is allowed, and asserts
   * that only the real one is reported, with its file and line.
   */
  it("reports a planted occurrence with its file and line, and spares tests and fixtures", async () => {
    const base = await mkdtemp(join(tmpdir(), "oalo-placeholder-guard-"));
    try {
      await mkdir(join(base, "apps", "web", "src", "server"), { recursive: true });
      await mkdir(join(base, "apps", "web", "src", "fixtures"), { recursive: true });
      await writeFile(
        join(base, "apps", "web", "src", "server", "draft.ts"),
        `export const ok = 1;\nexport const image = "${PLACEHOLDER_ASSET}";\n`,
      );
      await writeFile(
        join(base, "apps", "web", "src", "server", "draft.unit.test.ts"),
        `expect(x).not.toContain("${PLACEHOLDER_ASSET}");\n`,
      );
      await writeFile(
        join(base, "apps", "web", "src", "fixtures", "synthetic.ts"),
        `export const image = "${PLACEHOLDER_ASSET}";\n`,
      );

      expect(await findPlaceholderAssetHits(base, ["apps"])).toEqual([
        "apps/web/src/server/draft.ts:2",
      ]);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });
});
