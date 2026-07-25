# Social Creative Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `social-creative-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`ai-tools/agents/social-creative-guardian.md`](../../agents/social-creative-guardian.md)
**Weapon:** [`ai-tools/skills/social-creative-weapon/`](../../skills/social-creative-weapon/)
**Command Brief:** [`ai-tools/command-briefs/social-creative-guardian-command-brief.md`](../../../command-briefs/social-creative-guardian-command-brief.md)
**Trigger policy:** proactive (confirm-first)

---

## Domain

social-creative-guardian is the programmatic on-brand social CREATIVE specialist: it turns a client's markdown brand spec (BRAND-GUIDE.md / "Claude design md": palette, fonts, voice, registers, signature lines) into finished, reproducible, ready-to-post social assets, with a browsable preview as the human review gate. It owns the make-the-creative layer end to end: 1080x1080 quote/value cards (SVG rasterized to PNG via @resvg/resvg-js with vertical-centering, font-fill, and per-line wrapping plus brand-TTF loading), photo crop-to-square (sharp cover-crop with per-image gravity, EXIF/GPS stripped), gradient-scrim text-overlay CTA cards (sharp SVG-over-photo composite), the preview.html review gate, the jab/jab/right-hook content cadence, and the video extension (HeyGen HyperFrames HTML-to-MP4 logo/intro/outro plus kie.ai Veo 3.1 / Kling premium clips). It is the make-the-creative layer that feeds social-publishing-guardian: it produces the files and the preview, a human approves, and the publisher delivers.

## Trigger phrases

Route to `social-creative-guardian` when the user says any of:

- "generate on-brand social cards" / "make quote cards from the brand guide"
- "crop these photos to square for posts"
- "add a gradient text overlay to this photo"
- "turn this brand guide into social creative"
- "build a branded intro/outro video"

Or when the request implicitly involves generating reproducible on-brand social graphics or video from a markdown brand spec.

## Do NOT route when

- The request is to bootstrap a design system from scratch (palette, tokens, the brand itself) — that is `design-system-guardian`.
- The request is enforcing or applying a design system inside an app's UI — that is `ux-ui-guardian`.
- The request is generic web image compression / optimization (AVIF/WebP delivery, srcset, LCP) — that is `image-optimization-guardian`.
- The request is the actual posting / approval gate (pushing or scheduling finished assets to live accounts) — that is `social-publishing-guardian`.

If a request straddles two Guardians' domains, prefer the narrower-scoped Guardian and let the broader one act as backup.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The client's brand spec (BRAND-GUIDE.md: palette hexes, fonts, the registers/voices, signature lines).
- The per-post copy and beat, and any client photos.
- The target output location (e.g. `social/images/` in the campaign repo); optional brand TTF files (default: system fonts, swap to brand TTFs on request).

If a required input is missing — especially a brand fact not in the spec — do not invoke yet; ask the user to supply it. Never invent brand facts.

## Outputs the Guardian produces

- 1080x1080 PNG cards / cropped square photos / gradient-overlay cards, written to the campaign repo (e.g. `social/images/`).
- A browsable `preview.html` review gate (copy plus image per post) returned to the caller, plus reproducible generator scripts; branded video when asked.
- An asset-set hand-off report (`reports/asset-set-report.template.md`) listing the finished, approved assets and the host plan for social-publishing-guardian.

## Multi-Guardian sequences this Guardian participates in

- Social content pipeline — social-creative-guardian makes the creative and the preview gate; a human approves; `social-publishing-guardian` delivers the approved assets. Upstream it composes `design-system-guardian` (brand bootstrap) and `ux-ui-guardian` (app UI) as peer/upstream only, not owned.

## Critical directives the orchestrator should respect

- Brand spec is the source of truth: pull palette/fonts/voice/signature lines from the markdown; never guess. Keep registers separate (an elegant register vs a bold all-caps community register); no bleed.
- Mobile readability first: type fills the card and reads on a phone; pre-split long lines so nothing overflows.
- Reproducible and data-driven: generators read a spec/posts file and re-run deterministically; the preview shows exactly what publishes.
- Strip metadata: re-encode photos through sharp so source EXIF/GPS never publishes; commit only processed outputs.
- Preview before publish: the Guardian makes the creative and the review gate; a human approves; social-publishing-guardian delivers. Never publish from here.
- No em dashes on any asset, in any report, or in prose, ever.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`ai-tools/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
