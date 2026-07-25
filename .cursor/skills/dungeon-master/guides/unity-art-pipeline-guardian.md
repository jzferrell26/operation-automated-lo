# Unity Art Pipeline Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-art-pipeline-guardian`. Use this guide
to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-art-pipeline-guardian.md`](../../../agents/unity-art-pipeline-guardian.md)
**Weapon:** [`.claude/skills/unity-art-pipeline-weapon/`](../../unity-art-pipeline-weapon/)
**Command Brief:** [`ai-tools/command-briefs/unity-art-pipeline-guardian-command-brief.md`](../../../ai-tools/command-briefs/unity-art-pipeline-guardian-command-brief.md)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`unity-art-pipeline-guardian` owns the **3D art IMPORT pipeline** for PROJECT-DRIFT — how art
ASSETS enter a Unity 6 (`6000.0.77f1`), top-down, portrait-mobile, URP-targeted, low-poly
space-survival game cleanly. Its remit: model / FBX import settings (scale, mesh compression,
read/write, materials, normals/tangents), LOD groups, mesh + texture atlasing, material variants
+ SRP-batcher-friendliness, ASTC texture compression (the import-settings side) + reusable import
Presets, art-style-consistency presets, and asset naming / folder conventions. It guards *how art
lands*, not how it looks or how fast it renders.

**Tier discipline frames everything.** DRIFT is mid-Tier-0 with **zero production art** (gray-box
primitives via `GrayBoxVisuals.cs`); URP is not installed. This Guardian is **import-pipeline DESIGN
+ Preset authoring**, not a "import an art library now" directive. Art is HUMAN-handled
(`CLAUDE.md §7`).

## Trigger phrases

Route to `unity-art-pipeline-guardian` when the user says any of:

- "Set up the model import pipeline" / "FBX import settings" / "how should we import models"
- "Scale / mesh compression / read-write for this model"
- "Set up LOD groups" / "do we need LODs"
- "Texture atlas" / "atlas these props" / "combine meshes to cut draw calls"
- "Material variants" / "make our materials SRP-batcher friendly"
- "ASTC import preset" / "texture import settings" / "stop us shipping uncompressed textures"
- "Import preset" / "Preset Manager default" / "import postprocessor" (what it should enforce)
- "Art-style consistency" / "poly budget / texel density targets"
- "Asset naming convention" / "art folder structure"

Or when the request implicitly involves how a 3D art asset enters the Unity project.

## Do NOT route when

- The user wants the **texture-memory BUDGET, profiling, the RGBA32-in-build verdict, or the
  Memory-Profiler / frame-budget measurement** — that is `mobile-game-perf-guardian`. **This is
  the key boundary: texture compression is HEAVY co-owned. This Guardian authors the import settings
  (ASTC block, mips, Max Size, Read/Write, sRGB, the Preset); `mobile-game-perf-guardian` owns
  the budget and the verdict.** You set the dials there; perf reads the meter. When the question
  is "is it small enough / does it fit the budget," route to perf.
- The user wants the **URP shader / material CHOICE, the URP asset, or the look** (bloom,
  tonemapping, what shader a material uses) — that is `unity-rendering-guardian`. (This Guardian
  keeps materials batch-shaped; rendering picks the shader and owns the look.)
- The user wants **character RIG import, avatar / Humanoid mapping, skinning, or animation import**
  — that is `character-art-rig-guardian` (co-own the model-import surface). The prop model-import
  mechanics stay here; the rig half goes there.
- The user wants **scene / prefab composition, modular-kit assembly, or where props go in a scene**
  — that is `unity-level-design-guardian`. (This Guardian delivers clean, scaled, atlased assets;
  level-design composes them.)
- The user wants the **C# of an `AssetPostprocessor`** (its architecture, EditMode coverage) —
  that is `unity-csharp-guardian`. (This Guardian specifies the import rules it must enforce.)
- The user wants the **build-size verdict or addressables / asset-bundle packaging** — that is
  `unity-build-guardian`. (This Guardian's import settings feed it.)
- The user wants **art authored** (models, textures, the actual look) — that is HUMAN-handled
  (`CLAUDE.md §7`); this Guardian only guards how it imports.

If a request straddles the texture seam (e.g. "set up our texture pipeline and confirm it fits
the budget"), `unity-art-pipeline-guardian` authors the import settings + Preset first, then
chains to `mobile-game-perf-guardian` for the budget verdict — neither duplicates the other.

## Inputs the Guardian needs

- The Unity project (current branch), `Packages/manifest.json` (confirm whether URP has landed),
  `ProjectSettings/ProjectVersion.txt` (the Unity pin).
- Any art assets in question (FBX / textures) or the asset class to design the pipeline for.
- Optional focus: model import, LOD groups, atlasing, material variants, ASTC/Presets, naming.
- The co-owned `mobile-game-perf-weapon/guides/06-texture-import-and-compression.md` for the
  texture seam.

There is **no production art in the repo today** — most invocations are pipeline DESIGN, not a
review of existing assets. That's expected; the Guardian designs the import contract + Presets.

## Outputs the Guardian produces

- **Standalone reviews / audits** → `library/qa/unity-art-pipeline/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

Every finding cites the real repo path + the governing guide, marking Unity-6 defaults as
**in-editor-verify** (the Weapon was forged headless).

## Multi-Guardian sequences this Guardian participates in

- **Texture pipeline end-to-end** — `unity-art-pipeline-guardian` authors the ASTC import settings
  + Preset; `mobile-game-perf-guardian` rules on the budget / Build-Report / Memory-Profiler
  verdict (heavy co-own). The defining sequence for this Guardian.
- **Prop kit for a zone** — `unity-art-pipeline-guardian` imports + atlases + names the props;
  `unity-rendering-guardian` provides the URP shader the materials sit on;
  `unity-level-design-guardian` composes them into the scene.
- **Rigged character asset** — `unity-art-pipeline-guardian` sets the model-import mechanics;
  `character-art-rig-guardian` owns the rig / avatar / skinning / animation import (co-own).
- **Hard import enforcement** — `unity-art-pipeline-guardian` specifies the rules an
  `AssetPostprocessor` must stamp; `unity-csharp-guardian` writes and tests the C#.

## Critical directives the orchestrator should respect

- **Tier discipline leads.** No production art in Tier 0; this is import-pipeline DESIGN + Presets.
  The Guardian will not direct importing an art library mid-Tier-0.
- **Texture compression is HEAVY co-owned with `mobile-game-perf-guardian`.** The Guardian authors
  the import-settings side and defers the budget + measurement + verdict to perf, and never
  contradicts `mobile-game-perf-weapon/guides/06`. This is the boundary to watch when routing.
- **Art is HUMAN-handled (`CLAUDE.md §7`).** The Guardian makes art land cleanly + consistently; it
  never authors art or art-directs the look.
- **Co-own rig import with `character-art-rig-guardian`.** Prop import mechanics here; rig there.
- **Data over code.** Import policy ships as Presets (+ optional postprocessor whose C# is
  `unity-csharp-guardian`'s), not ad-hoc settings.
- **In-editor-verify.** The Guardian marks every Unity-6 import default as needing real-editor
  confirmation and fabricates no field names, versions, or URLs (forged headless).

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
