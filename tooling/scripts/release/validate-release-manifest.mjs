import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertAllowedArguments,
  fail,
  loadBuiltConfigModule,
  parseArguments,
  requireArgument,
} from "./common.mjs";
import {
  assertReleaseMatchesMigrationCompatibility,
  parseMigrationCompatibilityEvidence,
} from "./validate-migration-compatibility.mjs";

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  assertAllowedArguments(argumentsMap, [
    "manifest",
    "expected-environment",
    "expected-commit",
    "expected-build-id",
    "migration-compatibility",
    "require-production-evidence",
  ]);
  const manifestPath = resolve(requireArgument(argumentsMap, "manifest"));
  const expectedEnvironment = requireArgument(argumentsMap, "expected-environment");
  const expectedCommit = requireArgument(argumentsMap, "expected-commit");
  const expectedBuildId = requireArgument(argumentsMap, "expected-build-id");
  const migrationCompatibilityPath = resolve(
    requireArgument(argumentsMap, "migration-compatibility"),
  );
  const encoded = await readFile(manifestPath, "utf8");
  const compatibilityEvidence = parseMigrationCompatibilityEvidence(
    await readFile(migrationCompatibilityPath, "utf8"),
  );
  const {
    DeploymentEnvironmentSchema,
    assertDeploymentManifestCompatibility,
    assertProductionReleaseEvidence,
    parseDeploymentManifestJson,
  } = await loadBuiltConfigModule();
  const manifest = parseDeploymentManifestJson(encoded);
  const environment = DeploymentEnvironmentSchema.parse(expectedEnvironment);

  assertDeploymentManifestCompatibility(manifest, {
    environment,
    commit: expectedCommit,
    buildId: expectedBuildId,
  });
  assertReleaseMatchesMigrationCompatibility(manifest, compatibilityEvidence);

  if (argumentsMap.get("require-production-evidence") === true) {
    assertProductionReleaseEvidence(manifest);
  }

  process.stdout.write(
    `${JSON.stringify({
      status: "valid",
      environment: manifest.environment,
      commit: manifest.commit,
      buildId: manifest.buildId,
      externalExercises: manifest.evidence.externalExercises.status,
      migrationCompatibility: compatibilityEvidence.verificationScope,
      note: "Validation is read-only and does not prove an external exercise occurred",
    })}\n`,
  );
}

main().catch(fail);
