---
source_url: https://sharp.pixelplumbing.com/api-resize/
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: critical
topic: sharp
weapon: social-creative-weapon
---

# sharp resize - fit cover, gravity/position, attention/entropy, extract

## Summary
The sharp official resize docs confirm the crop-to-square recipe and add a smarter option the for-now weapon did not document: `position: sharp.strategy.attention` (and `sharp.strategy.entropy`) for COVER crops, which auto-frames the crop on the region of highest visual interest (e.g. a face) instead of relying on hand-tuned cx/cy. This is the automatic alternative to the manual `extract()` + per-image gravity approach.

## Key quotations / statistics
- `cover` (default): "Preserving aspect ratio, attempt to ensure the image covers both provided dimensions by cropping/clipping to fit."
- `contain`, `fill`, `inside`, `outside` are the other four fits.
- For cover/contain, position defaults to `centre`. Options: positional (`top`,`right top`,`right`,`right bottom`,`bottom`,`left bottom`,`left`,`left top`), gravity (`north`...`northwest`, `center`/`centre`), and STRATEGIES (cover only): `sharp.strategy.entropy` or `sharp.strategy.attention`.
- `extract({ left, top, width, height })` crops a defined region (zero-indexed offsets).

## Examples (verbatim)
```javascript
// resize with cover + position
sharp(input).resize(200, 300, { fit: 'cover', position: 'right top' }).toFile('output.png')
// extract a region
sharp(input).extract({ left, top, width, height }).toFile(output)
```

## Annotations for weapon-forge
- TWO valid crop strategies for the weapon to document, with a decision rule:
  1. MANUAL (current heather recipe): `extract({left,top,side,side})` computed from per-image `cx`/`cy` -> `.resize(1080,1080,{fit:'cover'})`. Best when the operator knows the subject position (landscape keynote shot, subject on the right -> cx~0.72).
  2. AUTO: `.resize(1080,1080,{fit:'cover', position: sharp.strategy.attention})` -> sharp picks the region of highest interest (face/contrast). Best for batch crops where you can't hand-tune each one. `entropy` is the busier-region variant.
- Recommend: default to `attention` for bulk, fall back to manual `cx`/`cy` when attention mis-frames (it can pick the wrong subject in a crowd). Document both; the for-now weapon only had the manual path.
- `fit: 'cover'` is the right fit for 1080 square (fills + crops, no letterbox). `contain` would letterbox - wrong for social squares.
- EXIF/GPS strip is a side effect of re-encoding through sharp to PNG (no copy of metadata by default) - this corroborates the for-now weapon's privacy guardrail; sharp also has `.rotate()` (auto-orient from EXIF before stripping) worth noting so portrait phone photos don't come out sideways.
- CORROBORATES the for-now crop recipe and ADDS the attention/entropy auto-framing strategy + the .rotate() orientation note.
