import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 009G-AC-001. The review browser suite measured every Settings card description at 13px, a size
 * between the brief's six type steps (28, 19, 16, 14 and 12px). The description is the secondary
 * step, so it takes the token and never a pixel value.
 *
 * jsdom has no layout, so this reads the stylesheet. The measurement itself is the type-step check
 * in `tests/browser/helpers/design-quality.ts`, which runs against every page of a new account.
 */

const source = (
  await readFile(join(resolve(import.meta.dirname), "workspace.module.css"), "utf8")
).replaceAll(/\/\*[\s\S]*?\*\//gu, "");

/** The declarations of the rule whose whole selector is `selector`. */
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

describe("the Settings card description is on the brief's type steps (009G-AC-001)", () => {
  it("is the secondary step, 14px, as a token", () => {
    expect(declarationsOf(".toolCard p")["font-size"]).toBe("var(--text-secondary-size)");
  });

  it("sets no 13px text anywhere in the sheet", () => {
    expect(source).not.toMatch(/font-size:\s*13px/u);
  });
});
