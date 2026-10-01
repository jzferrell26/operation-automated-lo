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

/**
 * Everything that can put words on a screen (PRD-006b D6, the source guard's globs).
 *
 * `packages/application/src` widened in, 2026-09-20: it is where a campaign's role-aware next
 * step is written (`campaign-workspace-read.ts`'s `label` fields, consumed by
 * `persisted-campaign-screen.tsx` and `open-house-draft-builder.tsx`), so a word banned in the
 * component that renders it was still legal one layer down. The campaign next-step copy moved
 * into apps/web/src/copy/user-language.ts on 2026-09-21 (the application layer returns keys), so
 * campaign-workspace-read.ts is scanned like any other file, and the reporting sentences moved
 * into apps/web/src/copy/reporting-messages.ts on 2026-09-30 for the same reason, which closed the
 * last temporary exclusion this widening needed (PRD-008c, 008C-AC-005).
 *
 * `apps/web/src/server/homeowners` widened in on 2026-09-30 (PRD-008c, 008C-AC-001): its refusals
 * reach the screen through `homeError` in `http.ts`, and the `HomeownerError` messages in it were
 * exempt as thrown errors until `USER_FACING_ERRORS` below named that class as one a person reads.
 */
const SCANNED_ROOTS: readonly string[] = [
  "apps/web/src/app",
  "apps/web/src/copy",
  "apps/web/src/features",
  "apps/web/src/server/email",
  "apps/web/src/server/homeowners",
  "packages/application/src",
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
      'Demo fixture data (named beside synthetic-ui.ts in PRD-006b\'s Background, and covered by the same Non-Goals carve-out). Reviewed 2026-09-20: `toReviewBrand` in authenticated-workspace-data.ts replaces every honesty-sensitive value (disclosure, source, reason, nextAction) with the D4 constants before review mode renders it; only `field.label` ("Public loan officer name", "Company", and the rest) passes through unchanged, and those are already clean. A new field added here needs the same review before its label ships.',
  },
  {
    path: "apps/web/src/features/reporting/model",
    because:
      "Demo fixture data for the reporting screens, out of scope by the same Non-Goals carve-out, with one exception fixed 2026-09-20: `synthetic-reporting.ts`'s approved artifact `previewSummary` reached the product's one unauthenticated page, `apps/web/src/app/public/synthetic-open-house-v3/page.tsx`, and has been rewritten to the D1 register. The rest of this directory (reporting-acceptance.ts and the superseded artifacts) has no path to a rendered screen today.",
  },
  {
    path: "apps/web/src/features/ui-foundation/evidence",
    because:
      "Local hash-computation fixture data for `projectApproval`'s deterministic evidence, same Non-Goals class as synthetic-ui.ts. Reviewed 2026-09-20: it has no import outside its own unit test, so nothing in it reaches a screen.",
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

/**
 * Error classes whose message a person reads, so the diagnostic exemption below does not apply.
 *
 * `HomeownerError` is how the homeowner report server refuses a request: `homeError` in
 * `apps/web/src/server/homeowners/http.ts` puts its message in the response body, and
 * `use-home-workspace.ts` shows that message in the alert on the screen. Read as a thrown error it
 * would be exempt, which is how "Set the report website address before sharing." reached a loan
 * officer without the guard ever looking at it (PRD-008c, 008C-AC-001). A class joins this list
 * only when something renders its message; most errors in this product are log text and stay exempt.
 */
const USER_FACING_ERRORS: readonly string[] = ["HomeownerError"];

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
    if (
      ts.isNewExpression(current) &&
      current.expression.getText().endsWith("Error") &&
      !USER_FACING_ERRORS.includes(current.expression.getText())
    ) {
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
  // collectAllCopyStrings walks every SCANNED_ROOTS directory from disk, parses each file into
  // a syntax tree, and reads every SCANNED_FILES entry, so its wall time tracks filesystem
  // cache state rather than the code under test. That can run past vitest's 5,000 ms default
  // on a cold disk. An explicit budget keeps machine load from reddening this gate; it does
  // not change what the scan asserts.
  it("scans every file that can put words on a screen", async () => {
    const strings = await collectAllCopyStrings();
    const files = new Set(strings.map((entry) => entry.file));

    expect(strings.length).toBeGreaterThan(200);
    expect(files.has("apps/web/src/server/authenticated-workspace-data.ts")).toBe(true);
    expect(files.has("apps/web/src/features/shell/components/app-shell.tsx")).toBe(true);
    expect(files.has("packages/ui/src/components/metric.tsx")).toBe(true);
    expect(files.has("apps/web/src/copy/auth-messages.ts")).toBe(true);
    /**
     * The unauthenticated page under `apps/web/src/app/public`. D6's exclusion list does not
     * name it, and it used to be excluded anyway, which let two operator sentences sit on the
     * one URL in the product that needs no sign-in to read.
     */
    expect(files.has("apps/web/src/app/public/synthetic-open-house-v3/page.tsx")).toBe(true);
    /**
     * PRD-008c. The homeowner report server's refusals reach the screen, so the directory is read
     * (008C-AC-001). The reporting sentences left the application layer, so `reporting.ts` is read
     * like any other file rather than excused, and holds no English at all (008C-AC-005): it is in
     * the scan, and it contributes no copy string to it.
     */
    expect(files.has("apps/web/src/server/homeowners/runtime.ts")).toBe(true);
    expect(files.has("apps/web/src/server/homeowners/http.ts")).toBe(true);
    expect(files.has("apps/web/src/copy/reporting-messages.ts")).toBe(true);
    /**
     * PRD-008b D1. The empty-images sentence lives in a copy file of its own, and is the one
     * sentence a screen says about a version's images, so the guard has to be reading it.
     */
    expect(files.has("apps/web/src/copy/campaign-image-messages.ts")).toBe(true);
    expect(await collectSourceFiles("packages/application/src")).toContain(
      "packages/application/src/reporting.ts",
    );
    expect(files.has("packages/application/src/reporting.ts")).toBe(false);
  }, 30_000);

  it("states a reason for every path it does not read", () => {
    expect(EXCLUDED.every((entry) => entry.because.length > 20)).toBe(true);
  });

  /**
   * PRD-008c 008C-AC-005: "no other temporary exclusion remains". An exclusion that waits on a
   * migration says so in its reason, so the claim can be read off the list instead of remembered.
   * The permanent ones (the word list itself, and demo fixture data the PRD-006b Non-Goals carve
   * out) say why they are permanent and never describe themselves as a stopgap.
   */
  it("holds no temporary exclusion", () => {
    expect(EXCLUDED.map((entry) => entry.path)).not.toContain(
      "packages/application/src/reporting.ts",
    );
    expect(
      EXCLUDED.filter((entry) =>
        /temporar|removal condition|goes the moment/iu.test(entry.because),
      ),
    ).toEqual([]);
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
   * PRD-008c 008C-AC-001 and 008C-AC-002, the red half of red-then-green.
   *
   * These are the three sentences exactly as `131c7f4` shipped them, planted in the same shapes
   * the real files held: two refusals thrown as `HomeownerError` from the homeowner report server,
   * and one status line chosen in a ternary on the workspace routing card. Before the guard read
   * `apps/web/src/server/homeowners` and before it knew `HomeownerError` is a message a person
   * reads, the first two were invisible to it; before "adapter" and "origin" were on the list the
   * second and third passed it even where it could see them. The recorded run that failed on the
   * real files is quoted in the PRD-008c lane report; this case keeps the same proof in the suite,
   * so removing the extension turns it red again.
   */
  it("fails on the 131c7f4 text of the homeowner refusals and the workspace valuation line", () => {
    const runtime = collectCopyStrings(
      "apps/web/src/server/homeowners/runtime.ts",
      [
        "throw new HomeownerError(",
        '  "REPORT_URL_NOT_CONFIGURED",',
        "  503,",
        '  "Set the report website address before sharing.",',
        ");",
        "throw new HomeownerError(",
        '  "REPORT_URL_NOT_CONFIGURED",',
        "  503,",
        '  "The report website address must be a secure origin.",',
        ");",
      ].join("\n"),
    );
    const workspace = collectCopyStrings(
      "apps/web/src/features/workspace/workspace-screen.tsx",
      [
        "const detail = valuationConfigured",
        '  ? "A valuation adapter is configured for this workspace. Each new lookup still requires an allowance and a confirmed request."',
        '  : "A valuation connection and an approved workspace allowance are needed before requesting live values.";',
      ].join("\n"),
    );

    expect(report([...runtime, ...workspace])).toEqual([
      'apps/web/src/server/homeowners/runtime.ts:4 phrase "setup instruction for an administrator: Set the report website address" in "Set the report website address before sharing."',
      'apps/web/src/server/homeowners/runtime.ts:9 term "origin" in "The report website address must be a secure origin."',
      'apps/web/src/features/workspace/workspace-screen.tsx:2 term "adapter" in "A valuation adapter is configured for this workspace. Each new lookup still requires an allowance and a confirmed request."',
    ]);
  });

  /**
   * The exemption `USER_FACING_ERRORS` carves out is narrow. A thrown `Error` is still log text, and
   * so is a `HomeownerError`-shaped class nobody renders, so only the named class is read.
   */
  it("still treats an ordinary thrown error as log text rather than copy", () => {
    expect(
      collectCopyStrings(
        "planted.ts",
        [
          'throw new Error("The review surface is not connected to any provider.");',
          'throw new ReportingError("Cross-tenant minimum sample size must be at least two.");',
        ].join("\n"),
      ),
    ).toEqual([]);
  });

  /**
   * "adapter" and "origin" are banned in the sense a loan officer never meets, which is the only
   * sense this product uses them in. The matcher stops at the word, so a word that merely starts
   * with "origin" is not caught, in the same way "regional" is not caught by a ban on "region".
   */
  it("bans adapter and origin without banning a word that merely starts with origin", () => {
    expect(
      report([
        { file: "j.tsx", line: 1, text: "Open the valuation adapters for this workspace." },
        { file: "j.tsx", line: 2, text: "Links must start with a secure origin." },
      ]).map((entry) => entry.split(" ").slice(0, 3).join(" ")),
    ).toEqual(['j.tsx:1 term "adapter"', 'j.tsx:2 term "origin"']);
    expect(
      report([
        { file: "k.tsx", line: 1, text: "We kept the original photo and every original file." },
        { file: "k.tsx", line: 2, text: "This lead originated from your open house." },
      ]),
    ).toEqual([]);
  });

  /**
   * The administrator-task shape. A word list cannot tell that a perfectly plain sentence is
   * addressed to the wrong person, so the guard also bans the imperative to set or configure a named
   * piece of deployment configuration. It must leave alone every "set" a loan officer can act on.
   */
  it("bans a setup instruction for an administrator without banning a step a loan officer can take", () => {
    expect(
      report([
        { file: "l.tsx", line: 1, text: "Configure the sender address before sending." },
        { file: "l.tsx", line: 2, text: "Set the API key for this workspace." },
      ]).map((entry) => entry.split(" ").slice(0, 3).join(" ")),
    ).toEqual(['l.tsx:1 phrase "setup', 'l.tsx:2 phrase "setup']);
    expect(
      report([
        { file: "m.tsx", line: 1, text: "Set a budget for the campaign." },
        { file: "m.tsx", line: 2, text: "Set your company name and NMLS number." },
        { file: "m.tsx", line: 3, text: "Set the date and time of the open house." },
        { file: "m.tsx", line: 4, text: "Contact support to get it set up." },
        { file: "m.tsx", line: 5, text: "Your settings are saved." },
      ]),
    ).toEqual([]);
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

  // Same whole-tree walk as "scans every file that can put words on a screen" above, run a
  // second time through collectAllCopyStrings; see that case's comment for the timeout budget
  // rationale.
  it("finds no forbidden word in any user-facing string in the product", async () => {
    expect(report(await collectAllCopyStrings())).toEqual([]);
  }, 30_000);

  it("bans every term, shape, and dash the contract names", () => {
    expect(FORBIDDEN_TERMS.length).toBeGreaterThan(40);
    expect(FORBIDDEN_IDENTIFIER_PATTERNS.length).toBeGreaterThan(5);
    expect(FORBIDDEN_DASHES.map((entry) => entry.character)).toEqual([EM_DASH, EN_DASH]);
  });
});
