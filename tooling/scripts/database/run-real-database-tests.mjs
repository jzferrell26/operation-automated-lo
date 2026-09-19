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

export const WEB_POSTGRES_PROJECT = "web-postgres";
const WEB_POSTGRES_TEST_DIRECTORY = "apps/web/src";
const WEB_POSTGRES_TEST_SUFFIX = ".postgres.test.ts";
const SEED_REVIEW_LOCATION_SCRIPT = "tooling/scripts/database/seed-review-location.mjs";

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
 * The route-level PostgreSQL suite (`apps/web/src/**\/*.postgres.test.ts`, the
 * `web-postgres` vitest project) is discovered rather than required, because
 * PRD-005b lands the migration and the gate wiring in Wave 1 while PRD-005b's
 * own route rows and PRD-005a's composition add the first matching file in
 * Wave 2. An empty discovery is NOT treated as success: the step is omitted and
 * `runRealDatabaseTests` prints a notice naming the empty pattern, so an
 * accidentally deleted suite is visible in the gate log instead of silent. Once
 * a file exists the step runs and a failure fails the gate like any other.
 */
export async function discoverWebPostgresTestFiles(repositoryRoot = defaultRepositoryRoot) {
  const absoluteDirectory = resolve(repositoryRoot, WEB_POSTGRES_TEST_DIRECTORY);
  if (!existsSync(absoluteDirectory)) return [];
  const entries = await readdir(absoluteDirectory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(WEB_POSTGRES_TEST_SUFFIX))
    .map((entry) =>
      relative(repositoryRoot, resolve(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    )
    .toSorted();
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

/**
 * The name reaches `psql --command` inside unquoted `drop database` / `create database` DDL, so a
 * prefix check alone would let any suffix through. Constraining the whole value to a lowercase
 * identifier keeps the guard a guard: it cannot carry a quote, a semicolon, or a comment.
 */
const DISPOSABLE_TEST_DATABASE_NAME_PATTERN = /^oalo_test_[a-z0-9_]{1,40}$/u;

export function assertDisposableTestDatabaseName(databaseName) {
  if (!databaseName.startsWith(TEST_DATABASE_NAME_PREFIX)) {
    throw new Error(
      `Refusing to run destructive integration tests against ${databaseName}: the database name must start with ${TEST_DATABASE_NAME_PREFIX}.`,
    );
  }
  if (!DISPOSABLE_TEST_DATABASE_NAME_PATTERN.test(databaseName)) {
    throw new Error(
      `Refusing to run destructive integration tests against ${databaseName}: the database name must match ${DISPOSABLE_TEST_DATABASE_NAME_PATTERN.source}.`,
    );
  }
  return databaseName;
}

export function commandPlan(discovery, repositoryRoot = defaultRepositoryRoot) {
  const { pgtapFiles, migrationFiles, integrationTestFiles, databasePort } = discovery;
  const webPostgresTestFiles = discovery.webPostgresTestFiles ?? [];
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
      // @oalo/auth is built alongside @oalo/db because
      // packages/db/test/campaign-integration-support.mjs imports the shared role
      // map from packages/auth/dist (PRD-005a 005A-AC-007), and @oalo/db must not
      // depend on @oalo/auth, so the dependency graph will never pull it in.
      // Without this filter a clean checkout's `pnpm test:db` fails on a missing
      // dist file instead of on a real defect.
      Object.freeze({
        command: node,
        args: [
          turboCli,
          "run",
          "build",
          "--filter=@oalo/db...",
          "--filter=@oalo/auth...",
          "--filter=@oalo/contracts...",
        ],
        label: "build @oalo/db, @oalo/auth, and their workspace dependencies",
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
      // The seeding script runs before the route-level suite, not after it. Its
      // own guard refuses a database that holds an active location it does not
      // own (005B-AC-017), and the route-level suite seeds several of exactly
      // that kind. Seeding first keeps the guard meaningful: it still faces a
      // database it did not create, and the route suites cannot make it pass by
      // accident. The script talks to PostgreSQL through the postgres driver
      // rather than psql, so the disposable database's well-known local password
      // travels in the URL argument instead of PGPASSWORD. It is the same
      // throwaway credential already hardcoded in this file for the local stack.
      Object.freeze({
        command: node,
        args: [
          resolve(repositoryRoot, SEED_REVIEW_LOCATION_SCRIPT),
          "--review-database-url",
          localDatabaseUrl(databasePort, testDatabaseName, { withPassword: true }),
          "--confirm-database",
          testDatabaseName,
        ],
        label: `seed the review location into ${testDatabaseName}`,
      }),
      Object.freeze({
        command: node,
        args: [
          resolve(repositoryRoot, SEED_REVIEW_LOCATION_SCRIPT),
          "--review-database-url",
          localDatabaseUrl(databasePort, testDatabaseName, { withPassword: true }),
          "--confirm-database",
          testDatabaseName,
          "--expect-unchanged",
        ],
        label: "prove the review seeding script inserts nothing on a second run",
      }),
      // PRD-005b: the route-level suite runs only when a matching file exists.
      // `notices` below carries the message the runner prints when none does.
      ...(webPostgresTestFiles.length === 0
        ? []
        : [
            Object.freeze({
              command: node,
              args: [vitestCli, "run", "--project", WEB_POSTGRES_PROJECT],
              env: Object.freeze({
                OALO_TEST_DATABASE_URL: localDatabaseUrl(databasePort, testDatabaseName, {
                  withPassword: true,
                }),
              }),
              label: "run the route-level PostgreSQL tests",
            }),
          ]),
    ]),
    notices: Object.freeze(
      webPostgresTestFiles.length === 0
        ? [
            `no ${WEB_POSTGRES_TEST_DIRECTORY}/**/*${WEB_POSTGRES_TEST_SUFFIX} file exists, so the ${WEB_POSTGRES_PROJECT} step is not in this plan`,
          ]
        : [],
    ),
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
      webPostgresTestFiles: await discoverWebPostgresTestFiles(repositoryRoot),
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
    for (const notice of plan.notices) {
      process.stdout.write(`\n[database] notice: ${notice}\n`);
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
