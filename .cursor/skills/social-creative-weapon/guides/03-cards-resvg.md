# 03 - Cards: SVG to 1080x1080 PNG via resvg-js

ACTION step 3: author an SVG from the palette/fonts and rasterize to a 1080x1080 PNG via @resvg/resvg-js. Vertically center the text block to fill the card; size the font to fill; pre-split long lines so nothing overflows on a phone.

This is the verified core of the pipeline. The canonical worked script is `heather-brand-engine/social/make-cards.mjs` (read-only reference); its templates are reproduced and explained in `examples/01-heather-campaign-generation.md`. The fillable stub is `templates/card-spec.template.mjs`.

## The rasterize call (verified)

```js
import { Resvg } from "@resvg/resvg-js";
const png = new Resvg(svg, {
  font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  fitTo: { mode: "width", value: 1080 },
}).render().asPng();
```

`fitTo: { mode: "width", value: 1080 }` forces a 1080-wide output; pair it with a `viewBox="0 0 1080 1080"` SVG so the square is exact (`research/resvg-cards/2026-06-29-resvg-js-api-font-loading-fitto.md`).

## The three recipes that matter (preserve these)

1. **Vertically center the quote block.** Compute the block height from the line count and `dy`, then place the first line so the block is centered inside a `[top, bottom]` band. This is the `centeredBlock()` helper in the verified script: it makes the quote fill the card instead of clustering at the top with dead space. Mobile readability depends on it.

2. **Size the font to fill, and pre-split lines.** Author the quote as an array of lines (e.g. `["People rarely fail", "unclear expectations."]`) sized to the chosen font so nothing overflows 1080px width. SVG `<text>` does not wrap; you split manually. Pick a font size that fills the width at the longest line.

3. **Per-line accent spans.** Render each line as `<tspan>`s so the emphasized phrase can take the brand accent (gold `#c9a96e` for Strategist, red `#d1410c` for HF Bomb). The verified `lines()` helper maps `{ text, fill? }` parts to tspans. Always HTML-escape interpolated text (`& < >`).

A brand card also carries a top accent bar, an eyebrow (letter-spaced kicker), and a footer (name + tagline + url). Two register templates ship verified: the elegant cream/serif Strategist card and the high-contrast all-caps HF Bomb card. See the worked code in `examples/01-heather-campaign-generation.md`.

## Fonts: system default vs brand TTF

Two paths, both documented; pick per client.

- **System fonts (verified default).** `font: { loadSystemFonts: true, defaultFontFamily: "Arial" }`. Georgia (elegant serif) and Arial Black (bold heavy) were operator-approved for Heather. Zero font files to ship. Lower friction.
- **Brand TTFs (exact fidelity).** Load the client's actual typefaces:

```js
const opts = {
  font: { fontFiles: ["./fonts/Brand.ttf"], loadSystemFonts: false },
  fitTo: { mode: "width", value: 1080 },
};
```

`loadSystemFonts: false` is faster and avoids accidental system substitution when you are using brand fonts exclusively (`research/resvg-cards/2026-06-29-resvg-js-api-font-loading-fitto.md`).

### The silent-failure gotcha (bake this in)

resvg does NOT fall back to the network for fonts. Any font family named in the SVG must be loadable locally (via `fontFiles`, `fontDirs`, or system fonts) or the text silently renders with the wrong/default glyphs and DOES NOT error. So: declare every font family used in the SVG and load its file. This is the open TODO the for-now weapon could not close; the mechanism is `font.fontFiles`, but the actual `.ttf`/`.otf` is a per-client input.

> TODO: open question - brand TTF files are a per-client input. resvg loads them via `font.fontFiles`, but the actual typeface file (e.g. Heather's exact brand serif vs the operator-approved Georgia system substitute) must be supplied by the client. Default remains system fonts; swap to brand TTFs on request. Confirm the font file is present before relying on it, because a missing font fails silently.

## Raw SVG vs Satori (the authoring decision)

Satori and resvg-js are NOT competitors; they chain. Satori converts HTML/CSS (JSX or object syntax) to SVG; resvg-js converts SVG to PNG (`research/resvg-cards/2026-06-29-satori-vs-resvg-jsx-vs-raw-svg-decision.md`). The decision is HOW you author the card SVG:

- **Raw SVG (recommended default for quote/event cards).** Full control over the vertical-centering math, tspan accents, and the accent bar + eyebrow + footer. No flexbox limits. This is the verified Heather path.
- **Satori.** Use when a card layout is highly variable/data-driven and you would rather express it as flexbox than compute x/y. Accept the constraints: flexbox only (no CSS Grid), and fonts MUST be supplied as data buffers (no system fonts). Chain it: `[author JSX] -> Satori -> SVG -> resvg-js -> PNG`.

For text-heavy quote cards with precise centering and accent spans, raw SVG is simpler and more controllable. If a client lacks brand TTFs, the raw-SVG + resvg `loadSystemFonts` path is the lower-friction option (Satori cannot use system fonts).

## See also

- Worked templates and the full Heather card set: `examples/01-heather-campaign-generation.md`.
- Fillable stub: `templates/card-spec.template.mjs`.
- Canonical reference script: `heather-brand-engine/social/make-cards.mjs` (read-only).
- Sources: `research/resvg-cards/2026-06-29-resvg-js-api-font-loading-fitto.md`, `research/resvg-cards/2026-06-29-satori-vs-resvg-jsx-vs-raw-svg-decision.md`.
