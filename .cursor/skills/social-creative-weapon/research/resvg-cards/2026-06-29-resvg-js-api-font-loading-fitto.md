---
source_url: https://github.com/yisibl/resvg-js
retrieved_on: 2026-06-29
source_type: github-readme
authority: official
relevance: critical
topic: resvg
weapon: social-creative-weapon
---

# resvg-js (yisibl/resvg-js) - Resvg options, font loading, fitTo

## Summary
@resvg/resvg-js is the Rust-backed (napi) SVG->PNG rasterizer the card pipeline uses. The official README confirms the exact `font` option object (the for-now weapon only used `loadSystemFonts: true`): you can load brand TTFs explicitly via `fontFiles` / `fontDirs`, set `defaultFontFamily`, and DISABLE system fonts for speed when using brand fonts exclusively. `fitTo: { mode: 'width', value: 1080 }` is the documented way to force a 1080-wide output. resvg does NOT do font fallback to the network: any font referenced in the SVG must be loadable locally or text silently uses the default/missing glyphs.

## Key quotations / statistics
- Font object: `fontFiles` (custom TTF paths), `fontDirs` (dirs to scan), `loadSystemFonts` (default true), `defaultFontFamily`, `defaultFontSize`, plus `serifFamily`/`sansSerifFamily`/`cursiveFamily`/`fantasyFamily`/`monospaceFamily`.
- "It will be faster to disable loading system fonts" when using custom fonts exclusively.
- `fitTo.mode` is one of `'original'`, `'width'`, `'height'`, `'zoom'`; `value` is px or zoom factor.
- `background` accepts a CSS color string, e.g. `'rgba(238, 235, 230, .9)'`.
- Render: `const pngData = resvg.render(); const png = pngData.asPng();` Dimensions via `resvg.width/height` and `pngData.width/height`.

## Brand-TTF example (verbatim)
```javascript
const { Resvg } = require('@resvg/resvg-js')
const svg = await promises.readFile('./input.svg')
const opts = {
  background: 'rgba(238, 235, 230, .9)',
  fitTo: { mode: 'width', value: 1200 },
  font: { fontFiles: ['./fonts/custom.ttf'], loadSystemFonts: false }
}
const png = new Resvg(svg, opts).render().asPng()
```

## Annotations for weapon-forge
- This DIRECTLY answers the for-now weapon's open TODO ("for exact brand fidelity, load the brand TTFs explicitly"). The mechanism is `font.fontFiles: ['./fonts/Brand.ttf']` (+ `loadSystemFonts: false` for fidelity/speed). Put a worked "brand-TTF card" example in `guides/cards-resvg.md`.
- Guardrail: because resvg has no network font fetch, a card SVG that names a brand font NOT in fontFiles/fontDirs/system will render with the wrong glyphs and not error loudly. The weapon must instruct: declare every font family used in the SVG and load its file. This is the silent-failure mode behind "PNG rendering needs the brand fonts available."
- For the heather pipeline, `loadSystemFonts: true` with Georgia/Arial Black was operator-approved; document BOTH paths (system default vs explicit TTF) and the trade-off (fidelity/determinism vs zero font files).
- `fitTo: { mode: 'width', value: 1080 }` is the canonical 1080-square knob; pair with a 1080x1080 SVG viewBox.
- CORROBORATES the for-now `Resvg` snippet and EXTENDS it with the full font object and the no-network-fallback gotcha.
