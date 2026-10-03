import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingState } from "./async-state.js";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { Surface } from "./structural.js";

/**
 * The PRD-009 scored baseline review (009G-AC-006, pass 1) found these primitives drawing off the
 * design direction and the mockups. jsdom and the node renderer have no layout, so each rule is
 * pinned in its stylesheet, with comments removed so a commented-out declaration never passes, and
 * the markup half is pinned where the markup is what carries the rule.
 */
function stylesheet(file: string): string {
  return readFileSync(new URL(file, import.meta.url), "utf8").replaceAll(/\/\*[\s\S]*?\*\//gu, "");
}

/** The declarations of the first rule whose whole selector list is exactly `selector`. */
function rule(css: string, selector: string): Readonly<Record<string, string>> {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
  const body = new RegExp(String.raw`(?:^|\})\s*${escaped}\s*\{([^}]*)\}`, "u").exec(css)?.[1];
  expect(body, `a rule for ${selector}`).toBeDefined();
  const declarations: Record<string, string> = {};
  for (const declaration of (body ?? "").split(";")) {
    const colon = declaration.indexOf(":");
    if (colon > 0) {
      declarations[declaration.slice(0, colon).trim()] = declaration.slice(colon + 1).trim();
    }
  }
  return declarations;
}

const buttonCss = stylesheet("./Button.module.css");
const iconCss = stylesheet("./Icon.module.css");
const fieldCss = stylesheet("./field.module.css");
const linkCss = stylesheet("./link.module.css");
const primitivesCss = stylesheet("./primitives.css");

describe("a glyph and its words read as one line in a Button (R3 F-03)", () => {
  it("lays the label out as a centred row at the button's gap", () => {
    expect(rule(buttonCss, ".label")).toMatchObject({
      display: "inline-flex",
      "align-items": "center",
      gap: "var(--space-2)",
    });
  });

  it("puts the glyph and the words inside that one label element", () => {
    const markup = renderToStaticMarkup(
      createElement(
        Button,
        null,
        createElement(Icon, { decorative: true, name: "plus", size: "sm" }),
        "Add Realtor partner",
      ),
    );

    expect(markup).toMatch(
      /<span class="[^"]+"><svg[^>]*>[\s\S]*<\/svg>Add Realtor partner<\/span>/u,
    );
  });
});

describe("a disabled control looks disabled (R1-14, R2 F-5; design section 2.3)", () => {
  const disabledLook = {
    background: "var(--st-neutral-bg)",
    "border-color": "var(--bd-hairline)",
    color: "var(--tx-body)",
    "box-shadow": "none",
  };

  it("draws a disabled Button of any variant on the neutral fill and the hairline edge", () => {
    expect(rule(buttonCss, ".button:disabled")).toMatchObject(disabledLook);
  });

  it("draws a disabled IconButton the same way", () => {
    expect(rule(iconCss, ".iconButton:disabled")).toMatchObject(disabledLook);
  });
});

describe("a field label is one step under its value (R1-09)", () => {
  it("sets the label at the secondary step, semibold", () => {
    expect(rule(fieldCss, ".label")).toMatchObject({
      "font-size": "var(--text-secondary-size)",
      "font-weight": "var(--weight-semibold)",
    });
  });
});

describe("a link inside a sentence (R2 F-4, R1-15; link.md)", () => {
  it("takes the sentence's size, weight, and leading", () => {
    expect(rule(linkCss, ".sentence")).toMatchObject({
      "font-size": "inherit",
      "font-weight": "inherit",
      "line-height": "inherit",
    });
  });

  it("keeps the 44px target and gives the line back through its block margins", () => {
    expect(rule(linkCss, ".sentence")).toMatchObject({
      display: "inline-flex",
      "min-block-size": "var(--target-min-size)",
      "min-inline-size": "var(--target-min-size)",
      "margin-block": "calc((1lh - var(--target-min-size)) / 2)",
      "white-space": "nowrap",
    });
  });
});

describe("card-step titles are semibold (R4-09; design section 2.3)", () => {
  it("weighs the metric, checklist, and state titles at the semibold token", () => {
    expect(
      rule(
        primitivesCss,
        ".oalo-metric__label,\n.oalo-checklist-item__heading h3,\n.oalo-checklist__heading h2,\n.oalo-async-state__title",
      )["font-weight"],
    ).toBe("var(--weight-semibold)");
  });
});

describe("an informational notice is a surface variant, not a fight with the card (R3 F-10)", () => {
  it("draws the info surface on the information tint", () => {
    expect(rule(primitivesCss, '.oalo-surface[data-variant="info"]')).toMatchObject({
      background: "var(--st-info-bg)",
      "border-radius": "var(--radius-control)",
      color: "var(--tx-strong)",
    });
  });

  it("renders the variant on the element the rule selects", () => {
    expect(renderToStaticMarkup(createElement(Surface, { variant: "info" }, "Note"))).toContain(
      'data-variant="info"',
    );
  });
});

describe("a state standing on the page is drawn on the card surface (R4-10)", () => {
  it("fills the card surface where a state asks for it", () => {
    expect(rule(primitivesCss, '.oalo-async-state[data-surface="card"]')).toMatchObject({
      background: "var(--sf-card)",
    });
  });

  it("defaults to the sunken well and passes the card surface through", () => {
    const well = renderToStaticMarkup(
      createElement(LoadingState, { description: "This takes a moment.", title: "Loading" }),
    );
    const onThePage = renderToStaticMarkup(
      createElement(LoadingState, {
        description: "This takes a moment.",
        surface: "card",
        title: "Loading",
      }),
    );

    expect(well).toContain('data-surface="sunken"');
    expect(onThePage).toContain('data-surface="card"');
    expect(onThePage).not.toMatch(/\ssurface=/u);
  });
});

describe("the glyphs added for the PRD-009 review (R1-04, R1-10, R3 F-02, R2 N-2, R1 P2-08)", () => {
  const added = [
    "tag",
    "chevron-left",
    "plug",
    "palette",
    "circle-check",
    "copy",
    "pencil",
    "rocket",
  ] as const;

  it("draws each one in the set's stroke language, decorative by default", () => {
    for (const name of added) {
      const markup = renderToStaticMarkup(createElement(Icon, { name }));
      expect(markup, name).toMatch(/<(?:path|circle)\b/u);
      expect(markup, name).toContain('stroke-width="1.5"');
      expect(markup, name).toContain('aria-hidden="true"');
    }
  });

  it("gives each one geometry of its own", () => {
    const drawn = added.map((name) =>
      renderToStaticMarkup(createElement(Icon, { name })).replace(/^<svg[^>]*>/u, ""),
    );
    expect(new Set(drawn).size).toBe(added.length);
  });
});
