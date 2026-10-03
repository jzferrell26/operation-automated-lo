import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../testing/css-rules.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, on Settings, Brand and
 * Realtor partners. jsdom has no layout, so these read the stylesheet, as
 * `workspace-type-steps.unit.test.ts` does; the pictures are the review's own.
 *
 * - F-04: Brand drew two navy panels, which direction section 2.3 rules out.
 * - F-07: Settings and Brand collapsed at 1180px, a breakpoint of the rail the top bar replaced.
 * - F-11: the page title, section titles and card titles take the brief's tokens.
 */

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "workspace.module.css"),
);

/**
 * The section-title rule's whole selector. The shared state view's own `h2` is left to the primitive
 * (pass 3, R3 P3-01), so the rule says which `h2` it is not for.
 */
const SECTION_TITLE = ".workspace h2:not(:global(.oalo-async-state__title))";

/** The text between the braces of the `@media` rule whose condition is exactly `condition`. */
function mediaBody(condition: string): string {
  const escaped = condition.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
  const body = new RegExp(String.raw`@media ${escaped} \{\n([\s\S]*?)\n\}`, "u").exec(source)?.[1];
  expect(body, `a media rule for ${condition}`).toBeDefined();
  return body ?? "";
}

describe("F-04: the previews are cards of the light look, not navy panels", () => {
  it("reads no navy panel token anywhere in the sheet", () => {
    expect(source).not.toMatch(/--product-(?:feature|on-nav|nav-muted|nav-border)/u);
  });

  it("gives the preview no fill, ink, radius or padding of its own, so the Card's own rule stands", () => {
    const preview = declarationsOf(".brandPreview");

    for (const property of ["background", "color", "border-radius", "padding"]) {
      expect(preview, `.brandPreview sets ${property}`).not.toHaveProperty(property);
    }
    expect(preview["display"]).toBe("grid");
  });

  it("has no `.feature` panel left to bring the navy back", () => {
    expect(source).not.toMatch(/\.feature\b/u);
  });

  it("draws the divider in the hairline, and the contact lines in body ink", () => {
    expect(declarationsOf(".rule")["background"]).toBe("var(--bd-hairline)");
    expect(
      declarationsOf(".brandPreview > span:not(.eyebrow),\n.brandPreview > small")["color"],
    ).toBe("var(--tx-body)");
  });
});

describe("F-07: nothing here changes at the 17rem rail's 1180px", () => {
  it("has no 1180px rule", () => {
    expect(source).not.toMatch(/max-width:\s*1180px/u);
  });

  it("is three cards wide until Home's own breakpoint, 1100px, and one column below it", () => {
    expect(declarationsOf(".cards")["grid-template-columns"]).toBe("repeat(3, minmax(0, 1fr))");

    const narrow = mediaBody("(max-width: 1099.98px)");
    expect(narrow).toMatch(/\.cards \{\s*grid-template-columns: minmax\(0, 1fr\);/u);
    expect(narrow).toMatch(/\.columns \{\s*grid-template-columns: minmax\(0, 1fr\);/u);
  });

  it("never draws two columns of cards, which would leave the third Settings card alone at 768", () => {
    expect(source).not.toMatch(/\.cards\s*\{[^}]*repeat\(2,/u);
    expect(source).not.toMatch(/auto-(?:fit|fill)[^;]*minmax\(\s*(?:1[0-9]|2[0-9])rem/u);
  });

  it("keeps the editor beside its preview from 1100px, as at 1440", () => {
    expect(declarationsOf(".columns")["grid-template-columns"]).toBe(
      "minmax(0, 1.5fr) minmax(260px, 1fr)",
    );
  });
});

describe("F-11: the page title, section titles and card titles are the brief's", () => {
  it("sets the page title at the brief's tracking, bold, and tight leading", () => {
    const title = declarationsOf(".workspace h1");

    expect(title["letter-spacing"]).toBe("var(--tracking-page)");
    expect(title["font-weight"]).toBe("var(--weight-bold)");
    expect(title["line-height"]).toBe("var(--leading-tight)");
  });

  it("sets section and card titles semibold with no tracking", () => {
    expect(declarationsOf(SECTION_TITLE)["font-weight"]).toBe("var(--weight-semibold)");
    expect(declarationsOf(".workspace h3")["font-weight"]).toBe("var(--weight-semibold)");
    expect(declarationsOf(SECTION_TITLE)).not.toHaveProperty("letter-spacing");
  });

  it("sets the page's text on the body leading token, not 1.6", () => {
    expect(declarationsOf(".workspace")["line-height"]).toBe("var(--leading-normal)");
  });
});

describe("SELF-FOUND: a form card's title and lead are --space-2 apart (scored review pass 2 walk)", () => {
  it("makes the title and lead of each Brand form card a grid with the page header's gap", () => {
    const head = declarationsOf(".cardHead");

    expect(head["display"]).toBe("grid");
    expect(head["gap"]).toBe("var(--space-2)");
    expect(declarationsOf(".header > div,\n.sectionHead > div")["gap"]).toBe("var(--space-2)");
  });
});

describe("P2-06: the add button stands on the search field's edge (scored review pass 2)", () => {
  /**
   * "Add Realtor partner" was centred on the label and the box together, so it sat 14px above the
   * search box it belongs to (rows 232 to 275 against 246 to 289 at 1440). The mockups' field and
   * button rows align the button to the field's end (`launch-step-2-set-up.html:504` and `:261`).
   */
  it("aligns the toolbar's items to the end, after the shared flex rule that centres them", () => {
    expect(declarationsOf(".toolbar")["align-items"]).toBe("end");

    // `.toolbar` is also in the shared header rule, which centres. Equal weight, so the later one
    // wins: the end rule must come after it in the file.
    const shared = source.indexOf(".header,\n.toolbar,");
    const own = source.search(/\n\.toolbar\s*\{/u);
    expect(shared).toBeGreaterThanOrEqual(0);
    expect(own).toBeGreaterThan(shared);
  });

  it("still stretches the row below 760px, where it stacks", () => {
    expect(mediaBody("(max-width: 760px)")).toMatch(/\.toolbar \{\s*align-items: stretch;/u);
  });
});

describe("P3-01: the shared state view keeps its own title step (scored review pass 3)", () => {
  /**
   * `EmptyState` is a `section` holding an `h2` that the primitive sets at the card step, one state
   * view for every screen. A page sheet's `.workspace h2` (0,1,1) outranks the primitive's single
   * class (0,1,0), so Realtor partners drew "Add your first Realtor partner" at 19px beside
   * Campaigns' 16px. No stylesheet here can compute the cascade, so the rule is pinned by what it must
   * say: every sheet rule that sets a size on an `h2` excludes the state view's title.
   */
  const h2Rules = [...source.matchAll(/(?:^|\})\s*([^{}]*\bh2\b[^{}]*)\{([^}]*)\}/gu)].filter(
    (match) => /font-size/u.test(match[2] ?? ""),
  );

  it("finds the rule that sets the section step on an h2, so an empty scan cannot pass", () => {
    expect(h2Rules.length).toBeGreaterThan(0);
  });

  it("excludes the state view's title from every h2 rule that sets a size", () => {
    for (const match of h2Rules) {
      expect(match[1], "an h2 rule that sets a size").toContain(
        ":not(:global(.oalo-async-state__title))",
      );
    }
  });

  it("is the heading that class sits on in the primitive, so the exclusion reaches the state view's title", async () => {
    // The primitive's source, not an import of it: this file reads stylesheets and stays light.
    const { readFile } = await import("node:fs/promises");
    const primitive = await readFile(
      join(
        resolve(import.meta.dirname),
        "../../../../../packages/ui/src/components/async-state.tsx",
      ),
      "utf8",
    );

    expect(primitive).toMatch(/<h2 className="oalo-async-state__title"/u);
  });
});

describe("P3-03: the page note is the information notice, not a sunken well (scored review pass 3)", () => {
  it("sets only the row and the secondary step, because the Surface variant owns the tint, radius, padding and ink", () => {
    const note = declarationsOf(".pageNote");

    expect(note["display"]).toBe("flex");
    expect(note["gap"]).toBe("var(--space-3)");
    expect(note["font-size"]).toBe("var(--text-secondary-size)");
    for (const property of ["background", "border", "border-radius", "padding", "color"]) {
      expect(note, `${property} comes from the Surface variant`).not.toHaveProperty(property);
    }
  });

  it("takes the notice's strong ink for its sentence, over the page's body-ink paragraphs", () => {
    expect(declarationsOf(".workspace .pageNote p")["color"]).toBe("inherit");
  });

  it("sets the glyph on the first line's middle, by the line and a step, not by a raw length", () => {
    expect(declarationsOf(".pageNote > svg")["margin-block-start"]).toBe(
      "calc((1lh - var(--space-4)) / 2)",
    );
  });

  it("keeps no sunken note rule that could bring the well back", () => {
    expect(source).not.toMatch(/(?:^|\n)\.note\s*\{/u);
  });
});

describe("P3-04: a disabled save's reason is a plain line under the buttons (scored review pass 3)", () => {
  it("puts the buttons and the reason in one grid, --space-2 apart, as the campaign page's header does", () => {
    const block = declarationsOf(".formActions");

    expect(block["display"]).toBe("grid");
    expect(block["gap"]).toBe("var(--space-2)");
  });

  it("draws the reason at the secondary step with no box of its own", () => {
    const reason = declarationsOf(".reason");

    expect(reason["font-size"]).toBe("var(--text-secondary-size)");
    for (const property of ["background", "border", "padding", "border-radius"]) {
      expect(reason, `the reason sets ${property}`).not.toHaveProperty(property);
    }
  });
});

describe("P3-08: on a phone the page's actions span the column (scored review pass 3)", () => {
  const phone = (): string => mediaBody("(max-width: 760px)");

  it("makes the header's action and the toolbar's button the column's width", () => {
    expect(phone()).toMatch(
      /\.header \.headerAction,\s*\.toolbar \.toolbarAction \{\s*inline-size: 100%;/u,
    );
  });

  it("stacks a page-level row of actions and stretches them, where align-items on a wrapping row stretched only height", () => {
    const row = /\.actions\.pageActions \{([^}]*)\}/u.exec(phone())?.[1] ?? "";

    expect(row).toMatch(/flex-direction:\s*column;/u);
    expect(row).toMatch(/flex-wrap:\s*nowrap;/u);
    expect(row).toMatch(/align-items:\s*stretch;/u);
  });

  it("leaves a card's own actions at their width, as the mockups' card actions are", () => {
    // Only the page-level row (`.actions.pageActions`) is stacked; a bare `.actions` rule would reach
    // Settings' card links and a partner card's Edit and Remove too.
    expect(phone()).not.toMatch(/(?:^|[\s,])\.actions\s*[{,]/u);
  });
});
