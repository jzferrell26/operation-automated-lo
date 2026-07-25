---
source_url: https://github.com/vercel/satori
retrieved_on: 2026-06-29
source_type: github-readme
authority: official
relevance: high
topic: resvg
weapon: social-creative-weapon
---

# Satori vs raw SVG - the card authoring decision (Satori pairs WITH resvg, not vs)

## Summary
Important clarification for the weapon: Satori and resvg-js are NOT competitors - Satori converts HTML/CSS (JSX or object syntax) -> SVG, and resvg-js converts SVG -> PNG. They are typically chained (Satori then resvg). The real decision is HOW the card SVG is authored: (a) hand-author raw SVG (the current heather pipeline) for full control, or (b) author JSX/flexbox and let Satori produce the SVG for declarative layout. For text-heavy quote cards with precise vertical centering and tspan accents, raw SVG is simpler and more controllable; Satori shines when layout is dynamic/data-driven and you'd rather write flexbox than compute coordinates.

## Key quotations / statistics
- Satori = "Enlightened library to convert HTML and CSS to SVG"; uses Yoga (flexbox) exclusively, "There is no CSS Grid support."
- Not supported: `<input>`, `cursor`, `<style>`/`<link>`/`<script>`, 3D transforms, `z-index`, `calc()`. Supported: flexbox, positioning, borders, typography, backgrounds, 2D transforms, masks, filters.
- Fonts MUST be supplied as data buffers (ArrayBuffer/Buffer); "System fonts aren't accessible." (Contrast: resvg-js CAN loadSystemFonts.)
- Trade-off (verbatim): "Hand-authoring SVG offers complete control and avoids font/layout overhead. Satori trades that control for declarative HTML/CSS syntax - useful for dynamic content generation but less flexible for complex graphical designs."
- Workflow: "Satori outputs SVG; converting to PNG requires pairing it with libraries like resvg or resvg-js."

## Annotations for weapon-forge
- Document the chain clearly so no one thinks they must choose Satori OR resvg: cards = [author SVG] -> resvg-js -> PNG, OR [author JSX] -> Satori -> SVG -> resvg-js -> PNG.
- DECISION RULE for `guides/cards-resvg.md`:
  - Raw SVG (current, recommended default for quote/event cards): precise control over vertical-centering math, tspan gold accents, the accent bar + eyebrow + footer; no flexbox limits.
  - Satori: when a card layout is highly variable/data-driven and you'd rather express it as flexbox than compute x/y; accept flexbox-only + must-supply-font-buffers.
- Font note: Satori requires font BUFFERS (no system fonts), whereas resvg-js can use system fonts OR fontFiles. If a client lacks brand TTFs, the raw-SVG + resvg loadSystemFonts path is the lower-friction option.
- This is NEW context not in the for-now weapon (which only mentions resvg). Adding the Satori option + the chain + the decision rule rounds out the cards guide without changing the verified default.
