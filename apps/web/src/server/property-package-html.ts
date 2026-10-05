import { createHash } from "node:crypto";
import {
  DRAFT_NOTICE,
  NO_PHOTO_NOTICE,
  PREVIEW_NOTICE,
  type PropertyPackageDocument,
} from "./property-package-content.js";

export function escapePropertyPackageText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const escaped = escapePropertyPackageText;

/** Single sealed template, no JavaScript, external resource, or lead-capture form. */
export function propertyDraftHtml(document: PropertyPackageDocument): string {
  const accent = document.accent;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive"><title>Draft property page | ${escaped(document.address)}</title>
<style>
:root{color-scheme:light;font-family:Arial,Helvetica,sans-serif;color:#172b43;background:#f5f8fc;line-height:1.6}
*{box-sizing:border-box}body{margin:0}main{max-width:980px;margin:0 auto;padding:32px 24px 56px}
.draft{background:#fff4df;border:1px solid #d9bc7c;border-radius:8px;padding:16px;color:#624411;font-size:14px}
.draft strong{display:block;letter-spacing:.08em}.hero{margin:32px 0;border-top:6px solid ${accent};padding-top:24px}
.eyebrow{letter-spacing:.18em;text-transform:uppercase;font-weight:bold;color:${accent}}
h1{font-size:clamp(28px,5vw,48px);line-height:1.18;overflow-wrap:anywhere;margin:16px 0}h2{font-size:21px;margin:0 0 12px}
p{margin:12px 0}.details{white-space:pre-wrap;overflow-wrap:anywhere}.card{background:white;border:1px solid #c8d4e3;border-radius:12px;padding:24px;margin-top:24px}
.team{display:grid;grid-template-columns:1fr 1fr;gap:24px}.team p{overflow-wrap:anywhere}.label{font-size:14px;color:#475d77}.name{font-size:20px;font-weight:bold}
footer{margin-top:32px;font-size:14px;color:#475d77}.note{font-size:14px}.permissions{font-weight:bold}a{color:${accent};overflow-wrap:anywhere}a:focus-visible{outline:3px solid #005fcc;outline-offset:4px}
@media(max-width:600px){main{padding:20px 16px 40px}.team{grid-template-columns:1fr}.card{padding:20px}}
@media print{body{background:white}main{max-width:none;padding:0}.draft{position:relative}.card{break-inside:avoid}a{color:inherit}footer{color:#172b43}}
</style></head><body><main>
<aside class="draft" aria-label="Draft notice"><strong>${DRAFT_NOTICE}</strong>${PREVIEW_NOTICE}</aside>
<header class="hero"><p class="eyebrow">Open house</p><h1>${escaped(document.address)}</h1>
<p><time datetime="${escaped(document.startsAt)}">${escaped(document.eventLabel)}</time></p></header>
<section class="card"><h2>Explore the property</h2><p class="details">${escaped(document.description)}</p><p class="note">${NO_PHOTO_NOTICE}</p></section>
<div class="team"><section class="card"><h2>Realtor partner</h2><p class="name">${escaped(document.realtor)}</p><p>${escaped(document.brokerage)}</p></section>
<section class="card"><h2>Loan officer</h2><p class="name">${escaped(document.loanOfficer)}</p><p>${escaped(document.lender)}</p><p class="label">${escaped(document.nmls)}</p></section></div>
<section class="card"><h2>Before this campaign goes live</h2><p class="permissions">${escaped(document.permissions)}</p>
<p>${escaped(document.disclosure)}</p><p>No lead form is connected on this draft. Paid promotion and HighLevel follow-up are not active.</p></section>
<footer>${DRAFT_NOTICE} | Saved campaign version ${String(document.versionNo)}<p>${PREVIEW_NOTICE}</p></footer>
</main></body></html>`;
}

export function propertyDraftHtmlCsp(html: string): string {
  const css = /<style>([\s\S]*?)<\/style>/u.exec(html)?.[1];
  if (css === undefined) throw new Error("Property draft style block is missing");
  const digest = createHash("sha256").update(css).digest("base64");
  return `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'none'; object-src 'none'; style-src 'sha256-${digest}'; sandbox`;
}
