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
    expect(cards.source).not.toMatch(/0\.125rem/u);
