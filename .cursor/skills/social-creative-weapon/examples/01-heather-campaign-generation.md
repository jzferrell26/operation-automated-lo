# Example 01 - Full campaign generation (Heather Ferrari, jab/jab/right-hook)

A complete, verified run: load the brand spec, pick assets per beat, generate cards, crop photos, build overlays, and produce the preview. Built and verified on the real client on 2026-06-29. This example demonstrates `guides/01` through `guides/06`. The code below is the canonical pipeline shipped in `heather-brand-engine/social/` (read-only reference); it is reproduced here as the worked template.

## The brand spec inputs (guide 01)

From `BRAND-GUIDE.md`, two registers:

- **Strategist** (elegant): cream `#f9f5f0`, slate `#313d3b`, teal `#567572`, sage `#8aaba8`, gold `#c9a96e`; Georgia serif; gold accent. Signature: "Free. Live. No replay."
- **HF Bomb** (bold community): dark `#161616`, white, red `#d1410c`; Arial Black; red accent. Signature: "HF Bomb - free community."

## Asset selection per beat (guide 02)

| Post | Beat | Asset | Register |
|---|---|---|---|
| W3-W6 | value/teaching (jab) | Strategist quote card | Strategist |
| HB1-HB3 | value/teaching (jab) | HF Bomb quote card | HF Bomb |
| event | announcement | event card | Strategist |
| W8, W12 | day-of / urgency (right hook) | photo + gradient overlay | Strategist |

The jabs dominate; the right hooks are the minority. The register alternates so even the jabs are not uniform.

## Generate cards (guide 03): make-cards.mjs

The three reusable helpers are the heart of the recipe:

```js
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Render an array of {text, fill?} parts as <tspan>s on stacked lines.
const lines = (arr, x, y, dy, attrs) =>
  arr.map((ln, i) => {
    const parts = Array.isArray(ln) ? ln : [{ text: ln }];
    const spans = parts
      .map((p) => `<tspan${p.fill ? ` fill="${p.fill}"` : ""}>${esc(p.text)}</tspan>`)
      .join("");
    return `<text x="${x}" y="${y + i * dy}" ${attrs}>${spans}</text>`;
  }).join("\n");

// Vertically center a stacked text block inside a band [top, bottom] so the
// quote fills the card instead of clustering at the top (mobile readability).
const centeredBlock = (quote, x, dy, top, bottom, attrs) => {
  const blockH = (quote.length - 1) * dy;
  const firstY = Math.round(top + (bottom - top - blockH) / 2);
  return lines(quote, x, firstY, dy, attrs);
};
```

The Strategist template (top accent bar + eyebrow + centered serif quote with gold accent + footer):

```js
function strategistQuote({ eyebrow, quote, footerName = "Heather Ferrari", tagline, url }) {
  return `<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1080" fill="#f9f5f0"/>
    <rect width="1080" height="16" fill="#c9a96e"/>
    <text x="80" y="180" font-family="Arial" font-size="32" letter-spacing="7" fill="#567572" font-weight="700">${esc(eyebrow)}</text>
    <line x1="80" y1="222" x2="240" y2="222" stroke="#c9a96e" stroke-width="3"/>
    ${centeredBlock(quote, 80, 116, 300, 860, 'font-family="Georgia, serif" font-size="94" font-style="italic" fill="#313d3b"')}
    <text x="80" y="958" font-family="Georgia, serif" font-size="44" font-weight="700" fill="#313d3b">${esc(footerName)}</text>
    ${tagline ? `<text x="80" y="1006" font-family="Arial" font-size="28" fill="#567572">${esc(tagline)}</text>` : ""}
    ${url ? `<text x="80" y="1044" font-family="Arial" font-size="23" fill="#8aaba8">${esc(url)}</text>` : ""}
  </svg>`;
}
```

The HF Bomb template (dark, all-caps, red accent) follows the same shape with `#161616` background, `Arial Black` at `font-weight="900"`, and a red `#d1410c` tick. A card spec entry, with the quote pre-split into lines and the emphasis phrase carrying the accent fill:

```js
"card-W3": strategistQuote({
  eyebrow: "THE ACCOUNTABILITY GAP",
  quote: [
    "People rarely fail",
    "unclear expectations.",
    [{ text: "They fail " }, { text: "uninspected", fill: "#c9a96e" }],
    [{ text: "expectations.", fill: "#c9a96e" }],
  ],
  tagline: "Free. Live. No replay.  Wed, July 8",
  url: "heatherferrari.com/the-accountability-gap",
}),
```

Render with system fonts:

```js
const opts = {
  font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  fitTo: { mode: "width", value: 1080 },
};
for (const [name, svg] of Object.entries(CARDS)) {
  const png = new Resvg(svg, opts).render().asPng();
  writeFileSync(join(OUT, `${name}.png`), png);
}
```

## Crop photos (guide 04): process-photos.mjs

Per-image `cx`/`cy` keeps the subject framed:

```js
const JOBS = [
  { out: "photo-warm.png",     src: "heather-headshot-professional.jpg", cx: 0.5 },
  { out: "photo-podium.png",   src: "heather-stage-podium.jpg",          cx: 0.72 }, // she is on the right
  { out: "photo-workshop.png", src: "heather-speaking.jpg",              cx: 0.36 }, // center-left
  { out: "photo-podcast.png",  src: "heather-podcast.jpg",  cx: 0.45, cy: 0.4 },
];
for (const job of JOBS) {
  const m = await sharp(src).metadata();
  const side = Math.min(m.width, m.height);
  const left = clamp(Math.round(job.cx * m.width - side / 2), 0, m.width - side);
  const top  = clamp(Math.round((job.cy ?? 0.45) * m.height - side / 2), 0, m.height - side);
  await sharp(src).extract({ left, top, width: side, height: side })
    .resize(1080, 1080, { fit: "cover" }).png({ quality: 90 }).toFile(out);
}
```

Re-encoding strips EXIF/GPS. Only the processed 1080 squares are committed; the raw `images/heather/` sources stay out of git.

## Build overlays (guide 05): make-overlays.mjs

For the W8 and W12 right-hook posts, composite a scrim + text SVG over a cropped photo:

```js
function overlaySvg({ kicker, headline, sub }) {
  return `<svg viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.30" stop-color="#1c2422" stop-opacity="0"/>
      <stop offset="0.62" stop-color="#1c2422" stop-opacity="0.55"/>
      <stop offset="1"    stop-color="#1c2422" stop-opacity="0.95"/>
    </linearGradient></defs>
    <rect width="1080" height="1080" fill="url(#scrim)"/>
    <rect width="1080" height="14" fill="#c9a96e"/>
    <text x="80" y="800" font-family="Arial" font-size="30" letter-spacing="6" font-weight="700" fill="#c9a96e">${esc(kicker)}</text>
    <text x="80" y="892" font-family="Georgia, serif" font-size="78" font-style="italic" fill="#f9f5f0">${esc(headline)}</text>
    <text x="80" y="958" font-family="Arial" font-size="32" fill="#f9f5f0">${esc(sub)}</text>
  </svg>`;
}
await sharp(join(PHOTOS, job.photo))
  .resize(1080, 1080, { fit: "cover" })
  .composite([{ input: Buffer.from(overlaySvg(job)), top: 0, left: 0 }])
  .png().toFile(out);
```

Resize the photo to 1080 first, then composite the full-canvas scrim at `top:0,left:0`; the `over` blend preserves the scrim's alpha.

## Produce the preview (guide 06): make-preview.mjs

Read `posts.json`, render one card per post (id, platforms, register badge, MT time, beat, image, body in a `<pre>`), escape everything, write a single self-contained `preview.html`. The human reviews this, approves, and the set is handed to social-publishing-guardian.

## The result

8 cards + 5 photo squares + 2 overlays + 1 preview.html, all on-brand, all regenerable from the spec and posts file. No asset is hand-edited; re-running the four scripts reproduces the set byte-stably (fonts held constant).

## See also

- Guides demonstrated: `guides/01` through `guides/06`.
- Templates: `templates/card-spec.template.mjs`, `templates/photo-crop-spec.template.mjs`, `templates/overlay-spec.template.mjs`, `templates/posts.template.json`.
- Canonical scripts (read-only): `heather-brand-engine/social/{make-cards,process-photos,make-overlays,make-preview}.mjs`.
