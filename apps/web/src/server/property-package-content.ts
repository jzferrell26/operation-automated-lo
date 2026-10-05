import { canonicalCampaignHash } from "@oalo/application";
import { CampaignVersionSchema, type CampaignVersion } from "@oalo/contracts";
import { adBrandColorValue } from "../features/workspace/ad-brand.js";

export const DRAFT_NOTICE = "DRAFT / INTERNAL REVIEW ONLY";
export const PREVIEW_NOTICE = "Private preview. Sign-in required. Do not distribute to customers.";
export const NO_PHOTO_NOTICE = "No property photo has been supplied for this draft.";

export class PropertyPackageError extends Error {
  constructor(
    public readonly code:
      | "PROPERTY_PACKAGE_INVALID_SOURCE"
      | "PROPERTY_PACKAGE_STALE"
      | "PROPERTY_PACKAGE_NOT_FOUND"
      | "PROPERTY_PACKAGE_UNAVAILABLE"
      | "PROPERTY_PACKAGE_BUSY"
      | "PROPERTY_PACKAGE_FONT_UNSUPPORTED"
      | "PROPERTY_PACKAGE_INTEGRITY_FAILED",
    public readonly status: 400 | 404 | 409 | 422 | 429 | 503,
  ) {
    super(code);
    this.name = "PropertyPackageError";
  }
}

export interface PropertyPackageDocument {
  readonly address: string;
  readonly description: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly eventLabel: string;
  readonly loanOfficer: string;
  readonly lender: string;
  readonly nmls: string;
  readonly realtor: string;
  readonly brokerage: string;
  readonly disclosure: string;
  readonly permissions: string;
  readonly propertyPermissionConfirmed: boolean;
  readonly realtorPermissionConfirmed: boolean;
  readonly accent: string;
  readonly qrDestination: string;
  readonly versionNo: number;
}

export function privatePackageOutputPath(
  campaignRef: string,
  campaignVersionRef: string,
  output: string,
): string {
  return `/api/campaigns/property/package/${encodeURIComponent(campaignRef)}/${encodeURIComponent(campaignVersionRef)}/${encodeURIComponent(output)}`;
}

export function propertyEventLabel(startsAt: string, endsAt: string): string {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${format.format(new Date(startsAt))} to ${format.format(new Date(endsAt))} UTC`;
}

/** Only an intact saved preparation version can be a draft-package source. */
export function propertyPackageDocument(
  rawVersion: CampaignVersion,
  origin: string,
): PropertyPackageDocument {
  const version = CampaignVersionSchema.parse(rawVersion);
  const manifest = version.manifest;
  if (
    manifest.blueprintId !== "open-house-boost" ||
    manifest.preparation === undefined ||
    canonicalCampaignHash(manifest) !== version.manifestHash
  ) {
    throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
  }
  const { brand } = manifest.preparation;
  const document: PropertyPackageDocument = {
    address: manifest.property.address,
    description: manifest.property.description,
    startsAt: manifest.property.openHouseStartsAt,
    endsAt: manifest.property.openHouseEndsAt,
    eventLabel: propertyEventLabel(
      manifest.property.openHouseStartsAt,
      manifest.property.openHouseEndsAt,
    ),
    loanOfficer: brand.name,
    lender: brand.company,
    nmls: `NMLS ${brand.nmls} | Company NMLS ${brand.companyNmls}`,
    realtor: manifest.partner.realtorDisplayName,
    brokerage: manifest.preparation.partnerCompany,
    disclosure: manifest.content.disclosureText,
    permissions: [
      manifest.property.permissionConfirmed
        ? "Property marketing permission: confirmed for this saved draft."
        : "Property marketing permission: NOT CONFIRMED.",
      manifest.partner.permissionConfirmed
        ? "Realtor identity permission: confirmed for this saved draft."
        : "Realtor identity permission: NOT CONFIRMED.",
      "These materials have not been approved for public use.",
    ].join(" "),
    propertyPermissionConfirmed: manifest.property.permissionConfirmed,
    realtorPermissionConfirmed: manifest.partner.permissionConfirmed,
    accent: adBrandColorValue(brand.colorPresetId),
    qrDestination: `${origin}${privatePackageOutputPath(version.campaignRef, version.campaignVersionRef, "page")}`,
    versionNo: version.versionNo,
  };
  for (const value of Object.values(document)) {
    const unsafe =
      typeof value === "string" &&
      Array.from(value).some((character) => {
        const code = character.codePointAt(0) ?? 0;
        return (
          (code < 32 && ![9, 10, 13].includes(code)) ||
          code === 127 ||
          (code >= 0x202a && code <= 0x202e) ||
          (code >= 0x2066 && code <= 0x2069)
        );
      });
    if (unsafe) {
      throw new PropertyPackageError("PROPERTY_PACKAGE_INVALID_SOURCE", 400);
    }
  }
  return Object.freeze(document);
}

export function propertyDraftCopy(document: PropertyPackageDocument): string {
  const identity = `Realtor: ${document.realtor}, ${document.brokerage}\nLoan officer: ${document.loanOfficer}, ${document.lender}\n${document.nmls}`;
  return (
    [
      DRAFT_NOTICE,
      document.permissions,
      NO_PHOTO_NOTICE,
      "SOCIAL POST DRAFT",
      `Open house: ${document.address}`,
      document.eventLabel,
      document.description,
      identity,
      document.disclosure,
      "EMAIL DRAFT",
      `Subject: Open house at ${document.address}`,
      `Take a look at the upcoming open house at ${document.address}.`,
      `When: ${document.eventLabel}`,
      document.description,
      identity,
      document.disclosure,
      "SMS DRAFT",
      `Open house at ${document.address}. ${document.eventLabel}. Hosted by ${document.realtor}, ${document.brokerage}.`,
      "Add an approved public link and review the recipient's messaging permission before sending. No message has been sent.",
      "REVIEW LINK ONLY",
      document.qrDestination,
      PREVIEW_NOTICE,
    ].join("\n\n") + "\n"
  );
}
