import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoadingState } from "./async-state.js";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { Link } from "./Link.js";
import { Select } from "./Select.js";
import { Card, Surface } from "./structural.js";

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

/** The inside of the first `@media` block whose query is exactly `query`, braces balanced. */
function mediaBlock(css: string, query: string): string {
  const opening = `@media ${query} {`;
  const start = css.indexOf(opening);
  expect(start, `a ${opening} block`).toBeGreaterThanOrEqual(0);
  let depth = 1;
  let cursor = start + opening.length;
  while (cursor < css.length && depth > 0) {
    if (css[cursor] === "{") depth += 1;
    if (css[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  return css.slice(start + opening.length, cursor - 1);
}

const buttonCss = stylesheet("./Button.module.css");
const iconCss = stylesheet("./Icon.module.css");
const fieldCss = stylesheet("./field.module.css");
const linkCss = stylesheet("./link.module.css");
const primitivesCss = stylesheet("./primitives.css");
const selectCss = stylesheet("./Select.module.css");
const themeCss = stylesheet("./ThemeSegmentedControl.module.css");

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

describe("a disabled Select is drawn as a disabled field (pass 2, R3 P2-04)", () => {
  it("takes the field's disabled look: sunken fill, body text, hairline boundary", () => {
    expect(rule(selectCss, ".trigger:disabled")).toMatchObject({
      background: "var(--sf-sunken)",
      "border-color": "var(--bd-hairline)",
      color: "var(--tx-body)",
      cursor: "not-allowed",
    });
  });

  it("is the same look a disabled text field draws", () => {
    const field = rule(fieldCss, ".control:disabled");
    const trigger = rule(selectCss, ".trigger:disabled");

    for (const property of ["background", "border-color", "color", "cursor"]) {
      expect(trigger[property], property).toBe(field[property]);
    }
  });

  it("draws the field's control box, so a Select is the same 44px beside a text field", () => {
    const field = rule(fieldCss, ".control");
    const trigger = rule(selectCss, ".trigger");

    for (const property of [
      "min-block-size",
      "padding-block",
      "padding-inline",
      "font-size",
      "font-weight",
      "line-height",
      "border-radius",
    ]) {
      expect(trigger[property], property).toBe(field[property]);
    }
  });

  it("starts from the enabled edge, so the disabled edge is a change and not a default", () => {
    expect(rule(selectCss, ".trigger")["border"]).toBe("1px solid var(--bd-input)");
  });

  it("renders the trigger disabled with a Select's own markup", () => {
    const markup = renderToStaticMarkup(
      createElement(Select, {
        disabled: true,
        label: "Brand color",
        onValueChange: () => undefined,
        options: ["Blue"],
        value: "Blue",
      }),
    );

    expect(markup).toMatch(/<button[^>]*role="combobox"[^>]*disabled=""/u);
  });
});

describe("the compact Button is the secondary step at the shared weight (pass 2, R4-12)", () => {
  it("sets the sm size at the secondary step, like the mockups' .btn--sm", () => {
    expect(rule(buttonCss, ".sm")["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("leaves the weight to the shared button, 500, in every size", () => {
    expect(rule(buttonCss, ".button")["font-weight"]).toBe("var(--weight-medium)");
    for (const size of [".sm", ".md", ".lg"]) {
      expect(rule(buttonCss, size), size).not.toHaveProperty("font-weight");
    }
  });

  it("keeps md at the body step and lg at the card step", () => {
    expect(rule(buttonCss, ".button")["font-size"]).toBe("var(--text-body-size)");
    expect(rule(buttonCss, ".md")).not.toHaveProperty("font-size");
    expect(rule(buttonCss, ".lg")["font-size"]).toBe("var(--text-card-size)");
  });
});

describe("a compact action link is the small button's twin (pass 2, R4-12; coordinator, lane H)", () => {
  const small = rule(linkCss, '.action[data-size="sm"]');

  it("takes the secondary step and --space-3 of inline padding, as the sm Button", () => {
    expect(small).toMatchObject({
      "font-size": "var(--text-secondary-size)",
      "padding-inline": "var(--space-3)",
    });
    expect(small["font-size"]).toBe(rule(buttonCss, ".sm")["font-size"]);
    expect(small["padding-inline"]).toBe(rule(buttonCss, ".sm")["padding-inline"]);
  });

  it("sets no weight and no height, so it keeps the link's 500 and the 44px target", () => {
    expect(small).not.toHaveProperty("font-weight");
    expect(small).not.toHaveProperty("min-block-size");
    expect(rule(linkCss, ".link")["font-weight"]).toBe("var(--weight-medium)");
    expect(rule(linkCss, ".action")["min-block-size"]).toBe("var(--target-min-size)");
  });

  it("is carried by data-size on the anchor, md by default", () => {
    const compact = renderToStaticMarkup(
      createElement(Link, { href: "/x", size: "sm", variant: "action" }, "Connect"),
    );
    const normal = renderToStaticMarkup(
      createElement(Link, { href: "/x", variant: "action" }, "Connect"),
    );

    expect(compact).toContain('data-size="sm"');
    expect(normal).toContain('data-size="md"');
  });
});

describe("a compact plain link is the secondary step and nothing else (pass 3, R4-14 and R3 P3-09)", () => {
  const small = rule(linkCss, '.inline[data-size="sm"]');

  it("takes the secondary step as a token", () => {
    expect(small["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("sets nothing else, so it keeps the link's 500, its underline, and the inline rule's 44px target", () => {
    expect(Object.keys(small)).toEqual(["font-size"]);
    expect(rule(linkCss, ".link")["font-weight"]).toBe("var(--weight-medium)");
    expect(rule(linkCss, ".inline")).toMatchObject({
      "min-block-size": "var(--target-min-size)",
      "min-inline-size": "var(--target-min-size)",
    });
  });

  it("is carried by data-size and class on a plain link, md by default", () => {
    const compact = renderToStaticMarkup(createElement(Link, { href: "/x", size: "sm" }, "Launch"));
    const normal = renderToStaticMarkup(createElement(Link, { href: "/x" }, "Launch"));

    expect(compact).toContain('data-size="sm"');
    expect(compact).toContain('data-variant="inline"');
    expect(normal).toContain('data-size="md"');
  });
});

describe("the theme segments are the secondary step, as the mockups' format switch (pass 2, self-found)", () => {
  it("sets each segment at the secondary step and the medium weight", () => {
    expect(rule(themeCss, ".segment")).toMatchObject({
      "font-size": "var(--text-secondary-size)",
      "font-weight": "var(--weight-medium)",
    });
  });
});

describe("a large card insets 24px, and 20px on a phone (pass 2, R1 P2-06b, R2 N-1)", () => {
  const phone = mediaBlock(primitivesCss, "(max-width: 719.98px)");

  it("insets the large step at --space-6 above the phone edge", () => {
    expect(rule(primitivesCss, '.oalo-surface[data-padding="lg"]')["padding"]).toBe(
      "var(--space-6)",
    );
  });

  it("steps it down to --space-5 below the shell's 720px phone edge", () => {
    expect(rule(phone, '.oalo-surface[data-padding="lg"]')["padding"]).toBe("var(--space-5)");
  });

  it("moves no other step on a phone", () => {
    expect(phone).not.toContain('data-padding="sm"');
    expect(phone).not.toContain('data-padding="md"');
    expect(rule(primitivesCss, '.oalo-surface[data-padding="md"]')["padding"]).toBe(
      "var(--space-4)",
    );
  });

  it("is carried by the attribute a Card and a Surface both render", () => {
    expect(renderToStaticMarkup(createElement(Card, { padding: "lg" }, "x"))).toContain(
      'data-padding="lg"',
    );
    expect(renderToStaticMarkup(createElement(Surface, { padding: "lg" }, "x"))).toContain(
      'data-padding="lg"',
    );
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
    "chevron-right",
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
