import { describe, expect, it } from "vitest";

import { getTenantAccentCssVariables, DEFAULT_TENANT_ACCENT_KEY } from "./tenant-accent.js";
import {
  PRODUCT_TOKENS,
  SHIPPED_TOKENS,
  customPropertyBlocks,
  deliveredStylesheets,
  readCss,
} from "./token-source.test-support.js";

/**
 * PRD-009a, 009A-AC-002. A `var()` of a custom property nothing defines makes its declaration
 * invalid, and the element silently falls back to whatever it inherits. PRD-008's Quality L-1 was
 * exactly that: `--space-7` was consumed by two stylesheets and defined by no theme block.
 *
 * A reference passes when the name is defined by a theme block of `tokens.css`, is one of the
 * dashboard preview's own `--product-*` names in `product-tokens.css`, is declared in the same
 * stylesheet, is one of the tenant accent variables the root layout sets inline from the server
 * catalog, or carries its own fallback (`var(--name, fallback)`), which is how a stylesheet opts in
 * to a property a script may set.
 */

function definedNames(
  path: string,
  filter: (name: string) => boolean = () => true,
): ReadonlySet<string> {
  return new Set(
    customPropertyBlocks(readCss(path))
      .flatMap((block) => [...block.declarations.keys()])
      .filter(filter),
  );
}

describe("every custom property a stylesheet reads is defined (009A-AC-002)", () => {
  it("finds no var() of an undefined token under apps/web/src or packages/ui/src", () => {
    const themeNames = definedNames(SHIPPED_TOKENS);
    const productNames = definedNames(PRODUCT_TOKENS, (name) => name.startsWith("--product-"));
    const tenantNames = new Set(
      Object.keys(getTenantAccentCssVariables(DEFAULT_TENANT_ACCENT_KEY)),
    );

    const undefinedReferences = deliveredStylesheets().flatMap((path) => {
      const css = readCss(path);
      const local = new Set(
        customPropertyBlocks(css).flatMap((block) => [...block.declarations.keys()]),
      );
      return [...css.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/gu)]
        .filter(([, name, fallback]) => {
          if (name === undefined || fallback !== undefined) return false;
          return ![themeNames, productNames, tenantNames, local].some((set) => set.has(name));
        })
        .map(([, name]) => `${path}: ${String(name)}`);
    });

    expect([...new Set(undefinedReferences)]).toEqual([]);
  });
});
