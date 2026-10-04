import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 Wave 4 (009G-AC-001, 002; axe colour-contrast). The action colour `--ac-primary` (and its
 * hover) is for fills, borders and control accents. As a text colour it reads 3.19:1 on the Dark
 * card, under WCAG AA, so no stylesheet may set `color` to it; text takes `--st-info-fg` (the link
 * colour of design section 2.6) or `--tx-strong`.
 */
const root = resolve(import.meta.dirname, "../../../..");
const scanned = "apps/web/src";
const ACTION_AS_TEXT = /(?:^|[\s;{])color:\s*var\(--ac-primary(?:-hover)?\)/mu;

async function stylesheets(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe("the action colour is never a text colour", () => {
  it("finds no stylesheet that sets color to --ac-primary or its hover", async () => {
    const offenders: string[] = [];
    for (const file of await stylesheets(resolve(root, scanned))) {
      const text = await readFile(file, "utf8");
      if (ACTION_AS_TEXT.test(text)) offenders.push(relative(root, file).replaceAll("\\", "/"));
    }
    expect(offenders).toEqual([]);
  });

  it("tells a text colour from a border, fill or accent", () => {
    expect(ACTION_AS_TEXT.test("a:hover {\n  color: var(--ac-primary);\n}")).toBe(true);
    expect(ACTION_AS_TEXT.test("a { color: var(--ac-primary-hover); }")).toBe(true);
    expect(ACTION_AS_TEXT.test("a { border-color: var(--ac-primary); }")).toBe(false);
    expect(ACTION_AS_TEXT.test("a { background-color: var(--ac-primary); }")).toBe(false);
    expect(ACTION_AS_TEXT.test("input { accent-color: var(--ac-primary); }")).toBe(false);
  });
});
