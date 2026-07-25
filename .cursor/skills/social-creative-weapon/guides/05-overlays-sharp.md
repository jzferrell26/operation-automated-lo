# 05 - Overlay cards: gradient scrim + text over a photo via sharp

ACTION step 5: build gradient-scrim + text OVERLAY cards by compositing a transparent SVG over a cropped photo via sharp, for CTA/right-hook posts.

The canonical worked script is `heather-brand-engine/social/make-overlays.mjs` (read-only reference). The fillable stub is `templates/overlay-spec.template.mjs`.

## The composite recipe (verified)

Composite a transparent full-canvas SVG (a bottom-up gradient scrim + brand text) over a cropped photo:

```js
import sharp from "sharp";
const svg = Buffer.from(overlaySvg(job)); // 1080x1080, transparent except scrim + text
await sharp(photo)
  .resize(1080, 1080, { fit: "cover" })
  .composite([{ input: svg, top: 0, left: 0 }])
  .png()
  .toFile(out);
```

## The three rules that make it work (preserve these)

1. **Resize the base BEFORE composite.** sharp applies resize/extract to the base image before composition. So resize the photo to 1080x1080 first, then composite the full-canvas SVG at `top:0, left:0`, or the scrim will align to the original frame instead of the cropped one (`research/sharp-photos-overlays/2026-06-29-sharp-composite-svg-overlay-gradient-scrim.md`).

2. **Overlay must be <= base.** The scrim SVG must be exactly 1080x1080 (same as the resized base), not larger, or `composite()` errors. Same-size at `top:0,left:0` is the safe pattern.

3. **`over` is the right blend (the default).** The default `over` blend preserves the overlay's alpha, which is what makes a transparent scrim work: the SVG is transparent at the top (so the photo shows) and opaque toward the bottom (so the text has a legible home). Do not change the blend mode for a text+scrim overlay.

## The scrim gradient

Author the scrim inside the SVG as a vertical linear gradient: transparent at roughly 30% height, ramping to about 0.95 opacity at the bottom. The verified Heather scrim uses a slate `#1c2422` stop. The blank wall in a photo becomes intentional space; the text sits in the dark band. Reuse the same palette token as the cards so the overlay ties back to the brand spec.

```svg
<linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0.30" stop-color="#1c2422" stop-opacity="0"/>
  <stop offset="0.62" stop-color="#1c2422" stop-opacity="0.55"/>
  <stop offset="1"    stop-color="#1c2422" stop-opacity="0.95"/>
</linearGradient>
```

Over the scrim, place a gold kicker, a serif headline, and a sans sub (the ask). HTML-escape all interpolated text.

## When to use an overlay

Overlays are for "right hook" CTA posts (urgency, day-of, the ask), not for every post. Used selectively, they keep contrast in the feed between clean cards, clean photos, and overlays. See the cadence rule in `guides/02-asset-cadence.md`.

## Note: sharp can composite text directly

sharp can composite a text object directly, but authoring the scrim + text as one SVG keeps it consistent with the resvg card path and the brand spec. Recommend the SVG route.

## See also

- The photos the overlay composites onto: `guides/04-photos-sharp.md`.
- Worked overlay set: `examples/01-heather-campaign-generation.md`.
- Fillable stub: `templates/overlay-spec.template.mjs`.
- Canonical reference script: `heather-brand-engine/social/make-overlays.mjs` (read-only).
- Source: `research/sharp-photos-overlays/2026-06-29-sharp-composite-svg-overlay-gradient-scrim.md`.
