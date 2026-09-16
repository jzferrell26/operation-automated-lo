import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The real-PostgreSQL harness has to assume `migration_owner` and disable the four append-only
 * triggers to tear a tenant down (`packages/db/test/campaign-integration-support.mjs`). That is
 * the single most dangerous capability in the repository: `migration_owner` owns every schema, and
 * disabling `audit_events_append_only` defeats the audit trail outright.
 *
 * `packages/db/package.json` exposes only the `.` subpath, so the helper cannot be *imported* from
 * production code. Nothing stopped it from being *copied* there, which is how a test-only escape
 * hatch becomes a production one. These assertions close that path: the elevation and the trigger
 * switches may exist in `supabase/migrations/**` and in the harness under `packages/db/test/`, and
 * nowhere else that ships.
 */
const PROHIBITED_CAPABILITIES: readonly Readonly<{ name: string; pattern: RegExp }>[] =
  Object.freeze([
    Object.freeze({ name: "migration_owner role assumption", pattern: /\bmigration_owner\b/iu }),
    Object.freeze({
      name: "append-only trigger switch",
      pattern: /\b(?:disable|enable)\s+trigger\b/iu,
    }),
    Object.freeze({
      name: "replication-role trigger bypass",
      pattern: /session_replication_role/iu,
    }),
    Object.freeze({ name: "append-only trigger name", pattern: /\b\w+_append_only\b/u }),
  ]);

const SOURCE_EXTENSIONS = new Set([".mjs", ".mts", ".ts", ".tsx"]);
const IGNORED_DIRECTORIES = new Set([".next", ".turbo", "coverage", "dist", "node_modules"]);

/** The harness is the one sanctioned holder of these capabilities. */
const SANCTIONED_HOLDER = "packages/db/test/campaign-integration-support.mjs";

const workspaceRoot = resolve(".");

async function sourceFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) files.push(...(await sourceFiles(target)));
      continue;
    }
    if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(target);
  }
  return files;
}

function repositoryPath(absolutePath: string): string {
  return relative(workspaceRoot, absolutePath).replaceAll("\\", "/");
}

/** Every path that ships: the apps plus each package's compiled `src`, never its `test`. */
async function shippedSourceFiles(): Promise<string[]> {
  const packageDirectories = await readdir(resolve("packages"), { withFileTypes: true });
  const roots = [
    resolve("apps"),
    ...packageDirectories
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve("packages", entry.name, "src")),
  ];
  const files: string[] = [];
  for (const root of roots) {
    try {
      files.push(...(await sourceFiles(root)));
    } catch {
      // A package without a `src` directory ships nothing to scan.
    }
  }
  return files.toSorted();
}

describe("database privilege escalation boundary", () => {
  it("keeps owner elevation and trigger switches out of every shipped source path", async () => {
    const files = await shippedSourceFiles();
    expect(files.length).toBeGreaterThan(0);

    const findings: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const { name, pattern } of PROHIBITED_CAPABILITIES) {
        if (pattern.test(source)) findings.push(`${repositoryPath(file)} contains ${name}`);
      }
    }

    expect(findings).toEqual([]);
  });

  it("keeps the sanctioned holder the only test-harness file wielding them", async () => {
    const files = (await sourceFiles(resolve("packages/db/test"))).toSorted();
    const holders = new Set<string>();
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (PROHIBITED_CAPABILITIES.some(({ pattern }) => pattern.test(source))) {
        holders.add(repositoryPath(file));
      }
    }

    expect([...holders]).toEqual([SANCTIONED_HOLDER]);
  });

  it("re-enables every trigger it disables inside the same transaction", async () => {
    const source = await readFile(resolve(SANCTIONED_HOLDER), "utf8");

    expect(source).toContain('appendOnlyTriggerRequests("disable")');
    expect(source).toContain('appendOnlyTriggerRequests("enable")');
    expect(source).toContain("set local role migration_owner");
    // A bare `set role` outlives the transaction and would ride the pooled connection out.
    expect(/\bset\s+role\b/iu.test(source)).toBe(false);
  });

  it("does not expose the harness through the @oalo/db export map", async () => {
    const manifest: unknown = JSON.parse(
      await readFile(resolve("packages/db/package.json"), "utf8"),
    );
    const { exports: subpaths, private: isPrivate } = manifest as Readonly<{
      exports: Readonly<Record<string, unknown>>;
      private: boolean;
    }>;

    expect(isPrivate).toBe(true);
    expect(Object.keys(subpaths)).toEqual(["."]);
  });
});
