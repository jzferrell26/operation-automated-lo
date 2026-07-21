import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertAllowedArguments,
  fail,
  loadBuiltConfigModule,
  parseArguments,
  requireArgument,
} from "./common.mjs";

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  assertAllowedArguments(argumentsMap, [
    "environment",
    "commit",
    "build-id",
    "generated-at",
    "verification-reference",
    "web-version",
    "tasks-version",
    "database-migration-version",
    "contract-version",
    "renderer-version",
    "template-version",
    "write",
    "output",
  ]);
  const environment = requireArgument(argumentsMap, "environment");
  if (environment === "production") {
    throw new Error(
      "This tool never creates production manifests because external evidence requires independent verification",
    );
  }

  const { createCandidateDeploymentManifest, DeploymentEnvironmentSchema } =
    await loadBuiltConfigModule();
  const parsedEnvironment = DeploymentEnvironmentSchema.exclude(["production"]).parse(environment);
  const manifest = createCandidateDeploymentManifest({
    environment: parsedEnvironment,
    commit: requireArgument(argumentsMap, "commit"),
    buildId: requireArgument(argumentsMap, "build-id"),
    generatedAt: requireArgument(argumentsMap, "generated-at"),
    verificationReference: requireArgument(argumentsMap, "verification-reference"),
    versions: {
      web: requireArgument(argumentsMap, "web-version"),
      tasks: requireArgument(argumentsMap, "tasks-version"),
      databaseMigration: requireArgument(argumentsMap, "database-migration-version"),
      contract: requireArgument(argumentsMap, "contract-version"),
      renderer: requireArgument(argumentsMap, "renderer-version"),
      template: requireArgument(argumentsMap, "template-version"),
    },
  });
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;

  if (argumentsMap.get("write") === true) {
    const output = resolve(requireArgument(argumentsMap, "output"));
    await writeFile(output, serialized, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`Candidate manifest written to ${output}\n`);
    return;
  }

  if (argumentsMap.has("output")) {
    throw new Error("The --output argument requires the explicit --write flag");
  }

  process.stdout.write(
    `${JSON.stringify({ mode: "dry-run", note: "No file or cloud state changed", manifest }, null, 2)}\n`,
  );
}

main().catch(fail);
