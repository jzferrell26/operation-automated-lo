import type { DeepReadonly } from "../ui-foundation/model/synthetic-ui.js";
import type { SyntheticBrandProfile } from "../brand/model/synthetic-brand-profile.js";
import { blankHomeBrand } from "../homeowners/model.js";
import { DEFAULT_AD_BRAND } from "./ad-brand.js";
import { emptyWorkspacePreferences, type WorkspacePageData } from "./model.js";

/**
 * The scored baseline review of 2026-10-03 (PRD-009 009G-AC-006), part R3, F-13.
 *
 * The local demo's Brand page was the pre-PRD-009 "Brand and compliance details" page: a stack of
 * near-identical cards (a canonical profile, a blueprint's required fields, model suggestions), with
 * no title, no brand colour, no disclosure line and no preview of the band an ad carries. Direction
 * section 3.1 defines Brand as the fields the band needs, one brand for ads and reports, and that
 * is the page the signed-in product shows. The demo now shows the same page, fed by the same sample
 * identity the demo's Launch an ad flow already uses (`server/ad-brand-read.ts`: Alex Morgan,
 * Prairie Home Lending, NMLS 0000000, title "Loan officer", the default disclosure line).
 *
 * The local demo writes nothing (`safety.writesEnabled` is false), so nobody may edit here: the
 * fields are read-only and both saves are disabled, as they are for a role that cannot edit.
 */

const FIELD_IDS = Object.freeze({
  name: "synthetic-profile-field-public-name",
  company: "synthetic-profile-field-company",
  nmls: "synthetic-profile-field-nmls",
});

function fieldValue(profile: DeepReadonly<SyntheticBrandProfile>, id: string): string {
  return profile.canonicalProfile.fields.find((field) => field.id === id)?.value ?? "";
}

/** The Brand page's data for the local demo, from the demo's own sample identity. */
export function syntheticBrandPageData(
  profile: DeepReadonly<SyntheticBrandProfile>,
): WorkspacePageData {
  const name = fieldValue(profile, FIELD_IDS.name);
  const company = fieldValue(profile, FIELD_IDS.company) || profile.activeLocation.displayName;
  // The fixture writes the number as "NMLS 0000000, synthetic"; the Brand form holds the digits.
  const nmls = /\d{4,12}/u.exec(fieldValue(profile, FIELD_IDS.nmls))?.[0] ?? "";
  return {
    view: "profile",
    identity: { name, company, role: "Local demo" },
    canEdit: false,
    preferences: emptyWorkspacePreferences(),
    defaultBrand: { ...blankHomeBrand, name, company, nmls, companyNmls: nmls },
    defaultAdBrand: { ...DEFAULT_AD_BRAND, title: "Loan officer" },
    reportsEnabled: false,
    valuationConfigured: false,
    contactConfigured: false,
    deliveryEnabled: false,
    lookupsUsed: 0,
    lookupLimit: 0,
  };
}
