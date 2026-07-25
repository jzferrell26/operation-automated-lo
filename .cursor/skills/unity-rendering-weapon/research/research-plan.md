# Research Plan — unity-rendering-weapon

**Depth tier:** deep
**Mode:** DEGRADED — authored from model knowledge. Firecrawl/Exa web-research tooling
was unavailable in this environment. Sources below are named by reference, not fetched;
verify version-specific URP defaults against the live Unity 6 docs before relying on them.

## Backlog queries

1. **Unity 6 URP mobile rendering settings quality tiers 2026** — the URP Render Pipeline
   Asset, mapping URP assets to Unity Quality levels (low/mid/high), render scale, HDR on/off,
   MSAA, depth/opaque texture toggles, shadow distance/cascade budget for mobile.
2. **Unity URP post-processing volume mobile performance 2026** — `Volume` + `VolumeProfile`,
   global vs local volumes, the affordable effects (tonemapping, bloom, vignette, color
   adjustments) vs the expensive ones (DoF, motion blur, SSAO), fill-rate cost on tiled mobile
   GPUs.
3. **Unity 6 URP renderer features forward+ mobile 2026** — Forward vs Forward+ (tiled
   light culling), the per-object light limit in classic Forward, Renderer Features
   (`ScriptableRendererFeature`), Render Objects, the renderer-per-quality-tier pattern.
4. **Unity URP lighting baked vs realtime mobile top-down 2026** — Baked vs Mixed vs Realtime,
   lightmapping for static geometry, the realtime light budget, light probes for dynamic
   actors, reflection probes, the single-directional-realtime-light pattern for top-down.
5. **Unity 6 shader graph mobile material cost 2026** — URP `Lit` / `Simple Lit` / `Unlit`
   / `Baked Lit` shaders, when Shader Graph earns its cost on mobile, the material upgrade
   path from Built-in `Standard`, `MaterialPropertyBlock` vs per-instance material.
6. **Unity URP camera stacking overlay mobile 2026** — Base + Overlay cameras, the URP Camera
   component, perspective vs orthographic for top-down, clear flags, the cost of stacked
   cameras on mobile, the single-camera default.

## Sources by name (named, not fetched in this degraded run)

- Unity 6 Manual — URP: "Universal Render Pipeline overview", "The Universal Render Pipeline
  Asset", "Configure for better performance" / "Optimize for mobile", "Rendering paths"
  (Forward / Forward+ / Deferred), "Renderer Features", "Render Objects Renderer Feature".
- Unity 6 Manual — URP post-processing: "Post-processing in URP", "Volumes", "Volume
  Profile", "Volume Overrides", the Bloom / Tonemapping / Vignette / Color Adjustments
  / Color Curves override pages.
- Unity 6 Manual — URP cameras: "Cameras in URP", "Camera Stacking", "Camera component
  reference", "Set up multiple cameras".
- Unity 6 Manual — Lighting: "Lightmapping", "Mixed lighting", "Light Probes", "Reflection
  Probes", "Choose a lighting setup".
- Unity 6 Manual — Shaders/materials: URP "Shaders" (Lit, Simple Lit, Baked Lit, Unlit),
  "Upgrade material assets to URP", "Shader Graph", `MaterialPropertyBlock`.
- Unity package docs — `com.unity.render-pipelines.universal` (the package this Guardian asks
  the human to install; **absent from `Packages/manifest.json` today**).
- **Internal primary sources (authoritative for this repo):** `Packages/manifest.json`
  (URP absent), `ProjectSettings/ProjectVersion.txt` (Unity pin), `GrayBoxVisuals.cs`,
  `TopDownFollowCamera.cs`, `CLAUDE.md`, `ARCHITECTURE.md`, `AGENTS.md`, `TIER0.md`.

## Verification flags

- Whether the project ships URP at all: **verified against the live manifest — it is NOT in
  `Packages/manifest.json`.** All URP-asset/volume/camera work is post-install design.
- Exact Unity 6 URP defaults (render scale default, Forward+ light tile size, default MSAA):
  **verify in-editor / against the live URP docs.**
- Whether the top-down camera should be perspective or orthographic: a **design call** —
  `TopDownFollowCamera` is orthographic today; flag, don't assume.
- Real ms / fill-rate cost of any volume stack: **needs an on-device Profiler capture**
  (co-owned with `mobile-game-perf-guardian`); never assert a number headless.
