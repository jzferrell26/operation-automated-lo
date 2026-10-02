import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The "See what we checked" summary on the campaign page's decided state drew `--ac-primary`
 * (#3566d6) on the Dark card (#1b1e25), 3.19:1 against the 4.5:1 floor, and axe named it
 * (`color-contrast`). The design direction (`design/00-direction.md` section 2.6) rules that
 * `--ac-primary` is a fill and never text in Dark; a link reads `--st-info-fg`, which is
 * #005fcc in Light and #8bb0ff in Dark.
 *
 * jsdom has no layout, so this reads the stylesheet. The measurement is axe in
 * `tests/browser/review/review-campaign-decision.spec.ts`.
 */

const source = (
  await readFile(join(resolve(import.meta.dirname), "launch.module.css"), "utf8")
).replaceAll(/\/\*[\s\S]*?\*\//gu, "");

/** The declarations of the rule whose whole selector is `selector`. */
function declarationsOf(selector: string): Readonly<Record<string, string>> {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
  const body = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "u").exec(source)?.[1];
  expect(body, `a rule for ${selector}`).toBeDefined();
  return Object.fromEntries(
    (body ?? "")
      .split(";")
      .map((declaration) => declaration.split(":"))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([property, value]) => [property.trim(), value.trim()]),
  );
}

describe("the Launch an ad disclosure summary takes the link colour, not the action fill", () => {
  it("colours 'See what we checked' with --st-info-fg", () => {
    expect(declarationsOf(".checked summary")["color"]).toBe("var(--st-info-fg)");
  });

  it("uses no accent fill as text colour anywhere in the sheet", () => {
    expect(source).not.toMatch(/(?:^|[\s;{])color:\s*var\(--ac-/u);
  });
});
