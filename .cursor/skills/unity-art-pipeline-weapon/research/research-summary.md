# Research Summary — unity-art-pipeline-weapon

> **⚠️ DEGRADED RESEARCH BANNER.** This Weapon was forged on a headless VM with **no live web
> access and no Unity editor**. The findings below are grounded in (a) the real PROJECT-DRIFT
> repo, (b) the co-owned in-repo guide `mobile-game-perf-weapon/guides/06-texture-import-and-
> compression.md`, and (c) the builder's prior knowledge of Unity 6 import conventions. **No
> external URLs are cited because none could be fetched.** Every Unity-6-specific import default,
> import-inspector field name, and Preset behavior is marked **in-editor-verify** and must be
> confirmed against a real `6000.0.x` editor before being treated as fact. Do not fabricate
> sources to fill this gap.

## What is ground truth (verified against the repo)

- **No production art exists.** The only "art" path is `GrayBoxVisuals.CreateColorMaterial`
  (`Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs`) tinting primitives via a
  `Unlit/Color → URP/Unlit → Standard` shader fallback. There is **no FBX, no texture, no
  SpriteAtlas, no LODGroup, no `.preset`, no `Assets/Art/` tree** in the repo.
- **URP is not installed.** `Packages/manifest.json` has no `com.unity.render-pipelines.universal`.
  Material/SRP-batcher guidance is therefore "after URP lands."
- **The camera is orthographic fixed-zoom top-down** (`TopDownFollowCamera.cs`), which is the
  reason LODs here are mostly a cull-only concern, not a multi-tier mesh-swap concern.
- **Unity pin** is `6000.0.77f1` (`ProjectVersion.txt`, both `m_EditorVersion` and
  `m_EditorVersionWithRevision`); it was bumped from the earlier `6000.0.23f1` pin in commit
  `eddc6eb`. Cite `6000.0.77f1` as the current pin.
- This makes the entire Weapon **forward-guidance / Tier-1 pipeline DESIGN** (`CLAUDE.md §3, §7`).

## Query findings (degraded — prior-knowledge level, in-editor-verify)

### 1. Model / FBX import for low-poly mobile (in-editor-verify)
Low-poly props should import with **Mesh Compression** set above Off (Low/Medium trades a tiny
quality loss for build size), **Read/Write Enabled OFF** by default (on doubles mesh memory by
keeping a CPU copy), **Optimize Mesh ON**, normals **Import** when the DCC tool authored them
cleanly (else Calculate with a sane smoothing angle), and **Scale Factor / Convert Units**
nailed down so 1 unit = 1 metre matches the gray-box's `CharacterController` capsule scale.
Material import: prefer **"Use External Materials"** or no material import + project materials,
so an FBX re-import doesn't clobber hand-tuned materials. `.fbx` is the safe interchange format;
importing `.blend` directly couples the project to a local Blender install — avoid for a team.

### 2. LOD groups (in-editor-verify)
A fixed-zoom orthographic top-down camera sees props at a near-constant screen size, so classic
multi-tier LOD mesh-swapping buys little. The useful cases are **cull-only** (a single LOD0 +
a cull distance via LODGroup to drop off-screen / far props) and very-large scenes. When LODs
are used, set screen-relative transition heights deliberately and prefer no cross-fade on
mobile (cross-fade adds overdraw). Default stance: **don't add LODGroups speculatively** —
add them when profiling (perf's call) shows a cull win.

### 3. Mesh + texture atlasing (in-editor-verify)
Combining many low-poly props onto a shared atlas + shared material cuts material count and
draw calls — the biggest lever for a low-poly mobile game. SpriteAtlas covers UI/2D; world
geometry uses a shared texture atlas + (optionally) mesh combining. Atlasing must stay
compatible with the SRP Batcher (same shader/keywords) and/or GPU instancing. **Whether the
saving is needed is perf's verdict; this Weapon shapes the assets so it's possible.**

### 4. Material variants / SRP-batcher (in-editor-verify)
The SRP Batcher batches draws that share a **shader + keyword set** (per-material properties go
in a CBUFFER), so the win is *few shaders, many materials* — not few materials. **Material
Variants** (`Material.parent`) let a base material define the low-poly look and variants tweak
color/properties while staying in the same batch. Keep the shader set tiny. Shader/pipeline
CHOICE is `unity-rendering-guardian`'s; this Weapon keeps materials batch-shaped.

### 5. ASTC + Presets (cross-checked against the co-owned perf guide)
Matches `mobile-game-perf-weapon/guides/06`: **ASTC 6×6 default** for sprites/albedo, drop to
4×4 only where banding shows on-device, 8×8 for large low-detail; **mips OFF** for screen-space
UI/sprites, ON only for world textures at varying distance; **Read/Write OFF**; **Max Size**
clamped to the smallest that looks right; **sRGB ON** for color, OFF for data textures; confirm
the **resolved** format per-platform, never trust "Automatic". This Weapon encodes that as a
**texture import Preset**; perf owns the budget + Build-Report/Memory-Profiler verdict.

### 6. Presets + automation + naming (in-editor-verify)
`.preset` assets capture importer settings; the **Preset Manager** can set a default Preset for
a type so new assets import correctly by default. For hard enforcement, an `AssetPostprocessor`
(`OnPreprocessModel` / `OnPreprocessTexture`) can stamp settings on import — but its C# is
`unity-csharp-guardian`'s lane. Naming/folder: a stable `Assets/Art/{Models,Textures,Materials,
Presets}` tree with a consistent scheme keeps `.meta`/GUID churn and merge pain down.

## Co-ownership note (load-bearing)

Texture compression is **HEAVY co-owned with `mobile-game-perf-guardian`**. This Weapon authors
the **import-settings side** and the Preset; the **budget, measurement, and runtime verdict**
are perf's. `guides/05-texture-compression-astc.md` defers the budget to perf and must never
contradict `mobile-game-perf-weapon/guides/06`.
