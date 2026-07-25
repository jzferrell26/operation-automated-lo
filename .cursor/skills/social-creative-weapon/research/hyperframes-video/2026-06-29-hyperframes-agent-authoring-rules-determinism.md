---
source_url: https://github.com/heygen-com/hyperframes/blob/main/CLAUDE.md
retrieved_on: 2026-06-29
source_type: github-readme
authority: official
relevance: critical
topic: hyperframes
weapon: social-creative-weapon
---

# HyperFrames CLAUDE.md - the exact authoring rules for an AI agent

## Summary
HyperFrames ships its own CLAUDE.md telling an AI agent how to author a composition correctly. The load-bearing rules: clips need `class="clip"`; GSAP timelines must be `paused` and registered on `window.__timelines`; and determinism is MANDATORY - no `Date.now()`, no unseeded `Math.random()`, no runtime network fetches, or frame-accurate seeking breaks. Always `lint` then `validate` (headless-Chrome runtime check) before `render`. This is the single best gap-fill for the weapon's video layer because it is the actual agent contract.

## Key quotations / statistics
- "Clips need class="clip". GSAP timelines must be paused and registered on window.__timelines."
- Determinism mandatory - AVOID: `Date.now()` calls, unseeded `Math.random()`, "Runtime network fetches during composition execution." "These break frame-accurate seeking and produce non-reproducible output."
- Pre-render gate: `npx hyperframes lint` (static HTML) then `npx hyperframes validate` (runtime check in headless Chrome) - "Both must pass."
- Registry: `registry/blocks/` = 50+ installable sub-composition scenes; `registry/components/` = effects/snippets; `registry/examples/` = starter templates.
- Conventions: bun for workspace ops; Conventional Commits; avoid `any`/`as T`; frame adapters plug in via seek-by-frame, GSAP primary.
- Creative direction handled via `frame.md` / `design.md` and `/hyperframes-creative` + `/hyperframes-media` skills (the brand-spec analogue inside HyperFrames).

## Annotations for weapon-forge
- These five rules are the heart of `guides/video-hyperframes.md`'s authoring checklist:
  1. every animated element: `class="clip"` + `data-start`/`data-duration`/`data-track-index`
  2. GSAP timeline: `gsap.timeline({ paused: true })` registered on `window.__timelines.<id>`
  3. NO `Date.now()`, NO unseeded `Math.random()`, NO runtime fetch (bundle assets locally / pin a seed)
  4. `npx hyperframes lint && npx hyperframes validate` BEFORE `render` (both must pass) - this is the video review gate, analogous to the static `preview.html`
  5. install reusable scenes via `npx hyperframes add <block>` from the 50+ registry blocks
- The "no runtime network fetch" rule reinforces the resvg font lesson: bundle brand fonts/logos LOCALLY into the composition; do not reference remote URLs.
- HyperFrames' own `design.md`/`frame.md` creative-direction convention is the in-tool mirror of the weapon's BRAND-GUIDE.md - the Guardian can hand HyperFrames a design.md derived from the same brand spec.
- This file is the strongest NEW material for the video layer; the for-now weapon had none of these authoring constraints.
