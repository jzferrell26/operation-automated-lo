import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript-compat";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const productRoots = [resolve(workspaceRoot, "apps"), resolve(workspaceRoot, "packages")];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "dist" && entry.name !== "node_modules" && entry.name !== ".next") {
        files.push(...(await sourceFiles(target)));
      }
      continue;
    }
    if (
      [".ts", ".tsx", ".mts", ".mtsx"].includes(extname(entry.name)) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(target);
    }
  }
  return files;
}

function auditSource(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const findings = [];

  function visit(node) {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(`${relative(workspaceRoot, filePath)}:${position.line + 1} uses explicit any`);
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require"
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(
        `${relative(workspaceRoot, filePath)}:${position.line + 1} uses CommonJS require`,
      );
    }
    if (ts.isCatchClause(node) && node.block.statements.length === 0) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      findings.push(`${relative(workspaceRoot, filePath)}:${position.line + 1} swallows an error`);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings;
}

const findings = [];
for (const root of productRoots) {
  for (const filePath of await sourceFiles(root)) {
    findings.push(...auditSource(await readFile(filePath, "utf8"), filePath));
  }
}

if (findings.length > 0) {
  throw new Error(`Product type audit failed:\n${findings.join("\n")}`);
}
console.log("Product type audit passed: no explicit any, CommonJS require, or swallowed catch.");
