import {
  CampaignVersionSchema,
  PreflightResultSchema,
  type CampaignVersion,
} from "@oalo/contracts";
import { WEBINAR_AD_RULESET_REF } from "@oalo/domain";
import { canonicalCampaignHash } from "./canonical-hash.js";

/** The adapter must freshly verify current source standing and bytes, scoped publication
 * ownership/public capability, and deterministic regeneration of both frozen raster outputs.
 * Resolving this method is authoritative evidence, never a browser supplied boolean. */
export interface WebinarAdEvidencePort {
  assertCurrent(
    input: Readonly<{ version: Readonly<CampaignVersion>; checkedAt: Date }>,
  ): Promise<void>;
}

export class CampaignWebinarEvidenceUnavailableError extends Error {
  public constructor() {
    super("Current webinar template, publication and finished creative evidence is required.");
    this.name = "CampaignWebinarEvidenceUnavailableError";
  }
}

export function assertWebinarAdPreflightCurrent(
  untrustedVersion: unknown,
  untrustedPreflight: unknown,
): void {
  const version = CampaignVersionSchema.parse(untrustedVersion);
  if (version.manifest.blueprintId !== "webinar-ad") return;
  const preflight = PreflightResultSchema.parse(untrustedPreflight);
  const { resultHash, ...body } = preflight;
  if (
    preflight.blocking ||
    preflight.findings.some((finding) => finding.severity === "blocking") ||
    canonicalCampaignHash(body) !== resultHash ||
    preflight.manifestHash !== version.manifestHash ||
    preflight.campaignRef !== version.campaignRef ||
    preflight.campaignVersionRef !== version.campaignVersionRef ||
    preflight.rulesetVersionRef !== WEBINAR_AD_RULESET_REF ||
    version.inputVersions.rulesetVersionRef !== WEBINAR_AD_RULESET_REF ||
    canonicalCampaignHash(preflight.inputVersions) !== canonicalCampaignHash(version.inputVersions)
  ) {
    throw new Error("A current passing preflight is required before approval");
  }
}

export async function assertWebinarAdEvidenceCurrent(
  untrustedVersion: unknown,
  checkedAt: Date,
  port: WebinarAdEvidencePort | undefined,
): Promise<void> {
  const version = CampaignVersionSchema.parse(untrustedVersion);
  if (version.manifest.blueprintId !== "webinar-ad") return;
  if (!Number.isFinite(checkedAt.getTime()) || typeof port?.assertCurrent !== "function") {
    throw new CampaignWebinarEvidenceUnavailableError();
  }
  const manifest = version.manifest;
  if (
    canonicalCampaignHash(manifest) !== version.manifestHash ||
    canonicalCampaignHash(manifest.destination) !== manifest.destinationHash ||
    manifest.destination.publisherActorRef !== version.createdBy ||
    Date.parse(manifest.schedule.endsAt) <= checkedAt.getTime() ||
    Date.parse(manifest.destination.expiresAt) <= checkedAt.getTime() ||
    (manifest.destination.eventStartsAt !== null &&
      Date.parse(manifest.destination.eventStartsAt) <= checkedAt.getTime())
  ) {
    throw new CampaignWebinarEvidenceUnavailableError();
  }
  await port.assertCurrent({ version, checkedAt });
}
