import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import vitestConfig from "../../../../vitest.config.js";

/**
 * PRD-009c, 009C-AC-013 (and MTK-010): the loader module imports `server-only`, with no package added.
 *
 * `server-only` makes "a client file reaches the loader" a build error instead of a convention: Next
 * aliases the name to an empty module for the server and to a module that throws for the browser, so
 * nothing is installed and `pnpm-lock.yaml` gains nothing. Every other runtime that loads the loader
 * is a Vitest project, which needs an alias to an empty module. These checks fail if the import is
 * removed, if the alias or its empty module goes, or if a package sneaks in.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const LOADER = "apps/web/src/features/ads-library/server/catalog-loader.ts";

/** Source with its comments removed, so a mention in a comment or a string is not an import. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:"'])\/\/[^\n]*/gu, "$1");
}

/** True when the source has a top-level `import "server-only";` statement. */
export function importsServerOnly(source: string): boolean {
  return /^import\s+["']server-only["'];?\s*$/mu.test(withoutComments(source));
}

describe("the loader imports server-only (009C-AC-013)", () => {
  it('has a top-level `import "server-only";`', async () => {
    expect(importsServerOnly(await readFile(join(repositoryRoot, LOADER), "utf8"))).toBe(true);
  });

  it("would notice the import being removed, commented out, or only mentioned", () => {
    expect(importsServerOnly('import "server-only";\nimport { a } from "./a.js";\n')).toBe(true);
    expect(importsServerOnly('import { a } from "./a.js";\n')).toBe(false);
    expect(importsServerOnly('// import "server-only";\nimport { a } from "./a.js";\n')).toBe(
      false,
    );
    expect(importsServerOnly('/*\nimport "server-only";\n*/\nexport const x = 1;\n')).toBe(false);
    expect(importsServerOnly("export const note = 'import \"server-only\";';\n")).toBe(false);
    expect(importsServerOnly('import { x } from "server-only";\n')).toBe(false);
  });

  it("is loadable under Vitest, which is what the alias is for", async () => {
    const loader =
      await import("../../../../apps/web/src/features/ads-library/server/catalog-loader.js");
    expect(typeof loader.loadAdsLibrary).toBe("function");
  });
});

describe("the Vitest alias for server-only", () => {
  const alias = (vitestConfig.resolve?.alias ?? {}) as Readonly<Record<string, string>>;

  it("points `server-only` at a module that does nothing", async () => {
    const target = alias["server-only"];
    expect(target, "vitest.config.ts aliases server-only").toBeTypeOf("string");
    expect(existsSync(target ?? "")).toBe(true);
    const source = withoutComments(await readFile(target ?? "", "utf8"));
    // An empty module: no import, no require, no throw, and nothing it runs.
    expect(source).not.toMatch(/\b(?:import|require|throw|process|globalThis)\b/u);
    expect(source.replace(/\s+/gu, "")).toBe("export{};");
  });

  it("reaches every Vitest project, because they share the one resolve block", async () => {
    const config = await readFile(join(repositoryRoot, "vitest.config.ts"), "utf8");
    const projects = config.slice(config.indexOf("projects: ["));
    expect(projects.match(/resolve: workspaceResolve/gu)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
});

describe("no server-only package (MTK-010)", () => {
  it.each(["pnpm-lock.yaml", "package.json", "apps/web/package.json"])(
    "%s names no server-only package",
    async (file) => {
      expect(await readFile(join(repositoryRoot, file), "utf8")).not.toMatch(/server-only/u);
    },
  );
});
