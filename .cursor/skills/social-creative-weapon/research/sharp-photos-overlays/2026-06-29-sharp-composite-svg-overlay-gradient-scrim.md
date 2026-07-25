---
source_url: https://sharp.pixelplumbing.com/api-composite/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: sharp
weapon: social-creative-weapon
---

# sharp composite() - SVG-over-photo overlay (the gradient-scrim recipe)

## Summary
Official confirmation of the overlay-card recipe: `composite([{ input: <svgBuffer>, top, left }])` overlays an SVG (or image) over the resized base photo. The SVG's transparency/alpha is preserved by the default `over` blend mode, so a bottom-up gradient scrim (transparent at top, ~0.95 opacity at bottom) plus brand text composites cleanly onto a cropped photo. Overlay must be <= base dimensions. 27 blend modes available; `over` is the right default for a text+scrim overlay.

## Key quotations / statistics
- "Composite image(s) over the processed (resized, extracted etc.) image." Overlay "must be equal to or smaller than the base image."
- Input can be image buffers/paths, generated overlays, text, or raw pixel data. (An SVG string -> Buffer is a valid `input`.)
- Positioning: `gravity` (default centre), or `top`+`left` px offsets that override gravity when both provided, or `tile`.
- "Supports 27 blend modes including over (default), multiply, screen, overlay, darken, lighten." `over` preserves the overlay's alpha.
- "Operations like resize and rotation apply to the base image before composition occurs" - so resize the photo to 1080x1080 first, then composite the full-canvas SVG at top:0,left:0.

## Example (verbatim pattern)
```javascript
await sharp(background)
  .composite([{ input: layer1, gravity: 'northwest' }, { input: layer2, gravity: 'southeast' }])
  .toFile('combined.png');
```
For the overlay card: `sharp(photo).resize(1080,1080,{fit:'cover'}).composite([{ input: Buffer.from(overlaySvg), top:0, left:0 }]).png().toFile(out)`.

## Annotations for weapon-forge
- CORROBORATES the for-now weapon's overlay recipe exactly: resize photo to 1080 cover, then composite a transparent full-canvas SVG (scrim gradient + brand text) at top:0,left:0. The `over` blend default is what makes the alpha scrim work.
- Document the constraint "overlay <= base": the scrim SVG must be 1080x1080 (same as the resized base), not larger, or composite errors.
- Note the order rule: resize/extract the base BEFORE composite. weapon-forge should show the chained call so the scrim aligns to the cropped frame, not the original.
- The scrim gradient (linear, transparent ~30% height -> ~0.95 opacity at bottom) lives inside the SVG, authored from brand colors - ties the overlay card back to the brand spec. Reuse the same palette token as the cards.
- sharp can also composite TEXT directly (input as a text object), but authoring the scrim+text as one SVG keeps it consistent with the resvg card path and the brand spec; recommend the SVG route.
