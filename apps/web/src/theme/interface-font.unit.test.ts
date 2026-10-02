import { describe, expect, it } from "vitest";

import {
  LIGHT,
  SHIPPED_TOKENS,
  blockDeclarations,
  deliveredStylesheets,
  readCss,
} from "./token-source.test-support.js";

/**
 * PRD-009a, 009A-AC-007, and design `00-direction.md` section 2.2. Inter is the interface font,
 * declared once from the application origin; the data font is the system monospace stack, and it
 * survives only inside "Details for support" (user-language contract section 6: "plain labels and
 * monospace values"). Numbers and dates use Inter with tabular figures.
 */

const globals = readCss("apps/web/src/app/globals.css");

function stripComments(css: string): string {
  return css.replaceAll(/\/\*[\s\S]*?\*\//gu, "");
}

/** `selector { ... var(--font-data) ... }` rules, with comments and at-rule wrappers ignored. */
function dataFontConsumers(path: string): readonly string[] {
  const css = stripComments(readCss(path));
  return [...css.matchAll(/([^{};]+)\{([^{}]*)\}/gu)]
    .filter(([, , body]) => /var\(\s*--font-data\b/u.test(body ?? ""))
    .map(([, selector]) => `${path}: ${(selector ?? "").replaceAll(/\s+/gu, " ").trim()}`);
}

/**
 * Consumers in files 009a does not own in PRD-009's Wave 1. Each is a one-line swap to
 * `var(--font-interface)` with `font-variant-numeric: tabular-nums`, named for its owner in the
 * 009a lane report. 009A-AC-007's source-scan clause is NOT met until this list is empty; the test
 * below fails if an entry is fixed and left here, so the list can only shrink.
 */
const AWAITING_OWNER_EDITS: readonly string[] = [
  "apps/web/src/features/brand/components/brand-profile.module.css: .sourceText",
  "apps/web/src/features/campaigns/components/open-house-draft-builder.module.css: .builderTools nav a span",
  "apps/web/src/features/campaigns/components/open-house-draft-builder.module.css: .sectionTitle > span",
  "apps/web/src/features/dashboard-preview/workspace.module.css: .stepNumber",
  "apps/web/src/features/reporting/components/reporting.module.css: .assetGrid code",
  "apps/web/src/features/reporting/components/reporting.module.css: .tableRegion td",
  "apps/web/src/features/reporting/components/reporting.module.css: .metricGrid strong",
  "packages/ui/src/components/Button.module.css: .dataText",
  'packages/ui/src/components/field.module.css: .control[data-tone="data"]',
  "packages/ui/src/components/primitives.css: .oalo-metric__value",
  "packages/ui/src/components/primitives.css: .oalo-data-text",
  "packages/ui/src/components/primitives.css: .oalo-checklist__progress",
  "packages/ui/src/components/stepper.module.css: .position",
  "packages/ui/src/components/stepper.module.css: .marker",
];

describe("the interface font (009A-AC-007)", () => {
  it("declares one @font-face for Inter from /fonts/, swap, and the variable weight range", () => {
    const faces = [...stripComments(globals).matchAll(/@font-face\s*\{([^}]*)\}/gu)].map(
      (match) => match[1] ?? "",
    );
    expect(faces).toHaveLength(1);
    const face = faces[0] ?? "";
    expect(face).toMatch(/font-family:\s*"?Inter"?\s*;/u);
    expect(face).toMatch(/src:\s*url\("\/fonts\/InterVariable\.woff2"\)\s*format\("woff2"\)\s*;/u);
    expect(face).toMatch(/font-display:\s*swap\s*;/u);
    expect(face).toMatch(/font-weight:\s*100 900\s*;/u);
    expect(face).toMatch(/font-style:\s*normal\s*;/u);
  });

  it("names Inter first in the interface stack and the system monospace stack for data", () => {
    const light = blockDeclarations(readCss(SHIPPED_TOKENS), LIGHT);
    expect(light.get("--font-interface")).toBe(
      'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    );
    expect(light.get("--font-data")).toBe("ui-monospace, SFMono-Regular, Consolas, monospace");
  });

  it("draws numbers and dates in the interface face with tabular figures", () => {
    const rule = /(?:^|\n)time,\s*\[data-text-tone="data"\]\s*\{([^}]*)\}/u.exec(
      stripComments(globals),
    )?.[1];
    expect(rule).toContain("font-family: var(--font-interface)");
    expect(rule).toContain("font-variant-numeric: tabular-nums");
  });

  it("uses the data font only inside Details for support, apart from the named owner edits", () => {
    const consumers = deliveredStylesheets().flatMap((path) =>
      dataFontConsumers(path.replaceAll("\\", "/")),
    );
    const outside = consumers.filter((consumer) => !consumer.includes("[data-support-details]"));
    expect(outside.filter((consumer) => !AWAITING_OWNER_EDITS.includes(consumer))).toEqual([]);
    expect(
      AWAITING_OWNER_EDITS.filter((entry) => !outside.includes(entry)),
      "an owner fixed one of these: remove it from AWAITING_OWNER_EDITS",
    ).toEqual([]);
    expect(consumers.some((consumer) => consumer.includes("[data-support-details]"))).toBe(true);
  });
});
