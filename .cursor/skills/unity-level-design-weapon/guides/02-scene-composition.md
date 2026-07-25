# 02 — Scene Composition

How an authored DRIFT scene is laid out and organized.

## Root containers (hierarchy hygiene)

A scene reads at a glance when it groups under empty-GameObject headers. Mirror the logical groups
the code already creates in `Tier0RuntimeSpawner`:

```
--- Environment ---      (floor, walls, props — the modular kit)
--- Lighting ---         (Sun directional light, probe groups, reflection probes)
--- Gameplay ---         (O2Generator/deck, salvage nodes, tool caches, shuttle pads, enemy)
--- Spawns ---           (StationReturnPoint, PlanetDropPoint markers)
--- Systems ---          (Tier0Session, Tier0LoopController, Tier0Hud — usually the persistent scene)
```

`Tier0RuntimeSpawner` creates `StationReturnPoint`, `PlanetDropPoint`, `O2Generator`,
`ShuttlePad_Descend`, `ShuttlePad_Extract`, the `Salvage_*` / `ToolCache_*` nodes, `MutatedCrew`,
`Tier0LoopController`, `Tier0Session` and `Tier0Hud`. The authored scene's `--- Gameplay ---` and
`--- Spawns ---` groups hold exactly those, at exactly their coordinates (Rule #4).

## Readability for the fixed top-down camera

`TopDownFollowCamera` follows the player at a fixed angled pitch. That makes geometry height a
**gameplay** decision, not just art:

- Tall walls/props can hide the player or enemies at the camera angle — keep the play-floor legible.
- Silhouette + color separate interactables from set dressing (the gray-box leans on tint —
  salvage cyan, pads blue/gold, enemy red; an art kit keeps that readability through value/shape).
- Leave the camera's sightline to the player clear over the main traversal paths.

## Static flags (deliberate, per object)

Set static flags on environment geometry on purpose — they feed three downstream systems:

- **Contribute GI** → lightmap baking (`05`).
- **Occluder Static / Occludee Static** → occlusion culling (`04`).
- **Batching Static** → static batching for draw-call reduction (worth-it call is perf's, `04`).

Dynamic objects (player, enemies, pickups that move/despawn) are **not** static and take light
from probes (`05`).

## One concern per scene

Once additive loading lands (`03`): a **Station** scene, a **Surface** scene, and a persistent
**Systems** scene (player, camera, session, HUD). Keep each scene's hierarchy under the same root
containers so they're consistent and mergeable.

## Output

A scene layout + a filled `templates/scene-organization-checklist.md`.

## Severity

- **Must-fix:** a composition that moves a `Tier0RuntimeSpawner` gameplay coordinate; tall geometry
  that hides the player at the camera angle on a main path.
- **Should-refactor:** flat hierarchy with no root containers; static flags unset on baked geometry.
- **Style:** container naming.
