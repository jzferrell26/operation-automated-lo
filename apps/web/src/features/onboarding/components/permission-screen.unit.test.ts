import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../../testing/css-rules.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, on the Connections page.
 * jsdom has no layout, so these read the stylesheet; the pictures are the review's own.
 *
 * - F-08: a group's description kept the browser's 1em margin inside a grid that already had a gap,
 *   so each heading read as the caption of the card above it. The rubric's D-009 ruling says such a
 *   gap is a `--space-*` token in the module.
 * - F-10: the notice asks for the informational surface and, being a plain element, gets it.
 */

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "permission-screen.module.css"),
);

describe("F-08: the groups' rhythm", () => {
  it("takes the browser's margin off a group's description", () => {
    expect(declarationsOf(".permissionGroups p")["margin"]).toBe("0");
  });

  it("puts the groups --space-8 apart and the two columns --space-6 apart", () => {
    expect(declarationsOf(".permissionGroups")["gap"]).toBe("var(--space-8) var(--space-6)");
  });

  it("keeps what is inside one group closer than the groups are to each other", () => {
    expect(declarationsOf(".permissionGroups section")["gap"]).toBe("var(--space-3)");
  });
});

describe("F-10: the notice", () => {
  it("sets only its row, because the Surface primitive's info variant owns the tint, radius, padding, and ink", () => {
    const notice = declarationsOf(".safetyNotice");

    expect(notice["display"]).toBe("flex");
    expect(notice["align-items"]).toBe("flex-start");
    expect(notice["gap"]).toBe("var(--space-3)");
    for (const property of ["background", "color", "border-radius", "padding"]) {
      expect(notice[property], `${property} comes from the Surface variant`).toBeUndefined();
    }
  });

  it("keeps its title in the informational tone, the one colour the module still sets", () => {
    expect(declarationsOf(".safetyNotice strong")["color"]).toBe("var(--st-info-fg)");
    // The tint is the Surface variant's; the module never paints it again.
    expect(source).not.toMatch(/--st-info-bg/u);
  });
});

/**
 * Pass 4, R3 N-9. The sample-data Connections page read "verified 8 / minutes ago." across two lines
 * (the `pretty` wrap that keeps "yet." off its own line moved the break to the number). A relative
 * time is one phrase, so the page draws it in a span that does not wrap.
 */
describe("N-9: a relative time stays on one line", () => {
  it("does not wrap the span that holds it", () => {
    expect(declarationsOf(".relativeTime")["white-space"]).toBe("nowrap");
  });
});

describe("F-09: no hand-built pill is left", () => {
  it("styles no span as a pill, because the group's state is the shared Badge", () => {
    expect(source).not.toMatch(/\.permissionHeading\s+span/u);
    expect(source).not.toMatch(/text-transform:\s*capitalize/u);
  });
});

describe("P2-02: the header runs at Settings' rhythm (scored review pass 2)", () => {
  /**
   * The lead kept the browser's 1em paragraph margin and the page gap was `--space-8`, so the notice
   * stood 52px under the lead where Settings has 28 (and 44px against about 24 at 390). The
   * mockups' `.page` gap is `--space-6` and `.page-head__text` is `--space-2` apart.
   */
  it("spaces the header, the notice and the groups --space-6 apart at every width", () => {
    expect(declarationsOf(".onboarding")["gap"]).toBe("var(--space-6)");
    // No narrower step re-sets it: one gap, so 768 and 390 cannot drift from 1440.
    expect(source.match(/\.onboarding\s*\{/gu)).toHaveLength(1);
  });

  it("puts the eyebrow, the title and the lead --space-2 apart in one text block", () => {
    const text = declarationsOf(".pageHeaderText");

    expect(text["display"]).toBe("grid");
    expect(text["gap"]).toBe("var(--space-2)");
  });

  it("takes the browser's margin off the lead, so a gap token is the only space", () => {
    expect(declarationsOf(".pageHeader p")["margin"]).toBe("0");
  });

  it("draws the header's text in that block", async () => {
    const screen = await readFile(
      join(resolve(import.meta.dirname), "permission-screen.tsx"),
      "utf8",
    );

    expect(screen).toMatch(
      /<header className=\{styles\.pageHeader\}>\s*<div className=\{styles\.pageHeaderText\}>/u,
    );
  });
});

describe("P3-06: a card's facts are the mockups' .facts (scored review pass 3)", () => {
  /**
   * The mockups' `.facts` (`design/mockups/campaign-detail.html:360-363`), which the campaign page and
   * step 3 follow: label and value both the secondary step, the label in body ink, the value in strong
   * ink at the medium weight, an 8rem label column, `--space-3` between rows, stacked only below 720px.
   * The list set a 12px faint label beside a 16px value, on a 7rem column, so their baselines were 5px
   * apart, and it stacked at 768.
   */
  it("sets the label and the value on one step, the secondary step, in one rule", () => {
    expect(declarationsOf(".permissionDetails div")["font-size"]).toBe(
      "var(--text-secondary-size)",
    );
    for (const selector of [".permissionDetails dt", ".permissionDetails dd"]) {
      expect(declarationsOf(selector), selector).not.toHaveProperty("font-size");
    }
  });

  it("draws the label in body ink and the value in strong ink at the medium weight", () => {
    expect(declarationsOf(".permissionDetails dt")["color"]).toBe("var(--tx-body)");
    expect(declarationsOf(".permissionDetails dd")["color"]).toBe("var(--tx-strong)");
    expect(declarationsOf(".permissionDetails dd")["font-weight"]).toBe("var(--weight-medium)");
  });

  it("puts the label on an 8rem column and the rows --space-3 apart", () => {
    expect(declarationsOf(".permissionDetails div")["grid-template-columns"]).toBe(
      "8rem minmax(0, 1fr)",
    );
    expect(declarationsOf(".permissionDetails")["gap"]).toBe("var(--space-3)");
    expect(declarationsOf(".permissionDetails div")["gap"]).toBe("var(--space-3)");
  });

  it("stacks the pair only below 720px, so 768 keeps the label beside its value", () => {
    const phone = /@media \(max-width: 719\.98px\) \{([\s\S]*?)\n\}/u.exec(source)?.[1] ?? "";
    const tablet = /@media \(max-width: 768px\) \{([\s\S]*?)\n\}/u.exec(source)?.[1] ?? "";

    expect(phone).toMatch(
      /\.permissionDetails div \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/u,
    );
    expect(tablet).not.toMatch(/permissionDetails/u);
  });

  it("names no raw size, and no faint ink, anywhere in the facts' rules", () => {
    const facts = source
      .split("\n")
      .filter((line) => /permissionDetails/u.test(line))
      .join("\n");
    expect(facts).not.toMatch(/--tx-faint|--text-caption-size/u);
  });
});

describe("P3-07: a group's heading and chip wrap, and the groups of a row share their rows (scored review pass 3)", () => {
  /**
   * The mockups' `.card-head`: title and chip in a wrapping row, `--space-4` apart, so the chip takes
   * the next line before the title takes a third (at 390, "Access this app confirms after you connect"
   * broke into three lines beside a 140px chip). And each group is two rows of the groups' grid, its head
   * and its cards, so a two-line heading moves the card beside it too (at 1440 the second row's cards
   * started at 683 and 661; at 1180 both rows stepped).
   */
  it("lets the heading row wrap, with the mockup's gap", () => {
    const heading = declarationsOf(".permissionHeading");

    expect(heading["display"]).toBe("flex");
    expect(heading["flex-wrap"]).toBe("wrap");
    expect(heading["gap"]).toBe("var(--space-4)");
  });

  it("keeps the chip its own width, so wrapping moves it and never squeezes it", () => {
    expect(declarationsOf(".permissionHeading > [data-permission-category]")["flex"]).toBe("none");
  });

  it("makes each group a subgrid of two rows of the groups' grid, its head and its cards", () => {
    const group = declarationsOf(".permissionGroups section");

    expect(group["grid-row"]).toBe("span 2");
    expect(group["grid-template-rows"]).toBe("subgrid");
  });

  it("keeps a group's own rows --space-3 apart, closer than the --space-8 between rows of groups", () => {
    expect(declarationsOf(".permissionGroups section")["gap"]).toBe("var(--space-3)");
    expect(declarationsOf(".permissionGroups")["gap"]).toBe("var(--space-8) var(--space-6)");
  });

  it("draws the head as one block in the screen, so a section has exactly the two rows it spans", async () => {
    const screen = await readFile(
      join(resolve(import.meta.dirname), "permission-screen.tsx"),
      "utf8",
    );

    expect(screen).toMatch(
      /<section[^>]*>[\s\S]*?<div className=\{styles\.permissionGroupHead\}>[\s\S]*?<div className=\{styles\.permissionHeading\}>[\s\S]*?<\/div>[\s\S]*?<Stack gap="3">/u,
    );
  });
});
