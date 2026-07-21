import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  SUPABASE_CLI_VERSION,
  commandPlan,
  discoverPgtapFiles,
  resolveNpmCli,
  resolvePackageRunner,
  runRealDatabaseTests,
} from "../../scripts/database/run-real-database-tests.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("real database test orchestration", () => {
  it("discovers every pgTAP file in deterministic order and pins the Supabase CLI", async () => {
    const repositoryRoot = await fixtureRepository([
      "z-last.pgtap.sql",
      "ignored.sql",
      "a-first.pgtap.sql",
    ]);
    const files = await discoverPgtapFiles(repositoryRoot);
    const plan = commandPlan(files, repositoryRoot);

    expect(files).toEqual(["supabase/tests/a-first.pgtap.sql", "supabase/tests/z-last.pgtap.sql"]);
    expect(plan.setup).toHaveLength(4);
    expect(plan.tests).toHaveLength(2);
    expect([...plan.setup, ...plan.tests].every((step) => step.command === process.execPath)).toBe(
      true,
    );
    expect(plan.setup[0]?.args).toContain("--project");
    expect(
      [...plan.setup.slice(1), ...plan.tests].every((step) =>
        step.args.includes(`supabase@${SUPABASE_CLI_VERSION}`),
      ),
    ).toBe(true);
    expect(plan.tests[0]?.args.at(-1)).toBe("supabase/tests/a-first.pgtap.sql");
    expect(plan.tests[1]?.args.at(-1)).toBe("supabase/tests/z-last.pgtap.sql");
  });

  it("uses the inherited npm CLI when an exact temporary Node runtime has no bundled npm", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "oalo-node-runtime-"));
    temporaryDirectories.push(temporaryRoot);
    const nodeExecutable = join(temporaryRoot, "node", "bin", "node.exe");
    const inheritedNpmCli = join(temporaryRoot, "package-manager", "npm-cli.js");
    await mkdir(join(temporaryRoot, "package-manager"), { recursive: true });
    await writeFile(inheritedNpmCli, "// synthetic npm CLI\n", "utf8");

    expect(resolveNpmCli(nodeExecutable, inheritedNpmCli)).toBe(inheritedNpmCli);
  });

  it("uses an inherited pnpm JavaScript CLI without shell lookup", async () => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "oalo-pnpm-runtime-"));
    temporaryDirectories.push(temporaryRoot);
    const nodeExecutable = join(temporaryRoot, "node", "bin", "node.exe");
    const inheritedPnpmCli = join(temporaryRoot, "package-manager", "pnpm.mjs");
    await mkdir(join(temporaryRoot, "package-manager"), { recursive: true });
    await writeFile(inheritedPnpmCli, "// synthetic pnpm CLI\n", "utf8");

    expect(resolvePackageRunner(nodeExecutable, inheritedPnpmCli)).toEqual({
      cli: inheritedPnpmCli,
      args: ["dlx", `supabase@${SUPABASE_CLI_VERSION}`],
    });
  });

  it("always performs no-backup cleanup after a failed verification step", async () => {
    const repositoryRoot = await fixtureRepository(["only.pgtap.sql"]);
    const labels: string[] = [];

    await expect(
      runRealDatabaseTests({
        repositoryRoot,
        async run(step) {
          labels.push(step.label);
          if (step.label.includes("recreate")) throw new Error("synthetic migration failure");
        },
      }),
    ).rejects.toThrow("synthetic migration failure");

    expect(labels.at(-1)).toBe("stop local Supabase without preserving database state");
    expect(labels).not.toContain("run supabase/tests/only.pgtap.sql");
  });

  it("runs every pgTAP file before reporting test failures", async () => {
    const repositoryRoot = await fixtureRepository(["first.pgtap.sql", "second.pgtap.sql"]);
    const labels: string[] = [];

    await expect(
      runRealDatabaseTests({
        repositoryRoot,
        async run(step) {
          labels.push(step.label);
          if (step.label.includes("first.pgtap.sql")) throw new Error("synthetic pgTAP failure");
        },
      }),
    ).rejects.toThrow("1 pgTAP file failed");

    expect(labels).toContain("run supabase/tests/second.pgtap.sql");
    expect(labels.at(-1)).toBe("stop local Supabase without preserving database state");
  });
});

async function fixtureRepository(files: string[]) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "oalo-db-orchestration-"));
  temporaryDirectories.push(repositoryRoot);
  const testsDirectory = join(repositoryRoot, "supabase", "tests");
  await mkdir(testsDirectory, { recursive: true });
  await Promise.all(
    files.map((file) => writeFile(join(testsDirectory, file), "select 1;\n", "utf8")),
  );
  return repositoryRoot;
}
