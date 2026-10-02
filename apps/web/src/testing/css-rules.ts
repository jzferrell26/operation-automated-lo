import { readFile } from "node:fs/promises";

import { expect } from "vitest";

/**
 * A stylesheet read for unit tests that pin a design rule jsdom cannot measure (it has no layout).
 * Comments are stripped, so a commented-out declaration never satisfies a test.
 */
export type CssSource = Readonly<{
  source: string;
  /** The declarations of the rule whose whole selector is `selector`, by property. */
  declarationsOf: (selector: string) => Readonly<Record<string, string>>;
}>;

export async function readCssRules(path: string): Promise<CssSource> {
  const source = (await readFile(path, "utf8")).replaceAll(/\/\*[\s\S]*?\*\//gu, "");

  function declarationsOf(selector: string): Readonly<Record<string, string>> {
    const escaped = selector.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
    const body = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "u").exec(source)?.[1];
    expect(body, `a rule for ${selector}`).toBeDefined();
    return Object.fromEntries(
      (body ?? "")
        .split(";")
        .map((declaration) => declaration.split(":"))
        .filter((pair): pair is [string, string] => pair.length === 2)
        .map(([property, value]) => [property.trim(), value.trim()]),
    );
  }

  return { source, declarationsOf };
}
