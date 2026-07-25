---
name: social-creative-weapon
description: Programmatic on-brand social creative runbook for social-creative-guardian. Equips the Guardian to generate 1080x1080 social cards (SVG rasterized via @resvg/resvg-js), crop photos to square (sharp, cover + per-image gravity, EXIF stripped), composite gradient-scrim + text OVERLAY cards (sharp), build a browsable preview.html review gate, apply the jab/jab/right-hook image cadence, and produce branded video via HeyGen HyperFrames (HTML-to-MP4 logo/intro/outro) + kie.ai (Veo/Kling premium clips), all driven by a markdown brand spec (BRAND-GUIDE.md). Use whenever on-brand social graphics or video are generated from a brand guide. Preview before publish; never publishes. No em dashes, ever.
---

# social-creative-weapon

The creative-generation rulebook for `social-creative-guardian`. It turns a markdown brand spec ("Claude design md" / `BRAND-GUIDE.md`) into finished, reproducible, on-brand social assets, with a browsable preview as the human review gate. The static-card pipeline was built and verified on a real client (Cuantico / Heather Ferrari) on 2026-06-29; the video layer is researched and ready but is a per-client spike. This SKILL.md is the navigation layer: it tells you the shape of the work and points at the guide that holds each procedure's detail.

## The one rule

Preview before publish, and the brand spec is law. Every asset is generated from the client's markdown spec (palette, fonts, voice, signature lines), reviewed by a human in a generated `preview.html`, then handed to social-publishing-guardian. This Weapon makes creative; it never publishes.

## Critical directives (the guardrails)

These come from the Command Brief's SUBAGENT CRITICAL DIRECTIVES. The full reasoning and enforcement detail live in `guides/00-principles.md`; the short form:

1. **Brand spec is the source of truth.** Pull palette, fonts, voice, and signature lines from the markdown; never guess. Keep registers separate (an elegant register vs a bold all-caps community register); no bleed. An off-spec asset is off-brand, and a leaked register breaks the voice.
2. **Mobile readability first.** Type fills the card and reads on a phone; pre-split long lines so nothing overflows at the chosen font size. A card clustered in a corner with dead space or overflowing text is unusable on the feed.
3. **Reproducible and data-driven.** Generators read a spec/posts file and re-run deterministically; the preview shows exactly what publishes. Hand-edited one-off assets drift from the source and cannot be regenerated.
4. **Strip metadata.** Re-encode photos through sharp so source EXIF/GPS never gets published; keep raw source photos out of git, commit only processed outputs. Publishing a client's GPS/EXIF is a privacy leak.
5. **Preview before publish.** The Guardian makes the creative and produces the review gate; a human approves; social-publishing-guardian delivers it. Never publish from here.
6. **No em dashes** on any asset, in any report, or in prose, ever.

## The pipeline, in order

The Guardian follows these ACTION steps (from the brief). Each links to the guide that holds the procedure and the example that demonstrates it.

1. **Load the brand spec.** Pull palette, fonts, voice, and signature lines from `BRAND-GUIDE.md`. Never invent brand facts. See `guides/01-load-brand-spec.md`.
2. **Pick the asset per beat (jab/jab/right-hook).** Value/teaching beats get clean quote CARDS; announcement/urgency/day-of "right hooks" get a PHOTO or a gradient-text OVERLAY. Vary so the feed is not a content mill. See `guides/02-asset-cadence.md`.
3. **Generate cards.** Author an SVG from the palette/fonts and rasterize to 1080x1080 PNG via @resvg/resvg-js. Vertically center the text block to fill the card; size the font to fill; pre-split long lines. See `guides/03-cards-resvg.md`.
4. **Crop photos to square.** sharp cover-crop with per-image gravity (or `attention` auto-framing) to keep the subject framed; re-encoding strips EXIF/GPS. See `guides/04-photos-sharp.md`.
5. **Build gradient-scrim + text OVERLAY cards.** Composite a transparent SVG over a cropped photo via sharp, for CTA/right-hook posts. See `guides/05-overlays-sharp.md`.
6. **Generate the preview.html.** Copy plus image per post, so a human reviews the whole set before publishing. See `guides/06-preview-gate.md`.
7. **Video (extension, per-client spike).** Author a HyperFrames HTML scene for a branded logo reveal/intro/outro, and/or generate a premium clip via kie.ai (Veo/Kling); the SAME brand spec drives both. See `guides/07-video-hyperframes.md` and `guides/08-video-kie-ai.md`.
8. **Hand off.** Give the finished, approved assets (and the host plan) to social-publishing-guardian. See `guides/00-principles.md` (scope boundary).

## The toolchain (Node, verified)

Dev deps for the static pipeline: `@resvg/resvg-js` (SVG to PNG) and `sharp` (photo crop/composite). System fonts (e.g. Georgia for an elegant serif, Arial Black for a bold sans) render cleanly via resvg with `loadSystemFonts: true`; load brand TTFs explicitly via `font.fontFiles` for exact fidelity (see `guides/03-cards-resvg.md`). The video layer adds Node 22+ and FFmpeg as system prereqs for HyperFrames, and a kie.ai API key (env var only) for premium clips.

## Worked examples and templates

- **Full campaign generation** (the Heather jab/jab/right-hook set: cards + photos + overlays + preview): `examples/01-heather-campaign-generation.md`.
- **Branded short** (HyperFrames intro/outro bookending a kie.ai clip): `examples/02-branded-short-video.md`.
- **Templates** to fill in: card spec (`templates/card-spec.template.mjs`), photo-crop spec (`templates/photo-crop-spec.template.mjs`), overlay spec (`templates/overlay-spec.template.mjs`), posts-to-preview map (`templates/posts.template.json`), and a HyperFrames scene skeleton (`templates/hyperframes-scene.template.html`).
- **Report shape** for an asset-set handoff: `reports/asset-set-report.template.md`.

## Open questions carried from research

These survived the literature sweep and are flagged in the relevant guides as `> TODO: open question`. Do not invent answers; surface them to the human at build time.

- Brand TTF files are a per-client input (resvg loads them via `font.fontFiles`, but the actual file ships from the client). See `guides/03-cards-resvg.md`.
- The video layer is a per-client spike: re-verify kie.ai endpoints and pricing live at build. See `guides/08-video-kie-ai.md`.
- The kie.ai 14-day file retention needs a re-host destination, decided per deployment. See `guides/08-video-kie-ai.md`.

## Scope boundary

This Weapon owns generating on-brand social creative (cards, cropped photos, overlays, preview, and the video extension) from a brand spec. It does NOT bootstrap a design system (design-system-weapon), apply tokens inside app UI (ux-ui-weapon), do generic image compression for the web (image-optimization-weapon), or publish the assets (social-publishing-weapon). When a brand fact is missing from the spec, ask; do not invent. Mark open questions `> TODO: open question - needs human decision`.
