import { readFileSync, readdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rubric axis 3: "the six steps and the weights come from the tokens". A stylesheet that names a
 * type token the token layer does not define gets nothing: `var()` of an undefined property makes
 * the declaration invalid, and the element falls back to whatever it inherits.
 *
 * PRD-008d, the second redraw of 2026-10-01, finding R-17. The create screen's fieldset legends
 * and the workspace choice's legend asked for `var(--weight-semibold)`, which only the dashboard
 * preview's `product-tokens.css` defines. On every screen these pictures are taken of, the legends
 * were drawn at weight 400, lighter than the field labels under them, and the browser's 16px had
 * hidden it until D-009 put the body step on `body`.
 *
 * The three feature folders that load `@oalo/ui/product-tokens.css` (the dashboard preview, the
 * homeowner reports, and the workspace pages) are left out: their tokens come from that file.
 */
const PRODUCT_TOKEN_FEATURES = new Set(["dashboard-preview", "homeowners", "workspace"]);

function collectCss(directory: string): readonly string[] {
  return readdirSync(resolve(directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectCss(path);
    return extname(entry.name) === ".css" ? [path] : [];
  });
}

describe("type tokens in the delivered stylesheets", () => {
  it("names only font, size, and weight tokens the token layer defines", () => {
    const defined = new Set(
      [
        ...readFileSync(resolve("packages/ui/src/tokens.css"), "utf8").matchAll(/(--[\w-]+)\s*:/gu),
      ].map((match) => match[1]),
    );
    const features = readdirSync(resolve("apps/web/src/features"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !PRODUCT_TOKEN_FEATURES.has(entry.name))
      .flatMap((entry) => collectCss(join("apps/web/src/features", entry.name)));
    const stylesheets = [
      "apps/web/src/app/globals.css",
      ...features,
      ...collectCss("packages/ui/src/components"),
    ];

    const undefinedTokens = stylesheets.flatMap((path) =>
      [...readFileSync(resolve(path), "utf8").matchAll(/var\((--(?:weight|text|font)-[\w-]+)/gu)]
        .map((match) => match[1] ?? "")
        .filter((token) => !defined.has(token))
        .map((token) => `${path}: ${token}`),
    );

    expect(undefinedTokens).toEqual([]);
  });
});
