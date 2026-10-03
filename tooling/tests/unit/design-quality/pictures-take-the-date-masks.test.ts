import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 009G-AC-006, the scored baseline review's finding H-2. Every picture in the browser suite
 * is compared through `expectThePictureMatches`, which paints a mask over every date the product
 * draws (and over a run-day count) before it compares. A spec that calls `toHaveScreenshot` itself
 * skips those masks, so a day that moved with the clock fails a picture that no design change
 * touched, or worse, a mask is forgotten for one screen and the baseline quietly depends on the
 * date it was taken. The helper is the only file that may call the matcher.
 */

const repositoryRoot = resolve(import.meta.dirname, "../../../..");
const BROWSER_ROOT = "tests/browser";
const THE_HELPER = "tests/browser/helpers/design-quality.ts";
const DIRECT_CALL = /\.toHaveScreenshot\s*\(/u;

async function browserSources(): Promise<readonly string[]> {
  const found: string[] = [];
  for (const entry of await readdir(join(repositoryRoot, BROWSER_ROOT), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      found.push(
        relative(repositoryRoot, join(entry.parentPath, entry.name)).replaceAll("\\", "/"),
      );
    }
  }
  return found;
}

describe("every picture takes the shared date masks (review H-2)", () => {
  it("calls toHaveScreenshot nowhere but in the shared helper", async () => {
    const direct: string[] = [];
    for (const path of await browserSources()) {
      if (path === THE_HELPER) continue;
      if (DIRECT_CALL.test(await readFile(join(repositoryRoot, path), "utf8"))) direct.push(path);
    }

    expect(direct, "compare a picture with expectThePictureMatches, not toHaveScreenshot").toEqual(
      [],
    );
  });

  it("keeps the one real call inside the helper, where the masks are put on", async () => {
    const helper = await readFile(join(repositoryRoot, THE_HELPER), "utf8");

    expect(helper).toMatch(DIRECT_CALL);
    expect(helper).toContain("export async function expectThePictureMatches(");
  });

  it("detects a direct call when one appears", () => {
    expect(DIRECT_CALL.test("await expect(page).toHaveScreenshot(name, { fullPage: true });")).toBe(
      true,
    );
    expect(DIRECT_CALL.test("await expectThePictureMatches(page, name);")).toBe(false);
  });
});
