import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const rawColorPattern = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/iu;

function readSource(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function collectFiles(directory: string, extension: string): readonly string[] {
  return readdirSync(resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(path, extension);
    }
    return extname(entry.name) === extension ? [path] : [];
  });
}

describe("delivered dashboard semantic theme surface contract", () => {
  it("contains no raw color literals outside the semantic token source", () => {
    const deliveredCssFiles = [
      ...collectFiles("apps/web/src/features", ".css"),
      ...collectFiles("apps/web/src/theme", ".css"),
      ...collectFiles("packages/ui/src/components", ".css"),
    ];
    const offenders = deliveredCssFiles.filter((path) => rawColorPattern.test(readSource(path)));

    expect(offenders).toEqual([]);
  });

  it("themes every delivered loading, empty, warning, error, hover, focus, selected, and disabled state", () => {
    const primitives = readSource("packages/ui/src/components/primitives.css");
    const asyncState = readSource("packages/ui/src/components/async-state.tsx");
    const button = readSource("packages/ui/src/components/Button.module.css");
    const themeControl = readSource("packages/ui/src/components/ThemeSegmentedControl.module.css");

    expect(asyncState).toContain('loading: { icon: "loader"');
    expect(asyncState).toContain('empty: { icon: "circle-dot"');
    expect(asyncState).toContain('error: { icon: "circle-x"');
    expect(primitives).toContain('[data-state="loading"]');
    expect(primitives).toContain('[data-state="degraded"]');
    expect(primitives).toContain('[data-state="error"]');
    expect(primitives).toContain("var(--st-neutral-bg)");
    expect(primitives).toContain("var(--st-warning-bg)");
    expect(primitives).toContain("var(--st-critical-bg)");
    expect(button).toContain(":hover:not(:disabled)");
    expect(button).toContain(":focus-visible");
    expect(button).toContain(":disabled");
    expect(themeControl).toContain('[aria-checked="true"]');
    expect(themeControl).toContain("var(--ac-primary-hover)");
  });

  it("covers the delivered approval table, alertdialog, and drawer modal while making no future chart or tooltip claim", () => {
    const reporting = readSource("apps/web/src/features/reporting/components/reporting.module.css");
    const safeAction = readSource("packages/ui/src/components/Button.module.css");
    const shell = readSource("apps/web/src/features/shell/components/app-shell.module.css");
    /**
     * PRD-006d's reopened row 1, F-24. The shell's mobile drawer used to draw its own scrim, so
     * `--sf-overlay` was asserted in the shell's stylesheet. The drawer is now the `Dialog`
     * primitive at its `inline-start` placement, so the scrim is the primitive's and the token is
     * asserted where it lives. The claim is the same claim: a modal layer dims the canvas with the
     * semantic overlay token rather than with a literal.
     */
    const overlay = readSource("packages/ui/src/components/overlay.module.css");
    const deliveredTsx = [
      ...collectFiles("apps/web/src/features", ".tsx"),
      ...collectFiles("packages/ui/src/components", ".tsx"),
    ]
      .map(readSource)
      .join("\n");

    expect(deliveredTsx).toContain("<table>");
    expect(reporting).toContain(".tableRegion table");
    expect(reporting).toContain("var(--sf-card)");
    expect(reporting).toContain("var(--bd-hairline)");
    expect(reporting).toContain("var(--focus-color)");
    expect(deliveredTsx).toContain('role="alertdialog"');
    expect(deliveredTsx).toContain('role="dialog"');
    expect(safeAction).toContain(".confirmation");
    expect(safeAction).toContain("var(--shadow-raised)");
    expect(overlay).toContain("var(--sf-overlay)");
    expect(overlay).toContain('[data-dialog-placement="inline-start"]');
    // The drawer still carries the navigation surface, which is the shell's to state.
    expect(shell).toContain("var(--sf-nav)");
    expect(deliveredTsx).not.toMatch(/role="tooltip"|data-chart|<Chart/u);
  });
});
