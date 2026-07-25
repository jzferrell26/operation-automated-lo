# Example 02 — Additive Scene Loading for Descend → Planet

A worked additive-load design for DRIFT's station → surface transition, replacing the in-scene
teleport in `Tier0LoopController` with a scene swap. **Tier-1 design** — the runtime/component C# is
co-owned with `unity-csharp-guardian`; this example is the *loading design*.

## The three scenes

| Scene | Holds | Lifetime |
|---|---|---|
| `Systems` (persistent) | Player, `TopDownFollowCamera`, `Tier0Session`, `Tier0LoopController`, `Tier0Hud` | whole session |
| `Station` | station modular kit, O2 deck, descend pad, return point, raid breach | loaded at station |
| `Surface` | planet kit, drop point, salvage + tool caches, extract pad, mutations | loaded on descent |

## The seam (today vs Tier-1)

Today `Tier0ShuttlePad` (descend pad `(-5,0.25,8)`) drives `Tier0LoopController`, which **teleports**
the player between `StationReturnPoint (0,1,6)` and `PlanetDropPoint (0,1,-9)` in one scene.

Tier-1 replaces the teleport with a scene swap at the same trigger:

```
Player steps on ShuttlePad_Descend
  → transition curtain
  → Addressables/SceneManager.LoadSceneAsync("Surface", Additive)
  → SetActiveScene(Surface)
  → move player to PlanetDropPoint (0,1,-9) IN the Surface scene
  → UnloadSceneAsync("Station")
  → lift curtain
```

Extract (`ShuttlePad_Extract (0,0.25,-13)`) reverses it: load `Station`, set active, move player to
`StationReturnPoint`, unload `Surface`.

## Why a persistent scene

The player, camera and session must survive the swap (the loop, inventory, oxygen state all live on
them). Putting them in `Systems` means the zone scenes load/unload without touching the player. The
`Tier0Session.Instance` singleton is already the cross-scene service to wire through (Rule #5 — no
hard cross-scene serialized refs).

## SceneManager now, Addressables later

- **Now (Tier-1 first pass):** scenes in Build Settings, `SceneManager.LoadSceneAsync(..., Additive)`.
  Simple, no new package.
- **Later (Rule #10):** `Addressables.LoadSceneAsync` to stream zones from a catalog and keep the
  mobile base build small — **not in `Packages/manifest.json` today**; gate behind an ADR.

## Coordinates preserved

`PlanetDropPoint (0,1,-9)`, `StationReturnPoint (0,1,6)`, both pads, all nodes — unchanged (Rule #4).
The swap moves *scenes*, not gameplay positions.

## Handoffs

- Loader **C#** (the MonoBehaviour, async coroutine, asmdef) → `unity-csharp-guardian` (co-own).
- Wiring it in-editor / Build Settings via MCP → `unity-mcp-guardian`.
- Addressables packaging / build-size → `unity-build-guardian` if adopted.

## Severity notes

A hard serialized reference from `Systems` into `Surface` (or vice-versa) is **must-fix** (breaks on
unload). No persistent scene (player reloads each transition) is **should-refactor**.
