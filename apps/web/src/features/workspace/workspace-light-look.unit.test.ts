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
    expect(declarationsOf(".workspace h2")["font-weight"]).toBe("var(--weight-semibold)");
    expect(declarationsOf(".workspace h3")["font-weight"]).toBe("var(--weight-semibold)");
    expect(declarationsOf(".workspace h2")).not.toHaveProperty("letter-spacing");
  });

  it("sets the page's text on the body leading token, not 1.6", () => {
    expect(declarationsOf(".workspace")["line-height"]).toBe("var(--leading-normal)");
  });
});
