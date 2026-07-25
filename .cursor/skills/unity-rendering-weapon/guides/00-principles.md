# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. URP is not installed — say so, every time

`Packages/manifest.json` has **no `com.unity.render-pipelines.universal`** (verified against the
live manifest). The gray-box renders on the **Built-in pipeline** via
`GrayBoxVisuals.CreateColorMaterial`'s `Unlit/Color → Universal Render Pipeline/Unlit → Standard`
fallback. **Step zero of every plan is "install URP (a Tier-1 decision, with an ADR)."** Never
assert a pipeline exists, never reference a URP asset as if it's already there. Source:
`research/research-summary.md §1`, `Packages/manifest.json`.

### 2. Tier discipline: this is art-phase DESIGN

PROJECT-DRIFT is mid-Tier-0 (`CLAUDE.md §3`). Tier 0 has **no buildable scene** (`AGENTS.md`) and
deliberately renders gray-box primitives. URP asset authoring, lighting bakes, volume stacks, and
the camera projection decision are **Tier-1/art-phase forward guidance**, not a build-the-look-now
directive. Do not stand up URP infrastructure to skin a single gray-box capsule (`CLAUDE.md §6`
Rule #1).

### 3. The human art-directs (`CLAUDE.md §7`)

Art, feel, balance, and the "is it the right look?" call are **human-handled**. This Guardian ships a
**neutral, measurable baseline** — a tonemapping mode, a sane exposure, a render scale per tier,
a shader pick. The human tunes intensity, color, and the final aesthetic. Configure; don't
art-direct. Source: `CLAUDE.md §7`.

### 4. Render scale is the cheapest mobile lever

Before MSAA, before HDR, before fancy effects: **render scale** (rendering below native res and
upscaling) buys the most frame time per unit of look loss on mobile. The expensive toggles —
MSAA, HDR, extra shadow cascades, screen-space effects — earn their cost only when they visibly
matter. Source: `guides/02-quality-tiers-mobile.md`.

### 5. Forward by default; Forward+ only for many lights

A top-down scene lit by **one directional light + baked GI** does not need Forward+'s
tiled/clustered culling. Forward is the cheaper mobile default. Forward+ earns its cost when many
small dynamic lights appear — a Tier-1 question. Source: `guides/03-forward-vs-forward-plus.md`.

### 6. Bake the static world; keep realtime tiny

The station and the dead planet are mostly **static geometry** — ideal for **baked lightmaps**
(zero runtime lighting cost). Use **Mixed** lighting for a key directional light so dynamic actors
still shadow sensibly; light probes light the dynamic actors cheaply. Realtime lights stay on a
tight budget (ideally one directional). The **per-scene bake** belongs to
`unity-level-design-guardian`; this Guardian owns the **lighting-mode choice**. Source:
`guides/04-lighting-model.md`.

### 7. Post-processing is a budget, not a buffet

Tonemapping + color adjustments + vignette + a cheap bloom are affordable on mobile. Depth of
Field, Motion Blur, SSAO, and heavy bloom usually are not (tiled mobile GPUs are fill-rate bound).
Author a neutral base profile; the human dials intensity. Post-fx as **juice** (a hit-flash) is
`game-feel-juice-guardian`'s intent — this Guardian owns the **volume stack + budget**. Source:
`guides/05-post-processing-volumes.md`.

### 8. Stock URP shaders before Shader Graph; single camera before a stack

`Simple Lit` / `Baked Lit` for low-poly mobile; `Lit` only where PBR matters; Shader Graph only
for a real custom effect. A **single Base camera** is the default — camera stacking has a real
mobile cost; add an Overlay only for a genuine separate pass. Source:
`guides/06-shaders-and-materials.md`, `guides/07-camera-stack-topdown.md`.

### 9. Flag the perspective-vs-orthographic decision

`TopDownFollowCamera.cs` is **orthographic today** (`_camera.orthographic = true`, 90° pitch). The
Last-Day-on-Earth look usually wants a slightly **perspective**, **angled** camera for depth and
parallax. This is a **design decision to surface**, not a flag to silently flip. Source:
`Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs`, `guides/07-camera-stack-topdown.md`.

### 10. Shader cost + batching are co-owned with `mobile-game-perf-guardian`

This Guardian picks the URP shader, the volume stack, the render scale, the camera projection — the
**look** and the **config**. Whether it **batches** (SRP batcher unbroken) and **fits the ms
budget** is perf's measurement. `GrayBoxVisuals`'s `new Material(shader)` **per call** is exactly
this seam: the *which shader* is this Guardian's; the *one shared material + `MaterialPropertyBlock`*
is the co-owned fix. Name the seam; don't duplicate it. Source: `guides/09-render-perf-handoff.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `Packages/manifest.json` read — is URP present? (Today: **no**. Step zero = install.)
- [ ] Tier confirmed (default mid-Tier-0); design-now vs forward-guidance decided.
- [ ] The actual render site read (`GrayBoxVisuals.cs`, `TopDownFollowCamera.cs`) — not estimated.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-fix / forward-guidance).
- [ ] The perf co-ownership seam clear — set the pipeline, hand the cost question across.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. The short version: set the pipeline + look; hand the cost,
the import, the juice intent, the bake, and the C# to the owning Guardian at the boundary.

| Question | Owner |
|---|---|
| Shader/material runtime cost, draw-call batching, overdraw | `mobile-game-perf-guardian` (co-own) |
| Model + texture import (mesh, ASTC source, atlas) | `unity-art-pipeline-guardian` |
| Post-fx as juice (hit-flash, pulse intent) | `game-feel-juice-guardian` |
| Gameplay component C# | `unity-csharp-guardian` |
| Per-scene lightmap bake + probe placement | `unity-level-design-guardian` |
| PRD authoring | `library-guardian` |
| Device builds, flashing, the final look call | the human (`CLAUDE.md §7`) |

## Severity rubric (rephrased for clarity)

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | URP asset not assigned in Graphics (everything pink); shader missing from the active pipeline; post-processing referenced but disabled on the camera; a material breaking the SRP batcher — **once URP is installed** | Yes (post-install) |
| **Should-fix** | Render scale 1.0 on the low tier; MSAA on where not needed; a stacked camera that could be a single pass; `Lit` where `Simple Lit` would do | No — opens a follow-up |
| **Forward-guidance** | "When URP lands, author three quality assets"; "when art replaces gray-box, here's the shader baseline"; "bake the station when the geometry is authored" | Never — design ahead, flagged |

Calling forward-guidance a "must-fix" drags Tier 1 into Tier 0 and destroys credibility
(`CLAUDE.md §6` Rule #1).

## Citation discipline

Every finding has two citations:

1. **Where** — an internal repo path (`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs:9`)
   or the asset in question.
2. **Why** — a guide section (`guides/02-quality-tiers-mobile.md §2`) or a named Unity 6 URP
   reference. **Do not invent a URP default or version number** — mark it "verify in-editor."

No citation means the finding is opinion, not enforcement.
