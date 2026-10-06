import { FINANCING_COPY as COPY } from "../copy/financing-messages.js";
import {
  financingDate,
  financingGroups,
  financingMoney,
  programNames,
  quoteWarnings,
} from "../features/financing/display.js";
import type { FinancingReportView } from "../features/financing/model.js";
import { adBrandColorValue } from "../features/workspace/ad-brand.js";
import { escapePropertyPackageText as escape } from "./property-package-html.js";

/** Original private site preview. It reads the saved comparison and makes no external requests. */
export function financingSiteHtml(report: FinancingReportView, now = Date.now()): string {
  const { manifest } = report;
  const scenarios = manifest.financing.scenarios;
  const groups = financingGroups(manifest);
  const cell = (value: string) => `<td>${escape(value)}</td>`;
  const table = `<table><caption>Financing assumptions, cash to close, and housing expense</caption>
    <thead><tr><th scope="col">Compare your options</th>${scenarios.map((s) => `<th scope="col">${escape(s.label)}</th>`).join("")}</tr></thead>
    ${groups
      .map(
        (
          group,
        ) => `<tbody><tr class="group"><th colspan="${scenarios.length + 1}" scope="rowgroup">${escape(group.title)}</th></tr>
      ${group.rows.map((row) => `<tr${row.emphasis ? ' class="total"' : ""}><th scope="row">${escape(row.label)}</th>${row.values.map(cell).join("")}</tr>`).join("")}</tbody>`,
      )
      .join("")}</table>`;
  const mobile = scenarios
    .map(
      (scenario, index) =>
        `<section class="mobile-option"><h2>${escape(scenario.label)}</h2>${groups.map((group) => `<h3>${escape(group.title)}</h3><dl>${group.rows.map((row) => `<div${row.emphasis ? ' class="total"' : ""}><dt>${escape(row.label)}</dt><dd>${escape(row.values[index] ?? COPY.unknown)}</dd></div>`).join("")}</dl>`).join("")}</section>`,
    )
    .join("");
  const quoteDetails = scenarios
    .map(
      (s) => `<details><summary>${escape(s.label)}: quote and itemized costs</summary>
    <p>Quote source: ${escape(s.quote.source)}</p><p>Issued: ${escape(financingDate(s.quote.quotedAt))}<br>Valid until: ${escape(financingDate(s.quote.expiresAt))}</p>
    <p>${escape(s.quote.confirmed ? COPY.quoteConfirmed : COPY.quoteUnconfirmed)}</p><p>${escape(s.assumptions || COPY.unknown)}</p>
    <ul>${s.costs.map((cost) => `<li>${escape(cost.label)}: ${escape(financingMoney(cost.amountMinor))} (${cost.category}${cost.paidBeforeClosing ? "; already paid" : ""})</li>`).join("")}</ul>
    ${s.costsComplete ? "" : "<p>Cost list not confirmed complete.</p>"}</details>`,
    )
    .join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive"><title>Private financing preview | ${escape(manifest.property.address)}</title>
    <style>
    :root{font-family:Arial,Helvetica,sans-serif;color:#142c43;background:#f4f7fb;line-height:1.55;color-scheme:light}
    *{box-sizing:border-box}body{margin:0}main{max-width:1150px;margin:auto;padding:32px 24px 60px}
    .draft{padding:16px 20px;border:1px solid #d7be86;background:#fff8e9;border-radius:10px;font-size:14px;color:#594011}
    header{margin:32px 0;border-top:5px solid ${adBrandColorValue(manifest.preparation.brand.colorPresetId)};padding-top:24px}
    .eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:13px;font-weight:700;color:#51677a}h1{font-size:clamp(28px,5vw,46px);line-height:1.15;margin:12px 0;overflow-wrap:anywhere}h2{font-size:21px;margin:0 0 12px}h3{font-size:16px}p{margin:12px 0}.description{white-space:pre-wrap;max-width:70ch}
    .cards,.team{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:18px}.card,.sheet{background:white;border:1px solid #d3dfeb;border-radius:12px;padding:24px;min-width:0}.sheet{margin-top:24px}.card p,.team p{overflow-wrap:anywhere}.amount{font-size:30px;font-weight:700;line-height:1.2;white-space:normal;overflow-wrap:anywhere}.cash{font-size:23px;font-weight:700}.label,.small{font-size:14px;color:#526579}.warning{font-weight:700;font-size:14px}
    table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;font-variant-numeric:tabular-nums}caption{text-align:left;font-weight:700;font-size:18px;margin-bottom:20px}th,td{padding:10px 8px;border-bottom:1px solid #d3dfeb;text-align:right;overflow-wrap:anywhere;vertical-align:top}th:first-child{width:26%;text-align:left}.group th{background:#eff4fa;text-align:left;text-transform:uppercase;font-size:12px;letter-spacing:.07em;padding-top:15px;padding-bottom:15px}.total{background:#eff4fa;font-weight:700}
    .mobile{display:none}.team{margin-top:24px;grid-template-columns:1fr 1fr}details{padding:16px 0;border-top:1px solid #d3dfeb}summary{cursor:pointer;min-height:44px;font-weight:700}summary:focus-visible{outline:3px solid #005fcc;outline-offset:3px}li{overflow-wrap:anywhere}footer{font-size:13px;color:#526579;margin-top:28px;overflow-wrap:anywhere}.private-action{font-size:14px;padding:16px;border:1px solid #d3dfeb;border-radius:8px}
    @media(max-width:800px){main{padding:20px 16px 40px}.desktop{display:none}.mobile{display:block}.mobile-option{margin-bottom:32px}.mobile dl{margin:0}.mobile dl div{display:grid;grid-template-columns:1.1fr 1fr;gap:12px;border-bottom:1px solid #d3dfeb;padding:10px 4px;font-size:14px}.mobile dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.sheet,.card{padding:18px}}
    @media(max-width:540px){.team{grid-template-columns:1fr}}@media print{body{background:white}main{padding:0}details{break-inside:avoid}.draft{border:1px solid #888}}
    </style></head><body><main><aside class="draft"><strong>${COPY.draft}</strong><br>${COPY.privateNotice}</aside>
    <header><p class="eyebrow">Explore the property. Understand the financing.</p><h1>${escape(manifest.property.address)}</h1><p class="description">${escape(manifest.property.description)}</p><p>Illustrated purchase price: <strong>${escape(financingMoney(manifest.financing.purchasePriceMinor))}</strong></p></header>
    <section class="cards" aria-label="Scenario estimates">${scenarios
      .map((s, index) => {
        const result = manifest.calculated.scenarios[index];
        if (!result) throw new Error("Saved financing result missing.");
        return `<article class="card"><p class="eyebrow">${programNames[s.program]}</p><h2>${escape(s.label)}</h2><p class="label">Estimated monthly housing</p><p class="amount">${escape(financingMoney(result.totalHousingMinor))}</p><p class="label">Estimated cash at closing</p><p class="cash">${escape(financingMoney(result.cashToCloseMinor))}</p>${quoteWarnings(
          s,
          now,
        )
          .map((warning) => `<p class="warning">${escape(warning)}</p>`)
          .join(
            "",
          )}${result.missing.length ? `<p class="small">${COPY.incomplete}</p>` : ""}</article>`;
      })
      .join("")}</section>
    <section class="sheet"><div class="desktop">${table}</div><div class="mobile">${mobile}</div><p class="small">${COPY.noteMonthly}</p><p class="small">${COPY.noteCash}</p></section>
    <section class="team" aria-label="Your property and lending team">${(
      [
        ["Realtor partner", manifest.identities.realtor],
        ["Loan officer", manifest.identities.lender],
      ] as const
    )
      .map(
        ([label, identity]) =>
          `<article class="card"><p class="eyebrow">${label}</p><h2>${escape(identity.name)}</h2><p>${escape(identity.company)}</p><p>${escape(identity.phone)}<br>${escape(identity.email)}</p><p class="small">${escape(identity.license)}</p></article>`,
      )
      .join("")}</section>
    <section class="sheet"><h2>Quote inputs and cost details</h2><p>${COPY.noteQuotes}</p><p class="small">${COPY.dateNote}</p>${quoteDetails}</section>
    <p class="private-action">Private preview only. Customer inquiries, lead capture and public sharing are not enabled.</p>
    <footer><p>${manifest.property.permissionConfirmed && manifest.partner.permissionConfirmed ? COPY.permissionsRecorded : COPY.permissionsMissing}</p><p>${escape(manifest.content.disclosureText)}</p><p>${COPY.photoNote}</p><p>Saved ${escape(financingDate(report.createdAt))}. Version ${report.versionNo}. Calculation ${manifest.calculated.calculationVersion}.</p><p>${COPY.privateNotice}</p></footer>
    </main></body></html>`;
}
