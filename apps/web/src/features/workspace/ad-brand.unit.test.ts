import { describe, expect, it } from "vitest";

import {
  AD_BRAND_COLOR_PRESETS,
  AD_BRAND_TILE_LETTER_COLOR,
  AdBrandSchema,
  DEFAULT_AD_BRAND,
  adBrandColorValue,
  brandInitials,
} from "./ad-brand.js";
import {
  PreferenceKeySchema,
  WorkspacePreferenceCommandSchema,
  WorkspacePreferencesSchema,
  emptyWorkspacePreferences,
} from "./model.js";

/**
 * PRD-009d D3, 009D-AC-003 and 009D-AC-024. The four Brand fields a library ad needs, their caps,
 * and the six colour presets, each of which the initials tile's white letters must read on at the
 * 4.5:1 that WCAG 2.2 SC 1.4.3 asks of text.
 */

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.040_45 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((start) =>
    channel(Number.parseInt(hex.slice(start, start + 2), 16)),
  );
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0);
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

describe("the brand colour presets (009D-AC-003)", () => {
  it("are six, each a colour value and a name", () => {
    expect(AD_BRAND_COLOR_PRESETS).toHaveLength(6);
    expect(new Set(AD_BRAND_COLOR_PRESETS.map((preset) => preset.id)).size).toBe(6);
    for (const preset of AD_BRAND_COLOR_PRESETS) {
      expect(preset.value).toMatch(/^#[0-9A-F]{6}$/u);
      expect(preset.id).toMatch(/^[a-z][a-z0-9-]{1,31}$/u);
    }
  });

  it.each(AD_BRAND_COLOR_PRESETS.map((preset) => [preset.id, preset.value] as const))(
    "lets the initials tile's letters pass 4.5:1 on %s",
    (_id, value) => {
      expect(contrast(AD_BRAND_TILE_LETTER_COLOR, value)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("measures contrast the WCAG way", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#FFFFFF", "#777777")).toBeLessThan(4.5);
  });

  it("maps an id to its value only when the band renders, and falls back to the first", () => {
    expect(adBrandColorValue("forest")).toBe("#1F5A3D");
    expect(adBrandColorValue("not-a-preset")).toBe(AD_BRAND_COLOR_PRESETS[0].value);
  });
});

describe("the ad brand fields (009D-AC-003, 009D-AC-024)", () => {
  it("defaults to the Equal Housing line and a lead form wording that names no property", () => {
    expect(AdBrandSchema.parse(DEFAULT_AD_BRAND)).toEqual({
      title: "",
      colorPresetId: "navy",
      disclosureLine: "Equal Housing Opportunity.",
      leadFormWording:
        "By submitting, you agree to be contacted about home financing and related mortgage services.",
    });
    expect(DEFAULT_AD_BRAND.leadFormWording).not.toMatch(/property/iu);
  });

  it("refuses a title over 60, a disclosure line over 120, lead form wording over 300, and a colour that is not a preset", () => {
    const valid = { ...DEFAULT_AD_BRAND, title: "Loan officer" };
    expect(AdBrandSchema.safeParse(valid).success).toBe(true);
    expect(AdBrandSchema.safeParse({ ...valid, title: "t".repeat(60) }).success).toBe(true);
    expect(AdBrandSchema.safeParse({ ...valid, title: "t".repeat(61) }).success).toBe(false);
    expect(AdBrandSchema.safeParse({ ...valid, disclosureLine: "d".repeat(120) }).success).toBe(
      true,
    );
    expect(AdBrandSchema.safeParse({ ...valid, disclosureLine: "d".repeat(121) }).success).toBe(
      false,
    );
    expect(AdBrandSchema.safeParse({ ...valid, leadFormWording: "w".repeat(300) }).success).toBe(
      true,
    );
    expect(AdBrandSchema.safeParse({ ...valid, leadFormWording: "w".repeat(301) }).success).toBe(
      false,
    );
    for (const colour of ["#1F3A5F", "red", "Navy", ""]) {
      expect(AdBrandSchema.safeParse({ ...valid, colorPresetId: colour }).success, colour).toBe(
        false,
      );
    }
    expect(AdBrandSchema.safeParse({ ...valid, logo: "x" }).success).toBe(false);
  });

  it("is saved under its own preference key, beside the report brand", () => {
    expect(PreferenceKeySchema.options).toContain("ad_brand");
    expect(`workspace.ad_brand.v1`).toMatch(/^[a-z][a-z0-9_.]{1,63}$/u);
    expect(emptyWorkspacePreferences().adBrand).toBeNull();
    expect(
      WorkspacePreferenceCommandSchema.safeParse({
        key: "ad_brand",
        expectedRevision: null,
        value: DEFAULT_AD_BRAND,
      }).success,
    ).toBe(true);
    expect(
      WorkspacePreferencesSchema.safeParse({
        ...emptyWorkspacePreferences(),
        adBrand: { revision: "3b1f6f5e-6c0e-4a39-9f0e-6d7f3c1a9b22", value: DEFAULT_AD_BRAND },
      }).success,
    ).toBe(true);
  });
});

describe("the initials tile (D-25)", () => {
  it("takes the first letter of the first two words", () => {
    expect(brandInitials("Alex Morgan")).toBe("AM");
    expect(brandInitials("  casey   de la rivera ")).toBe("CD");
    expect(brandInitials("Cher")).toBe("C");
    expect(brandInitials("")).toBe("");
  });
});
