import { canonicalCampaignHash, runCampaignPreflight } from "@oalo/application";
import {
  CampaignVersionSchema,
  WebinarAdCampaignManifestSchema,
  type PreflightRules,
  type WebinarAdCampaignManifest,
} from "@oalo/contracts";
import { libraryAdRulesFor, libraryAdVersion } from "../ads-library/library-ad-fixtures.js";

export const WEBINAR_NOW = new Date("2026-10-01T17:00:00.000Z");
export async function webinarVersion(change?: (manifest: WebinarAdCampaignManifest) => void) {
  const legacy = await libraryAdVersion();
  if (legacy.manifest.blueprintId !== "library-ad") throw new Error("Wrong fixture blueprint");
  const destination = {
    publicationId: "00000000-0000-4000-8000-000000000801",
    kind: "live-webinar" as const,
    sourceRevision: "00000000-0000-4000-8000-000000000802",
    publisherActorRef: legacy.createdBy,
    snapshotHash: "a".repeat(64),
    publicUrl: "https://example.test/f/00000000-0000-4000-8000-000000000801",
    publishedAt: "2026-10-01T12:00:00.000Z",
    expiresAt: "2026-10-15T18:00:00.000Z",
    eventStartsAt: "2026-10-12T18:00:00.000Z",
  };
  const manifest = WebinarAdCampaignManifestSchema.parse({
    schemaVersion: 1,
    blueprintId: "webinar-ad",
    requestHash: "1".repeat(64),
    template: {
      id: "webinar-plan-first",
      version: 1,
      goal: "planning",
      sourceHash: "2".repeat(64),
      tallSha256: "3".repeat(64),
      squareSha256: "4".repeat(64),
      rightsBasis: "platform-original",
    },
    destination,
    destinationHash: canonicalCampaignHash(destination),
    content: {
      ...legacy.manifest.content,
      headline: "Make a homebuying plan",
      body: "Learn the path from planning to closing.",
      callToAction: "Learn more",
    },
    images: [
      {
        shape: "tall",
        assetRef: "webinarimage_tall001",
        rendererVersion: "1.0.0",
        contentSha256: "5".repeat(64),
        width: 1080,
        height: 1350,
        byteLength: 9000,
        altText: "Homebuying education with lender identity",
      },
      {
        shape: "square",
        assetRef: "webinarimage_square001",
        rendererVersion: "1.0.0",
        contentSha256: "6".repeat(64),
        width: 1080,
        height: 1080,
        byteLength: 8000,
        altText: "Homebuying education with lender identity",
      },
    ],
    advertiser: {
      ...legacy.manifest.advertiser,
      name: "Alex Morgan",
      company: "Example Lending",
      companyNmls: "7654321",
    },
    schedule: { startsAt: null, endsAt: "2026-10-12T18:00:00.000Z" },
    meta: { ...legacy.manifest.meta, enabled: false },
  });
  change?.(manifest);
  return CampaignVersionSchema.parse({
    ...legacy,
    manifest,
    manifestHash: canonicalCampaignHash(manifest),
    inputVersions: { ...legacy.inputVersions, rulesetVersionRef: "ruleset_webinarAd001" },
  });
}
export function webinarRules(manifest: WebinarAdCampaignManifest): PreflightRules {
  const legacy = libraryAdRulesFor();
  const { libraryAd: _unused, ...shared } =
    "libraryAd" in legacy ? legacy : { ...legacy, libraryAd: undefined };
  return {
    ...shared,
    rulesetVersionRef: "ruleset_webinarAd001",
    evaluatedAt: WEBINAR_NOW.toISOString(),
    webinarAd: {
      templateSourceHash: manifest.template.sourceHash,
      destinationHash: manifest.destinationHash,
      tallSha256: manifest.images[0].contentSha256,
      squareSha256: manifest.images[1].contentSha256,
      rendererVersion: "1.0.0",
      partnerNames: ["Taylor Reed", "Example Realty"],
    },
  };
}
export async function webinarEvidence(change?: (manifest: WebinarAdCampaignManifest) => void) {
  const version = await webinarVersion(change);
  if (version.manifest.blueprintId !== "webinar-ad") throw new Error("Wrong fixture blueprint");
  return {
    version,
    preflight: runCampaignPreflight(version, webinarRules(version.manifest)),
    state: "awaiting_approval" as const,
    rowVersion: 1,
  };
}
