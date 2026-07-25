# 00 — Principles

The non-negotiables for the DRIFT art-import pipeline. Read this before any finding.

## 1. Tier discipline is the first directive

DRIFT is **mid-Tier-0** (`CLAUDE.md §3`) and ships **zero production art**. The only "art" in
the repo is `GrayBoxVisuals.CreateColorMaterial` tinting primitives
(`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`). There is **no FBX, no texture, no
SpriteAtlas, no LODGroup, no `.preset`, no `Assets/Art/` tree**. URP is **not** in
`Packages/manifest.json`.

So everything this Weapon does is **import-pipeline DESIGN + Preset authoring** — the contract
and the guardrails art will land through in Tier 1, not a directive to import an art library
now. Open every response from this stance. **Never** tell anyone to art-direct or bulk-import
mid-Tier-0 (Hard Rule §6.1, GDD §13: build one tier at a time).

## 2. Art is HUMAN-handled (`CLAUDE.md §7`)

The human owns models, textures, game feel, and the look. This Weapon's job is to make whatever
the human makes **land cleanly and consistently**: correct scale, compressed, batch-friendly,
named to a convention, Read/Write off. You guard the *import settings*, not the *art*.

## 3. The texture seam is HEAVY co-owned with `mobile-game-perf-guardian`

This is the most important boundary in the Weapon. Texture work splits cleanly:

| You author (import settings) | They own (budget + verdict) |
|---|---|
| ASTC block size, mip policy, Max Size clamp, Read/Write flag, sRGB flag, per-platform override, the `.preset` | The texture-memory **budget**, the Build-Report RGBA32 pass/fail, the Memory-Profiler measurement, the "is it small enough / does it fit the frame budget" verdict |

Your `guides/05-texture-compression-astc.md` **must not contradict**
`mobile-game-perf-weapon/guides/06-texture-import-and-compression.md` — it uses the same
ASTC-6×6 default, mips-off-for-UI, Read/Write-off, Max-Size-clamp policy. When a budget question
comes up, **hand it to perf** (`guides/09-perf-handoff.md`). You set the dials; they read the meter.

## 4. Other co-ownership lanes

- **Rig import** is co-owned with `character-art-rig-guardian`. Prop model import (scale, mesh
  compression, read/write) is yours; rig type / avatar / Humanoid mapping / skinning / animation
  import is theirs. On a rigged FBX, split the import inspector accordingly.
- **Shaders / the URP look** is `unity-rendering-guardian`'s + the human's. You keep materials
  *batch-shaped*; they choose the shader and direct the look.
- **The C# of an `AssetPostprocessor`** is `unity-csharp-guardian`'s. You specify what it must
  enforce; they write and test it.
- **Build-size / addressables** is `unity-build-guardian`'s. Your import settings feed it.

## 5. Data over code (`CLAUDE.md §6.3`)

Import policy ships as **Presets** (`.preset` assets + Preset Manager defaults), optionally
backed by an `AssetPostprocessor`. Not as a doc that says "remember to set Read/Write off." A
Preset an artist can't bypass beats a convention they can. See `guides/06`.

## 6. Headless / in-editor-verify discipline (`AGENTS.md`)

This Weapon was forged on a VM with no Unity editor and no web access. Every Unity-6-specific
import default, inspector field name, and Preset behavior is **in-editor-verify** — state it as
"verify in a `6000.0.x` editor," never as confirmed fact, and never fabricate a URL, version
number, or field name to fill the gap.

## 7. Severity rubric

- **Must-fix** — `Read/Write Enabled` on without cause; uncompressed/RGBA32 texture (flag +
  hand budget to perf); wrong Scale Factor breaking world scale vs the `CharacterController`
  capsule; a `.blend`/`.max` in the import path; FBX re-import clobbering tuned materials;
  shader proliferation that breaks SRP batching.
- **Should-refactor** — no Preset / Preset-Manager default; ad-hoc per-asset settings;
  speculative LODGroups with no measured win; no naming convention; mips on for screen-space UI.
- **Style** — folder/file-name casing nits where a convention already holds.

Severity is credibility. A naming nit is never "must-fix."

## 8. Ground every claim in the real repo

Cite the Unity pin (`6000.0.77f1`), the absent URP package, `GrayBoxVisuals.cs`, the
orthographic `TopDownFollowCamera`, and the empty-of-art `Assets/`. That grounding is what keeps
this Weapon honest about being forward-guidance rather than pretending art already exists.
