---
name: unity-art-pipeline-weapon
description: The 3D art IMPORT pipeline arsenal for PROJECT-DRIFT — model/FBX import settings (scale, mesh compression, read/write, materials, normals), LOD groups, mesh + texture atlasing, material variants / SRP-batcher-friendliness, ASTC texture compression import settings + reusable import Presets, art-style consistency presets, and asset naming/folder conventions. Owns how low-poly 3D art ASSETS enter a Unity 6, top-down, portrait-mobile, URP-targeted game cleanly. Use when the user says "set up the model import pipeline", "FBX import settings", "LOD groups", "texture atlas", "material variants", "SRP batcher friendly", "ASTC import preset", "asset naming convention", "import postprocessor", or when unity-art-pipeline-guardian is invoked. Do NOT use for texture-memory BUDGET / profiling / runtime perf verdict (mobile-game-perf-guardian — HEAVY co-own; this Weapon authors import settings, defers the budget), URP shader/material/look choice (unity-rendering-guardian), character RIG import / skinning / animation (character-art-rig-guardian — co-own model import), scene/prefab composition (unity-level-design-guardian), the C# of an AssetPostprocessor (unity-csharp-guardian), or build-size/addressables packaging (unity-build-guardian).
license: MIT
---

# unity-art-pipeline-weapon

You are equipping **unity-art-pipeline-guardian** — PROJECT-DRIFT's authority on how 3D art
ASSETS enter the project. This Weapon encodes the **import** pipeline for a Unity 6
(`6000.0.77f1` pinned), top-down, portrait-mobile, URP-targeted, low-poly space-survival game:
model/FBX import settings, LOD groups, mesh + texture atlasing, material variants /
SRP-batcher-friendliness, ASTC texture compression (the import-settings side), reusable import
**Presets**, art-style consistency, and asset naming/folder conventions.

**You own how art LANDS, not how it looks or how fast it renders.** The look is
`unity-rendering-guardian` and the human (`CLAUDE.md §7`); the runtime perf verdict is
`mobile-game-perf-guardian`.

---

## First move on every invocation

1. **Open from tier discipline.** DRIFT is **mid-Tier-0** (`CLAUDE.md §3`) and ships **zero
   production art** — every visual is a tinted primitive via `GrayBoxVisuals.CreateColorMaterial`.
   There is **no FBX, no texture, no SpriteAtlas, no LODGroup, no `.preset`** in the repo. This
   Weapon is **import-pipeline DESIGN + Preset authoring**, not "import an art library now." Art
   is **HUMAN-handled** (`CLAUDE.md §7`).
2. **Confirm the render target.** `Packages/manifest.json` has **no URP package** today. Frame
   material / SRP-batcher work as "after `com.unity.render-pipelines.universal` lands."
3. **Read `guides/00-principles.md`** before any finding — it holds the tier stance, the
   co-ownership rules, and the severity rubric.
4. **Headless caveat (`AGENTS.md`).** No editor on the VM. Every import-inspector field, Preset
   behavior, and Unity-6 default is **in-editor-verify** — never fabricated.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Model / FBX import setup or review | `01-model-fbx-import.md`, `00-principles.md` | `library/qa/unity-art-pipeline/<date>-fbx-import.md` |
| LOD group setup / "do we need LODs?" | `02-lod-groups.md` | LODGroup spec + screen-height table |
| Mesh / texture atlasing | `03-mesh-and-texture-atlasing.md` | Atlas plan + draw-call rationale (perf verdict handoff) |
| Material variants / SRP-batcher | `04-material-variants-srp-batcher.md` | Variant hierarchy + batch-compatibility check |
| Texture compression / ASTC import | `05-texture-compression-astc.md`, **co-owned** `mobile-game-perf-weapon/guides/06` | Texture import Preset (budget handoff to perf) |
| Import Presets / automation | `06-import-presets-and-automation.md`, `templates/*` | `.preset` set + Preset Manager wiring (postprocessor C# → csharp) |
| Art-style consistency | `07-art-style-consistency.md` | Poly/texel/material target + preset set |
| Asset naming / folders | `08-asset-naming-conventions.md` | `Assets/Art/` convention doc |
| Perf handoff packaging | `09-perf-handoff.md` | What to hand `mobile-game-perf-guardian` |
| ADR | Relevant guide + cross-Weapon ADR template | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules

| # | Rule | Guide |
|---|---|---|
| 1 | **Tier discipline first.** No production art in Tier 0; this is pipeline DESIGN + Presets. Never direct importing an art library mid-Tier-0. | `00-principles.md` |
| 2 | **Art is HUMAN-handled (`CLAUDE.md §7`).** Make art land cleanly + consistently; never author models/textures or art-direct the look. | `00-principles.md` |
| 3 | **Texture compression is HEAVY co-own with `mobile-game-perf-guardian`.** Author the import-settings side (ASTC block size, mips, Max Size, Read/Write, sRGB, the Preset); **defer the BUDGET + measurement + verdict to perf.** Never contradict `mobile-game-perf-weapon/guides/06`. | `05-texture-compression-astc.md`, `09-perf-handoff.md` |
| 4 | **Read/Write Enabled OFF by default** (model + texture) unless runtime pixel/mesh read is proven necessary — on doubles memory. | `01`, `05` |
| 5 | **Data over code (`CLAUDE.md §6.3`).** Import policy ships as **Presets** (+ optional `AssetPostprocessor`), not ad-hoc per-asset settings. | `06-import-presets-and-automation.md` |
| 6 | **`.fbx` is the interchange format**, not `.blend`/`.max` direct import — don't couple the project to a local DCC install. | `01-model-fbx-import.md` |
| 7 | **Few shaders, many materials.** Keep the material set SRP-batch-friendly via Material Variants; don't proliferate shaders. | `04-material-variants-srp-batcher.md` |
| 8 | **Don't add LODGroups speculatively.** A fixed-zoom orthographic camera mostly wants cull-only; add LODs when perf shows a win. | `02-lod-groups.md` |
| 9 | **Rig import is co-owned with `character-art-rig-guardian`.** Prop model import is yours; rig type / avatar / skinning is theirs. | `01-model-fbx-import.md` |
| 10 | **In-editor-verify every Unity-specific default.** No fabricated field names, version numbers, or URLs (`AGENTS.md`). | `00-principles.md` |

---

## Severity rubric

- **Must-fix** — `Read/Write Enabled` on without cause; RGBA32 / uncompressed texture shipping
  (flag + hand budget to perf); wrong Scale Factor breaking world scale; a `.blend`/`.max` in
  the import path; an FBX re-import clobbering hand-tuned materials; a shader-proliferation
  pattern that kills SRP batching. Blocks the asset landing clean.
- **Should-refactor** — no import Preset / Preset-Manager default (settings drift risk); ad-hoc
  per-asset settings instead of Presets; speculative LODGroups with no measured win; no naming
  convention; mips on for screen-space UI.
- **Style** — folder-name bikeshedding, file-name casing nits where a convention already holds.

Severity is credibility. A naming nit is never "must-fix."

---

## Cross-Guardian handoffs

| Concern | Owner | This Weapon's role |
|---|---|---|
| Texture-memory **budget**, profiling, RGBA32-in-build verdict, Memory Profiler | `mobile-game-perf-guardian` (**HEAVY co-own**) | Author the import settings + Preset; hand off the budget/verdict |
| URP shader/material CHOICE, the URP asset, post-fx look | `unity-rendering-guardian` | Shape materials/atlases so the pipeline can consume them batch-friendly |
| Rig type, avatar/Humanoid mapping, skinning, animation import | `character-art-rig-guardian` (co-own) | Own the prop model-import mechanics; hand off the rig half |
| Scene/prefab composition, lightmap bake placement | `unity-level-design-guardian` | Deliver clean, scaled, atlased assets to place |
| C# of an `AssetPostprocessor` (architecture + EditMode) | `unity-csharp-guardian` | Specify the import rules it must enforce |
| Build-size verdict, addressables/bundles packaging | `unity-build-guardian` | Provide the per-asset import settings that decide what ships |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone reviews / audits** → `library/qa/unity-art-pipeline/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

- `guides/00-principles.md` — tier stance, co-ownership rules (esp. the perf texture seam),
  severity rubric, headless in-editor-verify discipline.
- `guides/01-model-fbx-import.md` — Scale Factor / Convert Units, Mesh Compression, Read/Write,
  Optimize Mesh, normals/tangents, material import modes, `.fbx` vs `.blend`, rig handoff.
- `guides/02-lod-groups.md` — LODGroup, screen-relative heights, cross-fade, cull-only case for
  a fixed-zoom orthographic camera, "don't add speculatively."
- `guides/03-mesh-and-texture-atlasing.md` — mesh combining, world texture atlas vs SpriteAtlas,
  draw-call reduction, SRP-Batcher / GPU-instancing interaction (perf owns the verdict).
- `guides/04-material-variants-srp-batcher.md` — `Material.parent` variant hierarchies, the
  shader+keyword batch rule, "few shaders, many materials."
- `guides/05-texture-compression-astc.md` — ASTC block sizes, mips, Max Size, Read/Write, sRGB,
  per-platform overrides, the texture Preset. **Defers budget to `mobile-game-perf-weapon/06`.**
- `guides/06-import-presets-and-automation.md` — `.preset` assets, Preset Manager defaults,
  `AssetPostprocessor` enforcement (C# → `unity-csharp-guardian`).
- `guides/07-art-style-consistency.md` — low-poly target (poly budget, texel density, shared
  palette/material set) encoded as Presets so imports stay coherent.
- `guides/08-asset-naming-conventions.md` — `Assets/Art/` layout, naming scheme, `.meta`/GUID
  hygiene, where Presets live.
- `guides/09-perf-handoff.md` — the exact package to hand `mobile-game-perf-guardian` for the
  budget + Build-Report + Memory-Profiler verdict.

## Examples

- `examples/01-fbx-import-preset-low-poly-mobile.md` — a worked FBX import Preset for a low-poly
  mobile prop, field by field, with the rig handoff marked.
- `examples/02-lod-group-setup.md` — a LODGroup setup for a larger prop + the cull-only minimal
  case for the orthographic camera.
- `examples/03-texture-atlas-and-import-preset-pass.md` — combining several props onto one atlas
  + applying the ASTC import Preset, with the budget verdict handed to perf.

## Templates

- `templates/model-import-preset.md` — a fill-in model/FBX import Preset spec.
- `templates/lod-group-setup.md` — a fill-in LODGroup setup spec.
- `templates/texture-import-preset.md` — a fill-in ASTC texture import Preset spec (mirrors the
  co-owned perf guide; budget line points to perf).

## Research

`research/research-summary.md` (DEGRADED banner — headless, no web, in-editor-verify) +
`research/research-plan.md` (6 queries). The summary is cross-checked against the co-owned
`mobile-game-perf-weapon/guides/06-texture-import-and-compression.md`.

---

## When in doubt

- Texture budget / "is this small enough?" → **hand to `mobile-game-perf-guardian`** with the
  import settings you chose; that's their verdict, not yours.
- Rigged FBX → split: prop import mechanics here, rig/avatar/skinning to `character-art-rig-guardian`.
- A Unity-6 import default you can't confirm headless → mark it **in-editor-verify**; never assert it.
