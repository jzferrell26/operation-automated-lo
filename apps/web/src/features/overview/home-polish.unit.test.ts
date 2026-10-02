import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 Wave 3 polish: what an independent verifier measured on Home against
 * `design/mockups/home-first-run.html` and its previews, at 1440, 1180, 768 and 390 in Light and
 * Dark, held as rules so none of them can come back unnoticed.
 *
 * 1. The "Get set up" intro sat 4px above the first item where the mockup has 20px. The element
 *    reset (`.card p`, `.card ul`, specificity 0,1,1) outranked the card rhythm (`.card > * + *`,
 *    0,1,0), so every paragraph and list that is a direct child of a card lost its top margin.
 * 2. The lead ran 604px wide against 518px in the previews, which were drawn in Segoe UI.
 * 3. The item glyphs were 20px against the mockup's 24px, and the state chips drew 12px words
 *    against the mockup's 14px.
 * 4. With no approval card (a person who cannot approve, 009B D3) "Running now" filled the whole
 *    column, because `repeat(auto-fit, ...)` drops an empty track.
 *
 * jsdom has no layout, so these read the stylesheet. The measurements themselves are in
 * `tests/browser/home-first-run-geometry.spec.ts` (needs a browser run).
 */

type Block = Readonly<{
  selector: string;
  media: string | undefined;
  declarations: Readonly<Record<string, string>>;
}>;

const source = (
  await readFile(join(resolve(import.meta.dirname), "components", "overview.module.css"), "utf8")
).replaceAll(/\/\*[\s\S]*?\*\//gu, "");

/** Every rule in the sheet, with the at-rule it sits in, if any. Braces are the only structure used. */
function readBlocks(css: string, media?: string): readonly Block[] {
  const blocks: Block[] = [];
  let depth = 0;
  let preludeStart = 0;
  let prelude = "";
  let bodyStart = 0;
  for (let at = 0; at < css.length; at += 1) {
    if (css[at] === "{") {
      if (depth === 0) {
        prelude = css.slice(preludeStart, at).trim();
        bodyStart = at + 1;
      }
      depth += 1;
    } else if (css[at] === "}") {
      depth -= 1;
      if (depth === 0) {
        const body = css.slice(bodyStart, at);
        if (prelude.startsWith("@")) blocks.push(...readBlocks(body, prelude));
        else blocks.push({ selector: prelude, media, declarations: readDeclarations(body) });
        preludeStart = at + 1;
      }
    }
  }
  return blocks;
}

function readDeclarations(body: string): Readonly<Record<string, string>> {
  const declarations: Record<string, string> = {};
  for (const part of body.split(";")) {
    const colon = part.indexOf(":");
    if (colon > 0) declarations[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
  }
  return declarations;
}

const blocks = readBlocks(source);

function rule(selector: string, media?: string): Readonly<Record<string, string>> {
  const found = blocks.find((block) => block.selector === selector && block.media === media);
  if (found === undefined) throw new Error(`No rule for ${selector}${media ? ` in ${media}` : ""}`);
  return found.declarations;
}

/** The pixels in a `rem` length, at the 16px body step every Home measure is written against. */
function pixels(length: string | undefined): number {
  const match = /^(\d+(?:\.\d+)?)rem$/u.exec(length ?? "");
  if (match === null) throw new Error(`Not a rem length: ${String(length)}`);
  return Number(match[1]) * 16;
}

describe("the checklist intro sits 20px above the first item (verifier: 4px against 20px)", () => {
  it("gives a card's direct children one --space-4 between them", () => {
    expect(rule(".card > * + *")["margin-block-start"]).toBe("var(--space-4)");
  });

  it("adds the first row's --space-1, which makes 16px plus 4px", () => {
    const firstRow = rule(".checklist > li:first-child");

    expect(firstRow["padding-block-start"]).toBe("var(--space-1)");
    expect(firstRow["border-block-start"]).toBe("0");
  });

  it("takes the browser's default margins off with a rule that cannot outrank the rhythm", () => {
    const outranking = blocks
      .filter((block) => "margin" in block.declarations)
      .map((block) => block.selector)
      .filter((selector) => /\.\w+ (?:h[1-6]|p|ul|ol)\b/u.test(selector))
      .filter((selector) => !selector.startsWith(":where("));

    expect(outranking, "an element selector under a class beats `.card > * + *`").toEqual([]);
    expect(rule(":where(.card, .start) :where(h1, h2, h3, p, ul, ol)")["margin"]).toBe("0");
  });
});

describe("the lead has the previews' measure (verifier: 604px against 518px)", () => {
  it("is 518px, written in rem so the face that draws it does not change it", () => {
    const measure = rule(".lead")["max-inline-size"];

    expect(pixels(measure)).toBe(518);
    expect(measure).not.toMatch(/ch$/u);
  });
});

describe("the two lists are two equal columns, with or without an approval card (verifier)", () => {
  it("is a fixed pair of equal tracks, not auto-fit, which would drop the empty one", () => {
    expect(rule(".lists")["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
    expect(source).not.toMatch(/auto-(?:fit|fill)/u);
  });

  it("stacks to one column below 720px, where the mockup does", () => {
    expect(rule(".lists", "@media (max-width: 719.98px)")["grid-template-columns"]).toBe(
      "minmax(0, 1fr)",
    );
  });
});

describe("the state chip reads at the secondary step (verifier: larger text in the mockup)", () => {
  it("sets 14px words and the mockup's padding on every Home chip", () => {
    const chip = rule(".card .stateChip");

    expect(chip["font-size"]).toBe("var(--text-secondary-size)");
    expect(chip["padding-inline"]).toBe("var(--space-2) var(--space-3)");
    expect(pixels(chip["padding-block"])).toBe(2);
  });
});

describe("the title and the primary button stay on the project's type steps", () => {
  it("keeps the 28px page title and the 16px button, where the mockup draws 34px and 17px", () => {
    expect(rule(".startTitle")["font-size"]).toBe("var(--text-page-size)");
    expect(rule(".start .primaryLink")["font-size"]).toBe("var(--text-body-size)");
  });
});
