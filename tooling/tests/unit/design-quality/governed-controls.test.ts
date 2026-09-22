import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-006d 006D-AC-003. The source scan that proves no user-visible screen renders a raw control
 * where a primitive exists.
 *
 * The rule the design brief states, and `03-components/form-field-and-text-inputs.md` repeats, is
 * that feature code imports `FormField`, `TextField`, `TextArea`, `PasswordField`, and `Link` from
 * `@oalo/ui` and never lays out an input, a textarea, or an anchor itself. That rule is only worth
 * having if something checks it, because the cost of breaking it is invisible on the day: one
 * screen's field simply stops matching the others, and nobody notices until a review.
 *
 * What the scan allows, and why:
 *
 * - `<input type="checkbox">` and `<input type="radio">`. PRD-006d D4 ships no primitive for
 *   either, and both are used inside an explicit `<label>` that associates them. They are listed
 *   as an open delta in `06-review-rubric.md` section 5, not hidden here.
 * - `<input type="hidden">`. It renders nothing, so there is nothing to style and no label to
 *   connect. The cross-site token field in the signed-in layout is the only one.
 * - `<select>`. PRD-006d D4 defers `Select`; every remaining one is structurally nested inside an
 *   open `<FormField>` ... `</FormField>` pair, which a separate assertion below proves per
 *   occurrence, so its label and identifiers are still governed.
 *
 * Nothing else is allowed, and a new screen is covered the moment it exists rather than when
 * somebody remembers to add it to a list. `<button>` joined the list on 2026-09-20, with no
 * exception at all: see the note beside its pattern.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

/** Everything that can paint a control on a screen a signed-in person reaches. */
const SCANNED_ROOTS: readonly string[] = ["apps/web/src/app", "apps/web/src/features"];

const RAW_ELEMENT_PATTERNS: readonly Readonly<{ pattern: RegExp; instead: string }>[] = [
  { pattern: /<input(?![\w-])/gu, instead: "TextField, PasswordField, or FormField" },
  { pattern: /<textarea(?![\w-])/gu, instead: "TextArea" },
  { pattern: /<a(?=[\s>])/gu, instead: "Link" },
  { pattern: /<dialog(?![\w-])/gu, instead: "Dialog or Sheet" },
  /**
   * Added by the PRD-006d named-state review, finding F-18. The campaign approval card rendered
   * "Send back for changes" as a raw `<button>` wearing `.hint` from another screen's module, and
   * it measured 152 by 21 where `03-components/button-and-safe-action.md` asks for a 44 by 44
   * target from the `Button` primitive. Nothing caught it, because this scan read four elements
   * and a button was not one of them. It is now, with no exception: every control on every screen
   * under the scanned roots comes from `Button`, `SafeAction`, or `IconButton`.
   */
  { pattern: /<button(?![\w-])/gu, instead: "Button, SafeAction, or IconButton" },
];

/** The `<input>` kinds that have no primitive and render no field of their own. */
const ALLOWED_INPUT_TYPES: readonly string[] = ["checkbox", "radio", "hidden"];

/**
 * The one anchor that is not a link in the `Link` sense.
 *
 * The shell's navigation item is its own specified component
 * (`03-components/application-shell-and-navigation.md`): it carries `aria-current`, a rail and a
 * drawer presentation, a selected state, a subordinate state, and a status word, none of which
 * `Link` has or should grow. Putting `Link` under it would mean two class layers competing for the
 * same boundary and focus ring, which is the consistency bug this scan exists to prevent. The
 * allowance is by file AND element: `marker` is the `className` the shell's navigation item
 * renders, so a second, plain `<a>` added to the same file (with no `styles.navigationLink`
 * className) is still caught, not waved through just because it shares a file with the one that
 * is allowed.
 */
const ALLOWED_ANCHORS: readonly Readonly<{ because: string; marker: RegExp; path: string }>[] = [
  {
    path: "apps/web/src/features/shell/components/app-shell.tsx",
    marker: /className=\{styles\.navigationLink\}/u,
    because:
      "The navigation item is a specified shell component, not an inline or action link; see 03-components/application-shell-and-navigation.md.",
  },
];

async function scannedFiles(): Promise<readonly string[]> {
  const files: string[] = [];
  for (const root of SCANNED_ROOTS) {
    const absolute = join(repositoryRoot, root);
    for (const entry of await readdir(absolute, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (extname(entry.name) !== ".tsx") continue;
      if (entry.name.includes(".test.")) continue;
      const file = join(entry.parentPath, entry.name);
      files.push(file);
    }
  }
  return files;
}

/** The opening tag starting at `index`, so the scan can read the attributes it carries. */
function openingTagAt(source: string, index: number): string {
  const end = source.indexOf(">", index);
  return end === -1 ? source.slice(index) : source.slice(index, end + 1);
}

/** Every raw-element offense `source` (at `repositoryPath`) contains, empty when it is clean. */
function findRawElementOffenders(source: string, repositoryPath: string): readonly string[] {
  const offenders: string[] = [];

  for (const { pattern, instead } of RAW_ELEMENT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const index = match.index;
      const tag = openingTagAt(source, index);
      const typeMatch = /\stype="([a-z-]+)"/u.exec(tag);
      if (
        match[0].startsWith("<input") &&
        typeMatch !== null &&
        ALLOWED_INPUT_TYPES.includes(typeMatch[1] ?? "")
      ) {
        continue;
      }
      if (
        match[0].startsWith("<a") &&
        ALLOWED_ANCHORS.some(
          (allowed) => allowed.path === repositoryPath && allowed.marker.test(tag),
        )
      ) {
        continue;
      }
      const line = source.slice(0, index).split("\n").length;
      offenders.push(`${repositoryPath}:${line} renders ${match[0]}>; use ${instead}`);
    }
  }

  return offenders;
}

/**
 * Whether the position `index` in `source` sits inside an open `<FormField>` ... `</FormField>`
 * pair, tracked as a simple open/close depth count over every marker before `index`. This is a
 * per-occurrence structural check, not "does `FormField` appear anywhere in the file": a `select`
 * before the file's only `FormField`, or after it has closed, reads as depth 0 and is unwrapped.
 */
function isNestedInFormField(source: string, index: number): boolean {
  const markers = [
    ...[...source.matchAll(/<FormField(?![\w-])/gu)].map((match) => ({
      index: match.index,
      delta: 1,
    })),
    ...[...source.matchAll(/<\/FormField>/gu)].map((match) => ({
      index: match.index,
      delta: -1,
    })),
  ].sort((a, b) => a.index - b.index);

  let depth = 0;
  for (const marker of markers) {
    if (marker.index >= index) break;
    depth += marker.delta;
  }
  return depth > 0;
}

/** Every `<select>` in `source` (at `repositoryPath`) that is not nested inside a `FormField`. */
function findUnwrappedSelects(source: string, repositoryPath: string): readonly string[] {
  const unwrapped: string[] = [];
  for (const match of source.matchAll(/<select(?![\w-])/gu)) {
    const index = match.index;
    if (isNestedInFormField(source, index)) continue;
    const line = source.slice(0, index).split("\n").length;
    unwrapped.push(`${repositoryPath}:${line} renders a select outside FormField`);
  }
  return unwrapped;
}

describe("the governed-control scan", () => {
  it("reads every screen file, so the result means something", async () => {
    const files = await scannedFiles();
    expect(files.length).toBeGreaterThan(20);
  });

  it("finds no raw input, textarea, anchor, button, or hand-built dialog on any screen", async () => {
    const offenders: string[] = [];

    for (const file of await scannedFiles()) {
      const source = await readFile(file, "utf8");
      const repositoryPath = relative(repositoryRoot, file).replaceAll("\\", "/");
      offenders.push(...findRawElementOffenders(source, repositoryPath));
    }

    expect(offenders).toEqual([]);
  });

  it("catches a second, plain anchor added to the shell file the navigation item is allowed in", () => {
    const repositoryPath = "apps/web/src/features/shell/components/app-shell.tsx";
    const source = [
      '<a aria-current="page" className={styles.navigationLink} href="/overview">Overview</a>',
      '<a href="/help">Help</a>',
    ].join("\n");

    const offenders = findRawElementOffenders(source, repositoryPath);

    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toContain(":2 renders <a");
  });

  it("wraps every remaining select in FormField, because Select is deferred and not forgotten", async () => {
    const unwrapped: string[] = [];

    for (const file of await scannedFiles()) {
      const source = await readFile(file, "utf8");
      const repositoryPath = relative(repositoryRoot, file).replaceAll("\\", "/");
      unwrapped.push(...findUnwrappedSelects(source, repositoryPath));
    }

    expect(unwrapped).toEqual([]);
  });

  it("fails a bare second select that sits outside every FormField, not just an unmentioned file", () => {
    const repositoryPath = "apps/web/src/features/example/example-surface.tsx";
    const source = [
      '<FormField label="Region">',
      "  <select {...regionControl} />",
      "</FormField>",
      "<select {...unwrappedControl} />",
    ].join("\n");

    const unwrapped = findUnwrappedSelects(source, repositoryPath);

    expect(unwrapped).toHaveLength(1);
    expect(unwrapped[0]).toContain(":4 renders a select outside FormField");
  });

  it("has deleted the hand-rolled action link, so no new screen can reach for it", async () => {
    const globals = await readFile(join(repositoryRoot, "apps/web/src/app/globals.css"), "utf8");
    expect(globals).not.toContain(".oalo-action-link");

    const callSites: string[] = [];
    for (const file of await scannedFiles()) {
      const source = await readFile(file, "utf8");
      if (source.includes("oalo-action-link")) {
        callSites.push(relative(repositoryRoot, file).replaceAll("\\", "/"));
      }
    }
    expect(callSites).toEqual([]);
  });
});
