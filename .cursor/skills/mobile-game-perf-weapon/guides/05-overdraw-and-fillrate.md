# 05 — Overdraw & Fill-Rate

The silent killer on mobile GPUs. A top-down 2D-ish game has almost no geometry cost — but it can still melt a phone GPU by shading the same pixels over and over. That's **overdraw**, and the resource it exhausts is **fill-rate**.

## What overdraw is

Overdraw = drawing the same screen pixel more than once in a frame. Each opaque object you draw on top of another, and *especially* each transparent layer, makes the GPU shade that pixel again. Overdraw of 3x means the average pixel was shaded three times; the GPU did 3x the fragment work for the same screen.

## Why it's worse on mobile

Mobile GPUs are **tile-based deferred renderers** (TBDR — Apple, Mali, Adreno). They're efficient for opaque geometry (they cull hidden opaque fragments per tile) but **transparency defeats that** — every transparent fragment must be shaded and blended, in order, with no early-out. Fill-rate (fragments shaded per second) is a hard, low ceiling on a mid-tier phone. A top-down game stacking transparent sprites, fog, lighting overlays, and UI is exactly the workload that hits it.

## The overdraw sources in a top-down portrait game

| Source | Risk | Mitigation |
|---|---|---|
| **Full-screen transparent layers** (vignette, fog-of-war, color grade, darkness over the dead planet) | Highest — every pixel, every frame, often multiple stacked | Bake into one pass; avoid stacking; use opaque where possible |
| **Large particle quads** (smoke, explosions, atmosphere) | High — big transparent quads with many overlapping particles | Cap particle count + size; co-own the budget with `game-feel-juice-guardian` |
| **Stacked UI** (`Tier0Hud`, panels, meters drawn over the game) | Medium — transparent UI redraws the area beneath it | Flatten UI layers; avoid invisible/transparent full-screen UI raycasters |
| **The floor + ground decals** | Low if opaque — `SectorFloor` (`Tier0RuntimeSpawner.CreateFloor`, `:156`) is one opaque plane | Keep ground opaque; avoid layering transparent decals across the whole floor |
| **Oversized sprites with large transparent margins** | Medium — the transparent border still costs fill-rate to blend | Tight-pack sprites; trim transparent padding in the atlas (`guides/04`) |

DRIFT today is opaque primitives (`GameObject.CreatePrimitive` + opaque tint), so overdraw is near-zero now. The risk arrives with **VFX, fog/atmosphere, and UI overlays** — design those against this budget from the start.

## Rules of thumb

- **Opaque beats transparent** every time on a TBDR. If a sprite has no soft edges that need alpha, use an opaque/cutout shader, not alpha-blend.
- **One full-screen transparent pass is a tax; three is a problem.** Count them.
- **Particle systems are overdraw machines** — a 200-particle burst of big soft quads can shade the screen several times over. Cap count and size; this is the co-owned VFX budget.
- **Don't render invisible things.** Fully-transparent UI raycast targets, off-screen particles, disabled-but-drawn layers all cost fill-rate. Cull aggressively.

## How to measure

1. **Scene-view Overdraw draw-mode:** in the Scene view, switch the draw-mode dropdown (top-left) from "Shaded" to **"Overdraw."** Surfaces light up additively — the brighter/hotter a region, the more times it's being drawn. Bright red = a fill-rate problem. This is the fastest visual diagnosis.
2. **Profiler GPU module (on-device):** read GPU time per frame. If you're GPU-bound (`guides/01`) and the geometry is trivial, overdraw/fill-rate is the prime suspect.
3. **Resolution test:** temporarily lower the render resolution (or the device resolution). If frame time drops sharply, you're fill-rate-bound — overdraw is confirmed as the bottleneck. (This is the classic fill-rate confirmation: cost scales with pixel count.)
4. **A/B a suspect layer:** toggle the fog/VFX/UI overlay off, recapture GPU time. The delta is that layer's fill-rate cost.

Pass/fail: **Overdraw draw-mode shows no large hot (bright) regions; GPU time stays within its frame-budget slice (`guides/01`); halving resolution does *not* produce an outsized frame-time drop (i.e. you're not fill-rate-bound).**

## DRIFT tier note

Tier 0 gray-box: overdraw is a non-issue (opaque primitives). The value now is **forward guidance** — when atmosphere, the "dead planet" darkness, fog-of-war, hit VFX, and the HUD overlay land, hold them to a fill-rate budget and verify each with the Overdraw draw-mode. Co-own the VFX share with `game-feel-juice-guardian`: they choose the effect, this Weapon caps its overdraw.

Source: Unity Manual — "Optimizing graphics performance" (fill-rate / overdraw), Scene-view draw modes; mobile TBDR architecture notes (Arm Mali / Apple GPU best-practices).
