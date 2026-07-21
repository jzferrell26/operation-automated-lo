import { createHash } from "node:crypto";

import {
  ArtifactTypeSchema,
  RenderManifestSchema,
  type ArtifactType,
  type RenderManifest,
} from "@oalo/contracts";
import { z } from "zod";

const UnsafeTextSchema = z
  .string()
  .refine(
    (value) =>
      Array.from(value).every((character) => {
        const codePoint = character.codePointAt(0);
        return (
          codePoint !== undefined &&
          (codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint >= 32) &&
          codePoint !== 127
        );
      }),
    { message: "Public text contains a disallowed control character" },
  )
  .refine((value) => !/[\u202A-\u202E\u2066-\u2069]/u.test(value), {
    message: "Public text contains a bidirectional override character",
  });

const PERFORMANCE_BUDGET = Object.freeze({
  publicPageServerResponseMsP95: 300,
  largestContentfulAssetBytes: 750_000,
});

export const publicCampaignPerformanceBudget = PERFORMANCE_BUDGET;
export const supportedPublicPageWidths = Object.freeze([320, 768, 1440] as const);

export interface RenderSourceDocument {
  readonly artifactType: ArtifactType;
  readonly html: string;
  readonly inputMimeType: "text/html";
  readonly viewport: Readonly<{ width: number; height: number }>;
  readonly output:
    | Readonly<{ format: "html" }>
    | Readonly<{ format: "pdf"; pageSize: "letter"; printBackground: true }>
    | Readonly<{ format: "png"; width: number; height: number }>;
  readonly responseHeaders: Readonly<Record<string, string>>;
  readonly networkPolicy: "deny-all";
}

const BASE_CSS = `
:root{color-scheme:light;font-family:Inter,Arial,sans-serif;background:#fff;color:#172033}
*{box-sizing:border-box}
body{margin:0;background:#fff;color:#172033;line-height:1.5}
a{color:#0b4f6c;text-decoration-thickness:.12em;text-underline-offset:.16em}
a:focus-visible{outline:4px solid #f59e0b;outline-offset:4px}
img{display:block;max-width:100%;height:auto}
.shell{width:min(72rem,100%);margin:0 auto;padding:clamp(1rem,4vw,3rem)}
.hero{display:grid;gap:1.5rem;align-items:center}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(16rem,1fr));gap:1rem}
.gallery img,.photo-missing{width:100%;aspect-ratio:16/9;object-fit:cover;background:#e8edf2;border-radius:.75rem}
.photo-missing{display:grid;place-items:center;color:#334155;font-weight:700}
.identity{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:1rem}
.identity section,.facts,.disclosures{padding:1rem;border:1px solid #cbd5e1;border-radius:.75rem}
.cta{display:inline-block;padding:.85rem 1.1rem;border-radius:.5rem;background:#0b4f6c;color:#fff;font-weight:800}
.consent{font-size:.95rem;color:#334155}
.disclosures{overflow-wrap:anywhere;word-break:normal}
@media (min-width:48rem){.hero{grid-template-columns:1.15fr .85fr}}
`;

const PDF_CSS = `
${BASE_CSS}
@page{size:letter;margin:.5in}
body{font-size:11pt}
.pdf-page{break-after:page;page-break-after:always;min-height:9in;overflow-wrap:anywhere}
.pdf-page:last-child{break-after:auto;page-break-after:auto}
.pdf-photo{max-height:3.25in;width:100%;object-fit:cover}
.pdf-copy{white-space:pre-wrap;overflow-wrap:anywhere}
`;

const CREATIVE_CSS = `
:root{font-family:Inter,Arial,sans-serif;background:#07111f;color:#fff}
*{box-sizing:border-box}
body{margin:0;width:100vw;height:100vh;overflow:hidden;background:#07111f}
.creative{position:relative;width:100%;height:100%;display:grid;grid-template-rows:55% 45%;background:#07111f}
.creative img,.creative-photo{width:100%;height:100%;object-fit:cover;object-position:center;background:#243247}
.creative-copy{display:flex;flex-direction:column;justify-content:center;gap:18px;padding:64px 72px;background:#07111f;color:#fff}
.creative h1{font-size:64px;line-height:1.05;margin:0;overflow-wrap:anywhere}
.creative p{font-size:32px;line-height:1.25;margin:0;overflow-wrap:anywhere}
.creative .disclosure{font-size:28px;line-height:1.25;color:#f8fafc}
.safe-zone{position:absolute;border:2px solid transparent;pointer-events:none}
.story{grid-template-rows:62% 38%}
.story .creative-copy{padding:96px 84px 180px}
.story h1{font-size:76px}
.story p{font-size:38px}
.story .disclosure{font-size:32px}
`;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function percentage(value: number): string {
  return `${String(Number((value * 100).toFixed(4)))}%`;
}

function creativeCss(manifest: RenderManifest, story: boolean): string {
  const focalPoint = manifest.assets[0]?.focalPoint ?? { x: 0.5, y: 0.5 };
  const safeZone = story
    ? manifest.creativeSafeZones.metaStory
    : manifest.creativeSafeZones.metaSquare;
  const width = 1080;
  const height = story ? 1920 : 1080;
  const safeZonePixels = {
    top: Math.round(safeZone.top * height),
    right: Math.round(safeZone.right * width),
    bottom: Math.round(safeZone.bottom * height),
    left: Math.round(safeZone.left * width),
  };
  return `${CREATIVE_CSS}
.creative img{object-position:${percentage(focalPoint.x)} ${percentage(focalPoint.y)}}
.creative .creative-copy{padding:${String(safeZonePixels.top)}px ${String(safeZonePixels.right)}px ${String(safeZonePixels.bottom)}px ${String(safeZonePixels.left)}px}
.safe-zone{top:${percentage(safeZone.top)};right:${percentage(safeZone.right)};bottom:${percentage(safeZone.bottom)};left:${percentage(safeZone.left)}}
`;
}

function validatePublicText(manifest: RenderManifest): void {
  const content = manifest.publicContent;
  for (const value of [
    content.headline,
    content.propertyAddress,
    content.propertyDescription,
    content.openHouseLabel,
    content.loanOfficerDisplayName,
    content.realtorDisplayName,
    content.callToActionLabel,
    ...content.disclosureBlocks,
  ]) {
    UnsafeTextSchema.parse(value);
  }
}

function sha256Base64(value: string): string {
  return createHash("sha256").update(value).digest("base64");
}

function contentSecurityPolicy(css: string): string {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "connect-src 'none'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self'",
    "object-src 'none'",
    "script-src 'none'",
    `style-src 'sha256-${sha256Base64(css)}'`,
  ].join("; ");
}

function approvedImagePath(manifest: RenderManifest, index: number): string | undefined {
  const asset = manifest.assets[index];
  if (asset === undefined) return undefined;
  return `/media/${encodeURIComponent(asset.assetRef)}/${asset.sha256}`;
}

function trackingPath(manifest: RenderManifest): string {
  const trackingRef = `track_${createHash("sha256")
    .update(`${manifest.campaignVersionRef}:${manifest.manifestRef}`)
    .digest("hex")
    .slice(0, 24)}`;
  const query = new URLSearchParams({ v: manifest.campaignVersionRef, t: trackingRef });
  return `${manifest.publicContent.destinationPath}?${query.toString()}`;
}

function documentShell(
  manifest: RenderManifest,
  css: string,
  body: string,
  metadata: Readonly<{ description: string; imagePath?: string }>,
): string {
  const imageMeta =
    metadata.imagePath === undefined
      ? ""
      : `<meta property="og:image" content="${escapeHtml(metadata.imagePath)}">`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(manifest.publicContent.headline)}</title>
<meta name="description" content="${escapeHtml(metadata.description)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(manifest.publicContent.headline)}">
<meta property="og:description" content="${escapeHtml(metadata.description)}">
${imageMeta}
<style>${css}</style>
</head>
<body>${body}</body>
</html>`;
}

function renderGallery(manifest: RenderManifest): string {
  if (manifest.assets.length === 0) {
    return '<div class="photo-missing" role="img" aria-label="Property photo unavailable">Property photo unavailable</div>';
  }
  return manifest.assets
    .map(
      (asset, index) =>
        `<img src="${approvedImagePath(manifest, index)}" alt="Approved property photo ${String(index + 1)}" width="${String(asset.width)}" height="${String(asset.height)}">`,
    )
    .join("");
}

function renderDisclosureBlocks(manifest: RenderManifest): string {
  return manifest.publicContent.disclosureBlocks
    .map((block) => `<p>${escapeHtml(block)}</p>`)
    .join("");
}

function publicPageBody(manifest: RenderManifest): string {
  const content = manifest.publicContent;
  return `<main class="shell">
<header class="hero">
<div><p>${escapeHtml(content.openHouseLabel)}</p><h1>${escapeHtml(content.headline)}</h1><p>${escapeHtml(content.propertyAddress)}</p></div>
<div class="facts"><h2>Property details</h2><p>${escapeHtml(content.propertyDescription)}</p></div>
</header>
<section aria-labelledby="gallery-heading"><h2 id="gallery-heading">Gallery</h2><div class="gallery">${renderGallery(manifest)}</div></section>
<section class="identity" aria-label="Open house team">
<section><h2>Loan officer</h2><p>${escapeHtml(content.loanOfficerDisplayName)}</p></section>
<section><h2>Realtor</h2><p>${escapeHtml(content.realtorDisplayName)}</p></section>
</section>
<section class="disclosures" aria-labelledby="disclosure-heading"><h2 id="disclosure-heading">Required disclosures</h2>${renderDisclosureBlocks(manifest)}</section>
<p id="compliance-version" class="consent">Compliance profile version: ${escapeHtml(manifest.profileVersions.compliance)}</p>
<p id="consent-disclosure-version" class="consent">Consent disclosure version: ${escapeHtml(manifest.consentDisclosureVersion)}</p>
<a class="cta" aria-describedby="compliance-version consent-disclosure-version" href="${escapeHtml(trackingPath(manifest))}">${escapeHtml(content.callToActionLabel)}</a>
</main>`;
}

function splitLongText(value: string, limit = 1_800): readonly string[] {
  if (value.length <= limit) return [value];
  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > limit) {
    const candidate = remaining.slice(0, limit);
    const boundary = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("\n"));
    const splitAt = boundary >= Math.floor(limit * 0.6) ? boundary : limit;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function pdfBody(manifest: RenderManifest): string {
  const content = manifest.publicContent;
  const hero = approvedImagePath(manifest, 0);
  const coverPhoto =
    hero === undefined
      ? '<div class="photo-missing" role="img" aria-label="Property photo unavailable">Property photo unavailable</div>'
      : `<img class="pdf-photo" src="${hero}" alt="Approved property exterior">`;
  const pages: string[] = [
    `<section class="pdf-page"><p>${escapeHtml(content.openHouseLabel)}</p><h1>${escapeHtml(content.headline)}</h1><p>${escapeHtml(content.propertyAddress)}</p>${coverPhoto}<h2>Open house team</h2><p>Loan officer: ${escapeHtml(content.loanOfficerDisplayName)}</p><p>Realtor: ${escapeHtml(content.realtorDisplayName)}</p></section>`,
  ];
  for (const [index, chunk] of splitLongText(content.propertyDescription).entries()) {
    pages.push(
      `<section class="pdf-page"><h2>Property details${index === 0 ? "" : " continued"}</h2><p class="pdf-copy">${escapeHtml(chunk)}</p></section>`,
    );
  }
  for (const [disclosureIndex, disclosure] of content.disclosureBlocks.entries()) {
    for (const [chunkIndex, chunk] of splitLongText(disclosure).entries()) {
      pages.push(
        `<section class="pdf-page"><h2>Required disclosure ${String(disclosureIndex + 1)}${chunkIndex === 0 ? "" : " continued"}</h2><p class="pdf-copy">${escapeHtml(chunk)}</p></section>`,
      );
    }
  }
  return `<main class="shell">${pages.join("")}</main>`;
}

function assertCreativeCopyFits(manifest: RenderManifest): void {
  const disclosureLength = manifest.publicContent.disclosureBlocks.join(" ").length;
  if (
    manifest.publicContent.headline.length > 100 ||
    manifest.publicContent.propertyAddress.length > 140 ||
    disclosureLength > 420
  ) {
    throw new Error("Approved creative copy exceeds the readable safe-zone budget");
  }
}

function creativeBody(manifest: RenderManifest, story: boolean): string {
  assertCreativeCopyFits(manifest);
  const content = manifest.publicContent;
  const hero = approvedImagePath(manifest, 0);
  const photo =
    hero === undefined
      ? '<div class="creative-photo" role="img" aria-label="Property photo unavailable"></div>'
      : `<img src="${hero}" alt="Approved property exterior">`;
  const focalPoint = manifest.assets[0]?.focalPoint ?? { x: 0.5, y: 0.5 };
  const safeZone = story
    ? manifest.creativeSafeZones.metaStory
    : manifest.creativeSafeZones.metaSquare;
  return `<main class="creative${story ? " story" : ""}" data-focal-point="${percentage(focalPoint.x)},${percentage(focalPoint.y)}" data-safe-zone="${percentage(safeZone.top)},${percentage(safeZone.right)},${percentage(safeZone.bottom)},${percentage(safeZone.left)}">${photo}<section class="creative-copy"><h1>${escapeHtml(content.headline)}</h1><p>${escapeHtml(content.propertyAddress)}</p><p>${escapeHtml(content.openHouseLabel)}</p><p class="disclosure">${escapeHtml(content.disclosureBlocks.join(" "))}</p></section><div class="safe-zone" aria-hidden="true"></div></main>`;
}

function qrBody(manifest: RenderManifest): string {
  const path = trackingPath(manifest);
  return `<main class="shell"><h1>Open house link</h1><p data-qr-payload="${escapeHtml(path)}">${escapeHtml(path)}</p></main>`;
}

function sourceHeaders(css: string): Readonly<Record<string, string>> {
  return Object.freeze({
    "cache-control": "public, max-age=31536000, immutable",
    "content-security-policy": contentSecurityPolicy(css),
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
}

export function renderSourceForManifest(
  untrustedManifest: unknown,
  untrustedArtifactType: unknown,
): RenderSourceDocument {
  const manifest = RenderManifestSchema.parse(untrustedManifest);
  const artifactType = ArtifactTypeSchema.parse(untrustedArtifactType);
  validatePublicText(manifest);
  const description = manifest.publicContent.propertyDescription;
  const imagePath = approvedImagePath(manifest, 0);

  switch (artifactType) {
    case "public-page-projection":
      return Object.freeze({
        artifactType,
        html: documentShell(manifest, BASE_CSS, publicPageBody(manifest), {
          description,
          ...(imagePath === undefined ? {} : { imagePath }),
        }),
        inputMimeType: "text/html",
        viewport: { width: 1440, height: 1000 },
        output: { format: "html" as const },
        responseHeaders: sourceHeaders(BASE_CSS),
        networkPolicy: "deny-all",
      });
    case "pdf":
      return Object.freeze({
        artifactType,
        html: documentShell(manifest, PDF_CSS, pdfBody(manifest), { description }),
        inputMimeType: "text/html",
        viewport: { width: 816, height: 1056 },
        output: {
          format: "pdf" as const,
          pageSize: "letter" as const,
          printBackground: true as const,
        },
        responseHeaders: sourceHeaders(PDF_CSS),
        networkPolicy: "deny-all",
      });
    case "meta-square": {
      const css = creativeCss(manifest, false);
      return Object.freeze({
        artifactType,
        html: documentShell(manifest, css, creativeBody(manifest, false), {
          description,
        }),
        inputMimeType: "text/html",
        viewport: { width: 1080, height: 1080 },
        output: { format: "png" as const, width: 1080, height: 1080 },
        responseHeaders: sourceHeaders(css),
        networkPolicy: "deny-all",
      });
    }
    case "meta-story": {
      const css = creativeCss(manifest, true);
      return Object.freeze({
        artifactType,
        html: documentShell(manifest, css, creativeBody(manifest, true), {
          description,
        }),
        inputMimeType: "text/html",
        viewport: { width: 1080, height: 1920 },
        output: { format: "png" as const, width: 1080, height: 1920 },
        responseHeaders: sourceHeaders(css),
        networkPolicy: "deny-all",
      });
    }
    case "qr":
      return Object.freeze({
        artifactType,
        html: documentShell(manifest, BASE_CSS, qrBody(manifest), { description }),
        inputMimeType: "text/html",
        viewport: { width: 512, height: 512 },
        output: { format: "png" as const, width: 512, height: 512 },
        responseHeaders: sourceHeaders(BASE_CSS),
        networkPolicy: "deny-all",
      });
  }
}

export function publicPageVisualFingerprints(
  untrustedManifest: unknown,
): Readonly<Record<(typeof supportedPublicPageWidths)[number], string>> {
  const source = renderSourceForManifest(untrustedManifest, "public-page-projection");
  return Object.freeze(
    Object.fromEntries(
      supportedPublicPageWidths.map((width) => [
        width,
        createHash("sha256").update(`${width}\n${source.html}`).digest("hex"),
      ]),
    ) as Record<(typeof supportedPublicPageWidths)[number], string>,
  );
}
