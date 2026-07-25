# Modular Kit Spec — <kit name>

> Fill this for each kit (Station, Surface). The kit is the top-down-3D answer to "terrain" —
> grid-snapped modular prefabs, NOT Unity Terrain, NOT 2D tilemaps. This spec is the input
> `unity-mcp-guardian` assembles and `procedural-generation-guardian` consumes.

## Grid

- **Grid unit:** `<e.g. 2m floor, 3m wall height>` (verify against the top-down camera pitch in-editor)
- **Up axis / floor height:** `y = 0`
- **Snapping:** vertex snap (`V`) + grid snap; every module pivot sits ON the grid

## Modules

| Module | Footprint | Pivot | Collider | Notes / variants |
|---|---|---|---|---|
| `Floor_2x2` | 2×2 | corner @ y=0 | box | base tile |
| `Wall_Straight` | 2 wide | base, wall line | box | tiling wall |
| `Wall_Door` | 2 wide | base, wall line | box | room transition |
| `Corner_Inner` | 2×2 | grid intersection | box | turns wall line |
| `Corner_Outer` | 2×2 | grid intersection | box | |
| `Pillar` | 1×1 | center base | box | structure + occluder |
| `Prop_*` | off-grid OK | base | simple | set dressing |

## Connection rules (for procgen co-own)

- `<which modules connect to which edges; where a Wall_Door is legal; min/max room size>`
- These rules let `procedural-generation-guardian` arrange chunks deterministically without
  redefining the grid/pivots (this Weapon owns the kit; procgen owns the RNG).

## Static flags (per module)

- Floors/walls/pillars: Contribute GI + Occluder/Occludee + Batching static
- Props: Occludee + Batching static (occluder only if large)

## Gameplay coordinates this kit must preserve (from `Tier0RuntimeSpawner`)

| Object | Position | In this kit's zone? |
|---|---|---|
| StationReturnPoint | `(0,1,6)` | |
| PlanetDropPoint | `(0,1,-9)` | |
| O2 deck | `(0,0,8)` | |
| ShuttlePad_Descend | `(-5,0.25,8)` | |
| ShuttlePad_Extract | `(0,0.25,-13)` | |
| Salvage (scrap/polymer/ore) | `(-5,0.75,1)`/`(5,0.75,0)`/`(0,0.75,-7)` | |
| Tool caches (cutter/welder/drill) | `(-8,0.75,-4)`/`(8,0.75,4)`/`(0,0.75,-10)` | |
| Enemy | `(7,1,-2)` | |

## Naming / folders

`Assets/Art/Kits/<Zone>/` → `Floor_*`, `Wall_*`, `Corner_*`, `Pillar`, `Props/`

## Handoffs

- Assembly in-editor → `unity-mcp-guardian`
- FBX import settings (scale/LODs/atlas) → `unity-art-pipeline-guardian`
- Randomized arrangement → `procedural-generation-guardian`
