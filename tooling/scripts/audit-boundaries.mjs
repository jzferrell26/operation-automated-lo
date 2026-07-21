import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript-compat";
import { z } from "zod";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const internalNameSchema = z.string().regex(/^@oalo\/[a-z0-9-]+$/u);
const dependencyNameSchema = z.string().regex(/^(?:@[a-z0-9-]+\/[a-z0-9-]+|[a-z0-9-]+)$/u);
const boundaryConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    packages: z.array(
      z
        .object({
          name: internalNameSchema,
          path: z.string().regex(/^(apps|packages)\/[a-z0-9-]+$/u),
          allowedInternalDependencies: z.array(z.union([internalNameSchema, z.literal("*")])),
          allowExternalDependencies: z.boolean().default(true),
        })
        .strict(),
    ),
  })
  .strict();
const reverseFixtureSchema = z
  .object({
    schemaVersion: z.literal(1),
    edges: z
      .array(
        z
          .object({
            from: internalNameSchema,
            to: dependencyNameSchema,
            reason: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
const packageManifestSchema = z
  .object({
    name: internalNameSchema,
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    optionalDependencies: z.record(z.string(), z.string()).optional(),
    peerDependencies: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

async function readJson(filePath, schema) {
  const source = await readFile(filePath, "utf8");
  let input;
  try {
    input = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON error";
    throw new Error(`Invalid JSON in ${filePath}: ${message}`);
  }
  return schema.parse(input);
}

function isAllowed(fromPackage, toPackage) {
  if (!toPackage.startsWith("@oalo/")) {
    return fromPackage.allowExternalDependencies;
  }
  return (
    fromPackage.allowedInternalDependencies.includes("*") ||
    fromPackage.allowedInternalDependencies.includes(toPackage)
  );
}

function packageNameFromSpecifier(specifier) {
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }
  return specifier.split("/")[0];
}

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

function importSpecifiers(sourceText, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

async function auditWorkspace(config) {
  const violations = [];
  for (const packageRule of config.packages) {
    const packageDirectory = resolve(workspaceRoot, packageRule.path);
    const manifest = await readJson(join(packageDirectory, "package.json"), packageManifestSchema);
    if (manifest.name !== packageRule.name) {
      violations.push(
        `${packageRule.path}/package.json declares ${manifest.name}, expected ${packageRule.name}`,
      );
    }

    const declaredDependencies = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.optionalDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    for (const dependency of declaredDependencies) {
      if (!isAllowed(packageRule, dependency)) {
        violations.push(`${packageRule.name} declares prohibited dependency ${dependency}`);
      }
    }

    for (const filePath of await sourceFiles(packageDirectory)) {
      const sourceText = await readFile(filePath, "utf8");
      for (const specifier of importSpecifiers(sourceText, filePath)) {
        if (!specifier.startsWith(".") && !specifier.startsWith("node:")) {
          const importedPackage = packageNameFromSpecifier(specifier);
          if (!declaredDependencies.has(importedPackage)) {
            violations.push(
              `${relative(workspaceRoot, filePath)} imports undeclared dependency ${importedPackage}`,
            );
          }
          if (!isAllowed(packageRule, importedPackage)) {
            violations.push(
              `${relative(workspaceRoot, filePath)} imports prohibited dependency ${importedPackage}`,
            );
          }
        }
        if (
          specifier.startsWith(".") &&
          !specifier.endsWith(".js") &&
          !specifier.endsWith(".json") &&
          !specifier.endsWith(".css")
        ) {
          violations.push(
            `${relative(workspaceRoot, filePath)} has extensionless relative ESM import ${specifier}`,
          );
        }
      }
    }
  }
  return violations;
}

async function main() {
  const config = await readJson(
    resolve(workspaceRoot, "tooling/boundaries.json"),
    boundaryConfigSchema,
  );
  const argumentsSchema = z.union([
    z.tuple([]),
    z.tuple([
      z.literal("--assert-reject"),
      z.literal("tooling/fixtures/boundaries/reverse-dependency.json"),
    ]),
  ]);
  const arguments_ = argumentsSchema.parse(process.argv.slice(2));
  if (arguments_.length === 2) {
    const fixtureArgument = arguments_[1];
    const fixture = await readJson(resolve(workspaceRoot, fixtureArgument), reverseFixtureSchema);
    const packagesByName = new Map(
      config.packages.map((packageRule) => [packageRule.name, packageRule]),
    );
    const rejected = fixture.edges.filter((edge) => {
      const fromPackage = packagesByName.get(edge.from);
      return fromPackage !== undefined && !isAllowed(fromPackage, edge.to);
    });
    if (rejected.length !== fixture.edges.length) {
      throw new Error("The deliberate reverse-dependency fixture was not rejected");
    }
    console.log(`Boundary fixture rejected ${rejected.length} prohibited edges.`);
    return;
  }

  const violations = await auditWorkspace(config);
  if (violations.length > 0) {
    throw new Error(`Boundary audit failed:\n${violations.join("\n")}`);
  }
  console.log(`Boundary audit passed for ${config.packages.length} workspace packages.`);
}

await main();
