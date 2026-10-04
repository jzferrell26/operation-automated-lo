import { randomBytes } from "node:crypto";
import { connect } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

/**
 * PRD-006c D9. The review browser run: a real `next start` in review mode, a TLS terminator in
 * front of it, and the `review` Playwright project against both.
 *
 * It is a module of its own rather than more lines inside `run-real-database-tests.mjs` because it
 * owns three processes and a temporary directory, and every one of them has to be torn down
 * whether the run passed or failed. That is a lifecycle, and lifecycles that share a file with a
 * command list get half-cleaned up.
 *
 * Nothing here weakens a rule the deployment enforces. The certificate is real TLS on the loopback
 * interface, generated per run and deleted after it; the environment is the preview contract the
 * security suite already builds, with self-serve sign-up enabled because the timed run creates an
 * account, and with no email variables at all because that is the honest not-configured state.
 *
 * PRD-009g, 009G-AC-001. The browser project runs twice against two servers started one after the
 * other on the same ports, because what a server shows depends on whether the samples flag is set
 * and a flag is read when the process starts. The first pass shows the labelled sample ads, which
 * is what every review spec was written against. The second shows the real catalog, which ships
 * empty, and is the page a real sign-up meets on the hosted app: Home, the Ads library tab, and
 * step 1 with no ad to choose. The second pass runs only the specs under
 * `tests/browser/review/real-catalog/`, and the first runs none of them (`playwright.config.ts`).
 * Both passes use the same disposable database, so the sign-ups they spend are one budget.
 */

const HOST = "127.0.0.1";
export const REVIEW_HTTP_PORT = 3100;
export const REVIEW_HTTPS_PORT = 3443;
export const REVIEW_APP_URL = `https://${HOST}:${String(REVIEW_HTTPS_PORT)}`;
const SERVER_READY_TIMEOUT_MS = 180_000;
const SERVER_POLL_INTERVAL_MS = 500;
const REVIEW_BUILD_COMMIT = "local";
const REVIEW_BUILD_ID = "review-browser-run";

/**
 * The environment a deployed preview branch carries, as
 * `tests/security/provider-side-effect-default-off.test.ts` builds it, plus the names the review
 * composition needs and the self-serve flag the timed run's sign-up needs.
 *
 * One value diverges from PRD-006c D9's literal text, for the same reason
 * `apps/web/src/server/campaign-route-postgres-support.ts` already diverges from it:
 * `OALO_ENVIRONMENT` is `local`, not `preview`. The pool refuses a TLS-disabled connection on any
 * deployment environment other than local or test, and the disposable Supabase stack speaks plain
 * TCP, so a `preview` environment name here would mean either no database or a weakened TLS rule.
 * Review mode is selected by `OALO_REVIEW_SURFACE`, not by the environment name, so what this run
 * exercises is exactly the review composition a preview deployment builds, minus a TLS requirement
 * the local stack cannot satisfy. Weakening the rule to keep the label would have been the wrong
 * trade.
 *
 * `OALO_RESEND_API_KEY` and `OALO_EMAIL_FROM` are deliberately absent. Both absent selects the
 * not-configured email adapter, which never calls `fetch`; exactly one present is a composition
 * failure. A gate that set them would be proving a deployment nobody has.
 *
 * `catalog` is `samples` (the default) for the labelled sample ads, or `real` for the catalog the
 * repository ships, which is empty (PRD-009g).
 */
export function reviewServerEnvironment(databaseUrl, catalog = "samples") {
  if (catalog !== "samples" && catalog !== "real") {
    throw new Error(`The review run has no catalog named ${String(catalog)}`);
  }
  const identity = Object.fromEntries(
    [
      ["OALO_DATABASE_ID", "database"],
      ["OALO_TASK_PROJECT_ID", "tasks"],
      ["OALO_SECRET_SCOPE_ID", "secrets"],
      ["OALO_PRIVATE_STORAGE_ID", "private-storage"],
      ["OALO_PUBLISHED_STORAGE_ID", "published-storage"],
      ["OALO_PROVIDER_APP_ID", "provider-app"],
    ].map(([name, suffix]) => [name, `local:${suffix}`]),
  );

  return Object.freeze({
    ...identity,
    OALO_ENVIRONMENT: "local",
    OALO_PROVIDER_MODE: "stub",
    OALO_STRIPE_MODE: "test",
    OALO_DATA_CLASSIFICATION: "synthetic-only",
    OALO_TRIGGER_ENVIRONMENT: "dev",
    OALO_SUPABASE_MODE: "local",
    OALO_PRODUCTION_TRAFFIC: "disabled",
    OALO_SYNTHETIC_DATA_ONLY: "true",
    OALO_REVIEW_SURFACE: "authorized",
    // An opt-in for this disposable run only. Security Ruling 1 (PRD-005/006 batch security audit,
    // 2026-09-19): sign-up's duplicate-email disclosure is acceptable only while sign-up is off by
    // default, and turning it on by default requires moving to the emailed path first.
    OALO_SELF_SERVE_SIGNUP: "enabled",
    // PRD-009c D3, 009C-AC-004. The first pass shows the labelled sample ads. The guard also needs
    // `OALO_ENVIRONMENT` to be exactly `local`, set above, and refuses on any deployment signal,
    // none of which this run sets. PRD-009g: the second pass leaves the flag out, so the guard
    // refuses and the server shows the real catalog, which ships empty.
    ...(catalog === "samples" ? { OALO_ADS_LIBRARY_SAMPLES: "enabled" } : {}),
    OALO_DATABASE_URL: databaseUrl,
    OALO_DATABASE_SSL_MODE: "disable",
    OALO_APP_URL: REVIEW_APP_URL,
    OALO_ALLOWED_ORIGINS: REVIEW_APP_URL,
    OALO_CSRF_SERVER_SECRET: randomBytes(32).toString("base64url"),
    OALO_BUILD_COMMIT: REVIEW_BUILD_COMMIT,
    OALO_BUILD_ID: REVIEW_BUILD_ID,
    NEXT_PUBLIC_OALO_ENVIRONMENT: "local",
    NEXT_PUBLIC_OALO_APP_URL: REVIEW_APP_URL,
    NEXT_PUBLIC_OALO_BUILD_ID: REVIEW_BUILD_ID,
  });
}

/**
 * PRD-009g, 009G-AC-001. The two passes of the browser project, in the order they run.
 *
 * `OALO_REVIEW_CATALOG` is what `playwright.config.ts` reads to choose the spec set: the sample pass
 * ignores `real-catalog/**`, and the real pass runs nothing else. `OALO_EXPECT_EMPTY_LIBRARY` is the
 * switch the synthetic suite's empty-library block already uses for the same server state.
 */
export const REVIEW_PASSES = Object.freeze([
  Object.freeze({
    catalog: "samples",
    label: "the review browser suite against the sample ads",
    environment: Object.freeze({ OALO_REVIEW_CATALOG: "samples" }),
  }),
  Object.freeze({
    catalog: "real",
    label: "the review browser suite against the real, empty catalog",
    environment: Object.freeze({
      OALO_REVIEW_CATALOG: "real",
      OALO_EXPECT_EMPTY_LIBRARY: "true",
    }),
  }),
]);

/**
 * PRD-006d D8. A baseline is written only when somebody asks for it by name, on their own machine,
 * and never by the gate: a run that quietly writes the picture it was supposed to compare against
 * proves nothing. Continuous integration never sets this.
 */
export function playwrightReviewArguments(playwrightCli, baselineMode) {
  const updateBaselines =
    baselineMode === "true"
      ? ["--update-snapshots=missing"]
      : ["all", "changed", "missing"].includes(baselineMode ?? "")
        ? [`--update-snapshots=${baselineMode ?? ""}`]
        : [];
  return [playwrightCli, "test", "--project", "review", ...updateBaselines];
}

/** The openssl invocation that makes the run's certificate. One command, no config file. */
export function certificateCommand(directory) {
  return Object.freeze({
    command: "openssl",
    args: [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=127.0.0.1",
      "-addext",
      "subjectAltName=IP:127.0.0.1,DNS:localhost",
      "-keyout",
      join(directory, "review.key"),
      "-out",
      join(directory, "review.crt"),
    ],
  });
}

function spawnProcess(command, args, options) {
  return spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    shell: false,
    stdio: "inherit",
    windowsHide: true,
  });
}

function runToCompletion(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawnProcess(command, args, options);
    child.once("error", rejectPromise);
    child.once("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${options.label} failed with exit code ${String(code)}`));
    });
  });
}

async function stopProcess(child) {
  if (child === undefined || child.exitCode !== null || child.killed) return;
  child.kill();
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolvePromise(undefined);
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolvePromise(undefined);
    });
  });
}

/**
 * Readiness is proven in two plain steps rather than by fetching over TLS.
 *
 * Node's `fetch` would reject this run's self-signed certificate, and the only way to make it
 * accept one is `NODE_TLS_REJECT_UNAUTHORIZED=0`, which turns off certificate checking for the
 * whole process. A gate that disabled certificate checking in order to prove TLS works would be
 * proving nothing. So the application is checked over plain http on its own port, and the
 * terminator is checked by opening a socket to it. Playwright, which is configured to accept this
 * one certificate, is what actually speaks TLS.
 */
async function waitForApplication(url) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  let lastError = "no attempt was made";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
      lastError = `answered ${String(response.status)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, SERVER_POLL_INTERVAL_MS));
  }
  throw new Error(`The review server never answered at ${url}: ${lastError}`);
}

async function waitForTerminator(port) {
  const deadline = Date.now() + SERVER_READY_TIMEOUT_MS;
  let lastError = "no attempt was made";
  while (Date.now() < deadline) {
    const connected = await new Promise((resolvePromise) => {
      const socket = connect({ host: HOST, port }, () => {
        socket.end();
        resolvePromise(true);
      });
      socket.once("error", (error) => {
        lastError = error.message;
        socket.destroy();
        resolvePromise(false);
      });
    });
    if (connected) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, SERVER_POLL_INTERVAL_MS));
  }
  throw new Error(`The TLS terminator never listened on ${String(port)}: ${lastError}`);
}

export async function runReviewBrowserSuite(options) {
  const repositoryRoot = options.repositoryRoot;
  const node = process.execPath;
  const playwrightCli = resolve(repositoryRoot, "node_modules/@playwright/test/cli.js");
  // `next` is a dependency of `apps/web`, not of the workspace root, so pnpm installs it under
  // the app rather than hoisting it. Resolving it from the app is what makes this work on a
  // strict, non-hoisted install.
  const nextCli = resolve(repositoryRoot, "apps/web/node_modules/next/dist/bin/next");
  const proxyScript = resolve(repositoryRoot, "tooling/scripts/browser/https-proxy.mjs");
  const certificateDirectory = await mkdtemp(join(tmpdir(), "oalo-review-tls-"));

  let server;
  let terminator;
  const failures = [];
  try {
    // `next start` serves whatever is in `.next`, so the build has to happen first. The database
    // job does not otherwise build the web application, and an absent or stale build would either
    // fail confusingly or, worse, exercise the previous commit.
    await runToCompletion(
      node,
      [
        resolve(repositoryRoot, "node_modules/turbo/bin/turbo"),
        "run",
        "build",
        "--filter=@oalo/web...",
      ],
      { cwd: repositoryRoot, env: {}, label: "build the web application for the review run" },
    );

    const certificate = certificateCommand(certificateDirectory);
    await runToCompletion(certificate.command, certificate.args, {
      cwd: repositoryRoot,
      env: {},
      label: "generate the review run's self-signed certificate",
    });

    terminator = spawnProcess(
      node,
      [
        proxyScript,
        "--listen-port",
        String(REVIEW_HTTPS_PORT),
        "--target-port",
        String(REVIEW_HTTP_PORT),
        "--cert",
        join(certificateDirectory, "review.crt"),
        "--key",
        join(certificateDirectory, "review.key"),
      ],
      { cwd: repositoryRoot, env: {} },
    );
    await waitForTerminator(REVIEW_HTTPS_PORT);

    /**
     * PRD-009g, 009G-AC-001. One server per pass, started after the previous one has exited, on the
     * same ports, so the terminator in front of them never changes and the review origin is the
     * same address in both. A pass that fails does not stop the next one: the pictures the second
     * pass draws are still worth having when the first has a failing test, and the run as a whole
     * still fails, naming each pass that did.
     */
    for (const pass of REVIEW_PASSES) {
      try {
        server = spawnProcess(
          node,
          [nextCli, "start", "--hostname", HOST, "--port", String(REVIEW_HTTP_PORT)],
          {
            cwd: resolve(repositoryRoot, "apps/web"),
            env: reviewServerEnvironment(options.databaseUrl, pass.catalog),
          },
        );
        await waitForApplication(`http://${HOST}:${String(REVIEW_HTTP_PORT)}/sign-in`);
        await runToCompletion(
          node,
          playwrightReviewArguments(playwrightCli, process.env.OALO_UPDATE_SCREEN_BASELINES),
          {
            cwd: repositoryRoot,
            env: {
              OALO_REVIEW_BROWSER_RUN: "true",
              OALO_REVIEW_APP_URL: REVIEW_APP_URL,
              OALO_TEST_SEEDED_CREATOR_EMAIL: options.seededCredentials.creatorEmail,
              OALO_TEST_SEEDED_APPROVER_EMAIL: options.seededCredentials.approverEmail,
              OALO_TEST_SEEDED_PASSWORD: options.seededCredentials.password,
              ...pass.environment,
              ...(process.env.OALO_REGENERATE_UI_EVIDENCE === undefined
                ? {}
                : { OALO_REGENERATE_UI_EVIDENCE: process.env.OALO_REGENERATE_UI_EVIDENCE }),
            },
            label: `run ${pass.label}`,
          },
        );
      } catch (error) {
        failures.push(error instanceof Error ? error.message : String(error));
      } finally {
        await stopProcess(server);
        server = undefined;
      }
    }
  } finally {
    await stopProcess(terminator);
    await stopProcess(server);
    await rm(certificateDirectory, { force: true, recursive: true });
  }
  if (failures.length > 0) throw new Error(failures.join("; "));
}

/**
 * The gate invokes this as a command so the orchestration contract test can plan the whole run
 * without a browser. The disposable database's URL arrives as an argument, the way the seeding
 * script's does; the shared password arrives in the environment, never on the command line, so it
 * cannot reach a process listing.
 */
export function parseReviewRunArguments(argv) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (typeof name !== "string" || !name.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value pairs, saw ${String(name)}`);
    }
    options.set(name.slice(2), value);
  }
  const databaseUrl = options.get("database-url");
  const creatorEmail = options.get("creator-email");
  const approverEmail = options.get("approver-email");
  const password = process.env.OALO_TEST_SEEDED_PASSWORD;
  if (databaseUrl === undefined || creatorEmail === undefined || approverEmail === undefined) {
    throw new Error("--database-url, --creator-email, and --approver-email are required");
  }
  if (!new URL(databaseUrl).pathname.startsWith("/oalo_test_")) {
    throw new Error("The review browser run only ever points at a disposable oalo_test_ database");
  }
  if (password === undefined || password.length === 0) {
    throw new Error("OALO_TEST_SEEDED_PASSWORD is required");
  }
  return Object.freeze({
    databaseUrl,
    seededCredentials: Object.freeze({ approverEmail, creatorEmail, password }),
  });
}

const invokedPath =
  process.argv[1] === undefined ? undefined : pathToFileURL(resolve(process.argv[1])).href;

if (invokedPath === import.meta.url) {
  const parsed = parseReviewRunArguments(process.argv.slice(2));
  await runReviewBrowserSuite({
    ...parsed,
    repositoryRoot: resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
  });
}
