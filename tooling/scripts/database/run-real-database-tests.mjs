import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

export const SUPABASE_CLI_VERSION = "2.109.1";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const defaultRepositoryRoot = resolve(scriptDirectory, "../../..");

export async function discoverPgtapFiles(repositoryRoot = defaultRepositoryRoot) {
  const testsDirectory = resolve(repositoryRoot, "supabase/tests");
  const entries = await readdir(testsDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pgtap.sql"))
    .map((entry) =>
      relative(repositoryRoot, resolve(testsDirectory, entry.name)).replaceAll("\\", "/"),
    )
    .toSorted();

  if (files.length === 0) {
    throw new Error("No supabase/tests/*.pgtap.sql files were found.");
  }
  return files;
}

export function commandPlan(pgtapFiles, repositoryRoot = defaultRepositoryRoot) {
  const node = process.execPath;
  const packageRunner = resolvePackageRunner(node);
  const vitestCli = resolve(repositoryRoot, "node_modules/vitest/vitest.mjs");
  const supabase = [packageRunner.cli, ...packageRunner.args];

  return Object.freeze({
    cleanup: Object.freeze({
      command: node,
      args: [...supabase, "stop", "--no-backup"],
      label: "stop local Supabase without preserving database state",
    }),
    setup: Object.freeze([
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
  });
}

export async function runRealDatabaseTests(options = {}) {
  const repositoryRoot = options.repositoryRoot ?? defaultRepositoryRoot;
  const run = options.run ?? runCommand;
  const pgtapFiles = await discoverPgtapFiles(repositoryRoot);
  const plan = commandPlan(pgtapFiles, repositoryRoot);
  let verificationError;
  let cleanupError;

  try {
    for (const step of plan.setup) {
      process.stdout.write(`\n[database] ${step.label}\n`);
      await run(step, repositoryRoot);
    }
    const testFailures = [];
    for (const step of plan.tests) {
      process.stdout.write(`\n[database] ${step.label}\n`);
      try {
        await run(step, repositoryRoot);
      } catch (error) {
        testFailures.push(error);
      }
    }
    if (testFailures.length > 0) {
      throw new AggregateError(
        testFailures,
        `${String(testFailures.length)} pgTAP file${testFailures.length === 1 ? "" : "s"} failed`,
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

function runCommand(step, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(step.command, step.args, {
      cwd,
      env: {
        ...process.env,
        SUPABASE_TELEMETRY_DISABLED: "true",
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
