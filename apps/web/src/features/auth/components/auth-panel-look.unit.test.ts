import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";

/**
 * The account card, held to the PRD-009 scored baseline review (009G-AC-006, pass 1, part R4).
 * jsdom has no layout, so these read the stylesheet; the browser suite photographs the result.
 */
const css = await readCssRules(resolve("apps/web/src/features/auth/components/auth-form.module.css"));

describe("the account card's padding (R4-04)", () => {
  it("is the PRD-009 card's 24px at 720px and wider", () => {
    expect(css.declarationsOf(".panel")["padding"]).toBe("var(--space-6)");
  });

  it("is the PRD-009 card's 20px under 720px", () => {
    expect(css.source).toMatch(
      /@media \(max-width: 719\.98px\) \{\s*\.panel \{\s*padding: var\(--space-5\);\s*\}\s*\}/u,
    );
  });
});

describe("the account notices (R4-06, R4-08)", () => {
  it("states no text colour for the notice, so it is the visible live region's body colour", () => {
    expect(css.declarationsOf(".notice")).not.toHaveProperty("color");
  });

  it("lays the glyph and the words out side by side, the glyph on the first line", () => {
    expect(css.declarationsOf(".problem,\n.notice")).toMatchObject({
      display: "grid",
      "grid-template-columns": "auto minmax(0, 1fr)",
      "align-items": "start",
    });
    expect(css.declarationsOf(".feedbackGlyph")["margin-block-start"]).toBe("var(--space-1)");
  });
});

describe("the workspace choice's legend (R4-09)", () => {
  it("is the card step's semibold weight", () => {
    expect(css.declarationsOf(".choicesLegend")["font-weight"]).toBe("var(--weight-semibold)");
  });
});
