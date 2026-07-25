# 06 - The preview.html review gate

ACTION step 6: generate a browsable `preview.html` (copy + image per post) so a human can review the whole set before publishing.

The canonical worked script is `heather-brand-engine/social/make-preview.mjs` (read-only reference). The posts file it reads is `templates/posts.template.json`.

## Why a preview, not a folder of PNGs

The preview is the human review gate. It shows exactly what publishes (the exact body copy plus the exact image, per post) in one browsable page, so the client approves the whole set in context before anything goes to social-publishing-guardian. A folder of loose PNGs cannot show copy + image + beat + schedule together; the preview can.

## What the preview shows per post

Generate `preview.html` from the posts file (`posts.json`). For each post render a card with:

- the post `id`
- the target platforms (e.g. Facebook + LinkedIn)
- the `register` badge (Strategist vs HF Bomb), color-coded
- the scheduled time, rendered in the client timezone
- the `beat` (italic, muted)
- the image (`<img src="images/...">`) or a "photo pending" placeholder for right-hook posts whose photo is not yet in
- the body copy in a `<pre>` so whitespace is preserved exactly

## The one hard rule: escape everything

HTML-escape every interpolated string (`& < >`) before it goes into the page, both copy and attribute values. The verified `esc()` helper does this. Unescaped copy can break the layout or inject markup. This is the same escaping discipline used in the card and overlay SVGs.

## Structure

The verified `make-preview.mjs` reads `posts.json`, maps each post to an `<article>`, and writes a single self-contained `preview.html` with inline CSS (no external assets, so it opens anywhere). It is read-only: it reads `posts.json`, writes `preview.html`, sends nothing. The register badge and the left border are color-coded per register so the reviewer sees the voice mix at a glance.

## After approval

Once the human approves in the preview, the asset set is ready for handoff. Write the report from `reports/asset-set-report.template.md` and hand the approved assets plus the host plan to social-publishing-guardian (`guides/00-principles.md`). Never publish from here.

## See also

- The posts file schema: `templates/posts.template.json`.
- Worked preview generation: `examples/01-heather-campaign-generation.md`.
- Canonical reference script: `heather-brand-engine/social/make-preview.mjs` (read-only).
