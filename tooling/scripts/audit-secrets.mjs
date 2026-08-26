import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../..");
const scanRoots = [".github", "apps", "packages", "supabase", "tests", "tooling"];
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
const ignoredDirectories = new Set([".next", ".turbo", "coverage", "dist", "node_modules"]);
const forbiddenPatterns = [
  /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\bsk_live_[A-Za-z0-9]{16,}\b/u,
  /\bsk_test_[A-Za-z0-9]{16,}\b/u,
  /\bwhsec_[A-Za-z0-9]{16,}\b/u,
  /\brk_(?:live|test)_[A-Za-z0-9]{16,}\b/u,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/u,
];

async function textFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...(await textFiles(target)));
      }
      continue;
    }
    if (textExtensions.has(extname(entry.name))) {
      files.push(target);
    }
  }
  return files;
}

const findings = [];
for (const root of scanRoots) {
  const directory = resolve(workspaceRoot, root);
  for (const filePath of await textFiles(directory)) {
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
console.log(`Secret audit passed across ${scanRoots.length} source roots.`);
