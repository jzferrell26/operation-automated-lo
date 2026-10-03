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
  it("gives the support details the same inset as every other card, --space-6", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    expect(css.declarationsOf(".support details").padding).toBe("var(--space-3) var(--space-6)");
  });

  it("leaves a library notice's fill, edge, shadow and inset to the Surface it is drawn on", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    // The notice is a `Surface` at `lg` (see `persisted-campaign-screen.integration.test.tsx`), so its
    // inset is the primitive's at every width, the phone's included. A padding here would be a second
    // value for the same card, and the one that drifted from the mockup's phone rule (review pass 2, N-1).
    const notice = css.declarationsOf(".notice");
    for (const property of ["padding", "border", "border-radius", "background", "box-shadow"]) {
      expect(notice, property).not.toHaveProperty(property);
    }
  });
});

/**
 * Review pass 2, R2 N-1. The mockup's phone rules (`campaign-detail.html`, below 720px) set the page's
 * gap and a card's padding to `--space-5`; Home applies both. The cards on this page are `Surface`s,
 * whose inset is the primitive's, so the stylesheet restates the value only for the one card that is
 * not a `Surface`: the support details, a `details` element.
 */
describe("the campaign page on a phone (review pass 2, R2 N-1)", () => {
  it("keeps the page's blocks --space-5 apart, and the support details' inset at --space-5", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const phone = mediaBody(css.source, "(max-width: 719.98px)");
    expect(declarationsIn(phone, ".page").gap).toBe("var(--space-5)");
    expect(declarationsIn(phone, ".support details")["padding-inline"]).toBe("var(--space-5)");
  });

  it("keeps --space-6 between the page's blocks above the phone frame", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    expect(css.declarationsOf(".page").gap).toBe("var(--space-6)");
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

describe("the campaign page's crumb (review R2, F-4)", () => {
  it("keeps the crumb row at the 44px target, because its link is a sentence-sized link with its margin taken back", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const crumbs = css.declarationsOf(".crumbs");
    expect(crumbs["font-size"]).toBe("var(--text-secondary-size)");
    expect(crumbs["min-block-size"]).toBe("var(--target-min-size)");
    // The link primitive's `sentence` variant sets the link's own box; the page does not redo it.
    expect(css.source).not.toMatch(/\.crumbs a\b/u);
  });
});

describe("a date on the campaign page (review R2, H-3)", () => {
  it("is never broken inside itself, so a mask over it covers the one day and not the sentence round it", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    expect(css.declarationsOf(".page time")["white-space"]).toBe("nowrap");
  });
});

describe("the approve card and the hand-off on the campaign page (review R1-13, R1-13r)", () => {
  it("spaces the approve card's children --space-4 apart, and does not try to cancel the empty live region's row with a margin", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const card = css.declarationsOf(".stack [data-approval-card]");
    expect(card.display).toBe("grid");
    expect(card.gap).toBe("var(--space-4)");
    expect(css.declarationsOf(".stack [data-approval-card] > *").margin).toBe("0");
    // R1-13r. A negative margin on an empty child cannot shrink a grid track below zero, so it left
    // 16px of dead space at the card's foot. The component takes the empty live region out of the
    // flow instead (`campaign-approval-controls.integration.test.tsx`), and nothing here cancels it.
    expect(css.source).not.toMatch(/\[data-approval-card\]\s*>\s*\[role="status"\]:empty/u);
    expect(css.source).not.toMatch(/margin-block-start\s*:\s*calc\(\s*var\(--space-4\)\s*\*\s*-1/u);
  });

  it("sets the hand-off's sentence at the secondary step, as the mockup's .small", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const hint = css.declarationsOf(".hint");
    expect(hint["font-size"]).toBe("var(--text-secondary-size)");
    expect(hint.color).toBe("var(--tx-body)");
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
