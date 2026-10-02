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
