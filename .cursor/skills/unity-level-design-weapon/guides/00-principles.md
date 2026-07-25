# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Tier discipline first — always

The Tier 0 world is built **in code**. `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs`
spawns the station deck, planet drop zone, salvage nodes, shuttle pads and enemy from primitives;
`Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs` bakes the same layout into prefabs + a scene.
`AGENTS.md` states there is **no committed `.unity` scene** — the gray-box is assembled in-editor.
`CLAUDE.md §7` makes **level art / game feel human-handled**. So every answer leads from: *this is
modular-scene DESIGN for the Tier-1 art phase, not a build-now directive.* Never direct anyone to
build production art scenes mid-Tier-0.

### 2. Modular kits, NOT Unity Terrain, NOT 2D tilemaps

Art direction is confirmed: **low-poly 3D, fixed angled top-down, portrait mobile, URP.** The
"terrain" question in this stack is answered by **grid-snapped modular prefab kits** (walls,
floors, props) and authored scenes. Reject Unity Terrain (that's for large outdoor heightmaps) and
2D tilemaps (wrong projection) framings explicitly.

### 3. Pivot/origin + one grid unit is the whole game

Pick one grid unit and never drift from it. Every module's footprint is a whole multiple of the
grid, and every module's pivot sits **on** the grid (floor pivot at a corner, wall pivot at the
base on the wall line) so vertex-snap and grid-snap place pieces predictably. Inconsistent pivots
are the #1 cause of modular kits that "won't snap." See `01-modular-kit-workflow.md`.

### 4. Preserve the gameplay coordinates in `Tier0RuntimeSpawner`

The spawner already fixes gameplay positions: station return `(0,1,6)`, planet drop `(0,1,-9)`,
O2 deck `(0,0,8)`, descend pad `(-5,0.25,8)`, extract pad `(0,0.25,-13)`, salvage nodes,
tool caches, enemy `(7,1,-2)`. An authored scene **replaces primitives with kit prefabs** at those
positions — it does not relayout the gameplay. See `06`/`07`.

### 5. One concern per scene + a persistent scene

Once additive loading lands: player, camera rig, session and HUD live in a persistent scene; zone
scenes (station, surface) load/unload around it. **Avoid hard cross-scene serialized references** —
they break when a scene unloads. See `03-additive-and-streaming-scenes.md`.

### 6. Occlusion is measured, not assumed

At a fixed top-down angle the camera sees most of the play-floor at once, so occlusion culling
buys less than it does in a corridor. This Weapon owns the **authoring** (static flags, occlusion
areas); whether it beats plain frustum culling + LOD is a **PERF measurement question owned by
`mobile-game-perf-guardian`.** See `04`.

### 7. Probe PLACEMENT is mine; render CONFIG is rendering's

Place light probe lattices and reflection probes in the scene. Hand the URP renderer asset,
lighting model, shadow and quality config to `unity-rendering-guardian`. See `05`.

### 8. Spec, don't drive

Author the kit spec + scene-organization checklist. `unity-mcp-guardian` drives the editor (via
MCP) to build it. The boundary is the spec. See `08`.

### 9. Kits are mine; randomization is procgen's

Handcrafted kits and authored composition are this Weapon's. Randomized / runtime-generated layout
is `procedural-generation-guardian`. Co-own the seam; never author layout RNG here. See `08`.

### 10. Addressables for zones is Tier-1+ and ADR-gated

`Addressables.LoadSceneAsync` streaming is the path for keeping the mobile base build small, but
Addressables is **not in `Packages/manifest.json` today** — forward-frame it and pair the adoption
with an ADR. See `03`.

---

## First-move checklist

- [ ] `CLAUDE.md §3/§6/§7` + the `AGENTS.md` "no committed scene" line read; tier framing set.
- [ ] `Tier0RuntimeSpawner.cs` / `Tier0GrayBoxSetup.cs` read; gameplay coordinates captured.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Cross-Guardian handoff lines clear — assembly→MCP, RNG→procgen, config→rendering, perf→perf.

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Inconsistent pivots/grid (kit won't snap); authored scene moves a `Tier0RuntimeSpawner` gameplay coordinate; hard cross-scene serialized ref that breaks on unload; tier violation (production art mid-Tier-0); recommending Unity Terrain / 2D tilemaps against confirmed art direction | Yes |
| **Should-refactor** | No root-container hierarchy; static flags unset on baked geometry; missing persistent scene; occlusion baked without measuring worth; probe lattice too sparse | No — opens follow-up |
| **Style** | Kit naming nits; folder layout preference | Never |

## Citation discipline

Every finding cites (a) where — `Assets/Scripts/Drift/.../File.cs:LN` or the scene/prefab path —
and (b) why — a guide section here or a named Unity doc. Version-specific Unity behavior that can't
be verified headless is marked for in-editor verification, never asserted, never given a fake URL.
