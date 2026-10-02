import { describe, expect, it } from "vitest";

import { uiTokens } from "@oalo/ui";
import {
  DARK,
  KNOWLEDGE_TOKENS,
  LIGHT,
  MIRROR_SYSTEM_DARK,
  PRODUCT_TOKENS,
  REDUCED_MOTION,
  SHIPPED_TOKENS,
  blockDeclarations,
  customPropertyBlocks,
  deliveredStylesheets,
  designDarkRows,
  designLightRows,
  normalizeCssValue,
  readCss,
} from "./token-source.test-support.js";

/**
 * PRD-009a, 009A-AC-001, 002, and 005. The light AutomatedRE look (OD-E) is a change of values,
 * not of names: design `00-direction.md` section 2.4 (Light) and section 2.6 (the four Dark changes)
 * are normative (009a D1), and this test reads those tables rather than restating them, so the
 * shipped token file, its knowledge mirror, and the design cannot drift apart without failing.
 */

const shipped = readCss(SHIPPED_TOKENS);
const mirror = readCss(KNOWLEDGE_TOKENS);
const productTokens = readCss(PRODUCT_TOKENS);

const shippedLight = blockDeclarations(shipped, LIGHT);
const shippedDark = blockDeclarations(shipped, DARK);

/**
 * Dark as measured and signed on 2026-09-20 (`06-review-rubric.md` section 5). Section 2.6 keeps
 * these "with four changes" and lists only the four, so every other Dark override is pinned here.
 */
const DARK_SIGNED_2026_09_20: Readonly<Record<string, string>> = {
  "--sf-canvas": "#14161b",
  "--sf-card": "#1b1e25",
  "--sf-sunken": "#22262f",
  "--sf-overlay": "rgb(0 0 0 / 68%)",
  "--tx-strong": "#e8eaef",
  "--tx-body": "#b0b7c4",
  "--tx-faint": "#a6adbb",
  "--tx-on-action": "#ffffff",
  "--tx-on-nav": "#e8eaef",
  "--bd-hairline": "#343946",
  "--ac-primary": "#3566d6",
  "--ac-primary-hover": "#2f5dc7",
  "--ac-primary-active": "#264da8",
  "--st-success-fg": "#4ecb8d",
  "--st-success-bg": "#132a20",
  "--st-warning-fg": "#e8b64c",
  "--st-warning-bg": "#2d2413",
  "--st-critical-fg": "#f0786d",
  "--st-critical-bg": "#2f1715",
  "--st-info-fg": "#8bb0ff",
  "--st-info-bg": "#16233f",
  "--st-neutral-fg": "#b0b7c4",
  "--st-neutral-bg": "#242833",
  "--st-uncertain-fg": "#b9acf5",
  "--st-uncertain-bg": "#241d3d",
  "--focus-color": "#8bb0ff",
  "--shadow-rest": "0 1px 2px rgb(0 0 0 / 24%)",
  "--shadow-raised": "0 2px 6px rgb(0 0 0 / 30%), 0 18px 36px -20px rgb(0 0 0 / 84%)",
};

/** 009A-AC-001's retired values: none may appear in any delivered stylesheet. */
const RETIRED_VALUES = [
  // the product action blue
  "#2856d9",
  "#2148b5",
  "#1b3b94",
  // the product Dark block
  "#101827",
  "#172234",
  "#1d2b40",
  "#445771",
  "#3e67dd",
  "#3559c0",
  "#2c4ca7",
  // the old action blue
  "#2f6fed",
  "#1f4bb8",
  "#193f9c",
  // teal
  "#2b9d8f",
  "#3db3a4",
  // the old navigation
  "#0e1730",
  "#0b1122",
  // the old Dark field edge
  "#454c5c",
] as const;

/** 009A-AC-002's new tokens, and `--space-7` (PRD-008 follow-up Quality L-1). */
const NEW_TOKENS = [
  "--weight-semibold",
  "--space-7",
  "--space-12",
  "--topbar-height",
  "--content-max",
] as const;

function tableNames(): ReadonlySet<string> {
  return new Set([...designLightRows(), ...designDarkRows()].map((row) => row.name));
}

describe("the design token tables are what ships (009A-AC-001)", () => {
  it("reads both tables out of the design direction", () => {
    expect(designLightRows().length).toBeGreaterThan(40);
    expect(designDarkRows().map((row) => row.name)).toEqual([
      "--sf-nav",
      "--bd-input",
      "--ac-secondary",
      "--shadow-card",
    ]);
  });

  it("gives every Light token in section 2.4 its new value in tokens.css", () => {
    const mismatches = designLightRows()
      .filter((row) => row.newValue !== undefined)
      .filter((row) => shippedLight.get(row.name) !== normalizeCssValue(row.newValue ?? ""))
      .map(
        (row) => `${row.name}: ships ${String(shippedLight.get(row.name))}, table ${row.newValue}`,
      );
    expect(mismatches).toEqual([]);
  });

  it("gives the four Dark changes of section 2.6 their new values and keeps the rest of Dark", () => {
    for (const row of designDarkRows()) {
      expect(shippedDark.get(row.name), row.name).toBe(normalizeCssValue(row.newValue ?? ""));
    }
    for (const [name, value] of Object.entries(DARK_SIGNED_2026_09_20)) {
      expect(shippedDark.get(name), `${name} keeps its signed Dark value`).toBe(value);
    }
    expect([...shippedDark.keys()].sort()).toEqual(
      [...Object.keys(DARK_SIGNED_2026_09_20), ...designDarkRows().map((row) => row.name)].sort(),
    );
  });

  it("carries the same values in every theme block of the knowledge mirror", () => {
    expect(blockDeclarations(mirror, LIGHT)).toEqual(shippedLight);
    expect(blockDeclarations(mirror, DARK)).toEqual(shippedDark);
    expect(blockDeclarations(mirror, MIRROR_SYSTEM_DARK)).toEqual(shippedDark);
    expect(blockDeclarations(mirror, REDUCED_MOTION)).toEqual(
      blockDeclarations(shipped, REDUCED_MOTION),
    );
  });

  it("keeps product-tokens.css off every token the tables name (009a D5)", () => {
    const names = tableNames();
    const redeclared = customPropertyBlocks(productTokens).flatMap((block) =>
      [...block.declarations.keys()]
        .filter((name) => names.has(name))
        .map((name) => `${block.context.join(" | ")} ${name}`),
    );
    expect(redeclared).toEqual([]);
  });

  it("finds no retired value in any stylesheet under apps/web/src or packages/ui/src", () => {
    const found = deliveredStylesheets().flatMap((path) => {
      const css = readCss(path).toLowerCase();
      return RETIRED_VALUES.filter((value) => new RegExp(`${value}\\b`, "u").test(css)).map(
        (value) => `${path}: ${value}`,
      );
    });
    expect(found).toEqual([]);
  });

  it("declares --text-body-size as 1rem wherever it is declared", () => {
    const declared = deliveredStylesheets().flatMap((path) =>
      [...readCss(path).matchAll(/--text-body-size\s*:\s*([^;]+);/gu)]
        .map((match) => normalizeCssValue(match[1] ?? ""))
        .filter((value) => value !== "1rem")
        .map((value) => `${path}: ${value}`),
    );
    expect(declared).toEqual([]);
  });
});

describe("the new tokens (009A-AC-002)", () => {
  it("defines each new token in tokens.css and in the knowledge mirror", () => {
    for (const name of NEW_TOKENS) {
      expect(shippedLight.has(name), `${name} in tokens.css`).toBe(true);
      expect(blockDeclarations(mirror, LIGHT).has(name), `${name} in the mirror`).toBe(true);
    }
    expect(shippedLight.get("--space-7")).toBe("1.75rem");
  });

  it("exports every token the TypeScript contract names, including the new ones", () => {
    const exported = JSON.stringify(uiTokens);
    for (const name of NEW_TOKENS) {
      expect(exported, name).toContain(`var(${name})`);
    }
    const references = [...exported.matchAll(/var\((--[\w-]+)\)/gu)].map((match) => match[1]);
    expect(references.filter((name) => name === undefined || !shippedLight.has(name))).toEqual([]);
  });
});

describe("teal is retired (009A-AC-005)", () => {
  it("makes --ac-secondary the action blue in both themes", () => {
    expect(shippedLight.get("--ac-secondary")).toBe(shippedLight.get("--ac-primary"));
    expect(shippedDark.get("--ac-secondary")).toBe(shippedDark.get("--ac-primary"));
    expect(uiTokens.action.secondary).toBe("var(--ac-secondary)");
  });

  it("finds no stylesheet that consumes --ac-secondary", () => {
    expect(
      deliveredStylesheets().filter((path) => /var\(\s*--ac-secondary\b/u.test(readCss(path))),
    ).toEqual([]);
  });
});
