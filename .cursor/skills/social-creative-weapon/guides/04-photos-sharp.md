# 04 - Photos: crop to 1080 square via sharp

ACTION step 4: crop photos to 1080 square via sharp (cover + per-image gravity to keep the subject framed); re-encoding strips EXIF/GPS.

The canonical worked script is `heather-brand-engine/social/process-photos.mjs` (read-only reference). The fillable stub is `templates/photo-crop-spec.template.mjs`.

## The manual crop recipe (verified)

This keeps the subject framed when you know where they are in the source (the verified Heather path):

```js
import sharp from "sharp";
const m = await sharp(src).metadata();
const side = Math.min(m.width, m.height);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const left = clamp(Math.round(cx * m.width  - side / 2), 0, m.width  - side); // cx = subject center fraction
const top  = clamp(Math.round(cy * m.height - side / 2), 0, m.height - side); // cy defaults ~0.45
await sharp(src)
  .extract({ left, top, width: side, height: side })
  .resize(1080, 1080, { fit: "cover" })
  .png({ quality: 90 })
  .toFile(out);
```

`cx`/`cy` are the subject's center as a fraction of width/height. They only matter for off-center subjects: a landscape keynote shot where she stands on the right needs `cx ~ 0.72`; a center-left workshop shot needs `cx ~ 0.36`. `fit: "cover"` fills and crops with no letterbox, which is correct for a 1080 square; `contain` would letterbox and is wrong here (`research/sharp-photos-overlays/2026-06-29-sharp-resize-cover-gravity-attention-extract.md`).

## The auto-framing alternative (new, for bulk)

When you cannot hand-tune each image, sharp can auto-pick the crop region:

```js
await sharp(src)
  .resize(1080, 1080, { fit: "cover", position: sharp.strategy.attention })
  .png()
  .toFile(out);
```

`sharp.strategy.attention` frames on the region of highest visual interest (a face, high contrast); `sharp.strategy.entropy` targets the busiest region. These are cover-only strategies (`research/sharp-photos-overlays/2026-06-29-sharp-resize-cover-gravity-attention-extract.md`).

**Decision rule:** default to `attention` for a batch where you cannot inspect each photo; fall back to the manual `cx`/`cy` extract when attention mis-frames (it can pick the wrong subject in a crowd). Document which path you used in the report.

## Orientation: rotate before you strip

Phone photos carry an EXIF orientation flag. Re-encoding strips EXIF, so call `.rotate()` (no argument) FIRST to auto-orient from the EXIF flag, THEN crop/resize, so a portrait phone photo does not come out sideways:

```js
await sharp(src).rotate().extract({ ... }).resize(1080, 1080, { fit: "cover" }).png().toFile(out);
```

## EXIF/GPS strip is automatic (the privacy guardrail)

Re-encoding through sharp to PNG drops EXIF/GPS by default (sharp does not copy metadata unless asked). That is the privacy guardrail from `guides/00-principles.md`: keep raw source photos out of git, commit only the processed 1080 squares, and never publish a client's GPS/EXIF.

## See also

- Photos feeding the overlay step: `guides/05-overlays-sharp.md`.
- Worked photo set: `examples/01-heather-campaign-generation.md`.
- Fillable stub: `templates/photo-crop-spec.template.mjs`.
- Canonical reference script: `heather-brand-engine/social/process-photos.mjs` (read-only).
- Source: `research/sharp-photos-overlays/2026-06-29-sharp-resize-cover-gravity-attention-extract.md`.
