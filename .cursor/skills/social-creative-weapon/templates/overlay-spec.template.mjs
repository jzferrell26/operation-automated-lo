#!/usr/bin/env node
/*
 * OVERLAY SPEC TEMPLATE - fill in per client, then `node overlay-spec.template.mjs`.
 * Composites a gradient-scrim + text SVG over a cropped 1080 photo via sharp,
 * for "right hook" CTA posts. Read guides/05-overlays-sharp.md first.
 *
 * RULES (do not remove):
 * - Resize the photo to 1080x1080 BEFORE composite. Overlay SVG must be 1080x1080
 *   (<= base). Keep the default `over` blend (preserves the scrim alpha).
 * - Pull scrim color + text colors from BRAND-GUIDE.md. Escape text. No em dashes.
 * - Use selectively (asks, not every post) so the feed keeps contrast.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const PHOTOS = join(here, "images", "photos");
const OUT = join(here, "images", "overlays");
mkdirSync(OUT, { recursive: true });

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Scrim color + text colors from the brand spec.
const SCRIM = "#______"; // dark brand tone for the gradient
const KICK = "#______";  // accent (kicker)
const INK = "#______";   // headline/sub on the scrim (usually a light brand tone)

function overlaySvg({ kicker, headline, sub }) {
  return `<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.30" stop-color="${SCRIM}" stop-opacity="0"/>
        <stop offset="0.62" stop-color="${SCRIM}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${SCRIM}" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#scrim)"/>
    <rect width="1080" height="14" fill="${KICK}"/>
    <text x="80" y="800" font-family="Arial" font-size="30" letter-spacing="6" font-weight="700" fill="${KICK}">${esc(kicker)}</text>
    <text x="80" y="892" font-family="______, serif" font-size="78" fill="${INK}">${esc(headline)}</text>
    <text x="80" y="958" font-family="Arial" font-size="32" fill="${INK}">${esc(sub)}</text>
  </svg>`;
}

const JOBS = [
  { out: "overlay-01.png", photo: "photo-01.png", kicker: "______", headline: "______", sub: "______" },
];

for (const job of JOBS) {
  await sharp(join(PHOTOS, job.photo))
    .resize(1080, 1080, { fit: "cover" })
    .composite([{ input: Buffer.from(overlaySvg(job)), top: 0, left: 0 }])
    .png()
    .toFile(join(OUT, job.out));
  console.log(`  ${job.out}  <- ${job.photo} + overlay`);
}
console.log(`Wrote ${JOBS.length} overlay cards to ${OUT}`);
