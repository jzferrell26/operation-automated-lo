# 06 — Graybox → Art (ProBuilder)

The workflow that turns DRIFT's **code-built** gray-box into an authored modular scene, then into
art. The final art pass is human-handled (`CLAUDE.md §7`, Rule #1).

## Where the gray-box is today

The Tier 0 world has **two** code paths and **no committed scene**:

- `Tier0RuntimeSpawner.cs` — at Play, spawns the whole world from `GameObject.CreatePrimitive`
  (plane floor, cube O2 deck, cylinder pads, cube salvage nodes, capsule player/enemy) and tints
  them via `GrayBoxVisuals.Tint`.
- `Tier0GrayBoxSetup.cs` (editor menu `Drift → Setup Tier 0 Gray Box`) — bakes the same layout into
  prefabs under `Assets/Prefabs/Tier0/` and a scene `Assets/Scenes/Tier0_GrayBox.unity`.

This is the starting point. The migration is: **code primitives → authored ProBuilder blockout →
modular kit art**, preserving every gameplay coordinate (Rule #4).

## Step 1 — ProBuilder blockout on the grid

Block out the station and planet locations with **ProBuilder** on the grid (ProGrids / grid
snapping, vertex snap). ProBuilder geometry replaces the primitive cubes/planes with real
walls/floors/rooms — still untextured, still gray, but now an **authored** layout instead of a
runtime spawn. This blockout is the design deliverable the kit (`01`) and zones (`07`) describe.

Keep the blockout on the **same grid unit** as the kit (`01`) so the art swap is drop-in.

## Step 2 — The graybox → art pass

Swap ProBuilder blockout meshes for the **modular kit prefabs** (`01`), **preserving pivots and
grid footprint**. Because pivots are on the grid, a `Floor_2x2` art prefab drops onto a blockout
floor tile without moving anything. Set dressing (props) goes on after the structural swap.

This pass is where **import settings** (FBX scale, LODs, atlasing) matter — that's
`unity-art-pipeline-guardian`'s lane; this Weapon owns *placing* the kit, not *importing* the meshes.

## Step 3 — Retire the spawner for authored scenes

Once a zone is an authored scene, that zone no longer needs `Tier0RuntimeSpawner` to build it —
the spawner stays as the fast Play-bootstrap until the authored scenes are wired into the loop
(`03`). Don't delete the spawner mid-migration; it's the working gray-box.

## Preserve these coordinates (from `Tier0RuntimeSpawner`)

| Object | Position |
|---|---|
| StationReturnPoint | `(0, 1, 6)` |
| PlanetDropPoint | `(0, 1, -9)` |
| O2 deck (O2Generator) | `(0, 0, 8)`, deck `7×0.25×7` |
| ShuttlePad_Descend | `(-5, 0.25, 8)` |
| ShuttlePad_Extract | `(0, 0.25, -13)` |
| Salvage (scrap / polymer / ore) | `(-5,0.75,1)` / `(5,0.75,0)` / `(0,0.75,-7)` |
| Tool caches (cutter / welder / drill) | `(-8,0.75,-4)` / `(8,0.75,4)` / `(0,0.75,-10)` |
| Enemy (MutatedCrew) | `(7, 1, -2)` |

The authored scene puts kit geometry **around** these without moving them.

## Output

A graybox→art migration: ProBuilder blockout plan → kit-swap plan → coordinate-preservation table.
The human runs the final art pass (`CLAUDE.md §7`).

## Severity

- **Must-fix:** an art swap that moves a gameplay coordinate; deleting the spawner before authored
  scenes are wired.
- **Should-refactor:** blockout off the kit grid (art won't drop in); skipping ProBuilder and
  hand-placing primitives.
- **Style:** blockout object naming.
