import { createHash } from "node:crypto";
import { z } from "zod";
import {
  WebinarProviderLaunchInputSchema,
  WebinarProviderLaunchSchema,
  WebinarPublisherMediaReceiptSchema,
  WebinarPublisherQualificationSchema,
  type WebinarProviderLaunch,
  type WebinarPublisherQualification,
  type WebinarPublisherMediaReceipt,
} from "@oalo/contracts";

import { canonicalizeJson } from "./canonical-json.js";
import { WEBINAR_PUBLISHER_WIRE_MAPPING_HASH } from "./webinar-publisher-wire.js";
import {
  WebinarPublisherAdRequestSchema,
  WebinarPublisherAdsetRequestSchema,
  WebinarPublisherCampaignRequestSchema,
  WebinarPublisherResponseSchemas,
} from "./webinar-publisher-dtos.js";

export function hashWebinarPublisherValue(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalizeJson(z.json().parse(value))))
    .digest("hex");
}
export function createWebinarPublisherProjection(input: unknown): WebinarProviderLaunch {
  const projection = WebinarProviderLaunchInputSchema.parse(input);
  return WebinarProviderLaunchSchema.parse({
    ...projection,
    projectionHash: hashWebinarPublisherValue(projection),
  });
}
export function assertWebinarPublisherProjection(input: unknown): WebinarProviderLaunch {
  const projection = WebinarProviderLaunchSchema.parse(input);
  const { projectionHash, ...body } = projection;
  if (hashWebinarPublisherValue(body) !== projectionHash)
    throw new Error("Webinar projection digest mismatch.");
  return projection;
}
export function usdMinorToNativeAmount(minor: number): number {
  const value = z.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(minor);
  const major = value / 100;
  if (Math.round(major * 100) !== value)
    throw new Error("Webinar money is not exactly representable.");
  return major;
}

export type WebinarPublisherCompileResult =
  | Readonly<{
      ok: false;
      code: "PROVIDER_CONTRACT_UNQUALIFIED" | "CAMPAIGN_EXPIRED" | "MEDIA_UNQUALIFIED";
      reasons: readonly string[];
    }>
  | Readonly<{
      ok: true;
      fixtureOnly: boolean;
      projection: WebinarProviderLaunch;
      qualification: WebinarPublisherQualification;
      media: WebinarPublisherMediaReceipt;
      campaign: z.infer<typeof WebinarPublisherCampaignRequestSchema>;
      adset: Omit<z.infer<typeof WebinarPublisherAdsetRequestSchema>, "campaignId">;
      ad: Omit<z.infer<typeof WebinarPublisherAdRequestSchema>, "campaignId" | "adsetId">;
    }>;

export function compileWebinarPublisherDraft(
  input: Readonly<{ projection: unknown; qualification: unknown; media?: unknown; now: string }>,
): WebinarPublisherCompileResult {
  const projection = assertWebinarPublisherProjection(input.projection);
  const now = Date.parse(z.iso.datetime({ offset: true }).parse(input.now));
  if (now >= Date.parse(projection.schedule.endsAt))
    return { ok: false, code: "CAMPAIGN_EXPIRED", reasons: ["campaign_end"] };
  const qualification = WebinarPublisherQualificationSchema.safeParse(input.qualification);
  const reasons: string[] = [];
  if (projection.providerContract.wireMappingHash !== WEBINAR_PUBLISHER_WIRE_MAPPING_HASH)
    reasons.push("native_wire_mapping_changed");
  if (projection.budget.totalSemantics === "hard_cap")
    reasons.push("native_hard_total_cap_undocumented");
  if (!qualification.success) reasons.push("schedule_and_budget_evidence_missing");
  if (qualification.success) {
    const proof = qualification.data;
    if (
      proof.projectionHash !== projection.projectionHash ||
      proof.wireMappingHash !== projection.providerContract.wireMappingHash ||
      proof.locationId !== projection.assets.locationId ||
      proof.adAccountId !== projection.assets.adAccountId ||
      proof.pageId !== projection.assets.pageId ||
      proof.timezone !== projection.assets.timezone ||
      proof.budget.amountMajor !== usdMinorToNativeAmount(projection.budget.dailyBudgetMinor) ||
      proof.schedule.requestEnd !== projection.schedule.endsAt ||
      proof.schedule.observedStop !== projection.schedule.endsAt ||
      Date.parse(proof.observedAt) > now ||
      Date.parse(proof.expiresAt) <= now
    )
      reasons.push("schedule_or_budget_evidence_mismatch");
  }
  if (reasons.length > 0 || !qualification.success)
    return { ok: false, code: "PROVIDER_CONTRACT_UNQUALIFIED", reasons };
  const media = WebinarPublisherMediaReceiptSchema.safeParse(input.media);
  if (
    !media.success ||
    media.data.projectionHash !== projection.projectionHash ||
    media.data.projectionRef !== projection.projectionRef ||
    media.data.assetRef !== projection.creative.assetRef ||
    media.data.digest !== projection.creative.digest ||
    media.data.byteLength !== projection.creative.byteLength ||
    Date.parse(media.data.observedAt) > now ||
    Date.parse(media.data.expiresAt) < Date.parse(projection.schedule.endsAt)
  ) {
    return {
      ok: false,
      code: "MEDIA_UNQUALIFIED",
      reasons: ["exact_reviewed_png_delivery_unproven"],
    };
  }
  const name = `OALO Webinar ${projection.projectionHash.slice(0, 16)}`;
  const campaign = WebinarPublisherCampaignRequestSchema.parse({
    locationId: projection.assets.locationId,
    name,
    objective: projection.objective,
    specialAdCategories: projection.specialAdCategories,
    isCampaignBudget: false,
    adsetBudgetSharing: false,
  });
  const adset = {
    locationId: projection.assets.locationId,
    name,
    pageId: projection.assets.pageId,
    audience: {
      geoLocations: projection.geographies.map(
        ({ key, name: geoName, type, selectionType, countryCode }) => ({
          key,
          name: geoName,
          type,
          selectionType,
          countryCode,
        }),
      ),
      placementType: "manual" as const,
      placements: { facebook: ["feed"] as ["feed"] },
    },
    budget: {
      budgetType: "DAILY" as const,
      amount: usdMinorToNativeAmount(projection.budget.dailyBudgetMinor),
      scheduleEndDate: qualification.data.schedule.requestEnd,
    },
  };
  const ad = {
    locationId: projection.assets.locationId,
    name,
    mediaType: "SINGLE" as const,
    media: [
      { src: media.data.url, type: "image" as const, name: `${projection.creative.assetRef}.png` },
    ] as [{ src: string; type: "image"; name: string }],
    multiAdvertiserAds: false as const,
    primaryTexts: [{ text: projection.copy.primaryText }] as [{ text: string }],
    headlines: [{ text: projection.copy.headline }] as [{ text: string }],
    descriptions: [{ text: projection.copy.description }] as [{ text: string }],
    cta: projection.cta,
    destinationLink: projection.destination.publicUrl,
  };
  return {
    ok: true,
    fixtureOnly: qualification.data.kind === "local_synthetic",
    projection,
    qualification: qualification.data,
    media: media.data,
    campaign,
    adset,
    ad,
  };
}

export function materializeWebinarPublisherDraft(
  compiled: Extract<WebinarPublisherCompileResult, { ok: true }>,
  ids: Readonly<{ campaignId: string; adsetId: string }>,
) {
  return {
    campaign: compiled.campaign,
    adset: WebinarPublisherAdsetRequestSchema.parse({
      ...compiled.adset,
      campaignId: ids.campaignId,
    }),
    ad: WebinarPublisherAdRequestSchema.parse({
      ...compiled.ad,
      campaignId: ids.campaignId,
      adsetId: ids.adsetId,
    }),
  };
}

export function compareWebinarPublisherReadBack(
  compiled: Extract<WebinarPublisherCompileResult, { ok: true }>,
  raw: unknown,
  ids: Readonly<{ campaignId: string; adsetId: string; adId: string }>,
): Readonly<{ matches: boolean; differingFields: readonly string[]; readBackHash: string }> {
  const actual = WebinarPublisherResponseSchemas.linked.parse(raw);
  const differingFields: string[] = [];
  const equal = (name: string, left: unknown, right: unknown) => {
    if (hashWebinarPublisherValue(left) !== hashWebinarPublisherValue(right))
      differingFields.push(name);
  };
  equal(
    "campaign",
    {
      id: actual.id,
      name: actual.name,
      locationId: actual.locationId,
      fbAdAccountId: actual.fbAdAccountId,
      objective: actual.objective,
      specialAdCategories: actual.specialAdCategories,
    },
    {
      id: ids.campaignId,
      name: compiled.campaign.name,
      locationId: compiled.projection.assets.locationId,
      fbAdAccountId: compiled.projection.assets.adAccountId,
      objective: compiled.campaign.objective,
      specialAdCategories: compiled.campaign.specialAdCategories,
    },
  );
  if (actual.adsets.length !== 1 || actual.adsets[0]?.ads.length !== 1)
    differingFields.push("cardinality");
  const adset = actual.adsets[0];
  if (adset !== undefined) {
    const materialized = materializeWebinarPublisherDraft(compiled, ids);
    equal(
      "adset",
      {
        locationId: compiled.projection.assets.locationId,
        id: adset.id,
        name: adset.name,
        campaignId: adset.campaignId,
        pageId: adset.pageId,
        audience: adset.audience,
        budget: adset.budget,
      },
      { ...materialized.adset, id: ids.adsetId },
    );
    const ad = adset.ads[0];
    if (ad !== undefined) {
      equal(
        "ad",
        {
          locationId: compiled.projection.assets.locationId,
          id: ad.id,
          name: ad.name,
          campaignId: ad.campaignId,
          adsetId: ad.adsetId,
          mediaType: ad.mediaType,
          media: ad.media,
          multiAdvertiserAds: ad.multiAdvertiserAds,
          primaryTexts: ad.primaryTexts,
          headlines: ad.headlines,
          descriptions: ad.descriptions,
          cta: ad.cta,
          destinationLink: ad.destinationLink,
        },
        { ...materialized.ad, id: ids.adId },
      );
    }
  }
  return {
    matches: differingFields.length === 0,
    differingFields,
    readBackHash: hashWebinarPublisherValue(actual),
  };
}
