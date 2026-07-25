# Scene Organization Checklist — <scene name>

> Run before handing a scene to `unity-mcp-guardian` for assembly or to the human for the art
> pass. Tier note: the Tier 0 world is code-built (no committed `.unity` scene per `AGENTS.md`);
> art/feel is human-handled (`CLAUDE.md §7`). This checklist is for Tier-1 authored scenes.

## Hierarchy

- [ ] Root containers present: `--- Environment ---`, `--- Lighting ---`, `--- Gameplay ---`,
      `--- Spawns ---`, `--- Systems ---`
- [ ] Gameplay objects live under `--- Gameplay ---` (O2 deck, salvage nodes, tool caches, pads, enemy)
- [ ] Spawn markers under `--- Spawns ---` (StationReturnPoint, PlanetDropPoint)
- [ ] No orphan objects at the scene root

## Gameplay coordinates (Rule #4 — must NOT have moved)

- [ ] All `Tier0RuntimeSpawner` coordinates preserved (cross-check the kit-spec table)
- [ ] Kit geometry sits AROUND gameplay coordinates, not on top of them

## Modular kit

- [ ] Every module on the grid; no seams/overlaps (pivots on grid — Rule #3)
- [ ] Walls/floors use prefab instances (variants for skins), not unique meshes
- [ ] Simple colliders (box/convex), not per-mesh, for mobile

## Top-down readability

- [ ] No geometry hides the player at the camera angle on a main traversal path
- [ ] Interactables separated from set dressing by silhouette/value/color

## Static flags

- [ ] Static environment: Contribute GI + Occluder/Occludee + Batching static
- [ ] Dynamic objects (player, enemy, pickups): NOT static

## Lighting / probes (placement — config is rendering's)

- [ ] Light probe lattice covers the full play-volume; denser near light gradients
- [ ] One baked reflection probe per room/zone
- [ ] Lighting-model + render config handed to `unity-rendering-guardian`

## Occlusion (authoring — worth-it is perf's)

- [ ] Occluder/occludee static flags set; Occlusion Areas around rooms (if interior)
- [ ] Worth-it measurement handed to `mobile-game-perf-guardian`

## Loading (if additive)

- [ ] Persistent Systems scene holds player/camera/session/HUD
- [ ] No hard cross-scene serialized references (route via `Tier0Session.Instance`)
- [ ] Loaded zone set active after additive load

## Handoffs named

- [ ] Assembly → `unity-mcp-guardian`  · Import → `unity-art-pipeline-guardian`
- [ ] Render config → `unity-rendering-guardian`  · Perf → `mobile-game-perf-guardian`
- [ ] Randomized layout → `procedural-generation-guardian`  · Loader C# → `unity-csharp-guardian`
