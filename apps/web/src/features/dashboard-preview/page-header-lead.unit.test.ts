import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, F-15.
 *
 * The Homeowner reports page draws its lead ("Your property-value and equity workspace.") through
 * the shared `PageHeader`, and below 768px this sheet set `.header p { font-size: 12px }`, a raw
 * value, so at 390 the lead was smaller than the 16px body of the card under it. A lead keeps its
 * role's step at every frame, so the only rule that sizes it is the base one, at the body step.
 *
 * jsdom has no layout, so this reads the stylesheet. The type-step gate
 * (`tests/browser/helpers/design-quality.ts`) proves a size is a step; this proves the lead stays on
 * the right one.
 */

const source = (
  await readFile(join(resolve(import.meta.dirname), "workspace.module.css"), "utf8")
).replaceAll(/\/\*[\s\S]*?\*\//gu, "");

/** Every declaration block whose selector is exactly `.header p`, in file order. */
function leadRules(): readonly string[] {
  return [...source.matchAll(/(?:^|[{}])\s*\.header p\s*\{([^}]*)\}/gu)].map(
    (match) => match[1] ?? "",
  );
}

describe("the page header's lead keeps the body step at every frame (F-15)", () => {
  it("is sized by one rule, and that rule is the body step as a token", () => {
    const rules = leadRules();

    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatch(/font-size:\s*var\(--text-body-size\)/u);
  });

  it("is never set in pixels, in any width", () => {
    expect(leadRules().join("")).not.toMatch(/font-size:\s*\d+(?:\.\d+)?px/u);
  });
});
