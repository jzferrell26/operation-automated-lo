import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-008a 008A-AC-018. The owner-privileged seeding harness stays out of the application graph.
 *
 * `packages/db/test/route-seeding-bridge.js` re-exports the review-seeding surface of
 * `packages/db/test/campaign-integration-support.mjs`, the one module allowed to elevate to
 * `migration_owner` (`tests/security/database-privilege-escalation-boundary.test.ts`). Two support
 * modules under `apps/web/src/server/` import it for the route-level Postgres proofs. Today only
 * `*.postgres.test.ts` files import those, so nothing elevating reaches a route, a page, or a
 * bundle; the hazard is a future non-test module importing one of them and pulling seeding into
 * the application (PRD-005/006 batch security audit, second Low finding).
 *
 * This walks the static import graph from every non-test module under `apps/web/src/`, which
 * includes every route, page, layout, and other file under `app/` and Next's root entry modules,
 * and fails if either support module or anything under `packages/db/test/` is reachable. It
 * follows relative imports (`.js` specifiers resolve to their `.ts` or `.tsx` source, the way the
 * TypeScript build does) and `@oalo/*` workspace imports (resolved to `packages/<name>/src/`, the
 * way `vitest.config.ts` aliases them), so an indirect path through a package is caught too.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const webSource = join(repositoryRoot, "apps/web/src");

const SUPPORT_MODULES = Object.freeze([
  "apps/web/src/server/password-authentication-support.ts",
  "apps/web/src/server/campaign-route-postgres-support.ts",
]);
const SEEDING_HARNESS_DIRECTORY = "packages/db/test/";

const SOURCE_EXTENSIONS = Object.freeze([".ts", ".tsx"]);
const TEST_FILE_PATTERN = /\.(?:test|spec)\.tsx?$/u;
const IMPORT_PATTERN =
  /(?:^|[\s;])(?:import|export)\s[^"'`]*?from\s*["']([^"']+)["']|(?:^|[\s;(])import\s*\(\s*["']([^"']+)["']\s*\)|(?:^|[\s;])import\s+["']([^"']+)["']/gmu;

function toRepositoryPath(absolute: string): string {
  return relative(repositoryRoot, absolute).replaceAll("\\", "/");
}

function listSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
        !entry.name.endsWith(".d.ts"),
    )
    .map((entry) => join(entry.parentPath, entry.name))
    .toSorted();
}

function firstExisting(candidates: readonly string[]): string | undefined {
  return candidates.find((candidate) => existsSync(candidate));
}

/** Resolves one specifier to a file on disk, or `undefined` for a bare package or an asset. */
function resolveSpecifier(fromFile: string, specifier: string): string | undefined {
  if (specifier.startsWith(".")) {
    const target = resolve(dirname(fromFile), specifier);
    const stem = target.replace(/\.(?:js|jsx|mjs|ts|tsx)$/u, "");
    return firstExisting([
      `${stem}.ts`,
      `${stem}.tsx`,
      target,
      join(target, "index.ts"),
      join(target, "index.tsx"),
    ]);
  }
  const workspace = /^@oalo\/([a-z0-9-]+)(?:\/(.+))?$/u.exec(specifier);
  if (workspace?.[1] === undefined) return undefined;
  const packageSource = join(repositoryRoot, "packages", workspace[1], "src");
  const subpath = workspace[2];
  if (subpath === undefined) return firstExisting([join(packageSource, "index.ts")]);
  return firstExisting([
    join(packageSource, `${subpath}.ts`),
    join(packageSource, `${subpath}.tsx`),
  ]);
}

function importsOf(file: string): string[] {
  if (!SOURCE_EXTENSIONS.some((extension) => file.endsWith(extension))) return [];
  const source = readFileSync(file, "utf8");
  const specifiers: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

/** Every file reachable from `entries`, each with the chain that first reached it. */
function reachableFrom(entries: readonly string[]): Map<string, readonly string[]> {
  const chains = new Map<string, readonly string[]>();
  const queue: string[] = [];
  for (const entry of entries) {
    chains.set(entry, [toRepositoryPath(entry)]);
    queue.push(entry);
  }
  for (let file = queue.shift(); file !== undefined; file = queue.shift()) {
    const chain = chains.get(file) ?? [];
    for (const specifier of importsOf(file)) {
      const target = resolveSpecifier(file, specifier);
      if (target === undefined || chains.has(target)) continue;
      chains.set(target, [...chain, toRepositoryPath(target)]);
      queue.push(target);
    }
  }
  return chains;
}

function forbiddenIn(chains: Map<string, readonly string[]>): string[] {
  return [...chains]
    .filter(([file]) => {
      const path = toRepositoryPath(file);
      return SUPPORT_MODULES.includes(path) || path.startsWith(SEEDING_HARNESS_DIRECTORY);
    })
    .map(([, chain]) => chain.join(" -> "));
}

const supportModulePaths = new Set(SUPPORT_MODULES.map((path) => join(repositoryRoot, path)));
const applicationEntries = listSourceFiles(webSource).filter(
  (file) => !TEST_FILE_PATTERN.test(file) && !supportModulePaths.has(file),
);

describe("the seeding bridge stays out of the application graph (008A-AC-018)", () => {
  it("reaches neither support module nor the seeding harness from any non-test module", () => {
    expect(forbiddenIn(reachableFrom(applicationEntries))).toEqual([]);
  });

  it("walks the real graph, so an empty answer is not an empty walk", () => {
    const appEntries = applicationEntries.filter((file) =>
      toRepositoryPath(file).startsWith("apps/web/src/app/"),
    );
    expect(appEntries.some((file) => file.endsWith("route.ts"))).toBe(true);
    expect(appEntries.some((file) => file.endsWith("page.tsx"))).toBe(true);
    expect(appEntries.some((file) => file.endsWith("layout.tsx"))).toBe(true);

    const reached = new Set([...reachableFrom(appEntries).keys()].map(toRepositoryPath));
    // A `.js` specifier resolved to its `.ts` source, through a route.
    expect(reached).toContain("apps/web/src/server/password-authentication-handler.ts");
    // A workspace import resolved into a package's source.
    expect(reached).toContain("packages/db/src/index.ts");
  });

  it("fails when a module that imports a support module is treated as an entry", () => {
    // The route-level suites are the sanctioned importers. Walking from one proves the guard
    // would name the chain if a route ever imported a module like it.
    const importer = join(webSource, "server/password-authentication-handler.postgres.test.ts");
    const found = forbiddenIn(reachableFrom([importer]));

    expect(found).toContain(
      "apps/web/src/server/password-authentication-handler.postgres.test.ts -> apps/web/src/server/password-authentication-support.ts",
    );
    expect(found.some((chain) => chain.endsWith("packages/db/test/route-seeding-bridge.js"))).toBe(
      true,
    );
  });
});
