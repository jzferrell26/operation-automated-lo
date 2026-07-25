# 09 — Failure Modes

The recurring ways modular level authoring goes wrong, and the fix.

## Kit won't snap / gaps between modules

**Symptom:** floor tiles or walls leave seams or overlap when placed.
**Cause:** pivots off the grid or inconsistent across modules (Rule #3).
**Fix:** re-origin every module so its pivot sits on a grid point (floor → corner at `y=0`, wall →
base on the wall line). Never fix it by nudging instances — fix the prefab origin. Use vertex snap
(`V`) + grid snap to verify. See `01`.

## Authored scene moved the gameplay

**Symptom:** salvage/pad/objective is in the wrong place after the art swap; the loop breaks.
**Cause:** the kit/art pass relocated a coordinate from `Tier0RuntimeSpawner` (Rule #4).
**Fix:** restore the exact coordinate from the table in `06`/`07`. Kit geometry goes *around* the
gameplay coordinate, not on top of it.

## Cross-scene reference breaks on unload

**Symptom:** `NullReferenceException` / Unity warning after a zone scene unloads.
**Cause:** a serialized reference pointed at a GameObject in a now-unloaded scene (Rule #5).
**Fix:** route the reference through the persistent Systems scene (e.g. `Tier0Session.Instance`) or
an Addressables asset reference. Never drag a cross-scene object into a serialized field. See `03`.

## New objects spawn in the wrong scene / wrong lighting

**Symptom:** instantiated objects appear unlit or in the persistent scene instead of the zone.
**Cause:** the loaded zone wasn't set active after an additive load.
**Fix:** `SceneManager.SetActiveScene(loadedZone)` after `LoadSceneAsync(..., Additive)`. See `03`.

## Occlusion culling did nothing

**Symptom:** baked occlusion but draw calls didn't drop.
**Cause:** flat open top-down zone where the camera sees everything; or static flags unset so the
bake had no occluders (Rule #6).
**Fix:** confirm occluder-grade geometry exists and is marked Occluder Static; accept that open
zones occlude little and lean on frustum culling + LOD; hand the worth-it measurement to
`mobile-game-perf-guardian`. See `04`.

## Dynamic objects go black in a corner

**Symptom:** the player/enemy turns dark when entering a spot.
**Cause:** the light-probe lattice doesn't cover that part of the play-volume, so GI is extrapolated.
**Fix:** extend the probe lattice to cover the full traversal volume; densify near light gradients.
See `05`.

## Reflections look wrong / flat

**Symptom:** low-poly URP surfaces show the wrong environment reflection.
**Cause:** no reflection probe in that zone, or one realtime probe trying to cover everything.
**Fix:** place a baked reflection probe per room/zone for the camera's angle. The lighting-model
config behind it is `unity-rendering-guardian`'s. See `05`.

## "Just build the station scene now" (tier pressure)

**Symptom:** asked to author the production art scene mid-Tier-0.
**Cause:** tier discipline slipped (Rule #1).
**Fix:** restate it — the Tier 0 gray-box is code-built, there's no committed scene (`AGENTS.md`),
art/feel is human-handled (`CLAUDE.md §7`). Deliver the *design* (kit spec, blockout plan,
migration path); the human runs the art pass.

## Reached for Unity Terrain or a 2D tilemap

**Symptom:** proposing Terrain heightmaps or a tilemap for the "ground."
**Cause:** wrong mental model (Rule #2).
**Fix:** the confirmed art direction is low-poly 3D + fixed top-down + URP — the ground is a
modular floor kit, not Terrain, not a tilemap. See `01`.
