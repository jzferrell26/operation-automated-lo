# 06 — Shaders & materials (the URP baseline)

This Guardian picks the **shader and material baseline** — the *look*. Whether a material **batches**
and **fits the ms budget** is **co-owned with `mobile-game-perf-guardian`** (`guides/09`). The
**source texture/mesh import** that feeds materials is `unity-art-pipeline-guardian`'s.

## The URP shader menu (what to use when)

| Shader | Lighting | DRIFT use |
|---|---|---|
| **Lit** | Full PBR (metallic/specular, normal maps) | Only where PBR response visibly matters (hero metal/glass). |
| **Simple Lit** | Cheaper Blinn-Phong-style | **The low-poly mobile default** for most surfaces. |
| **Baked Lit** | Baked lighting only, no realtime response | Static props that rely entirely on the bake (`guides/04`). |
| **Unlit** | No lighting at all | Flat elements, glows, UI-ish surfaces, gray-box tints. |

**Low-poly mobile baseline:** `Simple Lit` (or `Baked Lit` for fully-static props) for most
surfaces; `Lit` reserved for the few that need PBR; `Unlit` for flat/emissive bits.

## Shader Graph — only when it earns its cost

Shader Graph is for a **real custom effect** (a scanline shield, a dissolve, a force-field). A
plain tinted or textured surface does **not** need a graph — a stock URP shader + a material asset
is cheaper to author, cheaper to maintain, and easier to batch. Don't reach for Shader Graph to do
what `Simple Lit` already does.

## Materials & the batching seam

- **One material, instanced** — a shared material with the **SRP batcher** unbroken batches well.
  **Per-object `new Material(...)`** breaks batching and leaks — that's exactly what
  `GrayBoxVisuals.CreateColorMaterial` does today (`new Material(shader)` per call). Tinting many
  objects should use a **shared material + `MaterialPropertyBlock`**, not a material per object.
- **This is the co-owned seam:** *which shader and material baseline* is this Guardian's call; *the
  `MaterialPropertyBlock` / shared-material batching fix* is co-owned with
  `mobile-game-perf-guardian` (`guides/09`, and `mobile-game-perf-weapon/guides/04`).

## The `_BaseColor` convention

URP shaders use **`_BaseColor`** (the Built-in `Standard` used `_Color`). `GrayBoxVisuals` already
probes both — once on URP, `_BaseColor` is the target property (`guides/08-builtin-to-urp-migration.md`).

## Tier discipline

URP isn't installed, so no URP material renders today. The shader baseline is **design-now**;
materials get authored when art replaces the gray-box in Tier 1 (`unity-art-pipeline-guardian`
imports the textures/meshes they apply to). The human owns the final material look (`CLAUDE.md §7`).

## Verify-in-editor flags

- Exact `Simple Lit` vs `Lit` cost delta on the target device — **needs an on-device Profiler
  capture (perf co-own)**; don't assert it.
- Whether `Baked Lit` is the right pick vs `Simple Lit` for a given prop depends on the bake —
  confirm with `unity-level-design-guardian`'s lighting setup.

Sources: Unity 6 Manual URP "Shaders" (Lit / Simple Lit / Baked Lit / Unlit), "Shader Graph",
`MaterialPropertyBlock`; `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`;
`mobile-game-perf-weapon/guides/04-sprite-atlasing-and-batching.md`.
