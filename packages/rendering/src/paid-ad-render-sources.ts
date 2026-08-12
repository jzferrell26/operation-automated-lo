import { createHash } from "node:crypto";

import {
  authorizePaidAdProjectionForRendering,
  type PaidAdBrandAttestationAuthority,
} from "@oalo/application";
import {
  PaidAdBrandPreflightEvidenceSchema,
  PaidAdRenderAssetManifestSchema,
  type PaidAdProjection,
  type PaidAdRenderAsset,
  type PaidAdRenderAssetManifest,
  type PaidAdRenderAssetManifestInput,
} from "@oalo/contracts";
import { z } from "zod";

import type { RenderSourceDocument } from "./campaign-render-sources.js";

const PaidAdCreativeFormatSchema = z.enum(["meta-square", "meta-story"]);
export type PaidAdCreativeFormat = z.infer<typeof PaidAdCreativeFormatSchema>;

export interface PaidAdRenderAssetAuthority {
  resolveAuthorizedManifest(
    input: Readonly<{
      campaignVersionRef: string;
      paidAdProjectionHash: string;
      collateralProjectionHash: string;
      brandBoundaryRulesHash: string;
      preflightResultHash: string;
      identityAssetRefs: readonly string[];
      propertyImageAssetRefs: readonly string[];
    }>,
  ): unknown | Promise<unknown>;
}

export interface PaidAdRenderAuthorization {
  readonly paidAdProjection: unknown;
  readonly evidence: unknown;
  readonly brandAuthority: PaidAdBrandAttestationAuthority;
  readonly assetAuthority: PaidAdRenderAssetAuthority;
}

export interface PaidAdRenderSourceDocument extends RenderSourceDocument {
  readonly artifactType: PaidAdCreativeFormat;
  readonly locationRef: string;
  readonly campaignRef: string;
  readonly campaignVersionRef: string;
  readonly projectionHash: string;
  readonly templateId: "open-house-boost-paid-ad";
  readonly templateVersion: string;
  readonly approvalPreviewRef: string;
  readonly assetManifest: PaidAdRenderAssetManifest;
  readonly sourceHash: string;
}

type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

function canonicalize(value: CanonicalValue): CanonicalValue {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, child]) => [key, canonicalize(child)]),
  );
}

export function paidAdRenderAssetManifestHash(manifest: PaidAdRenderAssetManifestInput): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(manifest)))
    .digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function contactLines(identity: PaidAdProjection["advertiserIdentity"]): readonly string[] {
  const contact = identity.contactInformation;
  if (contact === undefined) return [];
  return [contact.phone, contact.email, contact.websiteUrl].filter(
    (value): value is string => value !== undefined,
  );
}

function unique(values: readonly (string | undefined)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}

function sameMembers(left: readonly string[], right: readonly string[]): boolean {
  const sortedLeft = [...left].sort((a, b) => a.localeCompare(b, "en"));
  const sortedRight = [...right].sort((a, b) => a.localeCompare(b, "en"));
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  );
}

function assetUrl(asset: PaidAdRenderAsset): string {
  return `/media/${encodeURIComponent(asset.assetRef)}/${asset.sha256}`;
}

function percentage(value: number): string {
  return `${String(Math.round(value * 10_000) / 100)}%`;
}

export async function renderPaidAdCreativeSource(
  authorization: PaidAdRenderAuthorization,
  untrustedFormat: unknown,
): Promise<PaidAdRenderSourceDocument> {
  const evidence = PaidAdBrandPreflightEvidenceSchema.parse(authorization.evidence);
  const projection = await authorizePaidAdProjectionForRendering(
    authorization.paidAdProjection,
    evidence,
    authorization.brandAuthority,
  );
  const identityAssetRefs = unique([
    projection.advertiserIdentity.logoAssetRef,
    projection.advertiserIdentity.imageAssetRef,
    ...projection.creative.identityAssetRefs,
  ]);
  const propertyImageAssetRefs = unique(projection.creative.propertyImageAssetRefs);
  const assetManifest = PaidAdRenderAssetManifestSchema.parse(
    await authorization.assetAuthority.resolveAuthorizedManifest({
      campaignVersionRef: projection.campaignVersionRef,
      paidAdProjectionHash: projection.projectionHash,
      collateralProjectionHash: evidence.collateralProjectionHash,
      brandBoundaryRulesHash: evidence.brandBoundaryRulesHash,
      preflightResultHash: evidence.resultHash,
      identityAssetRefs,
      propertyImageAssetRefs,
    }),
  );
  const { manifestHash: _manifestHash, ...assetManifestInput } = assetManifest;
  if (
    paidAdRenderAssetManifestHash(assetManifestInput) !== assetManifest.manifestHash ||
    assetManifest.campaignVersionRef !== projection.campaignVersionRef ||
    assetManifest.paidAdProjectionHash !== projection.projectionHash ||
    !sameMembers(
      assetManifest.identityAssets.map((asset) => asset.assetRef),
      identityAssetRefs,
    ) ||
    !sameMembers(
      assetManifest.propertyAssets.map((asset) => asset.assetRef),
      propertyImageAssetRefs,
    )
  ) {
    throw new Error("Paid-ad rendering requires an exact authorized paid-only asset manifest");
  }
  const format = PaidAdCreativeFormatSchema.parse(untrustedFormat);
  const viewport =
    format === "meta-square" ? { width: 1080, height: 1080 } : { width: 1080, height: 1920 };
  const safeZone =
    format === "meta-square"
      ? assetManifest.creativeSafeZones.metaSquare
      : assetManifest.creativeSafeZones.metaStory;
  const propertyImages = propertyImageAssetRefs
    .map((assetRef) => assetManifest.propertyAssets.find((asset) => asset.assetRef === assetRef))
    .map((asset) => {
      if (asset === undefined) throw new Error("Paid-ad property asset is not authorized");
      return `<img class="property-image" src="${escapeHtml(assetUrl(asset))}" alt="" style="object-position:${percentage(asset.focalPoint.x)} ${percentage(asset.focalPoint.y)}">`;
    })
    .join("");
  const identityImages = identityAssetRefs
    .map((assetRef) => assetManifest.identityAssets.find((asset) => asset.assetRef === assetRef))
    .map((asset) => {
      if (asset === undefined) throw new Error("Paid-ad identity asset is not authorized");
      return `<img class="identity-image" src="${escapeHtml(assetUrl(asset))}" alt="${escapeHtml(projection.advertiserIdentity.displayName)}">`;
    })
    .join("");
  const contact = contactLines(projection.advertiserIdentity)
    .map((value) => `<span>${escapeHtml(value)}</span>`)
    .join("");
  const disclosure = projection.creative.disclosureBlocks.map(escapeHtml).join(" ");
  const safeZoneValue = [safeZone.top, safeZone.right, safeZone.bottom, safeZone.left]
    .map(percentage)
    .join(",");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(projection.copy.headline)}</title><style>html,body{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#07111f;color:#fff}.paid-ad{box-sizing:border-box;position:relative;overflow:hidden;width:100%;height:100%;background:#07111f}.property-gallery{position:absolute;inset:0;display:grid;grid-auto-flow:column;grid-auto-columns:1fr}.property-image{width:100%;height:100%;min-width:0;object-fit:cover}.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(7,17,31,.08),rgba(7,17,31,.9))}.creative-copy{position:absolute;display:flex;flex-direction:column;justify-content:flex-end;gap:24px;top:${percentage(safeZone.top)};right:${percentage(safeZone.right)};bottom:${percentage(safeZone.bottom)};left:${percentage(safeZone.left)}}h1{font-size:64px;line-height:1.05;margin:0}p{font-size:32px;line-height:1.3;margin:0}.identity{display:flex;align-items:center;gap:16px}.identity-images{display:flex;align-items:center;gap:12px}.identity-image{display:block;max-width:180px;max-height:96px;object-fit:contain}.identity-text{display:flex;flex-direction:column;gap:8px}.identity strong{font-size:36px}.identity span,.disclosure{font-size:24px}.cta{font-weight:700}</style></head><body><main class="paid-ad" data-projection-scope="paid_ad" data-projection-hash="${projection.projectionHash}" data-template-id="${projection.template.id}" data-template-version="${projection.template.version}" data-asset-manifest-hash="${assetManifest.manifestHash}" data-safe-zone="${safeZoneValue}"><div class="property-gallery" aria-hidden="true">${propertyImages}</div><div class="scrim" aria-hidden="true"></div><section class="creative-copy"><h1>${escapeHtml(projection.creative.headline)}</h1><p>${escapeHtml(projection.creative.body)}</p><p class="cta">${escapeHtml(projection.creative.callToActionLabel)}</p><section class="identity" aria-label="Advertiser"><div class="identity-images">${identityImages}</div><div class="identity-text"><strong>${escapeHtml(projection.advertiserIdentity.displayName)}</strong>${contact}</div></section><p class="disclosure">${disclosure}</p></section></main></body></html>`;
  return Object.freeze({
    artifactType: format,
    locationRef: projection.locationRef,
    campaignRef: projection.campaignRef,
    campaignVersionRef: projection.campaignVersionRef,
    html,
    projectionHash: projection.projectionHash,
    templateId: projection.template.id,
    templateVersion: projection.template.version,
    approvalPreviewRef: projection.approvalSummary.previewRef,
    assetManifest,
    viewport: Object.freeze(viewport),
    inputMimeType: "text/html",
    output: Object.freeze({ format: "png" as const, ...viewport }),
    responseHeaders: Object.freeze({
      "cache-control": "private, no-store",
      "content-security-policy":
        "default-src 'none'; base-uri 'none'; connect-src 'none'; font-src 'none'; form-action 'none'; frame-ancestors 'none'; frame-src 'none'; img-src 'self'; object-src 'none'; script-src 'none'; style-src 'unsafe-inline'",
      "x-content-type-options": "nosniff",
    }),
    networkPolicy: "deny-all",
    sourceHash: createHash("sha256").update(html).digest("hex"),
  });
}
