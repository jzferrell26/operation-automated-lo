import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../testing/css-rules.js";

/**
 * 009G-AC-001. The review browser suite measured every Settings card description at 13px, a size
 * between the brief's six type steps (28, 19, 16, 14 and 12px). The description is the secondary
 * step, so it takes the token and never a pixel value.
 *
 * jsdom has no layout, so this reads the stylesheet. The measurement itself is the type-step check
 * in `tests/browser/helpers/design-quality.ts`, which runs against every page of a new account.
 */

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "workspace.module.css"),
);

describe("the Settings card description is on the brief's type steps (009G-AC-001)", () => {
  it("is the secondary step, 14px, as a token", () => {
    expect(declarationsOf(".toolCard p")["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("sets no 13px text anywhere in the sheet", () => {
    expect(source).not.toMatch(/font-size:\s*13px/u);
  });
});

/**
 * Pass 4, R3 N-10. Brand's reason line ("Homeowner reports aren't turned on in this workspace yet.")
 * left "yet." alone on its second line at 1180. `text-wrap: pretty` keeps a last line from being one
 * word, as `permission-screen.module.css` already does on its facts.
 */
describe("the line that gives the reason a save is off (pass 4, R3 N-10)", () => {
  it("is the secondary step and keeps a single word off its last line", () => {
    const reason = declarationsOf(".reason");

    expect(reason["font-size"]).toBe("var(--text-secondary-size)");
    expect(reason["text-wrap"]).toBe("pretty");
  });
});

/**
 * The scored baseline review pass 2, P2-05. The sheet kept five raw `12px` sizes (`.openLink`,
 * `.metrics`, the page note, `.record small`, `.details > div`). 12px is a step's value, so the browser
 * run's type-step gate passed, but it cannot see a literal: the steps come from the tokens, never
 * an ad-hoc size (rubric axis 3). This scan is the check that can.
 */
describe("every size in the sheet is a type token (scored review pass 2, P2-05)", () => {
  const sizes = [...source.matchAll(/font-size:\s*([^;]+);/gu)].map((match) =>
    (match[1] ?? "").trim(),
  );

  it("finds the sizes the sheet sets, so an empty scan cannot pass", () => {
    expect(sizes.length).toBeGreaterThan(8);
  });

  it("names no pixel, rem or em length", () => {
    expect(sizes.filter((size) => !size.startsWith("var(--text-"))).toEqual([]);
  });

  it("draws a page note at the secondary step and the small print at the caption step", () => {
    expect(declarationsOf(".pageNote")["font-size"]).toBe("var(--text-secondary-size)");
    expect(declarationsOf(".reason")["font-size"]).toBe("var(--text-secondary-size)");
    for (const selector of [".openLink", ".record small"]) {
      expect(declarationsOf(selector)["font-size"], selector).toBe("var(--text-caption-size)");
    }
  });
});
