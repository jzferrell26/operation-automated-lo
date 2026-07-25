# 08 — Mobile Animation Budget

Keeping the rig and animation affordable on portrait mobile. You **design within** the budget; the hard ceiling is `mobile-game-perf-guardian`'s (co-owned). Grounded in Unity "Optimizing Animation", `Animator.cullingMode`, and `SkinQuality` / skin-weight docs (named).

## You design within budget; they set the ceiling

This guide gives **starting targets and design choices**. The authoritative measurement (Profiler skinning cost, draw calls, GC) is `mobile-game-perf-guardian`'s, and `unity-art-pipeline-guardian` owns the import-side knobs (mesh compression, read/write). You hand them the rig design and the cost flags; they ratify the numbers. Never assert a hard perf number as verified — this Weapon was forged headless (`AGENTS.md`).

## The levers (design-level)

### 1. Skin weights (bones per vertex)

`SkinQuality` / Quality Settings "Blend Weights" caps how many bones influence each vertex. **Default to `SkinQuality.Bone2` (2 bones/vertex)** for low-poly mobile humanoids — it's the standard mobile trade-off and usually visually indistinguishable on low-poly. Reserve `Bone4` for a hero close-up if ever needed (unlikely under a top-down camera). Set per-renderer (`SkinnedMeshRenderer.quality`) or globally via Quality Settings.

### 2. Bone count

Keep the skeleton lean (`guides/01`) — a typical mobile humanoid is well under ~40 bones. Avoid accessory bone chains (cloth/hair sims) early; attachment sockets ride **existing** bones (`guides/04`), they don't add skinned bones.

### 3. Animator culling

Set `Animator.cullingMode`:
- **`CullCompletely`** for enemies that don't need off-screen logic to keep animating — stops skinning + the Animator update entirely when off-screen.
- **`CullUpdateTransforms`** when retargeting/IK must keep evaluating but renderers are hidden.

Under a fixed top-down camera, most off-screen enemies can `CullCompletely`. (Coordinate with `fsm-ai-guardian`: the FSM `Step` is code-driven and unaffected by Animator culling — good; culling the *animation* doesn't cull the *behavior*.)

### 4. Animator update mode

`Animator.updateMode`:
- **Normal** for the player.
- Consider **`AnimatePhysics`** only if animation must align to FixedUpdate (DRIFT moves via `CharacterController`, not rigidbody physics — so Normal).
- Animation **LOD**: drop update frequency or simplify the controller for distant/low-priority agents (a swarm of mutations doesn't each need full-rate animation).

### 5. One material / atlas (batching)

The current `GrayBoxVisuals.Tint` makes a `new Material` per call (`GrayBoxVisuals.cs:33`) — fine for gray-box, a **batching landmine at character scale** (it's the same finding `mobile-game-perf-guardian` flags). For real characters, share materials and atlas the character textures so many enemies batch. Material/atlas is **co-owned**: you flag it; `mobile-game-perf-guardian` + `unity-art-pipeline-guardian` own the atlas pipeline and the draw-call verdict.

## Starting budget table (first-pass; confirm on device)

| Knob | Starting target | Authority |
|---|---|---|
| skin weights | `SkinQuality.Bone2` | co-own w/ `mobile-game-perf-guardian` |
| bones / humanoid | < ~40 | co-own |
| `cullingMode` (enemies) | `CullCompletely` | you (coordinate w/ fsm-ai) |
| simultaneous animated enemies | design for pooling + LOD | `mobile-game-perf-guardian` |
| character materials | shared + atlased | co-own w/ `unity-art-pipeline-guardian` |

> Every number here is **first-pass, tune on device** — not a verified ceiling.

## What you deliver

- The skin-weight / bone / culling / update-mode design for the rig.
- The batching flag (shared material + atlas) handed to the perf + import Guardians.
- The **handoff**: "Here's the rig designed to a mobile budget; the hard ceilings (skinning ms, draw calls, simultaneous-agent count) are mobile-game-perf's to measure on device."

## Cross-Guardian

- **Hard perf ceilings, profiling, pooling of animated agents** → `mobile-game-perf-guardian`.
- **Mesh/texture import (compression, atlas, read/write)** → `unity-art-pipeline-guardian`.
- **Animator culling vs FSM behavior** → coordinate with `fsm-ai-guardian` (culling animation ≠ culling behavior).
