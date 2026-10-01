import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The global stylesheet's element defaults, held to the rulings that set them.
 *
 * `library/knowledge/private/ux-ui/06-review-rubric.md` section 5, "The rulings of 2026-10-01":
 * D-009 puts the body step on `body` and each heading level's step on its element, never on the
 * root; D-010 deletes the bootstrap `section { max-width: 44rem }` and asks for a guard so a
 * scaffold measure on an element selector cannot return. Brief section 10 puts timestamps in the
 * data font, and the `time` element is how every screen marks one.
 *
 * The browser suite measures the rendered result on every photographed screen
 * (`expectTypographyOnBrief` in `tests/browser/helpers/design-quality.ts`). This reads the source,
 * so the rule fails in `pnpm test:unit` on any machine, before anything is built.
 */

type Rule = Readonly<{ selectors: readonly string[]; declarations: ReadonlyMap<string, string> }>;

function parseRules(css: string): readonly Rule[] {
  const source = css.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
  const found: Rule[] = [];
  let index = 0;
  const readBlock = (start: number): { body: string; end: number } => {
    let depth = 1;
    let cursor = start;
    while (cursor < source.length && depth > 0) {
      if (source[cursor] === "{") depth += 1;
      if (source[cursor] === "}") depth -= 1;
      cursor += 1;
    }
    return { body: source.slice(start, cursor - 1), end: cursor };
  };
  while (index < source.length) {
    const open = source.indexOf("{", index);
    if (open === -1) break;
    const prelude = source.slice(index, open).trim();
    const { body, end } = readBlock(open + 1);
    if (prelude.startsWith("@")) {
      found.push(...parseRules(body));
    } else if (prelude !== "") {
      const declarations = new Map<string, string>();
      for (const declaration of body.split(";")) {
        const colon = declaration.indexOf(":");
        if (colon === -1) continue;
        declarations.set(
          declaration.slice(0, colon).trim().toLowerCase(),
          declaration.slice(colon + 1).trim(),
        );
      }
      found.push({
        selectors: prelude.split(",").map((selector) => selector.trim()),
        declarations,
      });
    }
    index = end;
  }
  return found;
}

/** A selector with a type selector anywhere in it: `section`, `main section`, `html[data-x]`. */
function hasTypeSelector(selector: string): boolean {
  return /(?:^|[\s>+~(])(?:\*|[a-z][a-z0-9-]*)(?=$|[\s.#:[>+~),])/iu.test(selector);
}

const globals = parseRules(readFileSync(resolve("apps/web/src/app/globals.css"), "utf8"));

function declarationsFor(selector: string): ReadonlyMap<string, string> {
  const merged = new Map<string, string>();
  for (const rule of globals) {
    if (!rule.selectors.includes(selector)) continue;
    for (const [property, value] of rule.declarations) merged.set(property, value);
  }
  return merged;
}

describe("the global stylesheet's element defaults", () => {
  it("sets no max-width or max-inline-size on an element selector (rubric D-010)", () => {
    const measured = globals.flatMap((rule) =>
      [...rule.declarations.keys()]
        .filter((property) => property === "max-width" || property === "max-inline-size")
        .flatMap((property) =>
          rule.selectors.filter(hasTypeSelector).map((selector) => `${selector} { ${property} }`),
        ),
    );

    expect(measured).toEqual([]);
  });

  it("puts the body step on body and never sizes the root (rubric D-009, rule 1)", () => {
    expect(declarationsFor("body").get("font-size")).toBe("var(--text-body-size)");

    const rootSized = globals.flatMap((rule) =>
      rule.selectors
        .filter((selector) => /^(?::root|html)(?:$|[[:.\s])/u.test(selector))
        .filter(() => rule.declarations.has("font-size") || rule.declarations.has("font")),
    );
    expect(rootSized, "a size on :root or html would shrink every rem step").toEqual([]);
  });

  it("gives every heading level its type step (rubric D-009)", () => {
    expect(declarationsFor("h1").get("font-size")).toBe("var(--text-page-size)");
    expect(declarationsFor("h2").get("font-size")).toBe("var(--text-section-size)");
    for (const level of ["h3", "h4", "h5", "h6"]) {
      expect(declarationsFor(level).get("font-size"), level).toBe("var(--text-card-size)");
    }
  });

  it("gives small the caption step instead of the browser's relative size", () => {
    expect(declarationsFor("small").get("font-size")).toBe("var(--text-caption-size)");
  });

  it("draws every timestamp in the data font (design brief section 10)", () => {
    expect(declarationsFor("time").get("font-family")).toBe("var(--font-data)");
  });
});
