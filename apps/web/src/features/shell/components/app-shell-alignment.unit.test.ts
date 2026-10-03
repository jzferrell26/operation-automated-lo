import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * PRD-009 Wave 1 verifier findings, assigned to 009b in Wave 2.
 *
 * 1. At 1440 the page column started at x=120 while the wordmark was at x=152. The page column
 *    (`.content`) was the bar's measure plus 64px, so it began 32px outside the bar's own padding
 *    and the page hung to the left of the logo. Both now have the same box, `--content-max` wide
 *    and centred with `--space-8` of inline padding, so the content and the wordmark share an edge
 *    at every frame, as the mockups draw it (`design/mockups/previews/*`).
 * 2. The account control measured 50px tall against the mockup's roughly 44px: the `Button`
 *    primitive's block padding was added to a 32px avatar. It is exactly the 44px target now, and
 *    no smaller (design section 2.3, 009A-AC-012).
 *
 * jsdom has no layout, so these read the rules. The measurements themselves are in
 * `tests/browser/shell-column-alignment.spec.ts` (needs a browser run).
 */

const stylesheet = await readFile(
  join(resolve(import.meta.dirname), "app-shell.module.css"),
  "utf8",
);

/** The declarations of the first top-level rule with exactly this selector, comments removed. */
function rule(selector: string, media?: string): Record<string, string> {
  const source = stylesheet.replace(/\/\*[\s\S]*?\*\//gu, "");
  const scope =
    media === undefined
      ? source.replace(/@media[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gu, "")
      : (source.split(media)[1] ?? "");
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`, "mu").exec(scope);
  if (match === null) throw new Error(`No rule for ${selector}`);
  return Object.fromEntries(
    (match[1] ?? "")
      .split(";")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf(":");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()] as const;
      }),
  );
}

describe("the page column starts where the wordmark does (Wave 1 verifier, 1440 x=120 against x=152)", () => {
  it("gives the bar and the page column the same width", () => {
    expect(rule(".bar")["max-inline-size"]).toBe("var(--content-max)");
    expect(rule(".content")["max-inline-size"]).toBe("var(--content-max)");
  });

  it("gives both the same inline padding, so the wordmark and the page share an edge", () => {
    expect(rule(".bar")["padding-inline"]).toBe("var(--space-8)");
    // PRD-009 scored review R1-01: the mockups' `.page` is `--space-8` on every side.
    expect(rule(".content")["padding"]).toBe("var(--space-8)");
    expect(rule(".bar")["margin-inline"]).toBe("auto");
    expect(rule(".content")["margin-inline"]).toBe("auto");
  });

  it("keeps the same inline padding on both below 720px, where the bar narrows to --space-4", () => {
    const narrowBar = rule(".bar", "@media (max-width: 719.98px)");
    const narrowContent = rule(".content", "@media (max-width: 719.98px)");

    expect(narrowBar["padding-inline"]).toBe("var(--space-4)");
    // R1-01: the mockups' phone page, `--space-6` above and `--space-4` at the sides.
    expect(narrowContent["padding"]).toBe("var(--space-6) var(--space-4)");
  });

  /**
   * PRD-009 scored review R4-03. The unverified-email notice and the page are siblings in the
   * shell's main region; they stand a page gap apart, as the mockups' `.page` grid does.
   */
  it("stacks the main region's page-level blocks a page gap apart", () => {
    expect(rule(".content")["row-gap"]).toBe("var(--space-6)");
  });

  /**
   * PRD-009 scored review pass 2, R4-13. The mockups' `.page` gap is `--space-6` and `--space-5`
   * under 720px (`home-first-run.html:179` and `:420`). The padding took the phone value in R1-01;
   * the gap did not, so a notice stood 24px above the page at 390 where the mockup draws 20px.
   */
  it("steps the page gap down to --space-5 below 720px, with the page's own padding", () => {
    const narrowContent = rule(".content", "@media (max-width: 719.98px)");

    expect(narrowContent["row-gap"]).toBe("var(--space-5)");
    expect(narrowContent["padding"]).toBe("var(--space-6) var(--space-4)");
  });

  it("no longer reserves room for a floating walkthrough panel", () => {
    expect(stylesheet).not.toContain("guided-setup-panel-room");
  });
});

describe("the account control is the 44px target and no taller (Wave 1 verifier, 50px)", () => {
  const account = rule(".cluster .accountButton");

  it("is exactly the 44px target in height, and never smaller", () => {
    expect(account["min-block-size"]).toBe("var(--target-min-size)");
    // The primitive's block padding is what made it 50px; the control sizes itself from the target.
    expect(account["padding-block"]).toBe("0");
  });

  it("holds a 32px avatar and a one pixel border inside that height", () => {
    expect(rule(".avatar")["block-size"]).toBe("var(--space-8)");
    expect(account["border"]).toMatch(/^1px solid/u);
  });
});
