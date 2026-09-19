import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { spawn } from "node:child_process";

import {
  SUPABASE_CLI_VERSION,
  TEST_DATABASE_NAME,
  TEST_DATABASE_NAME_PREFIX,
  assertDisposableTestDatabaseName,
  commandPlan,
  WEB_POSTGRES_PROJECT,
  discoverIntegrationTestFiles,
  discoverMigrationFiles,
  discoverPgtapFiles,
  discoverWebPostgresTestFiles,
  localDatabaseUrl,
  resolveLocalDatabasePort,
  resolveNpmCli,
  resolvePackageRunner,
  runCommand,
  runRealDatabaseTests,
} from "../../scripts/database/run-real-database-tests.mjs";

const temporaryDirectories: string[] = [];

const CONFIG_TOML = `[api]
port = 55421

[db]
port = 55422
shadow_port = 55420
major_version = 17

[db.pooler]
enabled = true
port = 55429
`;

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("real database test orchestration", () => {
  it("discovers every pgTAP file in deterministic order and pins the Supabase CLI", async () => {
    const repositoryRoot = await fixtureRepository({
      pgtapFiles: ["z-last.pgtap.sql", "ignored.sql", "a-first.pgtap.sql"],
    });
    const files = await discoverPgtapFiles(repositoryRoot);
    const plan = await fixturePlan(repositoryRoot);

    expect(files).toEqual(["supabase/tests/a-first.pgtap.sql", "supabase/tests/z-last.pgtap.sql"]);
    expect(plan.setup).toHaveLength(5);
    expect(plan.tests).toHaveLength(2);
    expect([...plan.setup, ...plan.tests].every((step) => step.command === process.execPath)).toBe(
      true,
    );
    expect(plan.setup.map((step) => step.label)).toEqual([
      "build @oalo/db and its workspace dependencies",
      "run database orchestration contract tests",
      `verify Supabase CLI ${SUPABASE_CLI_VERSION}`,
      "start local Supabase",
      "recreate the local database and apply every migration",
    ]);
    expect(plan.setup[1]?.args).toContain("--project");
    expect(
      [...plan.setup.slice(2), ...plan.tests].every((step) =>
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
    const repositoryRoot = await fixtureRepository({ pgtapFiles: ["only.pgtap.sql"] });
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
    const repositoryRoot = await fixtureRepository({
      pgtapFiles: ["first.pgtap.sql", "second.pgtap.sql"],
    });
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

describe("real PostgreSQL integration phase", () => {
  it("reads the [db] port and ignores the shadow and pooler ports", () => {
    expect(resolveLocalDatabasePort(CONFIG_TOML)).toBe(55_422);
    expect(() => resolveLocalDatabasePort("[api]\nport = 1\n")).toThrow(
      "does not declare a port under [db]",
    );
  });

  it("builds loopback DSNs and only embeds the password where a driver needs it", () => {
    expect(localDatabaseUrl(55_422, "postgres")).toBe(
      "postgresql://postgres@127.0.0.1:55422/postgres",
    );
    expect(localDatabaseUrl(55_422, TEST_DATABASE_NAME, { withPassword: true })).toBe(
      `postgresql://postgres:postgres@127.0.0.1:55422/${TEST_DATABASE_NAME}`,
    );
  });

  it("refuses to target a database outside the disposable oalo_test_ prefix", () => {
    expect(assertDisposableTestDatabaseName(TEST_DATABASE_NAME)).toBe(TEST_DATABASE_NAME);
    expect(TEST_DATABASE_NAME.startsWith(TEST_DATABASE_NAME_PREFIX)).toBe(true);
    expect(() => assertDisposableTestDatabaseName("postgres")).toThrow(
      "Refusing to run destructive integration tests against postgres",
    );
  });

  it("refuses a prefixed name that could carry extra SQL into the psql DDL", () => {
    for (const hostileName of [
      'oalo_test_x"; drop database postgres; --',
      "oalo_test_x; drop database postgres",
      "oalo_test_x postgres",
      "oalo_test_X",
      TEST_DATABASE_NAME_PREFIX,
    ]) {
      expect(() => assertDisposableTestDatabaseName(hostileName)).toThrow(
        "Refusing to run destructive integration tests against",
      );
    }
  });

  it("discovers migrations and integration test files in deterministic order", async () => {
    const repositoryRoot = await fixtureRepository({
      integrationTestFiles: ["b.integration.test.mjs", "a.integration.test.mjs", "unit.test.mjs"],
      migrationFiles: ["20260102_second.sql", "20260101_first.sql"],
    });

    expect(await discoverMigrationFiles(repositoryRoot)).toEqual([
      "supabase/migrations/20260101_first.sql",
      "supabase/migrations/20260102_second.sql",
    ]);
    expect(await discoverIntegrationTestFiles(repositoryRoot)).toEqual([
      "packages/db/test/a.integration.test.mjs",
      "packages/db/test/b.integration.test.mjs",
    ]);
  });

  it("fails rather than silently passing when a discovery directory has no matching files", async () => {
    const repositoryRoot = await fixtureRepository({ integrationTestFiles: ["unit.test.mjs"] });

    await expect(discoverIntegrationTestFiles(repositoryRoot)).rejects.toThrow(
      "No packages/db/test/*.integration.test.mjs files were found.",
    );
  });

  it("provisions the disposable database, replays every migration, then runs the tests", async () => {
    const repositoryRoot = await fixtureRepository({
      migrationFiles: ["20260102_second.sql", "20260101_first.sql"],
    });
    const plan = await fixturePlan(repositoryRoot);

    expect(plan.integration.map((step) => step.label)).toEqual([
      `drop any leftover ${TEST_DATABASE_NAME} database`,
      `create the disposable ${TEST_DATABASE_NAME} database`,
      `apply supabase/migrations/20260101_first.sql to ${TEST_DATABASE_NAME}`,
      `apply supabase/migrations/20260102_second.sql to ${TEST_DATABASE_NAME}`,
      "run the real-PostgreSQL integration tests",
      `seed the review location into ${TEST_DATABASE_NAME}`,
      "prove the review seeding script inserts nothing on a second run",
    ]);
  });

  it("stops psql on the first error and applies each migration atomically", async () => {
    const repositoryRoot = await fixtureRepository({ migrationFiles: ["20260101_first.sql"] });
    const plan = await fixturePlan(repositoryRoot);
    const psqlSteps = plan.integration.filter((step) => step.command === "psql");
    const migrationStep = psqlSteps.at(-1);

    expect(psqlSteps).toHaveLength(3);
    expect(psqlSteps.every((step) => step.args.includes("--set=ON_ERROR_STOP=1"))).toBe(true);
    expect(psqlSteps.every((step) => step.env?.PGPASSWORD === "postgres")).toBe(true);
    expect(
      psqlSteps.every((step) => step.args.every((argument) => !argument.includes(":postgres@"))),
    ).toBe(true);
    expect(migrationStep?.args).toContain("--single-transaction");
    expect(migrationStep?.args.at(-1)).toBe("supabase/migrations/20260101_first.sql");
  });

  it("hands the integration tests a populated oalo_test_ URL and serialises the files", async () => {
    const repositoryRoot = await fixtureRepository({
      integrationTestFiles: ["a.integration.test.mjs", "b.integration.test.mjs"],
    });
    const plan = await fixturePlan(repositoryRoot);
    const testStep = plan.integration.find(
      (step) => step.label === "run the real-PostgreSQL integration tests",
    );
    const databaseUrl = testStep?.env?.OALO_TEST_DATABASE_URL;

    expect(testStep?.command).toBe(process.execPath);
    expect(testStep?.args).toEqual([
      "--test",
      "--test-concurrency=1",
      "packages/db/test/a.integration.test.mjs",
      "packages/db/test/b.integration.test.mjs",
    ]);
    expect(databaseUrl).toBeTruthy();
    expect(
      new URL(databaseUrl as string).pathname.startsWith(`/${TEST_DATABASE_NAME_PREFIX}`),
    ).toBe(true);
  });

  it("declares the test database URL on the test step alone", async () => {
    const repositoryRoot = await fixtureRepository({});
    const plan = await fixturePlan(repositoryRoot);
    const stepsCarryingTheUrl = [...plan.setup, ...plan.tests, ...plan.integration, plan.cleanup]
      .filter((step) => step.env?.OALO_TEST_DATABASE_URL !== undefined)
      .map((step) => step.label);

    expect(stepsCarryingTheUrl).toEqual(["run the real-PostgreSQL integration tests"]);
  });

  it("runs the integration phase after pgTAP and still tears the stack down when it fails", async () => {
    const repositoryRoot = await fixtureRepository({ pgtapFiles: ["only.pgtap.sql"] });
    const labels: string[] = [];

    await expect(
      runRealDatabaseTests({
        repositoryRoot,
        async run(step) {
          labels.push(step.label);
          if (step.label.startsWith("create the disposable")) {
            throw new Error("synthetic provisioning failure");
          }
        },
      }),
    ).rejects.toThrow("1 real-PostgreSQL integration step failed");

    expect(labels.indexOf("run supabase/tests/only.pgtap.sql")).toBeLessThan(
      labels.indexOf(`create the disposable ${TEST_DATABASE_NAME} database`),
    );
    expect(labels).not.toContain("run the real-PostgreSQL integration tests");
    expect(labels.at(-1)).toBe("stop local Supabase without preserving database state");
  });

  it("omits the route-level step and records a notice when no matching file exists", async () => {
    const repositoryRoot = await fixtureRepository({});
    const plan = await fixturePlan(repositoryRoot);

    expect(await discoverWebPostgresTestFiles(repositoryRoot)).toEqual([]);
    expect(plan.integration.map((step) => step.label)).not.toContain(
      "run the route-level PostgreSQL tests",
    );
    expect(plan.notices).toEqual([
      `no apps/web/src/**/*.postgres.test.ts file exists, so the ${WEB_POSTGRES_PROJECT} step is not in this plan`,
    ]);
  });

  it("runs the route-level project with the disposable URL once a matching file exists", async () => {
    const repositoryRoot = await fixtureRepository({
      webPostgresTestFiles: [
        "server/review-session-handler.postgres.test.ts",
        "app/api/campaigns/approve/route.postgres.test.ts",
      ],
    });
    const plan = await fixturePlan(repositoryRoot);
    const routeStep = plan.integration.find(
      (step) => step.label === "run the route-level PostgreSQL tests",
    );

    expect(await discoverWebPostgresTestFiles(repositoryRoot)).toEqual([
      "apps/web/src/app/api/campaigns/approve/route.postgres.test.ts",
      "apps/web/src/server/review-session-handler.postgres.test.ts",
    ]);
    expect(plan.notices).toEqual([]);
    expect(routeStep?.command).toBe(process.execPath);
    expect(routeStep?.args).toContain(WEB_POSTGRES_PROJECT);
    expect(
      new URL(routeStep?.env?.OALO_TEST_DATABASE_URL as string).pathname.startsWith(
        `/${TEST_DATABASE_NAME_PREFIX}`,
      ),
    ).toBe(true);
    expect(plan.integration.indexOf(routeStep!)).toBeGreaterThan(
      plan.integration.findIndex(
        (step) => step.label === "run the real-PostgreSQL integration tests",
      ),
    );
  });

  it("seeds the review location and then proves the second run changes nothing", async () => {
    const repositoryRoot = await fixtureRepository({});
    const plan = await fixturePlan(repositoryRoot);
    const [seedStep, idempotencyStep] = plan.integration.slice(-2);

    expect(seedStep?.label).toBe(`seed the review location into ${TEST_DATABASE_NAME}`);
    expect(seedStep?.command).toBe(process.execPath);
    expect(seedStep?.args.at(0)?.replaceAll("\\", "/")).toContain(
      "tooling/scripts/database/seed-review-location.mjs",
    );
    expect(seedStep?.args).toContain("--confirm-database");
    expect(seedStep?.args).toContain(TEST_DATABASE_NAME);
    expect(seedStep?.args).not.toContain("--expect-unchanged");
    expect(idempotencyStep?.args).toContain("--expect-unchanged");
    for (const step of [seedStep, idempotencyStep]) {
      const urlArgument = step?.args[step.args.indexOf("--review-database-url") + 1];
      expect(new URL(urlArgument as string).pathname).toBe(`/${TEST_DATABASE_NAME}`);
    }
  });

  it("reports pgTAP and integration failures together", async () => {
    const repositoryRoot = await fixtureRepository({ pgtapFiles: ["only.pgtap.sql"] });

    await expect(
      runRealDatabaseTests({
        repositoryRoot,
        async run(step) {
          if (step.label.includes("only.pgtap.sql") || step.label.startsWith("drop any leftover")) {
            throw new Error("synthetic failure");
          }
        },
      }),
    ).rejects.toThrow("1 pgTAP file failed; 1 real-PostgreSQL integration step failed");
  });

  it("merges per-step environment over the inherited environment when spawning", async () => {
    await expect(
      runCommand(
        {
          command: process.execPath,
          args: [
            "-e",
            "if (process.env.OALO_TEST_DATABASE_URL !== 'postgresql://sentinel') process.exit(3);",
          ],
          env: { OALO_TEST_DATABASE_URL: "postgresql://sentinel" },
          label: "assert the step environment reaches the child",
        },
        process.cwd(),
      ),
    ).resolves.toBeUndefined();

    await expect(
      runCommand(
        {
          command: process.execPath,
          args: ["-e", "process.exit(4);"],
          label: "assert a non-zero child exit rejects",
        },
        process.cwd(),
      ),
    ).rejects.toThrow("assert a non-zero child exit rejects failed");
  });
});

/**
 * A silent skip is how the real-PostgreSQL gap survived unnoticed, so these assertions run the
 * real test files as child processes and require a non-zero exit. Asserting on the message as well
 * as the exit code stops an unrelated startup failure from passing for the wrong reason.
 */
describe("integration test database URL guard", () => {
  const integrationTestFile = "packages/db/test/campaign-command.integration.test.mjs";

  it("fails rather than skipping when OALO_TEST_DATABASE_URL is unset", async () => {
    const result = await captureNodeTest(integrationTestFile, undefined);

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain(
      "OALO_TEST_DATABASE_URL is required for PostgreSQL integration tests",
    );
  });

  it("fails rather than skipping when OALO_TEST_DATABASE_URL names another database", async () => {
    const result = await captureNodeTest(
      integrationTestFile,
      "postgresql://postgres:postgres@127.0.0.1:55422/postgres",
    );

    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("OALO_TEST_DATABASE_URL must identify an oalo_test_ database");
  });
});

function captureNodeTest(testFile: string, databaseUrl: string | undefined) {
  const { OALO_TEST_DATABASE_URL: _ignored, ...inheritedEnvironment } = process.env;
  return new Promise<{ exitCode: number | null; output: string }>(
    (resolvePromise, rejectPromise) => {
      const child = spawn(process.execPath, ["--test", testFile], {
        cwd: process.cwd(),
        env:
          databaseUrl === undefined
            ? inheritedEnvironment
            : { ...inheritedEnvironment, OALO_TEST_DATABASE_URL: databaseUrl },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => (output += chunk));
      child.once("error", rejectPromise);
      child.once("close", (exitCode) => resolvePromise({ exitCode, output }));
    },
  );
}

async function fixturePlan(repositoryRoot: string) {
  return commandPlan(
    {
      databasePort: resolveLocalDatabasePort(CONFIG_TOML),
      integrationTestFiles: await discoverIntegrationTestFiles(repositoryRoot),
      migrationFiles: await discoverMigrationFiles(repositoryRoot),
      pgtapFiles: await discoverPgtapFiles(repositoryRoot),
      webPostgresTestFiles: await discoverWebPostgresTestFiles(repositoryRoot),
    },
    repositoryRoot,
  );
}

async function fixtureRepository({
  integrationTestFiles = ["only.integration.test.mjs"],
  migrationFiles = ["20260101_only.sql"],
  pgtapFiles = ["only.pgtap.sql"],
  webPostgresTestFiles = [],
}: {
  integrationTestFiles?: string[];
  migrationFiles?: string[];
  pgtapFiles?: string[];
  webPostgresTestFiles?: string[];
}) {
  const repositoryRoot = await mkdtemp(join(tmpdir(), "oalo-db-orchestration-"));
  temporaryDirectories.push(repositoryRoot);
  const directories = {
    integrationTestFiles: join(repositoryRoot, "packages", "db", "test"),
    migrationFiles: join(repositoryRoot, "supabase", "migrations"),
    pgtapFiles: join(repositoryRoot, "supabase", "tests"),
  };
  await Promise.all(
    Object.values(directories).map((directory) => mkdir(directory, { recursive: true })),
  );
  await Promise.all([
    writeFile(join(repositoryRoot, "supabase", "config.toml"), CONFIG_TOML, "utf8"),
    ...Object.entries({ integrationTestFiles, migrationFiles, pgtapFiles }).flatMap(
      ([key, files]) =>
        files.map((file) =>
          writeFile(
            join(directories[key as keyof typeof directories], file),
            "select 1;\n",
            "utf8",
          ),
        ),
    ),
  ]);
  // The route-level suite is discovered recursively, so its fixture files are
  // written under nested directories rather than one flat folder.
  for (const file of webPostgresTestFiles) {
    const absolute = join(repositoryRoot, "apps", "web", "src", ...file.split("/"));
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, "export {};\n", "utf8");
  }
  return repositoryRoot;
}
