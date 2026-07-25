# social-creative-weapon

The Weapon for `social-creative-guardian`: it turns a markdown brand spec (`BRAND-GUIDE.md` / "Claude design md") into finished, reproducible, on-brand social assets (1080x1080 cards via @resvg/resvg-js, square photo crops and gradient-scrim overlays via sharp, a browsable `preview.html` review gate, and an optional branded-video layer via HeyGen HyperFrames + kie.ai), with the jab/jab/right-hook cadence selecting the asset per beat. It makes the creative and produces the review gate; a human approves and social-publishing-guardian delivers, so this Weapon never publishes. The static-card pipeline was built and verified on a real client (Cuantico / Heather Ferrari) on 2026-06-29; the video layer is researched and ready as a per-client spike.

## Layout

- `SKILL.md` - the navigation layer (lean, triggering, the 8-step pipeline).
- `guides/` - one focused procedure per file (00 principles, 01 load spec, 02 cadence, 03 cards/resvg, 04 photos/sharp, 05 overlays/sharp, 06 preview gate, 07 video/HyperFrames, 08 video/kie.ai).
- `examples/` - a full Heather campaign generation (happy path) and a branded short (video spike, edge case).
- `templates/` - fillable stubs: card spec, photo-crop spec, overlay spec, posts-to-preview map, HyperFrames scene skeleton.
- `reports/` - the asset-set report template and the past-run archive.
- `research/` - the audit trail authored by loremaster (read-only; do not modify).

## Provenance

- Command Brief: `ai-tools/command-briefs/social-creative-guardian-command-brief.md` (depth: deep).
- Research: `ai-tools/skills/social-creative-weapon/research/research-summary.md` (15 source files across 6 subfolders, authored by loremaster 2026-06-29).
- Canonical worked scripts (read-only reference, not modified): `heather-brand-engine/social/{make-cards,process-photos,make-overlays,make-preview}.mjs`.
