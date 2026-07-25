# Example 03 — Occlusion Setup for a Top-Down Zone

A worked occlusion **authoring** pass for the DRIFT station interior. The worth-it call is
`mobile-game-perf-guardian`'s (Rule #6) — this example sets the scene up so occlusion *can* work
and hands the measurement off.

## Why the station, not the surface

The station interior (example 01) has **rooms + walls** that hide adjacent rooms at the fixed
top-down camera angle — that's where occlusion culling has something to cull. The open planet
surface bakes almost nothing (the camera sees the whole floor) — there, lean on frustum culling +
LOD and don't bother baking occlusion.

## Step 1 — static flags

On the station modular kit:

- `Wall_Straight`, `Wall_Door`, `Corner_*`, `Pillar` → **Occluder Static** (they block view) +
  **Occludee Static**.
- `Floor_2x2`, large `Prop_*` → **Occludee Static** (can be hidden, rarely occlude at this angle).
- Player, enemy, salvage pickups → **not static** (dynamic; they're occludees by default but not
  baked).

## Step 2 — occlusion areas

Place an **Occlusion Area** bounding each station room (shuttle bay, life-support room, any
corridor) so the bake reasons about room-to-room visibility. Portals are rarely worth it at the
top-down angle — skip them unless a measured case demands one.

## Step 3 — bake

Window → Rendering → Occlusion Culling → Bake. The smallest-occluder / smallest-hole / backface
parameters are scene-dependent — **set and verify them in-editor against the current Unity 6
version**; don't copy numbers blind.

## Step 4 — hand off the measurement

The question "did this drop draw calls enough to justify the bake on this device?" is **PERF
measurement**: hand it to `mobile-game-perf-guardian` with the Frame Debugger / GPU profiler. If the
win is marginal, drop the occlusion bake and rely on frustum culling + static batching + LOD.

## Expected outcome

- **Station interior:** meaningful occlusion between rooms at the camera angle — likely worth it,
  perf to confirm.
- **Planet surface:** little to no occlusion — don't bake; frustum + LOD.

## Severity notes

Baking occlusion on the open surface without measuring is **should-refactor** (wasted bake, no win).
Leaving station walls non-static so the bake has no occluders is **should-refactor**.
