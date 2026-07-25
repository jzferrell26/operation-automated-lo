---
source_url: https://hyperframes.heygen.com/introduction
retrieved_on: 2026-06-29
source_type: official-docs
authority: official
relevance: high
topic: hyperframes
weapon: social-creative-weapon
---

# HyperFrames official introduction - composition model + determinism math

## Summary
The official intro confirms the mental model: a video is an HTML document; elements get `data-start`/`data-duration` for timing and `data-track-index` for layering; clips/audio/text stack into a seekable timeline. Determinism is exact: the engine computes `frame = floor(time * fps)` and seeks each frame in headless Chrome via `beginFrame`, then encodes via FFmpeg, so same input -> identical bytes. Built LLM-first: the CLI is non-interactive, flag-driven, plain-text output, because compositions are plain HTML that models generate naturally.

## Key quotations / statistics
- Tagline: "Write HTML. Render video. Built for agents."
- Determinism: "Same input always produces identical output" because rendering uses `frame = floor(time * fps)` not wall-clock timing -> reliable batch + CI.
- Pipeline: write HTML -> preview in-browser with live edits -> render to MP4; engine seeks each frame via `beginFrame`, encodes via FFmpeg.
- Animation runtimes: GSAP, Lottie, CSS transitions via a Frame Adapter pattern for seekability.
- Output: customizable resolution, frame rate, and shader-based transitions across packages; transparent overlays supported.

## Annotations for weapon-forge
- The `frame = floor(time * fps)` formula and the `paused: true` seekable-timeline rule (from the README) together are the core authoring contract; put them at the top of `guides/video-hyperframes.md` so the Guardian authors timelines correctly the first time.
- "Built for agents / plain HTML" is exactly why this belongs in social-creative: the SAME way the Guardian writes a card SVG from the brand palette/fonts, it writes a HyperFrames HTML composition from the same spec - reuse the brand tokens (hex, font-family, logo path) verbatim across card and video.
- Transparent overlay output = lower-thirds / animated logo bugs that can be composited over a kie.ai clip; note this as the HyperFrames+kie.ai bridge.
- Live preview (`npx hyperframes preview`) is the video analogue of the static `preview.html` review gate - the human reviews motion before render, consistent with the weapon's preview-before-publish rule.
- DEEPENS the for-now weapon's single video bullet with the composition/timing/determinism model.
