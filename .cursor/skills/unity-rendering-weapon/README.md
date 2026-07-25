# unity-rendering-weapon

The procedural arsenal for `unity-rendering-guardian`, PROJECT-DRIFT's URP (Universal Render
Pipeline) configuration and mobile-look specialist.

## What this weapon covers

- **URP setup & the Render Pipeline Asset** — installing `com.unity.render-pipelines.universal`,
  the pipeline asset, assigning it in Graphics + per Quality level, the Renderer asset
- **Quality tiers for mobile** — one URP asset per tier, render scale, HDR, MSAA, shadow budget
- **Forward vs Forward+** — the rendering path choice for a top-down scene
- **Lighting model** — baked / mixed / realtime, lightmapping static geometry, light + reflection probes
- **Post-processing volumes** — `Volume` + `VolumeProfile`, tonemapping / bloom / vignette /
  color grading within a mobile fill-rate budget
- **Shaders & materials** — the URP `Lit` / `Simple Lit` / `Baked Lit` / `Unlit` baseline,
  Shader Graph cost, the Built-in `Standard` upgrade path
- **Top-down camera stack** — Base/Overlay cameras, the perspective-vs-orthographic decision
- **Gray-box migration** — replacing `GrayBoxVisuals`'s `Standard` fallback with a real URP material

## The two facts that gate everything

1. **URP is NOT installed.** `Packages/manifest.json` has no `com.unity.render-pipelines.universal`.
   The gray-box renders on the Built-in pipeline via `GrayBoxVisuals`'s `Unlit/Color → URP/Unlit →
   Standard` fallback. Everything here is **Tier-1/art-phase DESIGN** — step zero is "install URP."
2. **The human art-directs.** Per `CLAUDE.md §7`, art and feel are human-handled. This Guardian ships
   a neutral, measurable baseline; it never makes the final look call.

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, cross-Guardian handoffs
2. Read `guides/00-principles.md` — tier discipline, URP-is-absent, human-owns-the-look, the perf seam
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Reference `research/research-summary.md` for the six backlog queries (DEGRADED-mode — verify
   version-specific URP facts in-editor)

## Key rule

**Co-own the shader-cost / batching seam with `mobile-game-perf-guardian`.** This Guardian picks the
URP shader, the volume stack, the render scale, the camera projection — the *look* and the
*config*. Whether it batches and fits the per-frame ms budget is perf's measurement. Set the
pipeline; hand the cost question across the seam. Never duplicate perf's work, and never block a
Tier 0 PR on a Tier 1 render system.
