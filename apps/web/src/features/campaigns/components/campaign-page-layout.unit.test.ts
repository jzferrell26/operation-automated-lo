import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";
import { declarationsIn, mediaBody } from "./css-blocks.test-support.js";

/**
 * The scored baseline review of 2026-10-03, pass 1, part R2 (009G-AC-006): the layout rules the
 * review's pictures showed wrong on the Campaigns pages. jsdom has no layout, so each rule is pinned
 * in the stylesheet that draws it; the pictures themselves are the browser run's.
 */

const COMPONENTS = resolve(import.meta.dirname);

describe("the campaign page's header (review R2, F-1)", () => {
  it("keeps the actions and their sentence on the end edge of the column, beside the words or under them", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    // A block that wraps takes an edge of the column; it is never a box floating between the two.
    expect(css.declarationsOf(".headActions")["margin-inline-start"]).toBe("auto");
    expect(css.declarationsOf(".headActions")["justify-items"]).toBe("end");
    expect(css.declarationsOf(".headActions")["text-align"]).toBe("end");
    // The words give way to the actions, so the head is one row wherever the actions fit beside them.
    expect(css.declarationsOf(".headText").flex).toBe("1 1 20rem");
  });

  it("stacks the actions under the words at the start edge below the desktop frame, where 768 sits", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const tablet = mediaBody(css.source, "(max-width: 63.99rem)");
    expect(declarationsIn(tablet, ".headText")["flex-basis"]).toBe("100%");
    const actions = declarationsIn(tablet, ".headActions");
    expect(actions["margin-inline-start"]).toBe("0");
    expect(actions["justify-items"]).toBe("start");
    expect(actions["text-align"]).toBe("start");
    expect(declarationsIn(tablet, ".actions")["justify-content"]).toBe("flex-start");
  });
});

describe("the campaign page's cards (review R2, F-2)", () => {
  it("gives the library notices and the support details the same inset as every other card, --space-6", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    expect(css.declarationsOf(".notice").padding).toBe("var(--space-6)");
    expect(css.declarationsOf(".support details").padding).toBe("var(--space-3) var(--space-6)");
  });
});

describe("a library notice (review R2, F-3)", () => {
  it("draws the glyph and its sentence as one row, so the glyph sits on the sentence's first line", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const row = css.declarationsOf(".noticeText");
    expect(row.display).toBe("flex");
    expect(row["align-items"]).toBe("flex-start");
    expect(row.gap).toBe("var(--space-2)");
  });
});

describe("a date on the campaign page (review R2, H-3)", () => {
  it("is never broken inside itself, so a mask over it covers the one day and not the sentence round it", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    expect(css.declarationsOf(".page time")["white-space"]).toBe("nowrap");
  });
});

describe("the approve card and the hand-off on the campaign page (review R1-13)", () => {
  it("spaces the approve card's children --space-4 apart and gives the empty live region's gap back", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const card = css.declarationsOf(".stack [data-approval-card]");
    expect(card.display).toBe("grid");
    expect(card.gap).toBe("var(--space-4)");
    expect(css.declarationsOf(".stack [data-approval-card] > *").margin).toBe("0");
    expect(
      css.declarationsOf('.stack [data-approval-card] > [role="status"]:empty')[
        "margin-block-start"
      ],
    ).toBe("calc(var(--space-4) * -1)");
  });

  it("lays the hand-off out as the sentence and a button at the card's width, --space-4 apart", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const handOff = css.declarationsOf(".handOff");
    expect(handOff.gap).toBe("var(--space-4)");
    expect(handOff["justify-items"]).toBe("stretch");
    expect(handOff["justify-self"]).toBe("stretch");
    // The glyph of "Link copied." shares a row with its words.
    expect(css.declarationsOf(".copied").display).toBe("flex");
  });
});
