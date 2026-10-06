import { calculateFinancingComparison, canonicalCampaignHash } from "@oalo/application";
import type { CampaignVersion, FinancingCampaignManifest } from "@oalo/contracts";

export class FinancingSaveError extends Error {
  constructor(
    public readonly code:
      | "FINANCING_BRAND_REQUIRED"
      | "FINANCING_PARTNER_MISSING"
      | "FINANCING_SAVE_CONFLICT"
      | "FINANCING_QUOTE_IN_FUTURE"
      | "FINANCING_NOT_FOUND"
      | "FINANCING_INTEGRITY_FAILED",
    public readonly status: 400 | 404 | 409 | 503,
  ) {
    super(code);
    this.name = "FinancingSaveError";
  }
}

/** All report and reuse reads verify the same saved calculation and source. */
export function verifyFinancingVersion(version: CampaignVersion): FinancingCampaignManifest {
  if (version.manifest.blueprintId !== "financing-comparison")
    throw new FinancingSaveError("FINANCING_NOT_FOUND", 404);
  if (
    canonicalCampaignHash(version.manifest) !== version.manifestHash ||
    canonicalCampaignHash(calculateFinancingComparison(version.manifest.financing)) !==
      canonicalCampaignHash(version.manifest.calculated)
  ) {
    throw new FinancingSaveError("FINANCING_INTEGRITY_FAILED", 503);
  }
  return version.manifest;
}
