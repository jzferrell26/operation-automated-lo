import { execSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const configModuleUrl = new URL("../../packages/config/dist/index.js", import.meta.url);
const scanRoots = [".github", "apps", "packages", "supabase", "tests", "tooling"];
const assignmentScanRoots = ["apps", "packages"];
const textExtensions = new Set([
  ".css",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const assignmentScanExtensions = new Set([".mjs", ".mts", ".ts", ".tsx"]);
const ignoredDirectories = new Set([".next", ".turbo", "coverage", "dist", "node_modules"]);
const assignmentScanIgnoredFileSuffixes = [
  ".test.ts",
  ".test.tsx",
  ".unit.test.ts",
  ".integration.test.mjs",
  ".integration.test.ts",
];
const forbiddenPatterns = [
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bsk_live_[A-Za-z0-9]{16,}\b/u,
  /\bsk_test_[A-Za-z0-9]{16,}\b/u,
  /\bwhsec_[A-Za-z0-9]{16,}\b/u,
  /\brk_(?:live|test)_[A-Za-z0-9]{16,}\b/u,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/u,
];

async function textFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await textFiles(target, extensions)));
      }
      continue;
    }
    if (extensions.has(extname(entry.name))) {
      files.push(target);
    }
  }
  return files;
}

function shouldScanAssignmentFile(filePath) {
  return !assignmentScanIgnoredFileSuffixes.some((suffix) => filePath.endsWith(suffix));
}

/**
 * A merely *present* build artifact is not enough: auditing a stale `dist` would pass a boundary
 * violation that only exists in `src`, which is exactly the case this gate has to catch.
 */
async function builtConfigModuleIsCurrent() {
  let builtAtMs;
  try {
    builtAtMs = (await stat(configModuleUrl)).mtimeMs;
  } catch {
    return false;
  }

  const configSources = await textFiles(
    resolve(workspaceRoot, "packages/config/src"),
    new Set([".ts"]),
  );
  for (const filePath of configSources) {
    if ((await stat(filePath)).mtimeMs > builtAtMs) {
      return false;
    }
  }

  return true;
}

async function loadBuiltConfigModule() {
  if (!(await builtConfigModuleIsCurrent())) {
    execSync("pnpm --filter @oalo/config build", {
      cwd: workspaceRoot,
      stdio: "inherit",
    });
  }

  return import(configModuleUrl.href);
}

async function collectAssignmentSources() {
  const sources = [];

  for (const root of assignmentScanRoots) {
    const directory = resolve(workspaceRoot, root);
    for (const filePath of await textFiles(directory, assignmentScanExtensions)) {
      if (!shouldScanAssignmentFile(filePath)) {
        continue;
      }
      sources.push({
        filePath: relative(workspaceRoot, filePath),
        source: await readFile(filePath, "utf8"),
      });
    }
  }

  return sources;
}

async function auditPublicEnvironmentBoundary(configModule) {
  configModule.assertPublicEnvironmentAllowlistSecure(
    configModule.PUBLIC_ENVIRONMENT_VARIABLE_NAMES,
  );

  const assignmentViolations = configModule.collectPublicSecretAssignmentViolationsInSources(
    await collectAssignmentSources(),
  );

  if (assignmentViolations.length > 0) {
    throw new Error(`Public secret assignment audit failed:\n${assignmentViolations.join("\n")}`);
  }
}

const findings = [];
for (const root of scanRoots) {
  const directory = resolve(workspaceRoot, root);
  for (const filePath of await textFiles(directory, textExtensions)) {
    const source = await readFile(filePath, "utf8");
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(source)) {
        findings.push(`${relative(workspaceRoot, filePath)} matched ${pattern.source}`);
      }
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Secret audit failed:\n${findings.join("\n")}`);
}

const configModule = await loadBuiltConfigModule();
await auditPublicEnvironmentBoundary(configModule);

console.log(
  `Secret audit passed across ${scanRoots.length} source roots and the public environment boundary.`,
);
