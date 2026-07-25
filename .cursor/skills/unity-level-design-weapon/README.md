# unity-level-design-weapon

The procedural arsenal for `unity-level-design-guardian`, DRIFT's 3D modular level-authoring
specialist.

## What this weapon covers

- **Modular prefab kits** — grid unit, pivot/origin discipline, vertex + grid snapping, prefab
  variants, kit naming (the top-down-3D answer to "terrain" — **not** Unity Terrain, **not** 2D
  tilemaps).
- **Scene composition** — hierarchy root containers, set dressing, readability for the fixed
  angled top-down camera, static flags.
- **Additive + streaming scenes** — persistent scene + additive zone loading, station ↔ descent ↔
  surface boundaries, Addressables (forward / Tier-1).
- **Occlusion culling** — occluder/occludee flags + areas, tuned for the top-down angle, measured
  not assumed.
- **Probes & lighting placement** — light probe lattice, reflection probe placement, mixed
  lighting (placement, not render config).
- **ProBuilder graybox → art** — blockout on the grid, the graybox→art pass, swapping the
  code-built primitives for kit prefabs.

## Reading order

1. Read `SKILL.md` — master index, hard rules, routing table, severity rubric, output paths.
2. Read `guides/00-principles.md` — tier discipline, modular-not-terrain, the pivot/grid law.
3. Open the guide matching your task (see the routing table in `SKILL.md`).
4. Reference `research/research-summary.md` for the sourcing behind a claim (DEGRADED mode).

## Ground truth in the repo

The Tier 0 world is built in code — read these first, they own the gameplay coordinates any
authored scene must preserve:

- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs`
- `Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs`

## Key rule

**Lead with tier discipline.** The Tier 0 gray-box is code-built, there is no committed `.unity`
scene (`AGENTS.md`), and level art / game feel are human-handled (`CLAUDE.md §7`). This Weapon is
**modular-scene DESIGN for the art phase** — it designs the kit and the migration path, it does
not direct anyone to build production art scenes mid-Tier-0.
