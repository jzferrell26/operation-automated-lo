#!/usr/bin/env node
/*
 * CARD SPEC TEMPLATE - fill in per client, then `node card-spec.template.mjs`.
 * Generates on-brand 1080x1080 card PNGs via @resvg/resvg-js.
 * Read guides/03-cards-resvg.md before filling this in.
 *
 * RULES (do not remove):
 * - Pull every color/font from the client BRAND-GUIDE.md. Never invent.
 * - Pre-split each quote into lines sized to fill 1080px at the chosen font
 *   (SVG <text> does not wrap). Vertically center the block (centeredBlock).
 * - Escape all interpolated text. No em dashes anywhere.
 * - For brand TTFs, set font.fontFiles + loadSystemFonts:false (and confirm the
 *   file exists; resvg fails SILENTLY on a missing font).
 */
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "images", "cards");
mkdirSync(OUT, { recursive: true });

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const lines = (arr, x, y, dy, attrs) =>
  arr.map((ln, i) => {
    const parts = Array.isArray(ln) ? ln : [{ text: ln }];
    const spans = parts
      .map((p) => `<tspan${p.fill ? ` fill="${p.fill}"` : ""}>${esc(p.text)}</tspan>`)
      .join("");
    return `<text x="${x}" y="${y + i * dy}" ${attrs}>${spans}</text>`;
  }).join("\n");

const centeredBlock = (quote, x, dy, top, bottom, attrs) => {
  const blockH = (quote.length - 1) * dy;
  const firstY = Math.round(top + (bottom - top - blockH) / 2);
  return lines(quote, x, firstY, dy, attrs);
};

// ---- BRAND PALETTE (fill from BRAND-GUIDE.md) -----------------------------
const C = {
  bg: "#______",      // card background
  ink: "#______",     // primary text
  accent: "#______",  // emphasis fill (the gold/red phrase)
  muted: "#______",   // eyebrow / footer
};

// ---- TEMPLATE (one register; clone for a second register, no bleed) -------
function quoteCard({ eyebrow, quote, footerName, tagline, url }) {
  return `<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1080" fill="${C.bg}"/>
    <rect width="1080" height="16" fill="${C.accent}"/>
    <text x="80" y="180" font-family="Arial" font-size="32" letter-spacing="7" fill="${C.muted}" font-weight="700">${esc(eyebrow)}</text>
    ${centeredBlock(quote, 80, 116, 300, 860, `font-family="______, serif" font-size="94" fill="${C.ink}"`)}
    ${footerName ? `<text x="80" y="958" font-family="______, serif" font-size="44" font-weight="700" fill="${C.ink}">${esc(footerName)}</text>` : ""}
    ${tagline ? `<text x="80" y="1006" font-family="Arial" font-size="28" fill="${C.muted}">${esc(tagline)}</text>` : ""}
    ${url ? `<text x="80" y="1044" font-family="Arial" font-size="23" fill="${C.muted}">${esc(url)}</text>` : ""}
  </svg>`;
}

// ---- CARD SPEC (one entry per card; tag the beat in your posts.json) ------
const CARDS = {
  "card-01": quoteCard({
    eyebrow: "______",
    quote: [
      "______",                                   // each line pre-split to fit
      [{ text: "______ " }, { text: "______", fill: C.accent }], // accent phrase
    ],
    footerName: "______",
    tagline: "______",
    url: "______",
  }),
  // "card-02": quoteCard({ ... }),
};

// ---- RENDER ---------------------------------------------------------------
// System-font default. For brand TTFs:
//   font: { fontFiles: ["./fonts/Brand.ttf"], loadSystemFonts: false }
const opts = {
  font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  fitTo: { mode: "width", value: 1080 },
};

let n = 0;
for (const [name, svg] of Object.entries(CARDS)) {
  const png = new Resvg(svg, opts).render().asPng();
  writeFileSync(join(OUT, `${name}.png`), png);
  console.log(`  ${name}.png  (${png.length} bytes)`);
  n++;
}
console.log(`Wrote ${n} card PNGs to ${OUT}`);
