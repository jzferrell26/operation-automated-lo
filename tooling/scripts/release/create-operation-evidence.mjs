import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { assertAllowedArguments, fail, parseArguments, requireArgument } from "./common.mjs";

const operations = new Set([
  "deployment",
  "rollback",
  "database-restore",
  "provider-reconciliation",
  "incident",
  "kill-switch",
  "credential-revocation",
  "export",
  "uninstall",
  "retention",
  "deletion",
]);
const environments = new Set(["local", "preview", "staging", "production"]);
const CorrelationIdPattern = /^corr_[A-Za-z0-9][A-Za-z0-9_-]{7,95}$/u;

async function main() {
  const argumentsMap = parseArguments(process.argv.slice(2));
  assertAllowedArguments(argumentsMap, [
    "operation",
    "environment",
    "correlation-id",
    "write",
    "output",
  ]);
  const operation = requireArgument(argumentsMap, "operation");
  const environment = requireArgument(argumentsMap, "environment");
  const correlationId = requireArgument(argumentsMap, "correlation-id");

  if (!operations.has(operation)) {
    throw new Error(`Unsupported operation: ${operation}`);
  }
  if (!environments.has(environment)) {
    throw new Error(`Unsupported environment: ${environment}`);
  }
  if (!CorrelationIdPattern.test(correlationId)) {
    throw new Error("Correlation ID is invalid");
  }

  const evidence = Object.freeze({
    schemaVersion: 1,
    operation,
    environment,
    correlationId,
    status: "not-run",
    mode: "dry-run",
    createdAt: new Date().toISOString(),
    operator: "unassigned",
    approvals: [],
    commands: [],
    observations: [],
    artifacts: [],
    note: "This skeleton does not claim that an external command or exercise passed",
  });
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;

  if (argumentsMap.get("write") === true) {
    const output = resolve(requireArgument(argumentsMap, "output"));
    await writeFile(output, serialized, { encoding: "utf8", flag: "wx" });
    process.stdout.write(`Pending evidence skeleton written to ${output}\n`);
    return;
  }

  if (argumentsMap.has("output")) {
    throw new Error("The --output argument requires the explicit --write flag");
  }

  process.stdout.write(serialized);
}

main().catch(fail);
