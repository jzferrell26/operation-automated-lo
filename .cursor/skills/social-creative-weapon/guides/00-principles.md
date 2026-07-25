# 00 - Principles and guardrails

The non-negotiable rules for every asset this Weapon produces. These restate the Command Brief's SUBAGENT CRITICAL DIRECTIVES with the reasoning attached, because the model holds a rule better when it knows why the rule exists.

## 1. Brand spec is the source of truth

Pull palette hexes, font families, the voice registers, and signature lines from the client's `BRAND-GUIDE.md`. Never guess a brand fact. The 2026 practitioner consensus is explicit: treat brand guidelines as a data source to be queried, not a document to be read, because "without that foundation, every tool produces generic mush" (`research/brand-spec/2026-06-29-brand-guidelines-as-queryable-data-source.md`).

Keep registers SEPARATE. Heather Ferrari ships two: an elegant cream/slate/gold "Strategist" register and a high-contrast all-caps "HF Bomb" community register. A generator selects the register per beat as structured data; it never paraphrases one register's copy into the other's look. A leaked register breaks the voice.

If a brand fact is missing, ask. Mark it `> TODO: open question - needs human decision`. Do not invent.

## 2. Mobile readability first

The card is read on a phone, thumb-scrolled, at a glance. Two rules follow:

- **Fill the card.** Vertically center the text block inside a band so the quote fills the frame instead of clustering at the top with dead space. The verified `centeredBlock()` helper does this (`research`-corroborated by the mobile-adapted caveat in `research/content-cadence/2026-06-29-jab-jab-right-hook-cadence-image-mix.md`).
- **Pre-split long lines.** Author the quote as an array of lines sized to the chosen font so nothing overflows the 1080 width on a phone. Do not rely on auto-wrapping; SVG `<text>` does not wrap.

## 3. Reproducible and data-driven

Every generator reads a spec or posts file and re-runs deterministically. The `preview.html` shows exactly what publishes. Hand-edited one-off assets drift from the source and cannot be regenerated. This is the reproducibility thesis: one spec, many outputs (cards, overlays, story, video), all on-brand.

For the video layer, determinism is enforced by HyperFrames itself: no `Date.now()`, no unseeded `Math.random()`, no runtime network fetch, or frame-accurate seeking breaks (`research/hyperframes-video/2026-06-29-hyperframes-agent-authoring-rules-determinism.md`). The same discipline applies to the static pipeline: bundle fonts and assets locally, never reference a remote URL the render depends on.

## 4. Strip metadata

Re-encode every photo through sharp before it is published. PNG re-encoding drops EXIF/GPS by default (`research/sharp-photos-overlays/2026-06-29-sharp-resize-cover-gravity-attention-extract.md`). Keep raw source photos out of git; commit only the processed 1080 squares. Publishing a client's GPS/EXIF is a privacy leak, and it aligns with the repo's no-PII-in-git discipline.

## 5. Preview before publish

The Guardian makes the creative and produces the review gate. A human approves in the `preview.html`. social-publishing-guardian delivers the approved assets as drafts. Never publish from this Weapon. Separation of make-creative from publish keeps the approval gate honest.

## 6. No em dashes, ever

No em dashes (`U+2014`) or en dashes (`U+2013`) on any asset, in any report, or in any prose. Use a comma, colon, parentheses, period, or semicolon. Regular hyphens are fine. This applies to card copy, overlay text, video scripts, the preview, and every report. Scan output before handing off.

## Scope boundary (what this Weapon does NOT do)

- It does NOT bootstrap a design system. That is design-system-weapon. This Weapon consumes a finished brand spec.
- It does NOT apply tokens inside an app's UI. That is ux-ui-weapon.
- It does NOT do generic web image compression. That is image-optimization-weapon.
- It does NOT publish. That is social-publishing-weapon. This Weapon produces files plus the preview; a human approves; the publisher delivers.

## Handoff

When the asset set is generated and the preview is built, write the report from `reports/asset-set-report.template.md` and hand the approved assets plus the host plan to social-publishing-guardian. The report lists every file, its beat, its register, and any open TODO so the publisher and the human can act without re-reading this Weapon.

## See also

- Demonstrated end to end in `examples/01-heather-campaign-generation.md`.
- The cadence rule that drives asset selection: `guides/02-asset-cadence.md`.
