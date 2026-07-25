# Example 01 — A Modular Station-Hub Kit

A worked modular kit for DRIFT's station hub, grounded in `Tier0RuntimeSpawner` coordinates.
**Design for the Tier-1 art phase** — the Tier 0 station is code-built (`CLAUDE.md §7`, art human-
handled).

## Goal

Replace the spawner's primitive station (cube O2 deck on an open plane) with a modular interior
kit that reads as a base, preserving every gameplay coordinate.

## Grid + kit

- **Grid unit:** 2m floor, 3m wall height (confirm against the camera pitch in-editor).
- **Modules** (from `templates/modular-kit-spec.md`):

| Module | Footprint | Pivot |
|---|---|---|
| `Floor_2x2` | 2×2 | corner @ y=0 |
| `Wall_Straight` | 2 | base, wall line |
| `Wall_Door` | 2 | base, wall line |
| `Corner_Inner` | 2×2 | grid intersection |
| `Pillar` | 1×1 | center base |
| `Prop_Console`, `Prop_Crate` | off-grid | base |

## Layout (around the fixed coordinates)

```
                 +Z (station side)
   ShuttlePad_Descend(-5,0.25,8)   O2 deck / LifeSupportZone (0,0,8)
        [shuttle bay room]----[Wall_Door]----[life-support room]
                 |                                   |
        StationReturnPoint(0,1,6)            raid breach / RaiderAssault(-4,1,8)
                 |
        [Wall_Door] → corridor toward the descent
```

- The **life-support room** is built from `Floor_2x2` + walls around the O2 deck at `(0,0,8)`; the
  deck stays exactly where `Tier0RuntimeSpawner.CreateO2Deck` puts it.
- The **shuttle bay** holds `ShuttlePad_Descend (-5,0.25,8)` and `StationReturnPoint (0,1,6)`,
  separated from life-support by a `Wall_Door` so the base reads as rooms (occlusion can pay off
  here — `04`).
- The **breachable hull** section is where `Tier0RaiderAssault` spawns `(-4,1,8)` — a kit wall
  segment marked as the breach point so the raid reads.

## Readability (top-down camera)

- Wall height 3m doesn't hide the player at the camera pitch on the main floor — verify in-editor.
- Keep the camera's sightline to the player clear across the shuttle-bay ↔ life-support path.

## Static flags

- All `Floor_*` / `Wall_*` / `Pillar`: Contribute GI + Occluder/Occludee + Batching static.
- Player, enemy, salvage pickups: not static (probe-lit, `05`).

## Handoffs

- **Assembly** of this kit in-editor → `unity-mcp-guardian` (this is the spec; `08`).
- **Import** of the kit FBXs → `unity-art-pipeline-guardian`.
- **Occlusion worth-it** for the rooms → `mobile-game-perf-guardian`.

## Severity notes

Moving the O2 deck, return point, descend pad, or breach spawn off their coordinates is a
**must-fix** (Rule #4). Authoring the station as one open room is **should-refactor** (loses the
base feel and the occlusion win).
