import { z } from "zod";

/**
 * PRD-009d D3. The four Brand fields a library ad's brand band needs beyond the report brand: a
 * title, a brand colour, the disclosure line, and the lead form wording.
 *
 * They are saved per person under `workspace.ad_brand.v1`, beside the report brand and not inside
 * the homeowner report contract (`packages/contracts/src/homeowner-reports.ts`), so homeowner
 * reports are unchanged. The save of a campaign version reads them on the server from the signed-in
 * person's saved Brand; a request never carries them (009D-AC-024).
 */

/**
 * The six brand colours. A colour is stored as its preset id, refused otherwise, and turned into a
 * colour value only when the band renders. The band itself stays white with navy text (D-24); the
 * colour fills the initials tile and the thin rule above the band, and the tile's white letters
 * pass 4.5:1 on each (a unit test measures every one).
 */
export const AD_BRAND_COLOR_PRESETS = Object.freeze([
  Object.freeze({ id: "navy", label: "Navy", value: "#1F3A5F" }),
  Object.freeze({ id: "forest", label: "Forest green", value: "#1F5A3D" }),
  Object.freeze({ id: "teal", label: "Teal", value: "#0E5E6F" }),
  Object.freeze({ id: "plum", label: "Plum", value: "#5E2B6E" }),
  Object.freeze({ id: "brick", label: "Brick red", value: "#9A3412" }),
  Object.freeze({ id: "slate", label: "Slate", value: "#334155" }),
] as const);
export type AdBrandColorPresetId = (typeof AD_BRAND_COLOR_PRESETS)[number]["id"];
const PRESET_IDS = AD_BRAND_COLOR_PRESETS.map((preset) => preset.id) as [
  AdBrandColorPresetId,
  ...AdBrandColorPresetId[],
];

/** The white of the initials tile's letters. */
export const AD_BRAND_TILE_LETTER_COLOR = "#FFFFFF";

export function adBrandColorValue(id: string): string {
  return (
    AD_BRAND_COLOR_PRESETS.find((preset) => preset.id === id)?.value ??
    AD_BRAND_COLOR_PRESETS[0].value
  );
}

export const AD_BRAND_LIMITS = Object.freeze({
  title: 60,
  disclosureLine: 120,
  leadFormWording: 300,
});

export const AdBrandSchema = z
  .object({
    title: z.string().trim().max(AD_BRAND_LIMITS.title),
    colorPresetId: z.enum(PRESET_IDS),
    disclosureLine: z.string().trim().min(1).max(AD_BRAND_LIMITS.disclosureLine),
    leadFormWording: z.string().trim().min(1).max(AD_BRAND_LIMITS.leadFormWording),
  })
  .strict();
export type AdBrand = z.infer<typeof AdBrandSchema>;

/**
 * What a person who has saved nothing yet starts from. The lead form wording names no property,
 * because the guided setup's starter consent ("about this property") is untrue of a library ad
 * (D3). Counsel's review of both texts is on the operator checklist.
 */
export const DEFAULT_AD_BRAND: AdBrand = Object.freeze({
  title: "",
  colorPresetId: "navy",
  disclosureLine: "Equal Housing Opportunity.",
  leadFormWording:
    "By submitting, you agree to be contacted about home financing and related mortgage services.",
});

/** The letters of the initials tile (D-25): the first letter of the first two words of the name. */
export function brandInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => [...word][0]?.toLocaleUpperCase("en") ?? "")
    .join("");
}
