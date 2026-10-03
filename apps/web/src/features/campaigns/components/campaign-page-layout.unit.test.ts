import { readFile } from "node:fs/promises";
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
  it("gives the support details the same inline inset as every other card, --space-6, and the mockup's --space-1 above and below (pass 3, R1 P3-04)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    // The mockup's `details.card.support { padding-block: var(--space-1) }` on the card's inset: a
    // 52px card, where `--space-3` made it 70px. Opened, the last row gets room again.
    const card = css.declarationsOf(".support details");
    expect(card.padding).toBe("var(--space-1) var(--space-6)");
    // Not a grid: a closed `details` keeps its hidden content box, and a row gap before it is 8px of
    // dead space under the summary (a 62px card measured against the mockup's 54). The rows take
    // their own `--space-2` from the summary instead.
    expect(card.display).toBeUndefined();
    expect(card.gap).toBeUndefined();
    expect(css.declarationsOf(".support dl")["padding-block-start"]).toBe("var(--space-2)");
    expect(css.declarationsOf(".support details[open]")["padding-block-end"]).toBe(
      "var(--space-3)",
    );
  });

  it("sets the support summary at the secondary step in semibold, as the mockup's disclosure summary (pass 3, R1 P3-04)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const summary = css.declarationsOf(".support summary");
    expect(summary["font-size"]).toBe("var(--text-secondary-size)");
    expect(summary["font-weight"]).toBe("var(--weight-semibold)");
    expect(summary["min-block-size"]).toBe("var(--target-min-size)");
    expect(summary.color).toBe("var(--st-info-fg)");
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

  it("sets the hand-off's sentence at the secondary step in the strong ink, as the other decision-card sentences (pass 3, R1 P3-03)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const hint = css.declarationsOf(".hint");
    expect(hint["font-size"]).toBe("var(--text-secondary-size)");
    // The mockup draws the approved, sent-back, retired and cannot-approve sentences in one ink,
    // `--tx-strong`; only the approve line is `.muted` (`--tx-body`). The step 3 stylesheet's
    // decision sentences set no colour, so they take the card's strong ink, and this is the one
    // that had been the body ink (`launch-look.unit.test.ts` holds the approve line's).
    expect(hint.color).toBe("var(--tx-strong)");
  });

  it("keeps the page's primary link at the shared medium weight every button has (pass 3, R1 P3-02)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const link = css.declarationsOf("a.primaryLink.primaryLink");
    expect(link["font-weight"]).toBe("var(--weight-medium)");
    expect(link["font-size"]).toBe("var(--text-body-size)");
  });

  /**
   * Pass 4, R2 F4-1. `campaign-detail.html:553` draws the Approval card's first sentence ("Approved
   * by ...", "Sent back for changes by ...", "Nobody has approved this version yet.") as a plain
   * `.small`, in the body text's `--tx-strong`, and only the sentence under it as `.small muted`
   * (`--tx-body`). The page drew both in `--tx-body`, so it was the one card whose lead sentence was
   * quieter than step 3's, and the hand-off sentence two cards below it (`.hint`, `--tx-strong`).
   */
  it("draws the Approval card's first sentence in the strong ink, and the one under it in the body ink (pass 4, R2 F4-1)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);

    const lead = css.declarationsOf(".decisionLine");
    expect(lead["color"]).toBe("var(--tx-strong)");
    expect(lead["font-size"]).toBe("var(--text-secondary-size)");
    expect(lead["line-height"]).toBe("var(--leading-normal)");
    // The second sentence, and every other card's sentence, stay the quiet secondary step.
    expect(css.declarationsOf(".small")["color"]).toBe("var(--tx-body)");
  });

  /**
   * Pass 4, R1 F4-01 asked whether this rule has the step 3 links' grey ring. It does not, and this
   * holds why: "Launch an ad" is the plain `inline` variant of the link primitive, which draws no
   * edge, so there is no `--bd-input` border to turn into the action colour. If it were made the
   * `action` variant, the edge would return and the rule would need the same two declarations
   * `launch.module.css` has on `a.primaryLink`.
   */
  it("draws the page's primary link with no edge, because it is the plain link variant (pass 4, R1 F4-01)", async () => {
    const css = await readCssRules(`${COMPONENTS}/campaign-page.module.css`);
    const link = css.declarationsOf("a.primaryLink.primaryLink");
    expect(link["border"]).toBeUndefined();
    expect(link["border-color"]).toBeUndefined();

    const source = await readFile(`${COMPONENTS}/launch-an-ad-link.tsx`, "utf8");
    expect(source).not.toMatch(/variant=["{]/u);
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
