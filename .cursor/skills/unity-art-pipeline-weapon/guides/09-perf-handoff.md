# 09 — Perf Handoff

The seam guide. Texture compression and atlasing/LOD wins are **co-owned with
`mobile-game-perf-guardian`** — this guide defines exactly what crosses the boundary, so the two
Guardians never duplicate or contradict each other.

## The split, stated once and for all

| This Weapon authors (the dials) | `mobile-game-perf-guardian` owns (the meter) |
|---|---|
| ASTC block size, mip policy, Max Size clamp, Read/Write, sRGB, per-platform override | The texture-memory **budget**; the Build-Report RGBA32 pass/fail; the Memory-Profiler snapshot verdict |
| The mesh/texture **atlas** + shared material (so batching is *possible*) | Whether batching **fires** and the draw-call count fits the frame budget on device |
| The LODGroup setup (cull-only / tiers) | Whether the LOD/cull actually **wins** on device, and the static-batching memory trade-off |
| The poly/texel **target bands** | Whether those bands fit the **frame/triangle/VRAM budget** on the target tiers |

Memorable form: **you set the dials, perf reads the meter.** You never declare a perf pass; you
enable one and hand it over.

## What to hand off (the packet)

When art lands and the import settings are applied, hand `mobile-game-perf-guardian`:

1. **The import settings chosen** per asset class — ASTC block size, Max Size, mips on/off,
   Read/Write — i.e. the Presets from `guides/06`.
2. **The atlas/material plan** — which props share which atlas + material (`guides/03`/`04`), so
   they can confirm the batch actually fires.
3. **Any LODGroup setups** (`guides/02`) for the cull/draw-call measurement.
4. **The poly/texel target bands** (`guides/07`) to pressure-test against the device budget.

They run the Build Report (`mobile-game-perf-weapon/guides/08`), the texture verdict
(`.../guides/06`), and the profiling workflow (`.../guides/07`), and return: pass/fail + any
import settings to tighten. You then adjust the dials.

## The non-contradiction contract

`guides/05-texture-compression-astc.md` is a deliberate **subset** of
`mobile-game-perf-weapon/guides/06-texture-import-and-compression.md` — same ASTC-6×6 default,
same mips-off-for-UI, same Read/Write-off, same Max-Size-clamp, same per-platform-override
policy. **If perf updates their budget or policy, this Weapon follows; never diverge.** When in
doubt about a budget number or a measurement verdict, the answer is "that's perf's call" — don't
invent a budget here.

## Other handoffs (named, not owned)

- **Rig import mechanics** on a skinned FBX → `character-art-rig-guardian` (co-own `guides/01`).
- **Shader/URP look** the materials sit on → `unity-rendering-guardian` (`guides/04`).
- **`AssetPostprocessor` C#** → `unity-csharp-guardian` (`guides/06`).
- **Scene composition** of the imported prefabs → `unity-level-design-guardian` (`guides/08`).
- **Build-size / addressables packaging** → `unity-build-guardian`.

## DRIFT note

There's no art and no budget to measure yet. This guide is the *contract* for when there is — its
value now is making sure this Weapon's texture/atlas/LOD guidance is forever phrased as "enable
the win, hand the verdict to perf," never as a perf claim of its own.
