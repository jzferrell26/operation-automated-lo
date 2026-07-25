# Template — Mobile render checklist (pre-look pass)

> Run this **once URP is installed** (it isn't today — `Packages/manifest.json` has no
> `com.unity.render-pipelines.universal`). Until then the only "result" is the intended Tier-0
> one: the gray-box falls back to `Standard`. The final look call is the human's (`CLAUDE.md §7`);
> every cost line is `mobile-game-perf-guardian`'s on-device verdict (`guides/09`).

## Pipeline wired

- [ ] URP installed; version paired with Unity `6000.0.x` (**verify in-editor**).
- [ ] URP Render Pipeline Asset set in Project Settings → **Graphics**.
- [ ] A URP asset assigned **per Quality level** (Low/Mid/High).
- [ ] **Nothing renders pink** (if it does → pipeline unassigned or material un-migrated, `guides/10`).

## Materials & shaders

- [ ] Built-in `Standard` materials migrated to URP (Render Pipeline Converter, `guides/08`).
- [ ] `GrayBoxVisuals` no longer falling back to `Standard` (shader string resolves, `guides/08`).
- [ ] Tints use **`_BaseColor`** (URP), not `_Color`.
- [ ] Shader baseline = `Simple Lit` / `Baked Lit` / `Unlit` per surface (`guides/06`).
- [ ] No per-object `new Material(...)` breaking the SRP batcher → **perf to confirm batching**.

## Tiers & path

- [ ] Render scale set per tier (Low < 1.0) (`guides/02`).
- [ ] MSAA/HDR/shadows appropriate per tier.
- [ ] Renderer path = **Forward** (Forward+ only if many dynamic lights, `guides/03`).

## Lighting

- [ ] Static geometry baked; one Mixed directional key light (`guides/04`).
- [ ] Light probes cover dynamic-actor paths.
- [ ] Realtime light count tiny (ideally one directional).
- [ ] Per-scene bake → handed to `unity-level-design-guardian`.

## Post-processing

- [ ] Camera **Post Processing enabled** (`guides/07`).
- [ ] Volume stack = in-budget set only (tonemap + color + vignette + cheap bloom) (`guides/05`).
- [ ] No DoF / motion blur / SSAO on the low tier.
- [ ] Juice intent → `game-feel-juice-guardian`; fill-rate cost → `mobile-game-perf-guardian`.

## Camera

- [ ] Single Base camera unless a genuine separate pass needs an Overlay (`guides/07`).
- [ ] Perspective-vs-orthographic decision made deliberately (today: orthographic) — ADR if changed.

## Verify on-device (perf owns)

- [ ] Profile on the **actual mobile Quality level**, on-device — not the editor/desktop GPU.
