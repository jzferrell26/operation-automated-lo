import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";

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

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "launch.module.css"),
);

describe("the Launch an ad disclosure summary takes the link colour, not the action fill", () => {
  it("colours 'See what we checked' with --st-info-fg", () => {
    expect(declarationsOf(".checked summary")["color"]).toBe("var(--st-info-fg)");
  });

  it("uses no accent fill as text colour anywhere in the sheet", () => {
    expect(source).not.toMatch(/(?:^|[\s;{])color:\s*var\(--ac-/u);
  });
});
