import { access } from "node:fs/promises";

const configModuleUrl = new URL("../../../packages/config/dist/index.js", import.meta.url);

export function parseArguments(arguments_) {
  const parsed = new Map();

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === undefined || !argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument ?? "<missing>"}`);
    }

    if (argument === "--write" || argument === "--require-production-evidence") {
      parsed.set(argument.slice(2), true);
      continue;
    }

    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }

    parsed.set(argument.slice(2), value);
    index += 1;
  }

  return parsed;
}

export function requireArgument(argumentsMap, name) {
  const value = argumentsMap.get(name);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required argument: --${name}`);
  }
  return value;
}

export function assertAllowedArguments(argumentsMap, allowedNames) {
  const allowed = new Set(allowedNames);
  const unexpected = [...argumentsMap.keys()].filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    throw new Error(
      `Unexpected arguments: ${unexpected
        .sort()
        .map((name) => `--${name}`)
        .join(", ")}`,
    );
  }
}

export async function loadBuiltConfigModule() {
  try {
    await access(configModuleUrl);
  } catch {
    throw new Error(
      "Build @oalo/config before running release tooling: pnpm --filter @oalo/config build",
    );
  }

  return import(configModuleUrl.href);
}

export function fail(error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Release tooling failed closed: ${message}\n`);
  process.exitCode = 1;
}
