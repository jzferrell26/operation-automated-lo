import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";

/**
 * The scored baseline review of PRD-009 (2026-10-03, part R1 and finding F-6 and F-7 of part R2)
 * found these looks off the mockups. jsdom has no layout, so each rule is pinned in the stylesheet
 * that sets it; the pictures are the measurement (`tests/browser/review`).
 */

const here = resolve(import.meta.dirname);
const launch = await readCssRules(join(here, "launch.module.css"));
const cards = await readCssRules(join(here, "ad-library-cards.module.css"));
const creative = await readCssRules(join(here, "ad-creative.module.css"));

describe("the launch header (R1-05)", () => {
  it("puts one page gap between its pieces, and a phone's page gap on a phone", () => {
    expect(launch.declarationsOf(".header")["gap"]).toBe("var(--space-6)");
    expect(launch.declarationsOf(".headText")["gap"]).toBe("var(--space-2)");
    expect(launch.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.page,\s*\.header \{\s*gap: var\(--space-5\);/u,
    );
  });
});

describe("step 2 (R1-07, R1-08, R1-10, R1-11)", () => {
  it("draws 'Use the library words' in the link colour, with no edge or fill at rest or on hover", () => {
    const rest = launch.declarationsOf("button.resetLink");
    expect(rest["color"]).toBe("var(--st-info-fg)");
    expect(rest["font-size"]).toBe("var(--text-secondary-size)");
    expect(rest["font-weight"]).toBe("var(--weight-semibold)");
    expect(rest["text-decoration"]).toBe("underline");
    const hover = launch.declarationsOf("button.resetLink:hover:not(:disabled)");
    expect(hover["background"]).toBe("transparent");
    expect(hover["border-color"]).toBe("transparent");
  });

  it("sets the text links at the secondary step in semibold", () => {
    const link = launch.declarationsOf("a.textLink");
    expect(link["font-size"]).toBe("var(--text-secondary-size)");
    expect(link["font-weight"]).toBe("var(--weight-semibold)");
  });

  it("sets 'Your ad so far' at the card step and the locked line at the secondary step", () => {
    expect(launch.declarationsOf(".preview .previewTitle")["font-size"]).toBe(
      "var(--text-card-size)",
    );
    expect(launch.declarationsOf(".locked")["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("caps the feed frame, which step 2's preview and step 3's ad both sit in", () => {
    const frame = launch.declarationsOf(".feedFrame");
    expect(frame["max-inline-size"]).toBe("30rem");
    expect(frame["margin-inline"]).toBe("auto");
  });
});

describe("step 3's cards (R1-12, R1-13, R1-15)", () => {
  it("separates every child of a side card by one --space-4", () => {
    const stack = launch.declarationsOf(".approveCard,\n.launchCard,\n.decisionCard");
    expect(stack["display"]).toBe("grid");
    expect(stack["gap"]).toBe("var(--space-4)");
    expect(launch.declarationsOf(".decision [data-approval-card]")["gap"]).toBe("var(--space-4)");
    expect(launch.declarationsOf(".decision")["gap"]).toBe("var(--space-4)");
  });

  it("keeps a status chip at its own width", () => {
    expect(launch.declarationsOf(".decisionChip")["justify-self"]).toBe("start");
    expect(launch.declarationsOf(".decision [data-approval-card]")["justify-items"]).toBe("start");
  });

  it("takes an empty status line out of the approve card's grid, so it leaves no gap at the foot (R1-13r)", () => {
    const empty = launch.declarationsOf('.decision [data-approval-card] > [role="status"]:empty');
    // An absolutely positioned child takes no grid track, so the row gap before it is not drawn;
    // a negative margin could not shrink that gap, which is what the first fix tried.
    expect(empty["position"]).toBe("absolute");
    expect(empty["clip-path"]).toBe("inset(50%)");
    expect(empty["margin-block-start"]).toBeUndefined();
    expect(launch.declarationsOf(".decision [data-approval-card]")["position"]).toBe("relative");
    // The one sentence the review saw end on "it." alone (R1 pass 2, observation 2).
    expect(launch.declarationsOf(".decision [data-approval-card]")["text-wrap"]).toBe("pretty");
  });

  it("sets the decision cards' sentences at the secondary step, the approve line in the body ink (P2-08)", () => {
    const sentences = launch.declarationsOf(
      ".decision [data-approval-card] > p,\n.decisionCard p,\n.fixes",
    );
    expect(sentences["font-size"]).toBe("var(--text-secondary-size)");
    expect(
      launch.declarationsOf('.decision [data-approval-card] > p:not([role="status"])')["color"],
    ).toBe("var(--tx-body)");
    const title = launch.declarationsOf(".decision [data-approval-card] > strong");
    expect(title["font-size"]).toBe("var(--text-card-size)");
    expect(title["font-weight"]).toBe("var(--weight-semibold)");
  });

  it("outranks the link primitive's button look on the primary links of the decision cards", () => {
    const link = launch.declarationsOf("a.primaryLink");
    expect(link["background"]).toBe("var(--ac-primary)");
    expect(launch.declarationsOf("a.primaryLink:hover")["background"]).toBe(
      "var(--ac-primary-hover)",
    );
  });

  it("draws the primary links' edge in the action colour, at rest and on hover (pass 4, R1 F4-01)", () => {
    // The link primitive's `action` look is a card-coloured button with a `--bd-input` edge. The rule
    // turns it into a primary by fill and colour, so without its own edge a grey 1px ring showed
    // around the blue fill (the mockups' `.btn--primary` takes `--ac-primary`, then
    // `--ac-primary-hover`). "Copy the link" beside them is a Button with no visible edge.
    expect(launch.declarationsOf("a.primaryLink")["border-color"]).toBe("var(--ac-primary)");
    expect(launch.declarationsOf("a.primaryLink:hover")["border-color"]).toBe(
      "var(--ac-primary-hover)",
    );
  });

  it("leaves the primary links' size, padding and weight to the compact action link (P3-02)", () => {
    const link = launch.declarationsOf("a.primaryLink");
    // The mockups draw them as `btn--sm`, the twin of "Copy the link": the secondary step at the
    // shared medium weight (every button keeps 500). `Link size="sm"` carries the size and the
    // inline padding, so the rule restates none of them; a semibold here was the 600 the review
    // measured beside the 500 "Copy the link", and a 16px label was the body step.
    expect(link["font-weight"]).toBeUndefined();
    expect(link["font-size"]).toBeUndefined();
    expect(link["padding"]).toBeUndefined();
    expect(link["min-block-size"]).toBe("var(--target-min-size)");
    expect(launch.source).not.toMatch(
      /a\.primaryLink[^}]*font-weight:\s*var\(--weight-semibold\)/u,
    );
  });

  it("draws 'See what we checked' as the mockup's disclosure summary (P3-01)", () => {
    const summary = launch.declarationsOf(".checked summary");
    // A flex row (the glyph, then the words), which also takes the browser's triangle away.
    expect(summary["display"]).toBe("flex");
    expect(summary["align-items"]).toBe("center");
    expect(summary["gap"]).toBe("var(--space-2)");
    expect(summary["font-size"]).toBe("var(--text-secondary-size)");
    expect(summary["font-weight"]).toBe("var(--weight-semibold)");
    expect(summary["min-block-size"]).toBe("var(--target-min-size)");
    expect(summary["color"]).toBe("var(--st-info-fg)");
    expect(summary["list-style"]).toBe("none");
    expect(launch.declarationsOf(".checked summary::-webkit-details-marker")["display"]).toBe(
      "none",
    );
  });
});

describe("the launch header's crumbs (P2-02)", () => {
  it("keeps the 44px row, and marks the current crumb in the strong ink at the medium weight", () => {
    const crumbs = launch.declarationsOf(".crumbs");
    expect(crumbs["font-size"]).toBe("var(--text-secondary-size)");
    expect(crumbs["min-block-size"]).toBe("var(--target-min-size)");
    const current = launch.declarationsOf('.crumbs [aria-current="page"]');
    expect(current["color"]).toBe("var(--tx-strong)");
    expect(current["font-weight"]).toBe("var(--weight-medium)");
  });
});

describe("dates, captions, and the phone (P2-03 to P2-07)", () => {
  it("never breaks a date across two lines (P2-04)", () => {
    expect(launch.declarationsOf(".page time")["white-space"]).toBe("nowrap");
  });

  it("stacks each fact's label over its value on a phone (P2-03)", () => {
    expect(launch.declarationsOf(".fact")["grid-template-columns"]).toBe("8rem minmax(0, 1fr)");
    expect(launch.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.fact \{\s*gap: 0;\s*grid-template-columns: minmax\(0, 1fr\);/u,
    );
  });

  it("sets 'Updates as you type' and the two lines under the ad as captions in the faint ink (P2-05)", () => {
    const captions = launch.declarationsOf(".caption,\n.previewNote");
    expect(captions["font-size"]).toBe("var(--text-caption-size)");
    expect(captions["color"]).toBe("var(--tx-faint)");
    const notes = launch.declarationsOf(".note,\n.hint,\n.saveNote");
    expect(notes["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("start-aligns the save note and stretches Add to the field on a phone (P2-07)", () => {
    expect(launch.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.saveNote \{\s*text-align: start;/u,
    );
    expect(launch.declarationsOf(".saveNote")["text-align"]).toBe("end");
    // Add keeps the grid's own stretch: no rule sets its alignment.
    expect(launch.source).not.toMatch(/\.placeAdd > button/u);
  });

  it("keeps the save note one --space-3 from its buttons, on a line of its own in the actions row (P3-05)", () => {
    // The note is a child of `.actions` (`launch-flow.integration.test.tsx`), so the row's own gap
    // is the distance to the buttons; as a child of the form's `--space-6` grid it stood 24px off.
    expect(launch.declarationsOf(".actions")["gap"]).toBe("var(--space-3)");
    expect(launch.declarationsOf(".actions")["flex-wrap"]).toBe("wrap");
    expect(launch.declarationsOf(".saveNote")["flex-basis"]).toBe("100%");
    // On a phone the row is a column that does not wrap, and the note takes its own height.
    expect(launch.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.actions \{\s*flex-direction: column-reverse;\s*flex-wrap: nowrap;/u,
    );
    expect(launch.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.saveNote \{[^}]*flex-basis: auto;/u,
    );
  });

  it("leaves 'Your ad so far' to the shared Card, with no edge, radius or padding of its own (P2-06)", () => {
    const preview = launch.declarationsOf(".preview");
    expect(preview["gap"]).toBe("var(--space-4)");
    for (const own of ["padding", "border", "border-radius", "background"]) {
      expect(preview[own], `${own} on .preview`).toBeUndefined();
    }
    expect(launch.declarationsOf(".previewRail")["position"]).toBe("sticky");
  });
});

describe("the shape switch (P2-09)", () => {
  it("sets its words at the secondary step in the medium weight", () => {
    const option = launch.declarationsOf(".shapeOption");
    expect(option["font-size"]).toBe("var(--text-secondary-size)");
    expect(option["font-weight"]).toBe("var(--weight-medium)");
  });

  it("shows the chosen shape in the information tint and the semibold weight", () => {
    const chosen = launch.declarationsOf(".shapeOption:has(input:checked)");
    expect(chosen["background"]).toBe("var(--st-info-bg)");
    expect(chosen["font-weight"]).toBe("var(--weight-semibold)");
    expect(launch.declarationsOf(".shapeSwitch")["overflow"]).toBe("hidden");
  });
});

describe("the ad card and the topic chips (R1-03, R1-04)", () => {
  it("sets the version line as a caption in the faint ink, and never breaks its date", () => {
    const version = cards.declarationsOf(".cardVersion");
    expect(version["font-size"]).toBe("var(--text-caption-size)");
    expect(version["color"]).toBe("var(--tx-faint)");
    expect(cards.declarationsOf(".cardVersion time")["white-space"]).toBe("nowrap");
  });

  it("spaces the cards a page gap apart, and a phone's cards a --space-4 apart", () => {
    expect(cards.declarationsOf(".grid")["gap"]).toBe("var(--space-6)");
    expect(cards.source).toMatch(
      /@media \(max-width: 47\.99rem\) \{\s*\.grid \{\s*gap: var\(--space-4\);/u,
    );
  });

  it("pads the card body --space-4 above and --space-5 at the sides and below", () => {
    expect(cards.declarationsOf(".cardBody")["padding"]).toBe(
      "var(--space-4) var(--space-5) var(--space-5)",
    );
  });

  it("leaves the card's fill, edge, radius and shadow to the shared Card (P3-06)", () => {
    const card = cards.declarationsOf(".card");
    for (const own of ["border", "border-radius", "background", "box-shadow", "padding"]) {
      expect(card[own], `${own} on .card`).toBeUndefined();
    }
    // Three rows: the art, the body that takes the room left over, and the action's foot.
    expect(card["grid-template-rows"]).toBe("auto 1fr auto");
    expect(card["overflow"]).toBe("hidden");
  });

  it("puts the action in a foot that follows the body's own bottom inset (P3-06)", () => {
    // The mockup's `.ad-card__foot` is `padding: 0 --space-5 --space-5` after the body's
    // `--space-5` bottom, so "Use this ad" is 20px under the version line; the hand-built
    // `.cardAction` put it 16px under (`--space-2` gap and `--space-2` padding in the body).
    expect(cards.declarationsOf(".cardFoot")["padding"]).toBe("0 var(--space-5) var(--space-5)");
    expect(cards.declarationsOf(".cardFoot > *")["inline-size"]).toBe("100%");
    expect(cards.source).not.toMatch(/\.cardAction/u);
  });

  it("sets the chip's words at the secondary step, and keeps the chosen chip's ink", () => {
    expect(cards.declarationsOf(".chip")["font-size"]).toBe("var(--text-secondary-size)");
    const chosen = cards.declarationsOf('.chip[aria-current="true"],\n.chip[aria-pressed="true"]');
    expect(chosen["color"]).toBe("var(--tx-strong)");
    expect(chosen["font-weight"]).toBe("var(--weight-semibold)");
  });

  it("leaves the topic pill's size, padding and ink to the shared Badge (P2-01)", () => {
    const topic = cards.declarationsOf(".cardBody .topic");
    // The chip is 12px on every screen (the badge specification, ruled 2026-10-03), with
    // `--space-1` above and below; a raw 0.125rem and a 14px step were the first fix's mistake.
    expect(topic["font-size"]).toBeUndefined();
    expect(topic["padding-block"]).toBeUndefined();
    expect(topic["padding-inline"]).toBeUndefined();
    expect(topic["color"]).toBeUndefined();
    expect(topic["white-space"]).toBe("nowrap");
    expect(topic["align-self"]).toBe("flex-start");
    expect(cards.source).not.toMatch(/0\.125rem/u);
  });

  it("has no hand-built empty paragraph; the empty library is an AsyncState", () => {
    expect(cards.source).not.toMatch(/\.empty\b/u);
  });
});

describe("the ad picture looks the same in both themes (R1-17, F-6)", () => {
  it("draws the frame's three lines in the ad's own rule colour", () => {
    expect(creative.declarationsOf(".feed")["border"]).toBe(
      "1px solid var(--ad-band-rule, var(--bd-hairline))",
    );
    expect(creative.declarationsOf(".feedFooter")["border-block-start"]).toBe(
      "1px solid var(--ad-band-rule, var(--bd-hairline))",
    );
    expect(creative.declarationsOf(".feedButton")["border"]).toBe(
      "1px solid var(--ad-band-rule, var(--bd-hairline))",
    );
  });

  it("names the dashboard's hairline only as the fallback of the ad's rule", () => {
    const uses = creative.source.match(/var\(--bd-hairline\)/gu) ?? [];
    const asFallback = creative.source.match(/var\(--ad-band-rule, var\(--bd-hairline\)\)/gu) ?? [];
    expect(uses.length).toBe(asFallback.length);
    expect(asFallback.length).toBeGreaterThanOrEqual(3);
  });
});

describe("the ad's company line (F-7)", () => {
  it("carries no fractional tracking, which a whole-pixel rasterizer turned into gaps after letters", () => {
    const company = creative.declarationsOf(".feedCompany");
    expect(company["letter-spacing"]).toBeUndefined();
    expect(company["text-rendering"]).toBe("geometricPrecision");
    expect(company["text-transform"]).toBe("uppercase");
  });
});
