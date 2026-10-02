import { createHash } from "node:crypto";

import type { AuthenticatedPrincipal } from "@oalo/application";

import type { LaunchBand } from "../features/campaigns/launch-model.js";
import { DEFAULT_AD_BRAND } from "../features/workspace/ad-brand.js";
import { authenticatedWorkspaceMode } from "./authenticated-workspace-data.js";
import { campaignDatabasePool } from "./campaign-persistence-runtime.js";
import { readWorkspacePreferences } from "./workspace-preferences.js";

/**
 * PRD-009d D3 and 009D-AC-024. The brand a library ad carries, read on the server from the
 * signed-in person's saved Brand under their own workspace. A request never supplies any of it.
 *
 * The report brand gives the name, company, and NMLS numbers; the ad brand (`workspace.ad_brand.v1`)
 * gives the title, the colour, the disclosure line, and the lead form wording, or their defaults
 * when the person has saved none. The saved Realtor partners are read only as the co-brand rule's
 * list of names (009D-AC-023): nothing about a partner reaches an ad.
 */

export interface SavedAdBrand {
  readonly band: LaunchBand;
  readonly leadFormWording: string;
  /** False when no report brand is saved: the band then shows its placeholder (D3). */
  readonly saved: boolean;
  /**
   * 009D-AC-021. A version's `brandProfileVersionRef`, derived from the revisions of the saved
   * brand it froze, so two versions name the same brand exactly when they froze the same one.
   */
  readonly brandProfileVersionRef: string;
  readonly partnerNames: readonly string[];
}

/**
 * The repository's own sample identity (`apps/web/src/features/brand/model/synthetic-brand-profile.ts`)
 * stands in for a saved brand in the local demo, which has no database to save one in.
 */
const DEMO_BRAND = Object.freeze({
  name: "Alex Morgan",
  company: "Prairie Home Lending",
  nmls: "0000000",
  companyNmls: "0000000",
});

function brandProfileRef(brandRevision: string, adBrandRevision: string): string {
  const digest = createHash("sha256")
    .update(`brand:${brandRevision}:adbrand:${adBrandRevision}`)
    .digest("hex");
  return `brandprofile_${digest.slice(0, 40)}`;
}

export async function readSavedAdBrand(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown = process.env,
): Promise<SavedAdBrand> {
  if (authenticatedWorkspaceMode(environment) === "synthetic") {
    return Object.freeze({
      band: Object.freeze({
        ...DEMO_BRAND,
        title: "Loan officer",
        colorPresetId: DEFAULT_AD_BRAND.colorPresetId,
        disclosureLine: DEFAULT_AD_BRAND.disclosureLine,
      }),
      leadFormWording: DEFAULT_AD_BRAND.leadFormWording,
      saved: true,
      brandProfileVersionRef: brandProfileRef("demo", "demo"),
      partnerNames: Object.freeze([]),
    });
  }
  const preferences = await readWorkspacePreferences(principal, campaignDatabasePool(environment));
  const brand = preferences.brand?.value;
  const adBrand = preferences.adBrand?.value ?? DEFAULT_AD_BRAND;
  return Object.freeze({
    band: Object.freeze({
      name: brand?.name ?? "",
      title: adBrand.title,
      company: brand?.company ?? "",
      nmls: brand?.nmls ?? "",
      companyNmls: brand?.companyNmls ?? "",
      colorPresetId: adBrand.colorPresetId,
      disclosureLine: adBrand.disclosureLine,
    }),
    leadFormWording: adBrand.leadFormWording,
    saved: brand !== undefined,
    brandProfileVersionRef: brandProfileRef(
      preferences.brand?.revision ?? "none",
      preferences.adBrand?.revision ?? "default",
    ),
    partnerNames: Object.freeze(
      (preferences.partners?.value.items ?? []).flatMap((partner) => [
        partner.name,
        partner.company,
      ]),
    ),
  });
}
