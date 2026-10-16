import { createHash } from "node:crypto";
import { z } from "zod";
import {
  FinancingCampaignManifestSchema,
  FinancingPublicPresentationSchema,
  FinancingReleaseResolvedSourceSchema,
  type FinancingReleaseAuthority,
} from "@oalo/contracts";
import {
  canonicalCampaignHash as hash,
  calculateFinancingComparison,
  type FinancingReleaseRenderInput,
} from "@oalo/application";
import { financingDate, financingGroups, financingMoney } from "../features/financing/display.js";
import { financingPropertyFacts } from "../features/financing/property-display.js";
import { escapePropertyPackageText as escape } from "./property-package-html.js";

export const FINANCING_PUBLIC_FONT_HASH =
  "f8051d65db9b84447725125371871f36c382b14be90bf417771b059ea77e5947";
export const FINANCING_PUBLIC_RENDERER = "financing-public-1.0.0";
export const outputDigest = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
export class FinancingOutputError extends Error {
  constructor(public readonly code: "INVALID" | "PARITY" | "MEDIA" | "LIMIT" | "UNAVAILABLE") {
    super(`FINANCING_OUTPUT_${code}`);
    this.name = "FinancingOutputError";
  }
}
export function outputAssert(
  value: unknown,
  code: FinancingOutputError["code"] = "PARITY",
): asserts value {
  if (!value) throw new FinancingOutputError(code);
}
const Input = z
  .object({
    source: FinancingReleaseResolvedSourceSchema,
    presentation: FinancingPublicPresentationSchema,
    publicationId: z.uuid(),
    canonicalUrl: z.url({ protocol: /^https$/u }),
    manifestHash: z.string().regex(/^[a-f0-9]{64}$/u),
    evidenceHash: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
/** Source eligibility is also checked by the outer application. This boundary refuses even a
 * typed caller's substituted presentation and never renders the raw private manifest. */
export function validateFinancingOutputInput(raw: unknown): FinancingReleaseRenderInput {
  const input = Input.parse(raw);
  const manifest = FinancingCampaignManifestSchema.parse(input.source.sourceVersion.manifest);
  const authority = input.source.authority;
  const publicQuote =
    FinancingPublicPresentationSchema.shape.financing.shape.scenarios.element.shape.quote;
  const publicFinancing = {
    ...manifest.financing,
    scenarios: manifest.financing.scenarios.map(({ quote, ...scenario }) => ({
      ...scenario,
      quote: publicQuote.parse(
        Object.fromEntries(
          Object.keys(publicQuote.shape).map((key) => [key, quote[key as keyof typeof quote]]),
        ),
      ),
    })),
  };
  const facts =
    manifest.schemaVersion === 2
      ? (({ confirmed: _confirmed, ...rest }) => rest)(manifest.property.facts)
      : null;
  const expected = {
    address: manifest.property.address,
    description: manifest.property.description,
    stateCode: manifest.property.stateCode,
    facts,
    identities: manifest.identities,
    financing: publicFinancing,
    calculated: manifest.calculated,
    disclosureText: authority.disclosureText,
    consentText: authority.consentText,
    privacyUrl: authority.privacyUrl,
    issuedAt: input.presentation.issuedAt,
    validUntil: input.presentation.validUntil,
    estimateNotice:
      "Estimates based on the supplied assumptions. Not a loan commitment or eligibility determination.",
  };
  outputAssert(
    hash(expected) === hash(input.presentation) &&
      hash(manifest) === input.manifestHash &&
      input.manifestHash === input.source.sourceVersion.manifestHash &&
      hash(authority) === input.evidenceHash,
    "INVALID",
  );
  outputAssert(
    hash(calculateFinancingComparison(manifest.financing)) === hash(manifest.calculated) &&
      manifest.calculated.scenarios.every((s) => s.missing.length === 0),
    "INVALID",
  );
  outputAssert(
    input.canonicalUrl === `${authority.origin.canonicalOrigin}/p/${input.publicationId}` &&
      Date.parse(input.presentation.validUntil) > Date.parse(input.presentation.issuedAt),
    "INVALID",
  );
  outputAssert(
    manifest.financing.scenarios.every(
      (s) =>
        s.quote.aprMilliPercent !== null &&
        s.quote.confirmed &&
        Date.parse(s.quote.expiresAt) >= Date.parse(input.presentation.validUntil),
    ),
    "INVALID",
  );
  outputAssert(
    [
      authority.propertyAuthority,
      authority.partnerIdentity.authority,
      authority.lenderIdentity.authority,
      authority.preset,
      ...authority.quoteEvidence.map((e) => e.authority),
      authority.disclosure,
      ...authority.mediaAuthorizations.map((e) => e.authority),
      authority.template,
      authority.routing,
      authority.consent,
      authority.origin.authority,
    ].every(
      (e) =>
        e.locationRef === input.source.sourceVersion.locationRef &&
        e.revokedAt === null &&
        e.channels.includes("site") &&
        e.channels.includes("pdf") &&
        Date.parse(e.expiresAt) >= Date.parse(input.presentation.validUntil),
    ),
    "INVALID",
  );
  return input;
}
export type PublicOutputAsset = Readonly<{
  authorization: FinancingReleaseAuthority["mediaAuthorizations"][number];
  bytes: Uint8Array;
  publicRef: string;
  alt: string;
  width: number;
  height: number;
}>;
export function publicMediaRef(input: FinancingReleaseRenderInput, index: number): string {
  const asset = input.source.authority.mediaAuthorizations[index];
  outputAssert(asset, "MEDIA");
  return outputDigest(`${input.publicationId}:${index}:${asset.sha256}:${asset.purpose}`);
}
export function outputRows(input: FinancingReleaseRenderInput) {
  return financingGroups(
    FinancingCampaignManifestSchema.parse(input.source.sourceVersion.manifest),
  );
}
export function outputSections(
  input: FinancingReleaseRenderInput,
): readonly Readonly<{ key: string; text: string }>[] {
  const p = input.presentation;
  const result = [
    { key: "address", text: p.address },
    { key: "description", text: p.description },
    {
      key: "purchase",
      text: `Illustrated purchase price: ${financingMoney(p.financing.purchasePriceMinor)}`,
    },
    ...p.financing.scenarios.flatMap((s, index) => [
      {
        key: `quote-${index}`,
        text: `${s.label}: quote issued ${financingDate(s.quote.quotedAt)}; valid until ${financingDate(s.quote.expiresAt)}.`,
      },
      {
        key: `assumptions-${index}`,
        text: `${s.label}: ${s.assumptions || "No additional assumptions supplied."}`,
      },
      ...s.costs.map((c, i) => ({
        key: `cost-${index}-${i}`,
        text: `${c.label}: ${financingMoney(c.amountMinor)} (${c.category}${c.paidBeforeClosing ? "; already paid" : ""})`,
      })),
    ]),
    ...(["lender", "realtor"] as const).flatMap((role) =>
      Object.entries(p.identities[role]).map(([key, text]) => ({ key: `${role}-${key}`, text })),
    ),
    { key: "disclosure", text: p.disclosureText },
    { key: "estimate", text: p.estimateNotice },
    { key: "issued", text: `Issued: ${financingDate(p.issuedAt)}` },
    { key: "validity", text: `Valid until: ${financingDate(p.validUntil)}` },
    { key: "calculation", text: `Calculation ${p.calculated.calculationVersion}` },
    { key: "canonical", text: input.canonicalUrl },
    { key: "privacy", text: p.privacyUrl },
    { key: "consent", text: p.consentText },
    ...(p.facts
      ? financingPropertyFacts({ ...p.facts, confirmed: true }).map(([label, value], i) => ({
          key: `fact-${i}`,
          text: `${label}: ${value}`,
        }))
      : []),
  ];
  return result;
}
function css(font: Uint8Array, landscape: boolean): string {
  return `@font-face{font-family:PublicInter;src:url(data:font/ttf;base64,${Buffer.from(font).toString("base64")}) format("truetype");font-weight:100 900;font-display:block}
  :root{font-feature-settings:"calt" 0,"tnum" 0,"liga" 0,"dlig" 0; font-family:PublicInter,sans-serif;color:#142c43;background:#f5f7fa;font-size:16px;line-height:1.5;color-scheme:light}*{box-sizing:border-box}body{margin:0}main{width:min(1160px,100%);margin:auto;padding:24px 24px 56px}h1{font-size:clamp(28px,4vw,44px);line-height:1.16}h2{font-size:23px}h3{font-size:18px}p,h1,h2,h3,td,th{overflow-wrap:anywhere}.copy{white-space:pre-wrap}.sheet,.option,.identity{background:#fff;padding:24px;border:1px solid #d3dfeb;border-radius:12px}.sheet{margin-top:24px}.cards,.team,.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:16px}.hero{margin:0 0 24px}.hero img{width:100%;height:auto;max-height:450px;object-fit:contain}.gallery img{max-height:320px;width:100%;height:auto;object-fit:contain}figure{margin:0}figcaption{font-size:14px;color:#43566b}.identity img{width:110px;height:110px;object-fit:contain}.total{background:#edf3f8;font-weight:700}.amount{font-size:26px;font-weight:750;font-variant-numeric:normal}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px}th,td{vertical-align:top;text-align:right;padding:8px;border-bottom:1px solid #d3dfeb;font-variant-numeric:normal}th:first-child{text-align:left;width:29%}caption{text-align:left;font-weight:700;font-size:18px;margin:20px 0 10px}.mobile{display:none}dl{margin:0}dl div{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;border-bottom:1px solid #d3dfeb;padding:10px 0}dd{margin:0;text-align:right;overflow-wrap:anywhere}label{display:block;margin:16px 0 6px}input[type=text],input[type=email],select{width:100%;padding:12px;border:1px solid #607185;border-radius:6px;font:inherit}button,.download{display:inline-block;background:#0d4f81;color:white;padding:12px 18px;border:0;border-radius:6px;font:inherit;font-weight:700;text-decoration:none;min-height:44px}a{color:#0d4f81;overflow-wrap:anywhere}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #8d4c00;outline-offset:3px}.trap{position:absolute;left:-10000px}.consent{display:flex;align-items:start;gap:12px}.consent input{margin-top:6px;width:20px;height:20px;flex:none}.small{font-size:14px;color:#43566b}.details{margin-top:24px}.team{grid-template-columns:1fr 1fr}
  @media(max-width:800px){main{padding:16px 16px 40px}.desktop{display:none}.mobile{display:block}.sheet,.option,.identity{padding:18px}.team{grid-template-columns:1fr}}
  @page{size:letter ${landscape ? "landscape" : "portrait"};margin:0.45in} @media print{:root{background:#fff;font-size:10pt}main{width:100%;padding:0}.hero img{max-height:2.1in}.sheet,.option,.identity{padding:10px;border-radius:0}.cards{grid-template-columns:repeat(${landscape ? 5 : 3},1fr)}.desktop{display:block}.mobile,.inquiry,.download{display:none}.amount{font-size:15pt}table{font-size:9pt}th,td{padding:5px}thead{display:table-header-group}table{break-inside:avoid}caption{break-after:avoid}tr,.identity,.option,figure{break-inside:avoid}h2,h3{break-after:avoid}.comparison{break-before:page}.small{font-size:9pt}.gallery{grid-template-columns:1fr 1fr}.gallery img{max-height:2.4in}}`;
}
/** HTML contains only the public projection. Relative media routes are current-publication
 * capabilities; neither private storage paths nor source/evidence references are emitted. */
export function financingReleaseHtml(
  input: FinancingReleaseRenderInput,
  assets: readonly PublicOutputAsset[],
  font: Uint8Array,
): Readonly<{ html: string; headers: Readonly<Record<string, string>> }> {
  validateFinancingOutputInput(input);
  outputAssert(outputDigest(font) === FINANCING_PUBLIC_FONT_HASH, "INVALID");
  outputAssert(
    assets.length === input.source.authority.mediaAuthorizations.length &&
      assets.every(
        (a, i) =>
          hash(a.authorization) === hash(input.source.authority.mediaAuthorizations[i]) &&
          a.publicRef === publicMediaRef(input, i) &&
          outputDigest(a.bytes) === a.authorization.sha256,
      ),
    "MEDIA",
  );
  const sections = outputSections(input),
    p = input.presentation,
    rows = outputRows(input);
  const section = (key: string, tag = "p") => {
    const value = sections.find((s) => s.key === key);
    outputAssert(value);
    return key === "canonical"
      ? `<p><a data-field="canonical" href="${escape(input.canonicalUrl)}">${escape(value.text)}</a></p>`
      : `<${tag} data-field="${key}" class="copy">${escape(value.text)}</${tag}>`;
  };
  const image = (asset: PublicOutputAsset) =>
    `<figure data-image="${asset.publicRef}"><img src="/p/${input.publicationId}/media/${asset.publicRef}" width="${asset.width}" height="${asset.height}" alt="${escape(asset.alt)}"><figcaption>${escape(asset.alt)}</figcaption></figure>`;
  const photos = assets.filter((a) => a.authorization.purpose === "property");
  const comparison = rows
    .map(
      (g, gi) =>
        `<table data-group="${gi}"><caption>${escape(g.title)}</caption><thead><tr><th scope="col">Compare your options</th>${p.financing.scenarios.map((s) => `<th scope="col">${escape(s.label)}</th>`).join("")}</tr></thead><tbody>${g.rows.map((r, ri) => `<tr data-row="${gi}-${ri}"${r.emphasis ? ' class="total"' : ""}><th scope="row">${escape(r.label)}</th>${r.values.map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
    )
    .join("");
  const mobile = p.financing.scenarios
    .map(
      (s, si) =>
        `<article class="sheet"><h3>${escape(s.label)}</h3>${rows.map((g, gi) => `<h3>${escape(g.title)}</h3><dl>${g.rows.map((r, ri) => `<div data-mobile-row="${si}-${gi}-${ri}"${r.emphasis ? ' class="total"' : ""}><dt>${escape(r.label)}</dt><dd>${escape(r.values[si]!)}</dd></div>`).join("")}</dl>`).join("")}</article>`,
    )
    .join("");
  const cards = p.financing.scenarios
    .map(
      (s, i) =>
        `<article class="option"><h2>${escape(s.label)}</h2><p>Estimated monthly housing</p><p class="amount">${escape(financingMoney(p.calculated.scenarios[i]!.totalHousingMinor))}</p><p>Estimated cash at closing</p><p class="amount">${escape(financingMoney(p.calculated.scenarios[i]!.cashToCloseMinor))}</p><p>Fixed term: ${s.termMonths / 12} years; down payment: ${(s.downPaymentBps / 100).toFixed(2)}%</p></article>`,
    )
    .join("");
  const team = (["realtor", "lender"] as const)
    .map(
      (role) =>
        `<section class="identity"><h2>${role === "lender" ? "Loan officer" : "Realtor partner"}</h2>${assets
          .filter((a) =>
            a.authorization.purpose.startsWith(role === "lender" ? "lender-" : "partner-"),
          )
          .map(image)
          .join(
            "",
          )}${["name", "company", "phone", "email", "license"].map((k) => section(`${role}-${k}`, k === "name" ? "h3" : "p")).join("")}</section>`,
    )
    .join("");
  const style = css(font, p.financing.scenarios.length > 3);
  const csp = `default-src 'none'; base-uri 'none'; object-src 'none'; script-src 'none'; connect-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self'; font-src data:; style-src 'sha256-${createHash("sha256").update(style).digest("base64")}'`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="${escape(csp)}"><link rel="canonical" href="${escape(input.canonicalUrl)}"><title>${escape(p.address)} | Financing comparison</title><style>${style}</style></head><body><main><header>${photos[0] ? `<div class="hero">${image(photos[0])}</div>` : '<p class="small">Text-only property presentation</p>'}${section("address", "h1")}${section("description")}${section("purchase")}${sections
    .filter((s) => s.key.startsWith("fact-"))
    .map((s) => section(s.key))
    .join(
      "",
    )}${section("issued")}${section("validity")}${section("estimate")}</header><section class="cards" aria-label="Scenario estimates">${cards}</section><section class="sheet comparison"><h2>Compare the supplied financing options</h2><div class="desktop">${comparison}</div><div class="mobile">${mobile}</div><p class="small">Housing includes the supplied monthly expenses, including items paid separately from the mortgage. Cash at closing reflects the itemized costs, credits and already-paid amounts below.</p></section><section class="sheet details"><h2>Quote dates, assumptions and itemized costs</h2>${sections
    .filter((s) => /^(quote-|assumptions-|cost-)/u.test(s.key))
    .map((s) => section(s.key))
    .join(
      "",
    )}</section>${photos.length > 1 ? `<section class="sheet"><h2>Property photographs</h2><div class="gallery">${photos.slice(1).map(image).join("")}</div></section>` : ""}<section class="team sheet" aria-label="Property and lending team">${team}</section><section class="sheet"><h2>Disclosures and validity</h2>${section("disclosure")}${section("calculation")}<p>The information is valid only until the stated time. A downloaded report cannot reflect later withdrawal or changes.</p><a class="download" href="/p/${input.publicationId}/report.pdf">Download this comparison</a>${section("canonical")}${section("privacy")}${section("consent")}</section><section class="sheet inquiry"><h2>Request information</h2><form method="post" action="/p/${input.publicationId}/inquiry" accept-charset="UTF-8"><label for="firstName">First name</label><input id="firstName" name="firstName" type="text" autocomplete="given-name" maxlength="100" required><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" maxlength="200" required><label for="intent">What would you like?</label><select id="intent" name="intent"><option value="property-information">Property information</option><option value="financing-review">A personalized financing review</option></select><div class="trap" aria-hidden="true"><label for="honeypot">Leave this blank</label><input id="honeypot" name="honeypot" type="text" tabindex="-1" autocomplete="off"></div><label class="consent"><input type="checkbox" name="consent" value="true" required><span>${escape(p.consentText)}</span></label><p><a href="${escape(p.privacyUrl)}" rel="noreferrer">Privacy policy</a></p><button type="submit">Send request</button></form></section></main></body></html>`;
  outputAssert(Buffer.byteLength(html, "utf8") <= 2_097_152, "LIMIT");
  return {
    html,
    headers: Object.freeze({
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": csp,
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    }),
  };
}
