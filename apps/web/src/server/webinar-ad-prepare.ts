import { createHash } from "node:crypto";
import {
  canonicalCampaignHash,
  assertMayExecuteCampaignMutation,
  createCampaignVersion,
  runCampaignPreflight,
  CampaignResourceNotAccessibleError,
  CampaignVersionConflictError,
  type AuthenticatedPrincipal,
  type CampaignVersionRepository,
} from "@oalo/application";
import {
  CampaignVersionSchema,
  WebinarAdPreparationRequestSchema,
  WebinarAdCampaignManifestSchema,
  type CampaignVersion,
  type WebinarDestination,
  type PreflightRules,
  type WebinarAdCampaignManifest,
} from "@oalo/contracts";
import { WEBINAR_AD_RULESET_REF } from "@oalo/application";

import { readSavedAdBrand, type SavedAdBrand } from "./ad-brand-read.js";
import type { CampaignPersistenceAdapter } from "./campaign-persistence-runtime.js";
import { webinarTemplateEvidence } from "./webinar-ad-art.js";
import { prepareWebinarAdRasters } from "./webinar-ad-raster.js";
import { resolveOwnWebinarDestination } from "./webinar-destination.js";

export class WebinarPreparationError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
export class WebinarIncompleteSaveError extends WebinarPreparationError {
  constructor(
    readonly campaignRef: string,
    readonly campaignVersionRef: string,
  ) {
    super(503, "WEBINAR_SAVE_INCOMPLETE");
  }
}
export interface WebinarPreparationPorts {
  readonly adapter: CampaignPersistenceAdapter;
  readonly readBrand?: () => Promise<SavedAdBrand>;
  readonly resolveDestination?: (id: string, now: Date) => Promise<WebinarDestination>;
  readonly render?: typeof prepareWebinarAdRasters;
  readonly now?: () => Date;
}
/** References are reserved before rendering and never include their own resulting hashes. */
export function webinarReservedReferences(
  principal: Readonly<AuthenticatedPrincipal>,
  requestId: string,
  campaignRef?: string,
) {
  const identity = canonicalCampaignHash({
    domain: "webinar-ad-request-v1",
    locationRef: principal.locationRef,
    actorRef: principal.actorRef,
    requestId,
  });
  return {
    campaignRef: campaignRef ?? `campaign_${identity.slice(0, 40)}`,
    campaignVersionRef: `campaignversion_${identity.slice(0, 40)}`,
  };
}
export function webinarPreflightRules(
  manifest: WebinarAdCampaignManifest,
  partnerNames: readonly string[],
  now: Date,
): PreflightRules {
  return {
    schemaVersion: 1,
    rulesetVersionRef: WEBINAR_AD_RULESET_REF,
    evaluatedAt: now.toISOString(),
    minimumImageWidth: 1080,
    minimumImageHeight: 1080,
    earliestStartAt: now.toISOString(),
    allowedMergeTokens: [],
    bannedPhrases: ["guaranteed approval", "no credit check"],
    allowedClaims: [],
    allowsFinancingTerms: false,
    minimumDailyBudgetMinor: 500,
    maximumDailyBudgetMinor: 100000,
    maximumTotalBudgetMinor: 500000,
    warnings: [],
    webinarAd: {
      templateSourceHash: manifest.template.sourceHash,
      destinationHash: manifest.destinationHash,
      tallSha256: manifest.images[0].contentSha256,
      squareSha256: manifest.images[1].contentSha256,
      rendererVersion: manifest.images[0].rendererVersion,
      partnerNames: [...partnerNames],
    },
  };
}
/** A genuinely new edit checks the aggregate while its existing repository lock is held.
 * A committed exact retry is resolved first, even if a later version now exists. */
function guardedRepository(
  base: CampaignVersionRepository,
  expected: string | undefined,
  reserved: string,
  onExisting: (version: CampaignVersion) => void,
): CampaignVersionRepository {
  return {
    run: (work) =>
      base.run(async (transaction) =>
        work({
          getByCampaignVersionRef: (location, version) =>
            transaction.getByCampaignVersionRef(location, version),
          append: (version) => transaction.append(version),
          async getLatestVersionNo(location, campaign) {
            const latest = await transaction.getLatestVersionNo(location, campaign);
            const replay = await transaction.getByCampaignVersionRef(location, reserved);
            if (replay !== undefined) onExisting(replay);
            if (replay === undefined && expected !== undefined) {
              const previous = await transaction.getByCampaignVersionRef(location, expected);
              if (
                previous === undefined ||
                previous.campaignRef !== campaign ||
                previous.versionNo !== latest
              )
                throw new WebinarPreparationError(409, "WEBINAR_VERSION_CONFLICT");
            }
            return latest;
          },
        }),
      ),
  };
}
export async function prepareWebinarAdVersion(
  raw: unknown,
  principal: Readonly<AuthenticatedPrincipal>,
  environment: unknown,
  ports: WebinarPreparationPorts,
) {
  assertMayExecuteCampaignMutation(principal);
  if (principal.authenticationMode === "local_synthetic")
    throw new WebinarPreparationError(403, "WEBINAR_REAL_WORKSPACE_REQUIRED");
  const parsed = WebinarAdPreparationRequestSchema.parse(raw);
  const input = {
    ...parsed,
    requestId: parsed.requestId.toLowerCase(),
    publicationId: parsed.publicationId.toLowerCase(),
  };
  if (input.campaignRef !== undefined) {
    const versions = await ports.adapter.readRepository.listVersionsOf(input.campaignRef);
    const existing = versions.find(
      (candidate) => candidate.version.campaignVersionRef === input.expectedCampaignVersionRef,
    )?.version;
    if (
      existing === undefined ||
      existing.manifest.blueprintId !== "webinar-ad" ||
      existing.locationRef !== principal.locationRef ||
      existing.createdBy !== principal.actorRef
    )
      throw new CampaignResourceNotAccessibleError();
  }
  const now = (ports.now ?? (() => new Date()))();
  const template = webinarTemplateEvidence(input.templateId, input.templateVersion);
  const brand = await (ports.readBrand ?? (() => readSavedAdBrand(principal, environment)))();
  if (
    !brand.saved ||
    !brand.band.name.trim() ||
    !brand.band.company.trim() ||
    !/^\d{4,12}$/u.test(brand.band.nmls) ||
    !/^\d{4,12}$/u.test(brand.band.companyNmls) ||
    !brand.band.disclosureLine.trim() ||
    !brand.leadFormWording.trim()
  )
    throw new WebinarPreparationError(422, "WEBINAR_BRAND_INCOMPLETE");
  const destination = await (
    ports.resolveDestination ??
    ((id, checkedAt) => resolveOwnWebinarDestination(principal, id, environment, checkedAt))
  )(input.publicationId, now);
  if (destination.publisherActorRef !== principal.actorRef)
    throw new CampaignResourceNotAccessibleError();
  const endsAt = new Date(
    Math.min(
      Date.parse(`${input.endsOn}T23:59:59.000Z`),
      Date.parse(destination.expiresAt),
      destination.eventStartsAt === null ? Infinity : Date.parse(destination.eventStartsAt),
    ),
  ).toISOString();
  if (Date.parse(endsAt) <= now.getTime())
    throw new WebinarPreparationError(422, "WEBINAR_SCHEDULE_INVALID");
  const advertiser = {
    name: brand.band.name,
    title: brand.band.title,
    company: brand.band.company,
    nmls: brand.band.nmls,
    companyNmls: brand.band.companyNmls,
    colorPresetId: brand.band.colorPresetId,
  };
  const content = {
    headline: input.headline,
    body: input.primaryText,
    callToAction: "Learn more" as const,
    disclosureText: brand.band.disclosureLine,
    consentText: brand.leadFormWording,
    claims: [],
    mergeTokens: [],
    financingTerms: [],
  };
  const refs = webinarReservedReferences(principal, input.requestId, input.campaignRef);
  const rendered = await (ports.render ?? prepareWebinarAdRasters)({
    template,
    advertiser,
    content,
  });
  if (
    rendered.length !== 2 ||
    rendered[0].shape !== "tall" ||
    rendered[1].shape !== "square" ||
    rendered.some(
      (image) =>
        image.bytes.byteLength !== image.byteLength ||
        image.byteLength > 2 * 1024 * 1024 ||
        createHash("sha256").update(image.bytes).digest("hex") !== image.contentSha256,
    )
  )
    throw new WebinarPreparationError(503, "WEBINAR_RASTER_CHANGED");
  const images = rendered.map(({ bytes: _bytes, ...image }) => ({
    ...image,
    assetRef: `asset_${canonicalCampaignHash({ ...refs, shape: image.shape, digest: image.contentSha256 }).slice(0, 40)}`,
    altText: `${input.headline}. Lender identity and disclosure.`,
  }));
  const inputVersions = {
    blueprintVersionRef: "blueprint_webinarAd001",
    brandProfileVersionRef: brand.brandProfileVersionRef,
    complianceProfileVersionRef: "complianceprofile_webinar001",
    partnerProfileVersionRef: "partnerprofile_none001",
    routingProfileVersionRef: "routingprofile_nativeWebinar001",
    rulesetVersionRef: WEBINAR_AD_RULESET_REF,
  };
  const evidence = {
    template,
    destination,
    destinationHash: canonicalCampaignHash(destination),
    advertiser,
    content,
    images,
    schedule: { startsAt: null, endsAt },
    meta: {
      enabled: false,
      platform: "meta",
      specialAdCategory: "HOUSING",
      placements: ["facebook_feed"],
      targeting: {
        country: "US",
        regions: [...input.places.states],
        cities: [...input.places.cities],
        zipCodes: [],
        customAudienceRefs: [],
        protectedDimensions: [],
      },
      dailyBudgetMinor: Math.round(input.dailyBudgetDollars * 100),
      totalBudgetMinor: Math.round(input.totalBudgetDollars * 100),
    },
  };
  const manifest = WebinarAdCampaignManifestSchema.parse({
    schemaVersion: 1,
    blueprintId: "webinar-ad",
    requestHash: canonicalCampaignHash({ input, evidence, inputVersions, refs }),
    ...evidence,
  });
  const versionInput = {
    schemaVersion: 1,
    locationRef: principal.locationRef,
    ...refs,
    inputVersions,
    manifest,
    createdBy: principal.actorRef,
  };
  // Refuse incomplete content before any immutable append. The final check uses the real allocated version.
  const prospective = CampaignVersionSchema.parse({
    ...versionInput,
    versionNo: 1,
    createdAt: now.toISOString(),
    manifestHash: canonicalCampaignHash(manifest),
  });
  const initialPreflight = runCampaignPreflight(
    prospective,
    webinarPreflightRules(manifest, brand.partnerNames, now),
  );
  if (initialPreflight.blocking)
    throw new WebinarPreparationError(422, "WEBINAR_PREFLIGHT_BLOCKED");
  let duplicate = false;
  const version = await createCampaignVersion(
    { version: versionInput, createdAt: now },
    guardedRepository(
      ports.adapter.versionRepository,
      input.expectedCampaignVersionRef,
      refs.campaignVersionRef,
      () => {
        duplicate = true;
      },
    ),
  );
  let record, previous, preflight;
  try {
    previous = (await ports.adapter.readRepository.listVersionsOf(refs.campaignRef)).find(
      (item) => item.version.campaignVersionRef === refs.campaignVersionRef,
    );
    preflight =
      previous?.preflight ??
      runCampaignPreflight(
        version,
        webinarPreflightRules(manifest, brand.partnerNames, new Date(version.createdAt)),
      );
    record = await ports.adapter.persistDraft(version, preflight);
  } catch {
    throw new WebinarIncompleteSaveError(version.campaignRef, version.campaignVersionRef);
  }
  if (record.version.campaignVersionRef !== version.campaignVersionRef && !duplicate)
    throw new CampaignVersionConflictError();
  return { version, preflight, record, duplicate, savedDecision: previous?.approval?.decision };
}
