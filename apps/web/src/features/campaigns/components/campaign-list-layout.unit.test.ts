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

  it("is never broken inside itself in a phone card either, where the dates are a run of words", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".cards time")["white-space"]).toBe("nowrap");
  });
});

describe("a hyphenated word in the Campaigns table (review pass 2, R2 F-8)", () => {
  it("is one unbreakable unit, so 'Pre-approval' is never read across a line break", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".whole")["white-space"]).toBe("nowrap");
  });
});

describe("the Campaigns page on a phone (review pass 2, R2 N-1)", () => {
  it("keeps the page's blocks --space-5 apart below 720px, as the mockup's phone .page does", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    expect(css.declarationsOf(".page").gap).toBe("var(--space-6)");
    expect(declarationsIn(mediaBody(css.source, "(max-width: 719.98px)"), ".page").gap).toBe(
      "var(--space-5)",
    );
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

  it("keeps the thumbnail in the tablet table, as 009E-AC-009 asks, and in a phone card (pass 3, R2 P3-6)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    // Pass 1 hid the table's tile between 720px and 1023px to make the chips fit; the chips now keep
    // one line and hyphenated words stay whole, so nothing at this width hides a tile any more.
    const tablet = mediaBody(css.source, "(max-width: 63.99rem)");
    expect(tablet).not.toMatch(/\.thumb/u);
    expect(tablet).not.toMatch(/display\s*:\s*none/u);
    expect(css.declarationsOf(".thumb")["inline-size"]).toBe("3rem");
    // The Ad cell keeps its two columns, the tile beside the name, and the name's track may not
    // shrink under its longest unbreakable word: with a zero minimum, "pre-approved" ran into the
    // Topic column at 720px.
    expect(css.declarationsOf(".adCell")["grid-template-columns"]).toBe("auto minmax(0, 1fr)");
    expect(declarationsIn(tablet, ".adCell")["grid-template-columns"]).toBe(
      "auto minmax(min-content, 1fr)",
    );
  });

  it("gives the Ad column the tile's room in the tablet table, and stacks the tile above the name only from 720px to 767px (pass 3, R2 P3-6)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    const tablet = mediaBody(css.source, "(max-width: 63.99rem)");
    // 27% without the tile, 32% with its 60px; the six hints still add up to the whole table.
    const shares = [
      ...tablet.matchAll(/\.table th:nth-child\((\d)\)\s*\{\s*inline-size:\s*(\d+)%/gu),
    ].map((match) => Number.parseInt(match[2] ?? "", 10));
    expect(shares).toHaveLength(6);
    expect(shares[0]).toBe(32);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(100);
    // Six columns, the widest status chip and a tile beside the name need about 750px, so the narrow
    // end of the table frame draws the tile above the name, still in every row.
    const narrow = mediaBody(css.source, "(min-width: 45rem) and (max-width: 47.99rem)");
    expect(declarationsIn(narrow, ".adCell")["grid-template-columns"]).toBe(
      "minmax(min-content, 1fr)",
    );
  });

  it("sets a phone card's last change as a caption in the faint ink, on a line after the chip (pass 3, R2 P3-7)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-list.module.css`);

    const caption = css.declarationsOf(".cardCaption");
    expect(caption["font-size"]).toBe("var(--text-caption-size)");
    expect(caption.color).toBe("var(--tx-faint)");
    // The card's children are `--space-2` apart, as the mockup's `.list-card` sets them.
    expect(css.declarationsOf(".card").gap).toBe("var(--space-2)");
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
