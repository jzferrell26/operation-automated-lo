import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import ts from "typescript-compat";
import { describe, expect, it } from "vitest";

import {
  EM_DASH,
  EN_DASH,
  FORBIDDEN_DASHES,
  FORBIDDEN_IDENTIFIER_PATTERNS,
  FORBIDDEN_TERMS,
  findVocabularyHits,
} from "../../../../apps/web/src/copy/forbidden-vocabulary.js";

/**
 * The source-level half of PRD-006b D6.
 *
 * It reads every file that can put words on a screen, pulls out the strings a user would read, and
 * fails on anything `library/knowledge/private/standards/user-language-contract.md` forbids. The
 * rendered-output guard in the six review-surface suites catches what a page actually paints; this
 * one catches a forbidden word the moment somebody types it, with the file and the line, before any
 * page has to render it.
 *
 * It reads the TypeScript syntax tree rather than the text, because a guard that cannot tell a
 * comment from a heading reports both and teaches people to ignore it. What counts as copy is
 * defined narrowly in `isCopyString` below and stated there.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

/** Everything that can put words on a screen (PRD-006b D6, the source guard's globs). */
const SCANNED_ROOTS: readonly string[] = [
  "apps/web/src/app",
  "apps/web/src/copy",
  "apps/web/src/features",
  "apps/web/src/server/email",
  "packages/ui/src/components",
];

/** Single files outside those roots that hold user-facing strings. */
const SCANNED_FILES: readonly string[] = [
  "apps/web/src/server/authenticated-workspace-data.ts",
  "apps/web/src/server/runtime-authentication.ts",
];

/**
 * Paths the guard does not read, each with a stated reason. Anything not listed here is scanned, so
 * a new screen is covered the moment it exists rather than when somebody remembers to add it.
 */
const EXCLUDED: readonly Readonly<{ path: string; because: string }>[] = [
  {
    path: "apps/web/src/copy/forbidden-vocabulary.ts",
    because: "It is the list of forbidden words. It has to contain them in order to ban them.",
  },
  {
    path: "apps/web/src/fixtures",
    because: "Demo fixture data, which the PRD-006b Non-Goals put out of scope for this rewrite.",
  },
  {
    path: "apps/web/src/components/demo",
    because: "The founding-offer demo, which only a developer's own machine ever renders.",
  },
  {
    path: "apps/web/src/app/demo",
    because: "The demo route, which only a developer's own machine ever renders.",
  },
  {
    path: "apps/web/src/features/brand/model/synthetic-brand-profile.ts",
    because:
      "Demo fixture data that happens to sit beside a feature. A connected-account workspace replaces every value in it, and the PRD-006b Non-Goals leave fixture prose alone.",
  },
  {
    path: "apps/web/src/features/reporting/model",
    because:
      "Demo fixture data for the reporting screens. A connected-account workspace never renders it, and the PRD-006b Non-Goals leave fixture prose alone.",
  },
  {
    path: "apps/web/src/features/ui-foundation/evidence",
    because:
      "Demo campaign inputs used to produce local approval records. Nothing in it renders to a signed-in user.",
  },
];

/**
 * Props and object keys whose string value is something a user reads. A short string is copy when
 * it is handed to one of these; a long one is copy wherever it is written.
 */
const COPY_KEYS: readonly string[] = [
  "alt",
  "aria-label",
  "body",
  "confirmLabel",
  "description",
  "detail",
  "disclosure",
  "effect",
  "eyebrow",
  "explanation",
  "freshness",
  "heading",
  "label",
  "lead",
  "loadingLabel",
  "nextAction",
  "placeholder",
  "prerequisite",
  "progressLabel",
  "reason",
  "regionSource",
  "regionsTitle",
  "requiredRole",
  "responsibleParty",
  "result",
  "routeName",
  "roleLabel",
  "scope",
  "source",
  "subject",
  "summary",
  "term",
  "title",
  "value",
];

type CopyString = Readonly<{ file: string; line: number; text: string }>;

function isExcluded(relativePath: string): boolean {
  const normalized = relativePath.replaceAll("\\", "/");
  return EXCLUDED.some(
    (entry) => normalized === entry.path || normalized.startsWith(`${entry.path}/`),
  );
}

function isTestFile(name: string): boolean {
  return /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(name);
}

async function collectSourceFiles(root: string): Promise<readonly string[]> {
  const absolute = join(repositoryRoot, root);
  /**
   * A root that does not exist yet is not an error. `apps/web/src/server/email` arrives with
   * PRD-006a's account emails, and naming it now means those emails are scanned the day they are
   * written rather than when somebody remembers to widen this list.
   */
  const entries = await readdir(absolute, { withFileTypes: true, recursive: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    },
  );
  const files: string[] = [];

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      isTestFile(entry.name) ||
      ![".ts", ".tsx"].includes(extname(entry.name))
    ) {
      continue;
    }
    const full = join(entry.parentPath, entry.name);
    const relativePath = relative(repositoryRoot, full).replaceAll("\\", "/");
    if (isExcluded(relativePath)) {
      continue;
    }
    files.push(relativePath);
  }

  return files.sort();
}

/** Three or more words in a row: long enough that it is a sentence rather than a slug. */
function readsLikeProse(text: string): boolean {
  return /[A-Za-z]{2,}[ ,.][ ]?[A-Za-z]{2,}[ ,.][ ]?[A-Za-z]{2,}/u.test(text);
}

/** The name a string literal is assigned to, when it has one. */
function assignedKey(node: ts.Node): string | undefined {
  const parent = node.parent;
  if (parent === undefined) {
    return undefined;
  }
  if (ts.isPropertyAssignment(parent) && !ts.isComputedPropertyName(parent.name)) {
    return parent.name.getText().replaceAll('"', "").replaceAll("'", "");
  }
  if (ts.isJsxAttribute(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  if (
    ts.isJsxExpression(parent) &&
    parent.parent !== undefined &&
    ts.isJsxAttribute(parent.parent) &&
    ts.isIdentifier(parent.parent.name)
  ) {
    return parent.parent.name.text;
  }
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return parent.name.text;
  }
  return undefined;
}

/**
 * Whether a string sits inside a thrown error or a log call.
 *
 * Those messages are for whoever is reading the server's output, not for a loan officer: a route
 * that throws renders the page boundary's own sentence, never the error's text (PRD-006b D8's rule
 * that an error sentence never carries a variable name is about what the *user* sees). Holding them
 * to the user-language contract would push internal nouns out of the one place they belong.
 */
function isDiagnosticMessage(node: ts.Node): boolean {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (ts.isNewExpression(current) && current.expression.getText().endsWith("Error")) {
      return true;
    }
    if (
      ts.isCallExpression(current) &&
      /^(?:console\.|globalThis\.console\.)/u.test(current.expression.getText())
    ) {
      return true;
    }
    if (ts.isClassDeclaration(current) && (current.name?.text ?? "").endsWith("Error")) {
      return true;
    }
  }
  return false;
}

/**
 * Whether a string literal is something a user reads.
 *
 * It is copy when it is handed to one of `COPY_KEYS`, or when it reads like prose wherever it sits.
 * It is not copy when it is a module specifier, a CSS class, or a `data-*` value, because those are
 * handles rather than words. Everything the guard cannot classify is left alone on purpose.
 */
function isCopyString(node: ts.StringLiteralLike, text: string): boolean {
  const parent = node.parent;
  if (
    parent !== undefined &&
    (ts.isImportDeclaration(parent) ||
      ts.isExportDeclaration(parent) ||
      ts.isImportTypeNode(parent) ||
      ts.isModuleDeclaration(parent) ||
      ts.isLiteralTypeNode(parent))
  ) {
    return false;
  }
  if (isDiagnosticMessage(node)) {
    return false;
  }
  const key = assignedKey(node);
  if (key !== undefined && /^(?:data-|className$|id$|href$|src$|name$)/u.test(key)) {
    return false;
  }
  if (key !== undefined && COPY_KEYS.includes(key)) {
    return text.trim().length > 0;
  }
  return readsLikeProse(text);
}

function collectCopyStrings(file: string, source: string): readonly CopyString[] {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: CopyString[] = [];

  function record(node: ts.Node, text: string): void {
    const trimmed = text.trim();
    if (trimmed.length < 3 || !/[A-Za-z]/u.test(trimmed)) {
      return;
    }
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    found.push({ file, line: line + 1, text: trimmed });
  }

  function walk(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      record(node, node.text);
    } else if (ts.isStringLiteralLike(node)) {
      if (isCopyString(node, node.text)) {
        record(node, node.text);
      }
    } else if (ts.isTemplateExpression(node)) {
      const literal = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(
        " ",
      );
      if (readsLikeProse(literal) && !isDiagnosticMessage(node)) {
        record(node, literal);
      }
    }
    ts.forEachChild(node, walk);
  }

  walk(tree);
  return found;
}

async function collectAllCopyStrings(): Promise<readonly CopyString[]> {
  const files = [
    ...(await Promise.all(SCANNED_ROOTS.map(collectSourceFiles))).flat(),
    ...SCANNED_FILES,
  ];

  const collected = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(join(repositoryRoot, file), "utf8");
      return collectCopyStrings(file, source);
    }),
  );

  return collected.flat();
}

function report(strings: readonly CopyString[]): readonly string[] {
  return strings.flatMap((entry) =>
    findVocabularyHits(entry.text).map(
      (hit) =>
        `${entry.file}:${entry.line} ${hit.kind} "${hit.detail}" in ${JSON.stringify(entry.text)}`,
    ),
  );
}

describe("user-language guard, source level", () => {
  it("scans every file that can put words on a screen", async () => {
    const strings = await collectAllCopyStrings();
    const files = new Set(strings.map((entry) => entry.file));

    expect(strings.length).toBeGreaterThan(200);
    expect(files.has("apps/web/src/server/authenticated-workspace-data.ts")).toBe(true);
    expect(files.has("apps/web/src/features/shell/components/app-shell.tsx")).toBe(true);
    expect(files.has("packages/ui/src/components/metric.tsx")).toBe(true);
    expect(files.has("apps/web/src/copy/auth-messages.ts")).toBe(true);
    /**
     * The unauthenticated page under `apps/web/src/app/public`. D6's exclusion list does not name
     * it, and it used to be excluded anyway, which let two operator sentences sit on the one URL
     * in the product that needs no sign-in to read.
     */
    expect(files.has("apps/web/src/app/public/synthetic-open-house-v3/page.tsx")).toBe(true);
  });

  it("states a reason for every path it does not read", () => {
    expect(EXCLUDED.every((entry) => entry.because.length > 20)).toBe(true);
  });

  it("reads the syntax tree, so a comment is never mistaken for copy", () => {
    const strings = collectCopyStrings(
      "planted.tsx",
      [
        "// The review surface is not connected to any provider.",
        "/* Another synthetic fixture note about the tenant. */",
        'export const heading = "Not connected yet";',
      ].join("\n"),
    );

    expect(strings).toEqual([{ file: "planted.tsx", line: 3, text: "Not connected yet" }]);
  });

  it("reports a planted forbidden word with its file and line", () => {
    const strings = collectCopyStrings(
      "planted.tsx",
      ['export const banner = "Review surface. Demo fixtures only.";'].join("\n"),
    );

    expect(report(strings)).toEqual([
      'planted.tsx:1 term "review surface" in "Review surface. Demo fixtures only."',
      'planted.tsx:1 term "fixture" in "Review surface. Demo fixtures only."',
    ]);
  });

  it("reports a planted identifier, environment name, code, and dash", () => {
    const planted: readonly CopyString[] = [
      { file: "a.tsx", line: 1, text: "Version actor_0a1b2c3d4e5f6071" },
      { file: "b.tsx", line: 2, text: "Set OALO_REVIEW_SURFACE first" },
      { file: "c.tsx", line: 3, text: "CAMPAIGN_APPROVAL_CONFLICT" },
      { file: "d.tsx", line: 4, text: `Saved ${EM_DASH} and approved` },
      { file: "e.tsx", line: 5, text: "Ask a location_admin" },
    ];

    expect(report(planted).map((entry) => entry.split(" ").slice(0, 2).join(" "))).toEqual([
      "a.tsx:1 identifier",
      "b.tsx:2 identifier",
      "b.tsx:2 identifier",
      "c.tsx:3 identifier",
      "d.tsx:4 dash",
      "e.tsx:5 identifier",
    ]);
  });

  /**
   * D2 bans each term "in any case, tense, or compound". Every probe below used to pass the guard:
   * "persisting" and "compiling" because the suffix list stopped at `s` and `es`, and
   * "provider-backed" because the trailing hyphen sat inside the old word boundary.
   */
  it("catches a banned term in another tense and inside a hyphenated compound", () => {
    expect(
      report([
        { file: "g.tsx", line: 1, text: "Your draft is persisting now and compiling." },
        { file: "g.tsx", line: 2, text: "This page shows provider-backed results." },
        { file: "g.tsx", line: 3, text: "We are freezing this version for you." },
        { file: "g.tsx", line: 4, text: "Ask a non-operator to look at it." },
      ]).map((entry) => entry.split(" ").slice(0, 3).join(" ")),
    ).toEqual([
      'g.tsx:1 term "persist"',
      'g.tsx:1 term "compile"',
      'g.tsx:2 term "provider"',
      'g.tsx:3 term "freeze"',
      'g.tsx:4 term "operator"',
    ]);
  });

  /**
   * The matcher's own limit, kept under test so widening it again cannot quietly ban a word the
   * contract never banned. "Regional" is the case the copy module's comment has always cited;
   * "subregion" is the same claim on the other side of the word.
   */
  it("does not report a longer word that merely starts or ends with a banned term", () => {
    expect(
      report([
        { file: "h.tsx", line: 1, text: "We can target a regional audience for you." },
        { file: "h.tsx", line: 2, text: "A subregion of that area works too." },
      ]),
    ).toEqual([]);
  });

  /**
   * The one term the widening deliberately skips. "Routing" is what HighLevel calls sending a lead
   * to the right person, so it is the name of something the user has, while D2 bans "route" as a
   * noun for a page. Both halves are pinned so neither can move without the other being considered.
   */
  it("bans the page noun without banning the lead-routing the user knows", () => {
    expect(
      report([
        { file: "i.tsx", line: 1, text: "Routing is not connected yet." },
        { file: "i.tsx", line: 2, text: "Open your routing settings." },
      ]),
    ).toEqual([]);
    expect(
      report([{ file: "i.tsx", line: 3, text: "Go back to the route you came from." }]).map(
        (entry) => entry.split(" ").slice(0, 3).join(" "),
      ),
    ).toEqual(['i.tsx:3 term "route"']);
  });

  it("passes a sentence written in the contract's own voice", () => {
    expect(
      report([
        { file: "f.tsx", line: 1, text: "Not connected yet" },
        { file: "f.tsx", line: 2, text: "Connect HighLevel, Meta, and Stripe when you're ready." },
        { file: "f.tsx", line: 3, text: "Ready for approval" },
      ]),
    ).toEqual([]);
  });

  it("finds no forbidden word in any user-facing string in the product", async () => {
    expect(report(await collectAllCopyStrings())).toEqual([]);
  });

  it("bans every term, shape, and dash the contract names", () => {
    expect(FORBIDDEN_TERMS.length).toBeGreaterThan(40);
    expect(FORBIDDEN_IDENTIFIER_PATTERNS.length).toBeGreaterThan(5);
    expect(FORBIDDEN_DASHES.map((entry) => entry.character)).toEqual([EM_DASH, EN_DASH]);
  });
});
