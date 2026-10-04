import { expect } from "vitest";

/**
 * Two small readers for the stylesheet tests of the Campaigns pages, which `readCssRules` does not
 * cover because it reads a rule at the top of a stylesheet and not one inside an `@media` block.
 * The source they read has its comments stripped already (`readCssRules(...).source`).
 */

/** The body of the first `@media` block whose query is `query`, its braces matched. */
export function mediaBody(source: string, query: string): string {
  const start = source.indexOf(`@media ${query} {`);
  expect(start, `an @media ${query} block`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  const open = source.indexOf("{", start);
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(open + 1, index);
  }
  throw new Error(`@media ${query} is not closed.`);
}

/** The declarations of the rule for `selector` inside `body`, by property. */
export function declarationsIn(body: string, selector: string): Readonly<Record<string, string>> {
  const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\:>]/gu, String.raw`\$&`);
  const block = new RegExp(`(?:^|[{}])\\s*${escaped}\\s*\\{([^}]*)\\}`, "u").exec(body)?.[1];
  expect(block, `a rule for ${selector}`).toBeDefined();
  return Object.fromEntries(
    (block ?? "")
      .split(";")
      .map((declaration) => declaration.split(":"))
      .filter((pair): pair is [string, string] => pair.length === 2)
      .map(([property, value]) => [property.trim(), value.trim()]),
  );
}
