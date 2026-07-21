import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { z } from "zod";

import { assertAllowedArguments, fail, parseArguments, requireArgument } from "./common.mjs";

const VersionSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9._:+/-]{1,128}$/u);

export const RuntimeVersionManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    fixtureOnly: z.literal(true),
    runtime: z.enum(["web", "tasks"]),
    phase: z.enum(["baseline", "expand", "contract"]),
    buildId: VersionSchema,
    contractVersion: VersionSchema,
    readContractVersions: z.array(VersionSchema).min(1).max(16),
    writeContractVersions: z.array(VersionSchema).min(1).max(16),
    activeMigration: VersionSchema,
    supportedMigrations: z.array(VersionSchema).min(1).max(16),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.supportedMigrations.includes(value.activeMigration)) {
      context.addIssue({
        code: "custom",
        message: "A runtime version manifest must support its active migration.",
      });
    }
    if (!value.readContractVersions.includes(value.contractVersion)) {
      context.addIssue({
        code: "custom",
        message: "A runtime version manifest must read its active contract version.",
      });
    }
    if (!value.writeContractVersions.includes(value.contractVersion)) {
      context.addIssue({
        code: "custom",
        message: "A runtime version manifest must write its active contract version.",
      });
    }
  });

export const MigrationCompatibilityEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal("compatible"),
    verificationScope: z.literal("synthetic-contract-and-migration-manifests"),
    phase: z.enum(["expand", "contract"]),
    prior: z
      .object({ web: RuntimeVersionManifestSchema, tasks: RuntimeVersionManifestSchema })
      .strict(),
    candidate: z
      .object({ web: RuntimeVersionManifestSchema, tasks: RuntimeVersionManifestSchema })
      .strict(),
  })
  .strict()
  .readonly();

function assertRuntimePair(label, pair) {
  if (pair.web.runtime !== "web" || pair.tasks.runtime !== "tasks") {
    throw new Error(`${label} runtime manifests must be one web and one tasks manifest.`);
  }
  if (pair.web.activeMigration !== pair.tasks.activeMigration) {
    throw new Error(`${label} web and tasks manifests must declare the same active migration.`);
  }
}

function assertSupports(runtime, migration, message) {
  if (!runtime.supportedMigrations.includes(migration)) throw new Error(message);
}

function assertRuntimeContractCompatibility(prior, candidate) {
  for (const priorWriter of [prior.web, prior.tasks]) {
    for (const candidateReader of [candidate.web, candidate.tasks]) {
      if (!candidateReader.readContractVersions.includes(priorWriter.contractVersion)) {
        throw new Error(
          `Candidate ${candidateReader.runtime} must read the prior ${priorWriter.runtime} contract.`,
        );
      }
    }
  }
  for (const candidateWriter of [candidate.web, candidate.tasks]) {
    for (const priorReader of [prior.web, prior.tasks]) {
      if (!priorReader.readContractVersions.includes(candidateWriter.contractVersion)) {
        throw new Error(
          `Prior ${priorReader.runtime} must read the candidate ${candidateWriter.runtime} contract.`,
        );
      }
    }
  }
}

export function validateMigrationCompatibilityDocuments(input) {
  const prior = {
    web: RuntimeVersionManifestSchema.parse(input.priorWeb),
    tasks: RuntimeVersionManifestSchema.parse(input.priorTasks),
  };
  const candidate = {
    web: RuntimeVersionManifestSchema.parse(input.candidateWeb),
    tasks: RuntimeVersionManifestSchema.parse(input.candidateTasks),
  };

  assertRuntimePair("Prior", prior);
  assertRuntimePair("Candidate", candidate);
  const phase = candidate.web.phase;
  if (phase === "baseline" || candidate.tasks.phase !== phase) {
    throw new Error("Candidate web and tasks manifests must share an expand or contract phase.");
  }

  const priorMigration = prior.web.activeMigration;
  const candidateMigration = candidate.web.activeMigration;
  for (const runtime of [candidate.web, candidate.tasks]) {
    assertSupports(
      runtime,
      priorMigration,
      `Candidate ${runtime.runtime} must remain compatible with the prior migration.`,
    );
  }
  for (const runtime of [prior.web, prior.tasks]) {
    assertSupports(
      runtime,
      candidateMigration,
      `Prior ${runtime.runtime} must support the candidate migration during an ${phase} rollout.`,
    );
  }
  assertRuntimeContractCompatibility(prior, candidate);

  return MigrationCompatibilityEvidenceSchema.parse({
    schemaVersion: 1,
    status: "compatible",
    verificationScope: "synthetic-contract-and-migration-manifests",
    phase,
    prior,
    candidate,
  });
}

export function parseMigrationCompatibilityEvidence(encoded) {
  let decoded;
  try {
    decoded = JSON.parse(encoded);
  } catch {
    throw new Error("Migration compatibility evidence is not valid JSON.");
  }
  return MigrationCompatibilityEvidenceSchema.parse(decoded);
}

export function assertReleaseMatchesMigrationCompatibility(manifest, evidence) {
  const release = manifest.versions;
  const candidate = evidence.candidate;
  if (
    candidate.web.buildId !== release.web ||
    candidate.tasks.buildId !== release.tasks ||
    candidate.web.contractVersion !== release.contract ||
    candidate.tasks.contractVersion !== release.contract ||
    candidate.web.activeMigration !== release.databaseMigration ||
    candidate.tasks.activeMigration !== release.databaseMigration
  ) {
    throw new Error(
      "Migration compatibility evidence does not match the release version manifest.",
    );
  }
}

async function readRuntimeManifest(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  assertAllowedArguments(argumentsMap, [
    "prior-web-manifest",
    "prior-tasks-manifest",
    "candidate-web-manifest",
    "candidate-tasks-manifest",
  ]);
  const evidence = validateMigrationCompatibilityDocuments({
    priorWeb: await readRuntimeManifest(requireArgument(argumentsMap, "prior-web-manifest")),
    priorTasks: await readRuntimeManifest(requireArgument(argumentsMap, "prior-tasks-manifest")),
    candidateWeb: await readRuntimeManifest(
      requireArgument(argumentsMap, "candidate-web-manifest"),
    ),
    candidateTasks: await readRuntimeManifest(
      requireArgument(argumentsMap, "candidate-tasks-manifest"),
    ),
  });
  process.stdout.write(`${JSON.stringify(evidence)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(fail);
}
