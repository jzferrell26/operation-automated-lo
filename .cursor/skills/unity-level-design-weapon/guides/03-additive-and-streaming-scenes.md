# 03 — Additive & Streaming Scenes

How the station ↔ descent ↔ surface zones load. Maps onto DRIFT's existing descend/extract loop.

## The persistent-scene pattern

Keep a **persistent scene** alive for the whole session holding the things that must not reload:
player, `TopDownFollowCamera`, `Tier0Session`, `Tier0LoopController`, `Tier0Hud`. Zone scenes
(Station, Surface) load/unload **additively** around it.

```
SceneManager.LoadSceneAsync("Surface", LoadSceneMode.Additive)   // load the new zone
SceneManager.SetActiveScene(surfaceScene)                        // active = correct lighting/instantiation target
SceneManager.UnloadSceneAsync("Station")                         // drop the old zone
```

Setting the loaded zone **active** matters: new instantiations and lightmap/skybox settings follow
the active scene.

## Map to the DRIFT loop

The existing loop already has the seams:

- `Tier0LoopController` is `Configure(player, stationSpawn, planetSpawn, objectives, assault)` —
  it teleports the player between `StationReturnPoint (0,1,6)` and `PlanetDropPoint (0,1,-9)` today.
- `Tier0ShuttlePad` (descend pad `(-5,0.25,8)`, extract pad `(0,0.25,-13)`) triggers the transition.

The **descend** (shuttle pad → loop controller) is the natural async-load boundary: behind a
transition, load the Surface scene, move the player to `PlanetDropPoint` in it, unload the Station.
Extract reverses it. The Tier-1 design replaces the in-scene teleport with a scene swap — the
gameplay positions stay (Rule #4).

## Avoid hard cross-scene references (Rule #5)

A serialized reference from one scene to a GameObject in another scene **breaks when that scene
unloads** (and Unity warns on it). Wire across scenes via:

- the **persistent registry/service** in the Systems scene (e.g. `Tier0Session.Instance`), or
- **Addressables** asset references (below).

Never drag a cross-scene object into a serialized field.

## Addressables (forward / Tier-1, Rule #10)

`Addressables.LoadSceneAsync` streams zones from a content catalog and keeps the **mobile base
build small** — the right Tier-1+ path for many zones. But **Addressables is not in
`Packages/manifest.json` today**, so this is forward design: frame it, and gate adoption behind an
ADR (`library/architecture/ADR-<n>-addressables-zones.md`). For Tier 1's first authored scenes,
plain `SceneManager` additive loading from the Build Settings list is enough.

> Co-own the **runtime/component C#** of the loader with `unity-csharp-guardian`; this guide owns
> the **loading design** (what's persistent, what's additive, where the seam is).

## Output

A loader design (which scenes are persistent vs additive, the transition seam, sync `SceneManager`
now / Addressables later) + the skeleton in `templates/additive-scene-loader.cs`. Worked walk-through
in `examples/02-additive-descend-to-planet.md`.

## Severity

- **Must-fix:** hard cross-scene serialized reference; forgetting to set the loaded zone active.
- **Should-refactor:** no persistent scene (player/camera reload on every transition); committing to
  Addressables without an ADR.
- **Style:** scene naming.
