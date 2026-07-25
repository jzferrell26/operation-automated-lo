# Example 02 — LOD Group Setup

Two worked cases: the **cull-only** default (right for DRIFT's orthographic camera) and a
**multi-tier** setup (for a Tier-1 large/dense scene only). Fields **in-editor-verify**.

## Context

`TopDownFollowCamera` is orthographic fixed-zoom — props don't shrink with distance, so classic
LOD mesh-swapping buys little (`guides/02`). Default stance: **don't add LODGroups speculatively**
(Hard Rule §8). Add them only when `mobile-game-perf-guardian` shows a cull/draw-call win.

## Case A — Cull-only (the DRIFT default)

For a prop you want to stop drawing when it's off the visible play area:

1. Add a **LODGroup** component to the prop root.
2. Configure **one LOD (LOD0)** holding the single mesh renderer.
3. Set the LOD0 → **Culled** transition so the object culls past the visible frame (tune the
   screen-relative height **in-editor** — orthographic projection makes the default thresholds
   behave differently than perspective; verify visually).
4. **No cross-fade** (adds overdraw on mobile, `guides/02`).

Result: no extra meshes authored, just a cull boundary — the useful LOD form for top-down.

## Case B — Multi-tier (Tier-1 large scene only)

Only when a planet-surface vista genuinely spans a depth range worth a coarse mesh:

1. Author **LOD0 / LOD1** as decimated meshes in the DCC tool (the human, `CLAUDE.md §7`);
   import each via `DriftModel.preset` (`examples/01`). Name `SM_<x>_LOD0 / _LOD1` (`guides/08`).
2. LODGroup with two LODs; LOD1 a clearly cheaper mesh.
3. Set screen-relative transition heights deliberately; last band = **Culled**.
4. Cross-fade **None** unless perf measures the pop as worse than the overdraw.

## Handoff

Whether either case wins on device — the draw-call count, the static-batching memory trade-off —
is `mobile-game-perf-guardian`'s measurement (`guides/09`). This example authors the LODGroup
correctly; perf rules on whether it's needed.

## DRIFT note

No LODGroup exists in the repo. First relevance is a Tier-1 planet zone with many scattered
props. Until then, Case A at most, and only on a measured win.
