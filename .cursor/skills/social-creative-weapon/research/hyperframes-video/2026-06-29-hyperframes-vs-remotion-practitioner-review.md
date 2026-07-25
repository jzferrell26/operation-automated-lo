---
source_url: https://andrew.ooo/posts/hyperframes-heygen-html-video-agents-review/
retrieved_on: 2026-06-29
source_type: blog
authority: practitioner
relevance: high
topic: hyperframes
weapon: social-creative-weapon
---

# HyperFrames practitioner review - vs Remotion, gotchas, render speed

## Summary
A hands-on review framing HyperFrames as "the timeline IS the HTML document" (vs Remotion's React-component model). Determinism comes from registering seekable timelines on `window.__timelines.<id>` and advancing the playhead per-frame rather than by wall clock. The headline trade-off: HyperFrames buys reproducibility + agent-authorability + Apache-2.0-free at the cost of single-machine render throughput. For an agent-driven on-brand social pipeline (our exact use case) the reviewer calls it "genuinely a step change."

## Key quotations / statistics
- "same HTML in, same bytes out" - deterministic frame-seek rendering.
- Render speed (the main bottleneck): "a 30-second 1080p composition requires approximately 3 minutes locally, versus ~25 seconds on Remotion Lambda." First renders of 10-second 1080p take "35-50 seconds on M2 Pro hardware."
- Audio sync: "fiddly with seek-based animation" because frames are seeked not played; "tightly choreographed audio-to-timeline events demand careful offset math, and audio-reactive animation isn't yet supported."
- Verdict: "If you're building an automated content pipeline where the author is an agent, HyperFrames is genuinely a step change," but established Remotion teams "have no reason to migrate."

## Comparison matrix (verbatim)
| Factor | HyperFrames | Remotion |
|---|---|---|
| Authoring | HTML + CSS + seekable animation | React components |
| Build step | None required | Bundler required |
| Agent handoff | Plain HTML files | JSX/TSX in project |
| License | Apache 2.0, zero commercial cost | Source-available, paid tiers |

## Limitations / gotchas
- Render speed not competitive on a single machine for throughput-heavy work; horizontal sharding (or `lambda render`) is the escape hatch.
- Audio offset math is manual; no audio-reactive animation yet.
- Small component catalog (transitions, overlays, captions, charts only); no first-party React adapter.
- Browser Studio editor exists but "is clearly not the primary surface" - the agent/skill workflow is the focus.

## Annotations for weapon-forge
- Use this to write the realistic-expectations section of `guides/video-hyperframes.md`: short branded assets (logo reveal, 5-10s intro/outro, lower-third) are the sweet spot; do NOT promise fast bulk video on one machine.
- The for-now weapon's "simpler than Remotion; Remotion is the heavier option" claim is CORROBORATED and now has a concrete matrix + the agent-authorability rationale behind it.
- Concrete render-time numbers (3 min for 30s @1080p local) belong in the weapon so the operator sets expectations and considers `npx hyperframes lambda render` for volume.
- Audio caveat is a real gotcha: for music-backed intros, keep timing simple or accept manual offset tuning; flag audio-reactive as unsupported.
- Reinforces the kie.ai pairing: use kie.ai for the photoreal/AI motion clip (where HyperFrames is weak) and HyperFrames for the deterministic branded HTML overlay/logo work (where AI video is weak).
