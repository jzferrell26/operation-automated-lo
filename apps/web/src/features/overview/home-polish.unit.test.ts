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
 * 5. The topic question drew at the 16px body step where the mockup has the 14px secondary step,
 *    and sat 12px above its chips where the mockup has 20px.
 * 6. At 768 the two lists stayed in two columns (they stacked only below 720), so for an approver
 *    "Needs your approval" sat beside "Running now". 009B-AC-003 says the cards stack in order at
 *    768 and 390, and a criterion outranks the mockup, so the lists are two columns from 1100px,
 *    the page's own breakpoint (the Wave 3 verification, defect D-2).
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

describe("the two lists are two equal columns from 1100px, with or without an approval card (verifier, D-2)", () => {
  const WIDE = "@media (min-width: 1100px)";

  it("is a fixed pair of equal tracks from 1100px, not auto-fit, which would drop the empty one", () => {
    expect(rule(".lists", WIDE)["grid-template-columns"]).toBe("repeat(2, minmax(0, 1fr))");
    expect(source).not.toMatch(/auto-(?:fit|fill)/u);
  });

  it("is one column below 1100px, so the approval card stacks under Running now at 768 and 390 (009B-AC-003)", () => {
    expect(rule(".lists")["grid-template-columns"]).toBe("minmax(0, 1fr)");
    // The wide rule is the only place the pair is switched on: no narrower breakpoint brings it back.
    const placed = blocks
      .filter(
        (block) => block.selector === ".lists" && "grid-template-columns" in block.declarations,
      )
      .map((block) => block.media);
    expect(placed).toEqual([undefined, WIDE]);
  });

  it("writes the one-column rule first, because both rules weigh the same and the later one wins", () => {
    const order = blocks.filter((block) => block.selector === ".lists").map((block) => block.media);
    expect(order).toEqual([undefined, WIDE]);
  });

  it("uses the breakpoint of the page's own two columns, and no narrower step for the lists", () => {
    expect(rule(".grid", WIDE)["grid-template-columns"]).toBe("minmax(0, 1.55fr) minmax(0, 1fr)");
    const narrow = blocks.filter(
      (block) => block.selector === ".lists" && block.media?.includes("max-width") === true,
    );
    expect(narrow).toEqual([]);
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

/** One declaration's value with its line breaks and runs of spaces folded to single spaces. */
function flat(value: string | undefined): string {
  return (value ?? "").replaceAll(/\s+/gu, " ").trim();
}

describe("the checklist action never squeezes the text (scored review F-01 and R4-01, High)", () => {
  /**
   * "See what's needed" is about 171px, so beside the text it left the sentence 167px wide at 1440,
   * 140px at 1180 and 90px at 390: "Not connected yet" broke into a two-line pill (three at 390) and
   * ran past its edge. The card is two columns wide at 1440 and 1180, as narrow as the one on a
   * phone, so the card's own width decides where the action moves, not the window's.
   */
  const NARROW = "@container setup (max-inline-size: 32rem)";

  it("keeps a state chip on one line, as the mockup's badge does", () => {
    expect(rule(".card .stateChip")["white-space"]).toBe("nowrap");
  });

  it("draws a row as glyph, text and action in three tracks while the card has room", () => {
    const row = rule(".checklist > li");

    expect(row["grid-template-columns"]).toBe("auto minmax(0, 1fr) auto");
    expect(flat(row["grid-template-areas"])).toBe('"icon text action"');
    expect(rule(".itemIcon")["grid-area"]).toBe("icon");
    expect(rule(".itemText")["grid-area"]).toBe("text");
    expect(rule(".itemAction")["grid-area"]).toBe("action");
  });

  it("moves the action under the text once the card is narrower than 32rem", () => {
    const row = rule(".checklist > li", NARROW);

    expect(row["grid-template-columns"]).toBe("auto minmax(0, 1fr)");
    expect(flat(row["grid-template-areas"])).toBe('"icon text" ". action"');
    expect(rule(".itemAction", NARROW)["justify-self"]).toBe("start");
  });

  it("measures the card, not the window, so the two-column card at 1440 and 1180 stacks too", () => {
    const card = rule(".setup");

    expect(card["container-type"]).toBe("inline-size");
    expect(card["container-name"]).toBe("setup");
    // A window query could not tell the 413px card at 1440 from the 656px card at 768.
    const byWindow = blocks.filter(
      (block) =>
        block.media?.startsWith("@media") === true &&
        /\.(?:checklist|itemAction|itemText)\b/u.test(block.selector),
    );
    expect(byWindow).toEqual([]);
  });

  it("puts the text in a track of its own, so a long sentence cannot widen the row", () => {
    expect(rule(".itemText")["min-inline-size"]).toBe("0");
  });
});

describe("the topic question is the secondary step, 20px above its chips (coordinator, mockup)", () => {
  it("is 14px semibold, a step the brief allows, where it was the 16px body step", () => {
    const question = rule(".question");

    expect(question["font-size"]).toBe("var(--text-secondary-size)");
    expect(question["font-weight"]).toBe("var(--weight-semibold)");
  });

  it("sits --space-5 above the chips, the gap the mockup puts between its start card's children", () => {
    expect(rule(".topics")["gap"]).toBe("var(--space-5)");
  });
});

describe("the title and the primary button stay on the project's type steps", () => {
  it("keeps the 28px page title and the 16px button, where the mockup draws 34px and 17px", () => {
    expect(rule(".startTitle")["font-size"]).toBe("var(--text-page-size)");
    expect(rule(".start .primaryLink")["font-size"]).toBe("var(--text-body-size)");
  });
});
