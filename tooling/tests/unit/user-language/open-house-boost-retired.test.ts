import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import ts from "typescript-compat";
import { describe, expect, it } from "vitest";

/**
 * PRD-009f 009F-AC-009. "Open House Boost" is retired from everything a person reads (D-16).
 *
 * The product's flow is "Launch an ad" over a library of ready-made ads, and the three-word name
 * described a flow that no longer exists. This reads every string and piece of text in
 * `apps/web/src` that is not a test, through the syntax tree rather than the text, so a comment, a
 * test name, and the stored `open-house-boost` blueprint value (hyphenated, never a sentence) are
 * not hits and a heading, a label, or a description is.
 *
 * Fixtures are read like everything else. A fixture's strings are what the local demo and the
 * synthetic review mode render, so a sentence there reaches a person too.
 *
 * Several lanes of PRD-009 rewrite the files that still carry the phrase, each in its own wave. Until
 * a lane has, its file is listed in `PENDING` with the lane that owns it. The list is a ratchet and
 * not an excuse: a file that is not listed has to be clean, and a listed file that has become clean
 * fails the second test until its row is deleted, so the list only ever gets shorter. 009F-AC-009
 * is met when it is empty.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SCANNED_ROOT = "apps/web/src";
const PHRASE = /open\s+house\s+boost/iu;

type PendingFile = Readonly<{ path: string; lane: string }>;

/**
 * The files that still carry the phrase when this lane lands (Wave 1), with the lane that rewrites
 * each. One row per file, grouped by lane so that two lanes deleting rows in the same wave do not
 * touch neighbouring lines.
 */
const PENDING: readonly PendingFile[] = [
  // 009a, Wave 1: the synthetic fixture behind the local demo's shell.
  { path: "apps/web/src/fixtures/ui-foundation/synthetic-ui.ts", lane: "009a" },

  // 009b, Wave 2: Home and the walkthrough it retires.
  { path: "apps/web/src/features/overview/components/overview-screen.tsx", lane: "009b" },
  { path: "apps/web/src/copy/guided-setup-messages.ts", lane: "009b" },

  // 009d, Wave 2: the flow that replaces the open house builder, and the Brand page.
  { path: "apps/web/src/features/campaigns/components/open-house-draft-builder.tsx", lane: "009d" },
  { path: "apps/web/src/features/brand/components/brand-profile-screen.tsx", lane: "009d" },
  { path: "apps/web/src/features/brand/model/synthetic-brand-profile.ts", lane: "009d" },

  // 009e, Wave 3: the campaign page and the list.
  { path: "apps/web/src/app/(authenticated)/marketing/campaigns/page.tsx", lane: "009e" },
  {
    path: "apps/web/src/features/campaigns/components/persisted-campaign-screen.tsx",
    lane: "009e",
  },
];

async function sourceFiles(): Promise<readonly string[]> {
  const entries = await readdir(join(repositoryRoot, SCANNED_ROOT), {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        [".ts", ".tsx"].includes(extname(entry.name)) &&
        !/\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(entry.name) &&
        !/\.test-support\.[jt]sx?$/u.test(entry.name),
    )
    .map((entry) =>
      relative(repositoryRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
    )
    .toSorted();
}

/** Every string and every piece of JSX text in a file, with its line. Comments are not read. */
function textsIn(
  path: string,
  source: string,
): readonly Readonly<{ line: number; text: string }>[] {
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: { line: number; text: string }[] = [];
  const keep = (node: ts.Node, text: string) => {
    found.push({
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
      text,
    });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) keep(node, node.text);
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node))
      keep(node, node.text);
    else if (ts.isJsxText(node)) keep(node, node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

async function hitsByFile(): Promise<ReadonlyMap<string, readonly string[]>> {
  const result = new Map<string, readonly string[]>();
  for (const path of await sourceFiles()) {
    const source = await readFile(join(repositoryRoot, path), "utf8");
    const hits = textsIn(path, source)
      .filter((entry) => PHRASE.test(entry.text))
      .map((entry) => `${path}:${String(entry.line)}: ${entry.text.trim().slice(0, 100)}`);
    if (hits.length > 0) result.set(path, hits);
  }
  return result;
}

describe("009F-AC-009: no rendered string says Open House Boost", () => {
  it("finds the phrase in no file that is not on the pending list", async () => {
    const pending = new Set(PENDING.map((entry) => entry.path));
    const offenders = [...(await hitsByFile())]
      .filter(([path]) => !pending.has(path))
      .flatMap(([, hits]) => hits);

    expect(
      offenders,
      `Use the D-16 names (Ads library, Launch an ad, a campaign):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps the pending list to files that still carry the phrase", async () => {
    const hits = await hitsByFile();
    const stale = PENDING.filter((entry) => !hits.has(entry.path)).map(
      (entry) => `${entry.path} (lane ${entry.lane})`,
    );

    expect(
      stale,
      `Delete these rows from PENDING, the files are clean:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it("reads strings and text, not comments or the stored blueprint value", () => {
    const sample = [
      "// Open House Boost in a comment",
      "/* Open House Boost in a block */",
      'const blueprintId = "open-house-boost";',
      'const heading = "Launch an ad";',
      "const retired = <h1>Create an Open House Boost</h1>;",
      "const label = `Your Open House Boost, ${name}`;",
    ].join("\n");

    const hits = textsIn("sample.tsx", sample).filter((entry) => PHRASE.test(entry.text));

    expect(hits.map((entry) => entry.line)).toEqual([5, 6]);
  });
});
