import { readFile } from "node:fs/promises";
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
  assertAllowedArguments(argumentsMap, ["input"]);
  const sourcePath = resolve(requireArgument(argumentsMap, "input"));
  const source = JSON.parse(await readFile(sourcePath, "utf8"));
  if (!Array.isArray(source)) {
    throw new Error("Isolation contract must be a JSON array");
  }

  const { assertEnvironmentIsolation } = await loadBuiltConfigModule();
  assertEnvironmentIsolation(source);

  process.stdout.write(
    `${JSON.stringify({
      status: "valid",
      environments: source.map((entry) => entry.environment),
      note: "Synthetic contract validation is not live environment evidence",
    })}\n`,
  );
}

main().catch(fail);
