import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export const SUPABASE_CLI_VERSION = "2.109.1";

/**
 * The real-PostgreSQL integration tests are destructive: they bulk-delete tenant rows and disable
 * append-only triggers. `requiredTestDatabaseUrl` in
 * packages/db/test/campaign-integration-support.mjs refuses any database whose name does not start
 * with `oalo_test_`, so the gate provisions a disposable database under that prefix rather than
 * pointing the tests at the stack's primary `postgres` database.
 */
export const TEST_DATABASE_NAME = "oalo_test_campaign";
export const TEST_DATABASE_NAME_PREFIX = "oalo_test_";

const LOCAL_DATABASE_HOST = "127.0.0.1";
const LOCAL_DATABASE_ROLE = "postgres";
const LOCAL_DATABASE_PASSWORD = "postgres";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "../../..");

async function discoverSqlFiles(repositoryRoot, directory, suffix) {
  const absoluteDirectory = resolve(repositoryRoot, directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) =>
      relative(repositoryRoot, resolve(absoluteDirectory, entry.name)).replaceAll("\\", "/"),
    )
    .toSorted();

  if (files.length === 0) {
    throw new Error(`No ${directory}/*${suffix} files were found.`);
  }
  return files;
}

export async function discoverPgtapFiles(repositoryRoot = defaultRepositoryRoot) {
  return discoverSqlFiles(repositoryRoot, "supabase/tests", ".pgtap.sql");
}

export async function discoverMigrationFiles(repositoryRoot = defaultRepositoryRoot) {
  return discoverSqlFiles(repositoryRoot, "supabase/migrations", ".sql");
}

export async function discoverIntegrationTestFiles(repositoryRoot = defaultRepositoryRoot) {
  return discoverSqlFiles(repositoryRoot, "packages/db/test", ".integration.test.mjs");
}

/**
 * Reads the `port` declared directly under `[db]` in supabase/config.toml so the gate and the
 * committed local stack configuration can never drift apart. `[db.pooler]` and `shadow_port` are
 * deliberately ignored.
 */
export function resolveLocalDatabasePort(configToml) {
  let section = "";
  for (const rawLine of configToml.split(/\r?\n/u)) {
    const line = rawLine.trim();
    const header = /^\[(?<name>[^\]]+)\]$/u.exec(line);
    if (header?.groups?.name !== undefined) {
      section = header.groups.name;
      continue;
    }
    if (section !== "db") continue;
    const port = /^port\s*=\s*(?<value>\d+)$/u.exec(line);
    if (port?.groups?.value !== undefined) return Number.parseInt(port.groups.value, 10);
  }
  throw new Error("supabase/config.toml does not declare a port under [db].");
}

export async function readLocalDatabasePort(repositoryRoot = defaultRepositoryRoot) {
  return resolveLocalDatabasePort(
    await readFile(resolve(repositoryRoot, "supabase/config.toml"), "utf8"),
  );
}

export function localDatabaseUrl(databasePort, databaseName, { withPassword = false } = {}) {
  const credentials = withPassword
    ? `${LOCAL_DATABASE_ROLE}:${LOCAL_DATABASE_PASSWORD}`
    : LOCAL_DATABASE_ROLE;
  return `postgresql://${credentials}@${LOCAL_DATABASE_HOST}:${String(databasePort)}/${databaseName}`;
}

export function assertDisposableTestDatabaseName(databaseName) {
  if (!databaseName.startsWith(TEST_DATABASE_NAME_PREFIX)) {
    throw new Error(
      `Refusing to run destructive integration tests against ${databaseName}: the database name must start with ${TEST_DATABASE_NAME_PREFIX}.`,
    );
  }
  return databaseName;
}

export function commandPlan(discovery, repositoryRoot = defaultRepositoryRoot) {
  const { pgtapFiles, migrationFiles, integrationTestFiles, databasePort } = discovery;
  const node = process.execPath;
  const packageRunner = resolvePackageRunner(node);
  const vitestCli = resolve(repositoryRoot, "node_modules/vitest/vitest.mjs");
  const turboCli = resolve(repositoryRoot, "node_modules/turbo/bin/turbo");
  const supabase = [packageRunner.cli, ...packageRunner.args];
  const testDatabaseName = assertDisposableTestDatabaseName(TEST_DATABASE_NAME);
  const administrativeDsn = localDatabaseUrl(databasePort, "postgres");
  const testDsn = localDatabaseUrl(databasePort, testDatabaseName);
  const psqlEnvironment = Object.freeze({ PGPASSWORD: LOCAL_DATABASE_PASSWORD });
  const psqlBaseArguments = Object.freeze(["--no-psqlrc", "--quiet", "--set=ON_ERROR_STOP=1"]);

  return Object.freeze({
    cleanup: Object.freeze({
      command: node,
      args: [...supabase, "stop", "--no-backup"],
      label: "stop local Supabase without preserving database state",
    }),
    setup: Object.freeze([
      // The build precedes the contract tests because those tests spawn the integration test
      // files, which load packages/db/dist, to prove a missing OALO_TEST_DATABASE_URL fails
      // instead of skipping.
      Object.freeze({
        command: node,
        args: [turboCli, "run", "build", "--filter=@oalo/db..."],
        label: "build @oalo/db and its workspace dependencies",
      }),
      Object.freeze({
        command: node,
        args: [vitestCli, "run", "--project", "database"],
        label: "run database orchestration contract tests",
      }),
      Object.freeze({
        command: node,
        args: [...supabase, "--version"],
        label: `verify Supabase CLI ${SUPABASE_CLI_VERSION}`,
      }),
      Object.freeze({
        command: node,
        args: [...supabase, "start"],
        label: "start local Supabase",
      }),
      Object.freeze({
        command: node,
        args: [...supabase, "db", "reset", "--local"],
        label: "recreate the local database and apply every migration",
      }),
    ]),
    tests: Object.freeze(
      pgtapFiles.map((file) =>
        Object.freeze({
          command: node,
          args: [...supabase, "test", "db", "--local", file],
          label: `run ${file}`,
        }),
      ),
    ),
    integration: Object.freeze([
      Object.freeze({
        command: "psql",
        args: [
          ...psqlBaseArguments,
          "--dbname",
          administrativeDsn,
          "--command",
          `drop database if exists ${testDatabaseName}`,
        ],
        env: psqlEnvironment,
        label: `drop any leftover ${testDatabaseName} database`,
      }),
      Object.freeze({
        command: "psql",
        args: [
          ...psqlBaseArguments,
          "--dbname",
          administrativeDsn,
          "--command",
          `create database ${testDatabaseName}`,
        ],
        env: psqlEnvironment,
        label: `create the disposable ${testDatabaseName} database`,
      }),
      ...migrationFiles.map((file) =>
        Object.freeze({
          command: "psql",
          args: [...psqlBaseArguments, "--single-transaction", "--dbname", testDsn, "--file", file],
          env: psqlEnvironment,
          label: `apply ${file} to ${testDatabaseName}`,
        }),
      ),
      Object.freeze({
        command: node,
        args: ["--test", "--test-concurrency=1", ...integrationTestFiles],
        env: Object.freeze({
          OALO_TEST_DATABASE_URL: localDatabaseUrl(databasePort, testDatabaseName, {
            withPassword: true,
          }),
        }),
        label: "run the real-PostgreSQL integration tests",
      }),
    ]),
  });
}

export async function runRealDatabaseTests(options = {}) {
  const repositoryRoot = options.repositoryRoot ?? defaultRepositoryRoot;
  const run = options.run ?? runCommand;
  const plan = commandPlan(
    {
      databasePort: await readLocalDatabasePort(repositoryRoot),
      integrationTestFiles: await discoverIntegrationTestFiles(repositoryRoot),
      migrationFiles: await discoverMigrationFiles(repositoryRoot),
      pgtapFiles: await discoverPgtapFiles(repositoryRoot),
    },
    repositoryRoot,
  );
  let verificationError;
  let cleanupError;

  try {
    for (const step of plan.setup) {
      process.stdout.write(`\n[database] ${step.label}\n`);
      await run(step, repositoryRoot);
    }
    const pgtapFailures = [];
    for (const step of plan.tests) {
      process.stdout.write(`\n[database] ${step.label}\n`);
      try {
        await run(step, repositoryRoot);
      } catch (error) {
        pgtapFailures.push(error);
      }
    }
    // Provisioning is sequential, so a failed step invalidates every later one.
    const integrationFailures = [];
    for (const step of plan.integration) {
      process.stdout.write(`\n[database] ${step.label}\n`);
      try {
        await run(step, repositoryRoot);
      } catch (error) {
        integrationFailures.push(error);
        break;
      }
    }
    const failures = [...pgtapFailures, ...integrationFailures];
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        describeFailures(pgtapFailures.length, integrationFailures.length),
      );
    }
  } catch (error) {
    verificationError = error;
  } finally {
    process.stdout.write(`\n[database] ${plan.cleanup.label}\n`);
    try {
      await run(plan.cleanup, repositoryRoot);
    } catch (error) {
      cleanupError = error;
    }
  }

  if (verificationError !== undefined && cleanupError !== undefined) {
    throw new AggregateError(
      [verificationError, cleanupError],
      `Database verification and cleanup failed: ${errorMessage(verificationError)}; ${errorMessage(cleanupError)}`,
    );
  }
  if (cleanupError !== undefined) throw cleanupError;
  if (verificationError !== undefined) throw verificationError;
}

export function resolvePackageRunner(
  nodeExecutable,
  inheritedPackageManagerCli = process.env.npm_execpath,
) {
  if (
    typeof inheritedPackageManagerCli === "string" &&
    isAbsolute(inheritedPackageManagerCli) &&
    existsSync(inheritedPackageManagerCli)
  ) {
    const inheritedName = basename(inheritedPackageManagerCli).toLowerCase();
    if (["pnpm.js", "pnpm.cjs", "pnpm.mjs"].includes(inheritedName)) {
      return Object.freeze({
        cli: inheritedPackageManagerCli,
        args: Object.freeze(["dlx", `supabase@${SUPABASE_CLI_VERSION}`]),
      });
    }
  }

  const npmCli = resolveNpmCli(nodeExecutable, inheritedPackageManagerCli);
  return Object.freeze({
    cli: npmCli,
    args: Object.freeze([
      "exec",
      "--yes",
      "--package",
      `supabase@${SUPABASE_CLI_VERSION}`,
      "--",
      "supabase",
    ]),
  });
}

export function resolveNpmCli(nodeExecutable, inheritedNpmCli = process.env.npm_execpath) {
  const nodeDirectory = dirname(nodeExecutable);
  const candidates = [
    ...(typeof inheritedNpmCli === "string" &&
    isAbsolute(inheritedNpmCli) &&
    basename(inheritedNpmCli).toLowerCase() === "npm-cli.js"
      ? [inheritedNpmCli]
      : []),
    resolve(nodeDirectory, "node_modules/npm/bin/npm-cli.js"),
    resolve(nodeDirectory, "../lib/node_modules/npm/bin/npm-cli.js"),
  ];
  const npmCli = candidates.find((candidate) => existsSync(candidate));
  if (npmCli === undefined) {
    throw new Error(
      `Unable to locate npm-cli.js from the active package manager or beside Node at ${nodeExecutable}`,
    );
  }
  return npmCli;
}

function describeFailures(pgtapFailureCount, integrationFailureCount) {
  const descriptions = [];
  if (pgtapFailureCount > 0) {
    descriptions.push(
      `${String(pgtapFailureCount)} pgTAP file${pgtapFailureCount === 1 ? "" : "s"} failed`,
    );
  }
  if (integrationFailureCount > 0) {
    descriptions.push(
      `${String(integrationFailureCount)} real-PostgreSQL integration step${integrationFailureCount === 1 ? "" : "s"} failed`,
    );
  }
  return descriptions.join("; ");
}

export function runCommand(step, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(step.command, step.args, {
      cwd,
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: "true",
        ...step.env,
      },
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", rejectPromise);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(
        new Error(
          `${step.label} failed${signal === null ? ` with exit code ${String(code)}` : ` after signal ${signal}`}`,
        ),
      );
    });
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;
if (invokedPath === import.meta.url) {
  runRealDatabaseTests().catch((error) => {
    process.stderr.write(`[database] ${errorMessage(error)}\n`);
    process.exitCode = 1;
  });
}
