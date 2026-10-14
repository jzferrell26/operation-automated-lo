import {
  assertWebinarAdEvidenceCurrent,
  canonicalCampaignHash,
  type AuthenticatedPrincipal,
  type WebinarAdEvidencePort,
} from "@oalo/application";
import { CampaignVersionSchema, type CampaignVersion } from "@oalo/contracts";
import { loadVerifiedWebinarArt } from "./webinar-ad-art.js";
import { regenerateWebinarAdRasters } from "./webinar-ad-raster.js";
import { resolveCampaignWebinarDestination } from "./webinar-destination.js";
import { WebinarPreparationError } from "./webinar-ad-prepare.js";

export function createWebinarAdEvidencePort(
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
): WebinarAdEvidencePort {
  return {
    async assertCurrent({ version: raw, checkedAt }) {
      const version = CampaignVersionSchema.parse(raw);
      if (
        version.locationRef !== principal.locationRef ||
        version.manifest.blueprintId !== "webinar-ad"
      )
        throw new WebinarPreparationError(404, "NOT_FOUND");
      await loadVerifiedWebinarArt(version.manifest.template);
      const destination = await resolveCampaignWebinarDestination(
        principal,
        version.campaignRef,
        version.campaignVersionRef,
        environment,
        checkedAt,
      );
      if (canonicalCampaignHash(destination) !== version.manifest.destinationHash)
        throw new WebinarPreparationError(409, "DESTINATION_CHANGED");
      await regenerateWebinarAdRasters(version.manifest);
    },
  };
}
export type WebinarCurrentEvidence =
  Readonly<{ available: true }> | Readonly<{ available: false; error: string }>;
export async function webinarCurrentEvidence(
  version: Readonly<CampaignVersion>,
  port: WebinarAdEvidencePort,
  checkedAt = new Date(),
): Promise<WebinarCurrentEvidence> {
  try {
    await assertWebinarAdEvidenceCurrent(version, checkedAt, port);
    return { available: true };
  } catch (error) {
    // Historical evidence stays readable, while every failed current check suppresses actions.
    const code =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[A-Z][A-Z0-9_]{2,63}$/u.test(error.code)
        ? error.code
        : "WEBINAR_EVIDENCE_UNAVAILABLE";
    return { available: false, error: code };
  }
}
