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
 * - `<select>`. PRD-006d D4 defers `Select`; every remaining one is wrapped in `FormField`, which
 *   a separate assertion below proves, so its label and identifiers are still governed.
 *
 * Nothing else is allowed, and a new screen is covered the moment it exists rather than when
 * somebody remembers to add it to a list.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");

/** Everything that can paint a control on a screen a signed-in person reaches. */
const SCANNED_ROOTS: readonly string[] = ["apps/web/src/app", "apps/web/src/features"];

const EXCLUDED: readonly Readonly<{ path: string; because: string }>[] = [
  {
    path: "apps/web/src/components/demo",
    because:
      "The founding-offer demo route. PRD-006d Non-Goals put it out of scope and 006D-AC-018 records its drift instead; nothing in review mode links to it.",
  },
];

const RAW_ELEMENT_PATTERNS: readonly Readonly<{ pattern: RegExp; instead: string }>[] = [
  { pattern: /<input(?![\w-])/gu, instead: "TextField, PasswordField, or FormField" },
  { pattern: /<textarea(?![\w-])/gu, instead: "TextArea" },
  { pattern: /<a(?=[\s>])/gu, instead: "Link" },
  { pattern: /<dialog(?![\w-])/gu, instead: "Dialog or Sheet" },
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
 * allowance is by file and element, not a blanket exemption, so a plain link added to that file is
 * still caught.
 */
const ALLOWED_ANCHORS: readonly Readonly<{ path: string; because: string }>[] = [
  {
    path: "apps/web/src/features/shell/components/app-shell.tsx",
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
      const repositoryPath = relative(repositoryRoot, file).replaceAll("\\", "/");
      if (EXCLUDED.some((excluded) => repositoryPath.startsWith(excluded.path))) continue;
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

describe("the governed-control scan", () => {
  it("reads every screen file, so the result means something", async () => {
    const files = await scannedFiles();
    expect(files.length).toBeGreaterThan(20);
  });

  it("finds no raw input, textarea, anchor, or hand-built dialog on any screen", async () => {
    const offenders: string[] = [];

    for (const file of await scannedFiles()) {
      const source = await readFile(file, "utf8");
      const repositoryPath = relative(repositoryRoot, file).replaceAll("\\", "/");

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
            ALLOWED_ANCHORS.some((allowed) => allowed.path === repositoryPath)
          ) {
            continue;
          }
          const line = source.slice(0, index).split("\n").length;
          offenders.push(`${repositoryPath}:${line} renders ${match[0]}>; use ${instead}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("wraps every remaining select in FormField, because Select is deferred and not forgotten", async () => {
    const unwrapped: string[] = [];

    for (const file of await scannedFiles()) {
      const source = await readFile(file, "utf8");
      const repositoryPath = relative(repositoryRoot, file).replaceAll("\\", "/");
      const selects = [...source.matchAll(/<select(?![\w-])/gu)];
      if (selects.length === 0) continue;
      if (!/\bFormField\b/u.test(source)) {
        const line = source.slice(0, selects[0]?.index ?? 0).split("\n").length;
        unwrapped.push(`${repositoryPath}:${line} renders a select outside FormField`);
      }
    }

    expect(unwrapped).toEqual([]);
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
