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
 * Several lanes of PRD-009 rewrote the files that carried the phrase, each in its own wave. Until a
 * lane had, its file was listed in `PENDING` with the lane that owned it. The list was a ratchet and
 * not an excuse: a file that is not listed has to be clean, and a listed file that has become clean
 * fails the second test until its row is deleted, so the list only ever got shorter. 009F-AC-009 is
 * met when it is empty, and it is.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const SCANNED_ROOT = "apps/web/src";
const PHRASE = /open\s+house\s+boost/iu;

type PendingFile = Readonly<{ path: string; lane: string }>;

/**
 * The files that still carry the phrase, with the lane that rewrites each. PRD-009e rewrote the last
 * two (the Campaigns list and the campaign page) in Wave 3, so the list is empty and 009F-AC-009 is
 * met. The ratchet stays in place: a file that is not listed has to be clean, and a listed file that
 * has become clean fails the second test until its row is deleted.
 */
const PENDING: readonly PendingFile[] = [];

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

async function scanSource(): Promise<ReadonlyMap<string, readonly string[]>> {
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

/**
 * The scan parses every non-test file under `apps/web/src` into a syntax tree, so it is the one
 * expensive step here. The two tests that need it share a single run, which halves the work.
 */
let scan: Promise<ReadonlyMap<string, readonly string[]>> | undefined;
function hitsByFile(): Promise<ReadonlyMap<string, readonly string[]>> {
  scan ??= scanSource();
  return scan;
}

/**
 * The scan takes under a second alone, but it timed out at the 5s default while the whole unit
 * project ran under coverage and every other file competed for the CPU. The work is bounded (one
 * parse per source file) and grows with the application, so the budget is stated here rather than
 * left to the default, and it is wide enough for a loaded machine.
 */
const SCAN_BUDGET = { timeout: 60_000 };

describe("009F-AC-009: no rendered string says Open House Boost", () => {
  it("finds the phrase in no file that is not on the pending list", SCAN_BUDGET, async () => {
    const pending = new Set(PENDING.map((entry) => entry.path));
    const offenders = [...(await hitsByFile())]
      .filter(([path]) => !pending.has(path))
      .flatMap(([, hits]) => hits);

    expect(
      offenders,
      `Use the D-16 names (Ads library, Launch an ad, a campaign):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps the pending list to files that still carry the phrase", SCAN_BUDGET, async () => {
    const hits = await hitsByFile();
    const stale = PENDING.filter((entry) => !hits.has(entry.path)).map(
      (entry) => `${entry.path} (lane ${entry.lane})`,
    );

    expect(
      stale,
      `Delete these rows from PENDING, the files are clean:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  /**
   * 009F-AC-009 is met when the pending list is empty. Every lane that rewrote a screen has removed
   * its rows, so a row added back is a screen that says the retired name again.
   */
  it("has no file left on the pending list", () => {
    expect(PENDING).toEqual([]);
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
