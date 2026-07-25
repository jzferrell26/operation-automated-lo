# 10 — Failure modes

The recurring URP render failures, with the cause and the fix. Pair with
`templates/mobile-render-checklist.md`. Most of these only appear **once URP is installed** — in
Tier 0 the symptom is simply "we're still on Built-in / `Standard`."

## Everything is pink / magenta

- **Cause A — pipeline asset not assigned.** URP shaders need an active URP pipeline. If
  Project Settings → Graphics (and the Quality levels) don't reference a URP asset, every URP
  material renders pink. **Fix:** assign the URP asset in Graphics + per Quality level
  (`guides/01`). **Must-fix.**
- **Cause B — un-migrated Built-in materials.** After switching to URP, Built-in `Standard`
  materials render pink until upgraded. **Fix:** run the Render Pipeline Converter (`guides/08`).

## Materials tint wrong / ignore the color

- **Cause — wrong property name.** URP `Lit`/`Unlit` use **`_BaseColor`**, not the Built-in
  `_Color`. Setting `_Color` on a URP material silently does nothing. **Fix:** set `_BaseColor`
  (`GrayBoxVisuals` already probes both). **Verify the exact shader name string** resolves —
  `Shader.Find("Universal Render Pipeline/Unlit")` returns null on any typo, falling back to
  `Standard` → pink.

## Post-processing does nothing

- **Cause — Post Processing disabled on the camera.** The Volume framework only applies if the
  camera's **Post Processing** toggle is on. **Fix:** enable it per camera (`guides/07`). A profile
  with no enabled overrides (every override unchecked) is the same null result.

## Draw calls explode / SRP batcher broken

- **Cause — per-object `new Material(...)`** (exactly `GrayBoxVisuals` today) or per-object material
  variants. Each unique material is its own SetPass. **Fix:** shared material + `MaterialPropertyBlock`
  — **co-owned with `mobile-game-perf-guardian`** (`guides/09`). Confirm with the Frame Debugger.

## Shadow acne / peter-panning

- **Cause — shadow bias / resolution / distance tuning.** **Fix:** adjust shadow normal/depth bias
  and the cascade/distance settings on the URP asset (`guides/02`); on a flat top-down view a short
  shadow distance usually suffices.

## Frame rate cliff on the low tier

- **Cause — fill-rate**: render scale at 1.0 + MSAA + a heavy post-process stack on a tiled mobile
  GPU. **Fix:** drop render scale, trim the volume stack, cut MSAA (`guides/02`, `guides/05`) —
  **and have `mobile-game-perf-guardian` confirm the win on-device** (`guides/09`).

## "It looks great in the editor, bad on device"

- **Cause — editor uses the High tier / desktop GPU.** **Fix:** test the **actual mobile Quality
  level** and profile **on-device** (perf owns the capture). Editor timings are not device timings.

## Tier-0 reminder

In Tier 0 the only "failure" is the intended one: **no real pipeline is configured** — the gray-box
falls back to `Standard`. That's by design until URP is installed in Tier 1; don't file it as a
must-fix mid-Tier-0 (`CLAUDE.md §6` Rule #1).

Sources: Unity 6 Manual URP "Troubleshooting", "Upgrade material assets to URP";
`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`; `guides/09-render-perf-handoff.md`.
