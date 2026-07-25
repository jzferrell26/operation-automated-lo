# Unity Level Design Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-level-design-guardian`. Use this guide to
decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-level-design-guardian.md`](../../../../agents/unity-level-design-guardian.md)
**Weapon:** [`.claude/skills/unity-level-design-weapon/`](../../unity-level-design-weapon/)
**Command Brief:** [`ai-tools/command-briefs/unity-level-design-guardian-command-brief.md`](../../../../ai-tools/command-briefs/unity-level-design-guardian-command-brief.md)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`unity-level-design-guardian` is DRIFT's 3D modular level-authoring specialist — the top-down-3D
answer to "terrain." Art direction is confirmed: **low-poly 3D, fixed angled top-down camera,
portrait mobile, URP** — so the "terrain" question is answered with **grid-snapped modular prefab
kits** (walls/floors/props) and authored scenes, **not** Unity Terrain and **not** 2D tilemaps. Its
remit covers modular kit design (grid unit, pivot/snap discipline, prefab variants), scene
composition for the fixed top-down camera, additive + streaming scene loading (station ↔ descent ↔
surface via `SceneManager`/Addressables), the occlusion-culling authoring pass, light/reflection-
probe placement, the ProBuilder graybox→art workflow, and the migration that turns DRIFT's code-
built Tier 0 gray-box (`Tier0RuntimeSpawner` / `Tier0GrayBoxSetup`) into authored modular scenes.

**Tier note the orchestrator must respect:** the Tier 0 world is built in code, `AGENTS.md` says
there is no committed `.unity` scene, and `CLAUDE.md §7` makes level art / game feel human-handled.
This Guardian is **Tier-1 / art-phase DESIGN** — it designs the modular-scene future, it does not
direct production art scenes mid-Tier-0. Lead routing from there.

## Trigger phrases

Route to `unity-level-design-guardian` when the user says any of:

- "Design the station hub layout" / "lay out the station base"
- "Build a modular kit" / "modular walls/floors/props" / "kit-bash the level"
- "How should the planet zones load" / "additive scene loading" / "streaming scenes"
- "Occlusion culling for top-down"
- "Where do the light / reflection probes go" / "probe placement"
- "Graybox to art" / "ProBuilder blockout" / "turn the gray-box into a real scene"
- "Scene organization" / "scene hierarchy conventions"
- "How do we do terrain / the ground" (answer: modular floor kit, not Terrain/tilemaps)

Or when the request implicitly involves authoring a 3D modular DRIFT scene, kit, or zone layout.

## Do NOT route when

- The user wants to **drive the editor or run MCP scene assembly** (spawning/wiring objects,
  building the scene programmatically) — that is **`unity-mcp-guardian`**. The split: this Guardian
  authors the kit spec + scene checklist (the DESIGN); the MCP Guardian automates the editor to BUILD
  it. The boundary is the spec — if the ask is "make the editor build X", it's MCP.
- The user wants **randomized / procedural layout** (scavenge-location generation, seeded RNG,
  spawn distribution) — that is **`procedural-generation-guardian`**. **Co-owned seam:** this Guardian
  owns the handcrafted modular kit + connection rules; procgen owns the algorithm that arranges
  chunks. If the ask is "randomly generate the layout", it's procgen; "design the kit it arranges",
  it's here.
- The user wants **URP renderer / lighting-model / render config** (RP asset, Forward vs Forward+,
  post-processing, shadow/quality) — that is **`unity-rendering-guardian`**. This Guardian places
  probes + lights in the scene; rendering configures the pipeline behind them.
- The user wants **occlusion/draw-call PERF measurement or a frame-budget verdict** — that is
  **`mobile-game-perf-guardian`**. This Guardian authors occlusion (static flags, areas); perf measures
  whether it's worth the bake.
- The user wants **model/texture import** (FBX scale, LODs, atlasing, import presets) — that is
  **`unity-art-pipeline-guardian`**. This Guardian places the imported kit.
- The user wants **prefab/component C#, asmdef, or the additive-loader runtime code** — that is
  **`unity-csharp-guardian`** (co-owned: this Guardian owns the loader DESIGN + scene/prefab structure).
- The user wants **build size / Addressables packaging** — that is **`unity-build-guardian`**.
- The user wants **PRD authoring** — that is **`library-guardian`**.

If the request straddles boundaries (e.g. "design and build the station scene"), route to
`unity-level-design-guardian` first for the kit + layout DESIGN, then chain to `unity-mcp-guardian`
to assemble it in-editor.

## Inputs the Guardian needs

- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` and
  `Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` — the code-built zones + gameplay coordinates.
- `CLAUDE.md` (§3 Status Map, §6 Rule #1, §7 human-handled art), `AGENTS.md` (no committed scene),
  `space-survival-design-doc.md` (station base + planet zones), `ARCHITECTURE.md`, `TIER0.md`.
- Optional: a specific focus (kit, composition, loading, occlusion, probes, graybox→art, zone).

## Outputs the Guardian produces

- **Standalone reviews / audits** → `library/qa/unity-level-design/<date>-<topic>.md`.
- **Kit spec** → filled `templates/modular-kit-spec.md`.
- **Scene plan** → filled `templates/scene-organization-checklist.md`.
- **ADRs** (e.g. adopt Addressables for zones) → `library/architecture/ADR-<n>-<topic>.md`.

Every finding cites the real repo path + the governing guide; unverifiable Unity specifics are
marked for in-editor verification, never fabricated.

## Multi-Guardian sequences this Guardian participates in

- **Authoring a zone scene** — `unity-level-design-guardian` designs the kit + layout →
  `unity-art-pipeline-guardian` sets the import settings for the kit meshes →
  `unity-mcp-guardian` assembles the scene in-editor → `unity-rendering-guardian` configures URP +
  the lighting model → `mobile-game-perf-guardian` measures occlusion/draw-call cost.
- **Randomized scavenge zone** — `unity-level-design-guardian` delivers the modular chunk kit +
  connection rules → `procedural-generation-guardian` generates randomized layouts from it →
  perf measures the result.
- **Additive zone loading** — `unity-level-design-guardian` designs the persistent-scene + additive
  loader → `unity-csharp-guardian` implements the loader component → `unity-mcp-guardian` wires the
  Build Settings scene list → `unity-build-guardian` if it moves to Addressables.

## Critical directives the orchestrator should respect

- **Tier discipline first.** Code-built Tier 0, no committed scene (`AGENTS.md`), art/feel human-
  handled (`CLAUDE.md §7`). The Guardian designs the modular-scene future; it won't direct production
  art scenes mid-Tier-0.
- **Modular kits, NOT Unity Terrain, NOT 2D tilemaps.** Confirmed art direction. The Guardian rejects
  Terrain/tilemap framings.
- **Preserve the `Tier0RuntimeSpawner` gameplay coordinates.** Authored scenes swap primitives for
  kit prefabs at existing positions; moving a coordinate is a must-fix.
- **Spec, don't drive; kits, not RNG.** The Guardian authors specs (MCP builds them) and kits (procgen
  randomizes them); it names the sibling and stops at the boundary.
- **Placement, not config.** The Guardian places probes/lights; rendering configures the pipeline.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
