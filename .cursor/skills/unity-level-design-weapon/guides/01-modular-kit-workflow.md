# 01 — Modular Kit Workflow

The top-down-3D answer to "terrain": a grid-snapped kit of prefab modules. **Not Unity Terrain,
not 2D tilemaps** (Rule #2).

## Pick one grid unit and never drift

Choose a single metric grid unit and make every module a whole multiple of it. A common low-poly
choice is a **2m floor tile** with a **3m wall height**; pick what reads well at DRIFT's top-down
camera pitch and stay on it. Everything snaps because everything shares the grid.

The DRIFT gray-box already implies a scale: `Tier0RuntimeSpawner` builds a `Plane` floor scaled
`(4,1,4)` (a 40m plane), an O2 deck cube `(7,0.25,7)`, and places nodes/pads in a roughly ±13m
play-area. A 2m grid divides that cleanly. Confirm the final unit in-editor against the camera.

## Pivot/origin discipline is the whole game (Rule #3)

The single most important rule of modular kits:

- **Floor tile** — pivot at a grid corner (not the center), at floor height `y=0`.
- **Straight wall** — pivot at the base, on the wall line, at one end so it tiles along the grid.
- **Corner / pillar** — pivot at the grid intersection it occupies.

With pivots on the grid, **vertex snapping (`V`)** and grid snapping place pieces edge-to-edge
with zero gaps and zero overlap. Inconsistent pivots are why most first kits "won't snap" — the
fix is always to re-origin the module, never to nudge instances by hand.

## Module list (minimum viable station kit)

| Module | Footprint | Pivot | Notes |
|---|---|---|---|
| `Floor_2x2` | 2×2 | corner, y=0 | the tiling base |
| `Wall_Straight` | 2 wide | base, wall line | the tiling wall |
| `Wall_Door` | 2 wide | base, wall line | doorway variant for room transitions |
| `Corner_Inner` / `Corner_Outer` | 2×2 | grid intersection | turns the wall line |
| `Pillar` | 1×1 | center base | structure + occluder mass |
| `Prop_*` | varies | base | crates, consoles, set dressing (off-grid OK) |

## Prefabs and prefab variants

- One **base prefab** per module. Skins/damage states are **prefab variants** so a kit-wide change
  propagates. (Prefab/component C# wiring — asmdef, MonoBehaviour shape — is `unity-csharp-guardian`'s
  lane; this guide owns the *structure*.)
- Keep collision simple — a box/convex collider per wall/floor, not per-mesh, for mobile.

## Naming + folders

`Assets/Art/Kits/Station/` → `Floor_2x2`, `Wall_Straight`, `Wall_Door`, `Corner_Inner`,
`Pillar`, `Props/`. A planet kit lives under `Assets/Art/Kits/Surface/`. Consistent, sortable
names make the kit navigable and make the MCP assembly (`08`) and procgen seam (`08`) tractable.

## Gray-box first

Author the kit as **ProBuilder blockout** on the grid before any art mesh exists (`06`). The
blockout *is* the design deliverable; the art pass swaps meshes preserving pivots.

## Output

A filled `templates/modular-kit-spec.md`: grid unit, module list with footprints + pivots, naming
convention, and the gameplay coordinates from `Tier0RuntimeSpawner` the kit must land on.

## Severity

- **Must-fix:** pivots off the grid / inconsistent → kit won't snap.
- **Should-refactor:** per-mesh colliders on mobile; no prefab variants for skins.
- **Style:** module naming.
