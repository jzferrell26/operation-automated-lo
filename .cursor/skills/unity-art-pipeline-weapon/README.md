# unity-art-pipeline-weapon

The procedural arsenal for `unity-art-pipeline-guardian`, PROJECT-DRIFT's 3D art **import**
pipeline specialist.

## What this weapon covers

- **Model / FBX import** — Scale Factor / Convert Units, Mesh Compression, Read/Write, Optimize
  Mesh, normals/tangents, material import modes, `.fbx` vs `.blend`, the rig-import handoff.
- **LOD groups** — LODGroup setup, screen-relative transition heights, cross-fade, and the
  cull-only case for a fixed-zoom orthographic top-down camera.
- **Mesh + texture atlasing** — mesh combining, world atlas vs SpriteAtlas, draw-call reduction,
  SRP-Batcher / GPU-instancing interaction.
- **Material variants / SRP-batcher** — `Material.parent` hierarchies, the shader+keyword batch
  rule, "few shaders, many materials."
- **Texture compression (ASTC)** — the **import-settings** side (block size, mips, Max Size,
  Read/Write, sRGB, per-platform overrides) + reusable Presets. **Budget is co-owned with
  mobile-game-perf — see below.**
- **Import Presets + automation** — `.preset` assets, Preset Manager defaults, `AssetPostprocessor`.
- **Art-style consistency** — poly / texel / material targets encoded as Presets.
- **Asset naming + folder conventions** — the `Assets/Art/` layout and `.meta`/GUID hygiene.

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, output paths.
2. Read `guides/00-principles.md` — the tier stance, the co-ownership rules, the severity rubric.
3. Open the guide matching your task (routing table in `SKILL.md`).
4. Reference `research/research-summary.md` (DEGRADED banner) for the load-bearing context.

## Key rules

- **Tier discipline first.** DRIFT is mid-Tier-0 with **zero production art** (gray-box
  primitives). This Weapon is import-pipeline DESIGN + Preset authoring — never a "import an
  art library now" directive. Art is HUMAN-handled (`CLAUDE.md §7`).
- **Texture compression is HEAVY co-owned with `mobile-game-perf-guardian`.** This Weapon
  authors the import-settings side and the Preset; perf owns the **budget, measurement, and
  runtime verdict**. Never contradict `mobile-game-perf-weapon/guides/06-texture-import-and-
  compression.md`.
- **Headless caveat.** Forged on a VM with no Unity editor and no web. Every Unity-6 import
  default / inspector field / Preset behavior is **in-editor-verify** — never fabricated.

## Boundary at a glance

You own how art ASSETS **enter** the project cleanly. You do NOT own the budget/verdict
(`mobile-game-perf-guardian`), the look (`unity-rendering-guardian` + the human), the rig
(`character-art-rig-guardian`), scene composition (`unity-level-design-guardian`), or the
postprocessor C# (`unity-csharp-guardian`).

---

*Created by the Legendary Guardian Factory. Part of the Guild curated by [Mario Aldayuz a.k.a @thenotoriousllama](https://github.com/thenotoriousllama).*
