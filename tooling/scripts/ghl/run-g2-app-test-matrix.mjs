#!/usr/bin/env node
/**
 * G2 App Test matrix capture runner.
 *
 * Default: fail-closed (lists matrix, exits 1) unless
 * OALO_GHL_LIVE_CAPTURE=authorized.
 *
 * Prerequisites: `pnpm --filter @oalo/ghl build`
 *
 * Usage:
 *   node tooling/scripts/ghl/run-g2-app-test-matrix.mjs --list
 *   OALO_GHL_LIVE_CAPTURE=authorized node tooling/scripts/ghl/run-g2-app-test-matrix.mjs \
 *     --observation-dir ./tmp/g2-observations \
 *     --out-dir ./tmp/g2-sanitized-fixtures
 *
 * Observation files: one JSON per caseId, e.g. signed_custom_page_context.json
 * matching LiveCaptureObservationSchema (no tokens, PII, or spend).
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "../../..");
const distIndex = join(root, "packages/ghl/dist/index.js");

function parseArgs(argv) {
  const options = {
    list: false,
    observationDir: null,
    outDir: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--list") {
      options.list = true;
      continue;
    }
    if (arg === "--observation-dir") {
      options.observationDir = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  if (!existsSync(distIndex)) {
    throw new Error("Build @oalo/ghl first: pnpm --filter @oalo/ghl build");
  }

  const options = parseArgs(process.argv.slice(2));
  const ghl = await import(pathToFileURL(distIndex).href);
  const {
    listG2MatrixCases,
    createLiveCaptureAdapter,
    isLiveCaptureAuthorized,
    OALO_GHL_LIVE_CAPTURE_ENV,
    OALO_GHL_LIVE_CAPTURE_AUTHORIZED,
  } = ghl;

  const cases = listG2MatrixCases();

  if (options.list || (!options.observationDir && !isLiveCaptureAuthorized())) {
    console.log("G2 HighLevel App Test matrix cases:");
    for (const matrixCase of cases) {
      console.log(`- ${matrixCase.caseId}: ${matrixCase.title}`);
    }
    console.log("");
    console.log(
      `Live capture stays disabled unless ${OALO_GHL_LIVE_CAPTURE_ENV}=${OALO_GHL_LIVE_CAPTURE_AUTHORIZED}.`,
    );
    console.log(
      "Provide sanitized observation JSON files (no tokens/PII/spend), then re-run with --observation-dir and --out-dir.",
    );
    if (!options.list && !isLiveCaptureAuthorized()) {
      process.exitCode = 1;
    }
    return;
  }

  if (!isLiveCaptureAuthorized()) {
    throw new Error(
      `Refusing capture: set ${OALO_GHL_LIVE_CAPTURE_ENV}=${OALO_GHL_LIVE_CAPTURE_AUTHORIZED}.`,
    );
  }

  if (!options.observationDir || !options.outDir) {
    throw new Error("Authorized capture requires --observation-dir and --out-dir.");
  }

  const observationDir = resolve(options.observationDir);
  const outDir = resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });

  const adapter = createLiveCaptureAdapter();
  if (adapter.mode !== "authorized") {
    throw new Error("Expected authorized live capture adapter.");
  }

  const files = readdirSync(observationDir).filter((name) => name.endsWith(".json"));
  if (files.length === 0) {
    throw new Error(`No observation JSON files found in ${observationDir}`);
  }

  const written = [];
  for (const fileName of files) {
    const raw = JSON.parse(readFileSync(join(observationDir, fileName), "utf8"));
    const record = await adapter.capture(raw);
    const outName = `${record.caseId}.json`;
    writeFileSync(join(outDir, outName), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    written.push(outName);
    console.log(`captured ${record.caseId} -> ${outName}`);
  }

  const missing = cases
    .map((entry) => entry.caseId)
    .filter((caseId) => !written.includes(`${caseId}.json`));
  if (missing.length > 0) {
    console.log("");
    console.log(`Matrix cases still missing observations: ${missing.join(", ")}`);
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
