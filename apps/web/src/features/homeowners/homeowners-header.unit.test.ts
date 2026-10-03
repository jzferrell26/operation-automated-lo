import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { readCssRules } from "../../testing/css-rules.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), pass 3, part R3: P3-01 and P3-02 on
 * the Homeowner reports page, which draws its header through the dashboard preview's `PageHeader` and
 * is restyled by 009a. jsdom has no layout, so these read the stylesheets; the pictures are the
 * review's own.
 *
 * - P3-01: the shared `EmptyState`'s title is the card step (16px). This sheet's `.workspace h2` rule
 *   (0,1,1) outranked the primitive's single class, so "Connect the report workspace" drew at 19px.
 * - P3-02: the page header sat off every sibling's rhythm, with a raw `-0.035em` title tracking, a
 *   raw `1.6` page leading and a raw `1.25` title leading. The page's steps come from the tokens.
 */

const { source, declarationsOf } = await readCssRules(
  join(resolve(import.meta.dirname), "homeowners.module.css"),
);
const preview = await readCssRules(
  join(resolve(import.meta.dirname), "..", "dashboard-preview", "workspace.module.css"),
);

describe("P3-01: the shared state view keeps its own title step", () => {
  it("excludes the state view's title from the section-title rule", () => {
    const rules = [...source.matchAll(/(?:^|\})\s*(\.workspace h2[^{}]*)\{([^}]*)\}/gu)].filter(
      (match) => /font-size/u.test(match[2] ?? ""),
    );

    expect(rules.length).toBeGreaterThan(0);
    for (const match of rules) {
      expect(match[1]).toContain(":not(:global(.oalo-async-state__title))");
    }
  });
});

describe("P3-02: the page and its titles take the brief's tokens", () => {
  it("sets the page's text on the body leading token, not 1.6", () => {
    expect(declarationsOf(".workspace")["line-height"]).toBe("var(--leading-normal)");
  });

  it("sets the page title at the brief's tracking, bold, and tight leading", () => {
    const title = declarationsOf(".workspace h1");

    expect(title["letter-spacing"]).toBe("var(--tracking-page)");
    expect(title["font-weight"]).toBe("var(--weight-bold)");
    expect(title["line-height"]).toBe("var(--leading-tight)");
    expect(title["font-size"]).toBe("var(--text-page-size)");
  });

  it("sets the section title with no tracking, on the tight leading token", () => {
    const section = declarationsOf(".workspace h2:not(:global(.oalo-async-state__title))");

    expect(section["line-height"]).toBe("var(--leading-tight)");
    expect(section["font-size"]).toBe("var(--text-section-size)");
    expect(section).not.toHaveProperty("letter-spacing");
  });

  it("names no raw tracking or leading on the page or its titles", () => {
    for (const selector of [
      ".workspace",
      ".workspace h1",
      ".workspace h2:not(:global(.oalo-async-state__title))",
    ]) {
      const block = declarationsOf(selector);

      for (const property of ["letter-spacing", "line-height"]) {
        const value = block[property];
        if (value !== undefined) expect(value, `${selector} ${property}`).toMatch(/^var\(--/u);
      }
    }
  });

  it("draws the header through the page grid's --space-6 alone: the preview's header has no block padding", () => {
    expect(declarationsOf(".workspace")["gap"]).toBe("var(--space-6)");

    const header = preview.declarationsOf(".header");
    expect(header).not.toHaveProperty("padding");
    expect(header).not.toHaveProperty("padding-block");
    expect(header).not.toHaveProperty("margin-block");
  });

  it("keeps the title and the lead --space-2 apart", () => {
    expect(preview.declarationsOf(".header > div:first-child")["gap"]).toBe("var(--space-2)");
  });
});
