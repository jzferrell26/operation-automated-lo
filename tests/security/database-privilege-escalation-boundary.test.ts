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

// Exact immutable read-only query AND its denied-membership assertion. This is not a path
// exemption: only this role-name occurrence can be ignored by the test-harness inventory.
const SCHEDULER_DENIAL_PROOF = `      const scheduler = await ownerSql(
        f,
        "test.finance-cleanup-schema-capability",
        "select has_schema_privilege('scheduler_runtime','campaign','USAGE') as schema_usage,has_schema_privilege('scheduler_runtime','campaign','CREATE') as schema_create,has_table_privilege('scheduler_runtime','campaign.financing_release_inquiries','SELECT,INSERT,UPDATE,DELETE') as financing_table_access,has_table_privilege('scheduler_runtime','campaign.funnel_inquiries','SELECT,INSERT,UPDATE,DELETE') as funnel_table_access,has_function_privilege('scheduler_runtime','campaign.financing_release_export()','EXECUTE') as private_export,pg_has_role('scheduler_runtime','app_runtime','MEMBER') as native_membership,pg_has_role('scheduler_runtime','migration_owner','MEMBER') as owner_membership",
      );
      assert.deepEqual(scheduler.rows, [
        {
          schema_usage: true,
          schema_create: false,
          financing_table_access: false,
          funnel_table_access: false,
          private_export: false,
          native_membership: false,
          owner_membership: false,
        },
      ]);`;
function harnessCapabilityNames(source: string): string[] {
  const normalized = source.replaceAll("\r\n", "\n");
  const deniedRolePositions = new Set<number>();
  let start = normalized.indexOf(SCHEDULER_DENIAL_PROOF);
  while (start !== -1) {
    deniedRolePositions.add(start + SCHEDULER_DENIAL_PROOF.indexOf("'migration_owner'") + 1);
    start = normalized.indexOf(SCHEDULER_DENIAL_PROOF, start + SCHEDULER_DENIAL_PROOF.length);
  }
  return PROHIBITED_CAPABILITIES.filter(({ name, pattern }) =>
    name === "migration_owner role assumption"
      ? [...normalized.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))].some(
          (match) => !deniedRolePositions.has(match.index),
        )
      : pattern.test(normalized),
  ).map(({ name }) => name);
}

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
      if (harnessCapabilityNames(source).length > 0) {
        holders.add(repositoryPath(file));
      }
    }

    expect([...holders]).toEqual([SANCTIONED_HOLDER]);
  });

  it("recognizes only the exact read-only negative membership proof in the harness inventory", () => {
    expect(harnessCapabilityNames(SCHEDULER_DENIAL_PROOF)).toEqual([]);
    // The shipped-source prohibition stays literal and receives no recognition or masking.
    expect(
      PROHIBITED_CAPABILITIES.filter(({ pattern }) => pattern.test(SCHEDULER_DENIAL_PROOF)).map(
        ({ name }) => name,
      ),
    ).toEqual(["migration_owner role assumption"]);
  });
  it.each([
    "set local role migration_owner",
    "grant migration_owner to scheduler_runtime",
    "alter table campaign.audit_events disable trigger audit_events_append_only",
    "alter table campaign.audit_events enable trigger audit_events_append_only",
    "set session_replication_role = replica",
  ])("still rejects an adjacent capability: %s", (capability) => {
    expect(harnessCapabilityNames(`${SCHEDULER_DENIAL_PROOF}\n${capability}`)).not.toEqual([]);
    expect(harnessCapabilityNames(`${capability}\n${SCHEDULER_DENIAL_PROOF}`)).not.toEqual([]);
  });
  it.each([
    ["positive membership", "owner_membership: false", "owner_membership: true"],
    ["missing negative assertion", "assert.deepEqual(scheduler.rows", "unrelated(scheduler.rows"],
    [
      "changed queried role",
      "pg_has_role('scheduler_runtime','migration_owner'",
      "pg_has_role('app_runtime','migration_owner'",
    ],
    [
      "additional SQL statement",
      'as owner_membership",',
      'as owner_membership; set local role migration_owner",',
    ],
  ])("does not recognize %s", (_name, before, after) => {
    expect(harnessCapabilityNames(SCHEDULER_DENIAL_PROOF.replace(before, after))).toContain(
      "migration_owner role assumption",
    );
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
