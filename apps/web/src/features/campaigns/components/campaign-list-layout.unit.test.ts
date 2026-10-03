import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";
import { declarationsIn, mediaBody } from "./css-blocks.test-support.js";

/**
 * The scored baseline review of 2026-10-03, pass 1, part R2 (009G-AC-006): the layout rules the
 * review's pictures showed wrong on the Campaigns list. jsdom has no layout, so each rule is pinned
 * in the stylesheet that draws it; the pictures themselves are the browser run's.
 */

const COMPONENTS = resolve(import.meta.dirname);

describe("a date on the Campaigns list (review R2, H-3)", () => {
  it("is never broken inside itself, so a table cell that wraps leaves each day whole", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".tableWrap time")["white-space"]).toBe("nowrap");
  });
});

describe("the Campaigns table and cards (review R2, F-8, F-11)", () => {
  it("never releases the status chip's single line, and lets the browser share the width out at the tablet frame", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".chipCell")["white-space"]).toBe("nowrap");
    const tablet = mediaBody(css.source, "(max-width: 63.99rem)");
    // A fixed layout is what gave Status 17% and broke "Sent back for changes" into three lines.
    expect(tablet).not.toMatch(/table-layout\s*:\s*fixed/u);
    expect(css.source).not.toMatch(/table-layout\s*:\s*fixed/u);
    // `.nowrap` is released for the cells that may wrap; the chip's cell is a different class.
    expect(declarationsIn(tablet, ".table .nowrap")["white-space"]).toBe("normal");
    expect(tablet).not.toContain(".chipCell");
  });

  it("hides the thumbnail in the tablet table alone, so a phone card keeps it", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    const tablet = mediaBody(css.source, "(max-width: 63.99rem)");
    expect(declarationsIn(tablet, ".table .thumb").display).toBe("none");
    // No rule at this width hides the bare tile: that was the one that also hid the card's.
    expect(tablet).not.toMatch(/(?:^|[{}])\s*\.thumb\s*\{/u);
  });

  it("lays a phone card out with the thumbnail beside the name and one inset round it", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".card").padding).toBe("var(--space-5)");
    const head = css.declarationsOf(".cardHead");
    expect(head.display).toBe("grid");
    expect(head["grid-template-columns"]).toBe("auto minmax(0, 1fr)");
  });

  it("keeps a tile with no art quiet, in the faint text colour", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf('.thumb[data-thumb="none"]').color).toBe("var(--tx-faint)");
  });
});
