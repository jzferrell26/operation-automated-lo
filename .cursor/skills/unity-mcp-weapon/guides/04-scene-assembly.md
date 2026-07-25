# 04 — Assembling the Tier 0 Gray-Box Scene

This is the canonical layout for the station-hub + planet-zone gray-box. It is **lifted directly
from `Tier0RuntimeSpawner.Build()`** (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs`)
and `Tier0GrayBoxSetup` — those files are the layout source of truth. When you assemble via MCP,
**mirror these positions, components, and wiring exactly** (Hard Rule #5); when you use the menu
command, this is what it produces.

> Reminder (Hard Rule #4): the fastest, most deterministic path is `Drift → Setup Tier 0 Gray Box`.
> Assemble by hand via MCP only when you specifically need to, or to verify/tweak. This guide is the
> contract either way.

## The world, object by object

Positions are world-space `(x, y, z)`; tints are gray-box colors from the spawner.

### Environment

| Object | Notes (from spawner) |
|---|---|
| `Sun` | Directional `Light`, intensity `1.25`, rotation `(50, −25, 0)`; ambient flat `(0.35, 0.38, 0.42)` |
| `SectorFloor` | `Plane`, scale `(4, 1, 4)`, tint `(0.12, 0.14, 0.18)` |
| `StationReturnPoint` | empty marker at `(0, 1, 6)` |
| `PlanetDropPoint` | empty marker at `(0, 1, −9)` |

### Player (`(0, 1, 6)` — the station return point)

A capsule, tagged `Player`, with its default `CapsuleCollider` removed, tinted `(0.35, 0.95, 0.45)`
(green). Components, in the spawner's order:

- `CharacterController` (height `2`, radius `0.45`, center `(0, 1, 0)`)
- `TopDownPlayerController`
- `SalvageInventory`
- `OxygenSystem`
- `SuitPowerSystem`
- `Health`
- `PlayerMeleeAttack`
- `Tier0BuildPlanner` — wired via `Configure(inventory, database)`
- `SimpleCrafter` — wired via `ConfigureRecipes(quickRecipes)` (the 3 starter recipes)

### Station deck / O2 (`O2Generator` root at `(0, 0, 8)`)

Root empty + a child `Deck` cube (scale `(7, 0.25, 7)`, local pos `(0, 0.12, 0)`, collider removed,
tint `(0.15, 0.75, 0.95)` cyan). On the root:

- `BoxCollider`, trigger, size `(7, 3, 7)`, center `(0, 1.5, 0)`
- `LifeSupportZone`
- `O2Generator`
- `HullBreachEvent` — `SetAutoStartEnabled(false)` (the raid starts it later, not on load)
- `Tier0ObjectiveTracker`
- `Tier0RaiderAssault` (added by the spawner) — `Configure(breach, objectives, new Vector3(−4, 1, 8))`

### Loop controller (empty `Tier0LoopController`)

`Tier0LoopController` — `Configure(player.transform, stationSpawn, planetSpawn, objectives, assault)`.
This is the spine that ties descend/extract/raid together.

### Shuttle pads (cylinders, scale `(2.2, 0.12, 2.2)`, trigger collider)

| Pad | Position | Tint | `Configure(loop, objectives, extractsToStation)` |
|---|---|---|---|
| `ShuttlePad_Descend` | `(−5, 0.25, 8)` | `(0.25, 0.55, 1)` blue | `false` |
| `ShuttlePad_Extract` | `(0, 0.25, −13)` | `(1, 0.8, 0.2)` gold | `true` |

### Salvage nodes (cubes, trigger collider) — 3 resources

| Node | Position | Tint | Amount const |
|---|---|---|---|
| `Salvage_<ScrapMetalId>` | `(−5, 0.75, 1)` | `(0.85, 0.85, 0.9)` | `Tier0Balance.ScrapMetalNodeAmount` |
| `Salvage_<PolymerId>` | `(5, 0.75, 0)` | `(0.2, 0.9, 1)` | `Tier0Balance.PolymerNodeAmount` |
| `Salvage_<RawOreId>` | `(0, 0.75, −7)` | `(0.7, 0.45, 0.25)` | `Tier0Balance.RawOreNodeAmount` |

Each `SalvageNode` is wired via `Configure(item, amount)`.

### Tool caches (cubes, trigger collider) — 3 gated caches

| Cache | Position | Tint | `Configure(item, amount, requiredToolId)` |
|---|---|---|---|
| `ToolCache_<CutterId>` | `(−8, 0.75, −4)` | `(1, 0.9, 0.25)` | scrap, `CutterCacheScrapAmount`, `CutterId` |
| `ToolCache_<WelderId>` | `(8, 0.75, 4)` | `(1, 0.45, 0.2)` | polymer, `WelderCachePolymerAmount`, `WelderId` |
| `ToolCache_<PlasmaDrillId>` | `(0, 0.75, −10)` | `(0.75, 0.25, 1)` | ore, `DrillCacheRawOreAmount`, `PlasmaDrillId` |

### Enemy (`MutatedCrew` capsule at `(7, 1, −2)`)

Tint `(0.95, 0.2, 0.25)` red. Components: `Health` + `MutatedCrewEnemy`. The spawner wires the
target explicitly via `Configure(player, position)` rather than relying on the enemy's `Start()` tag
lookup — mirror that when assembling via MCP. (FSM behavior itself is `fsm-ai-guardian`'s; you just
place + wire.)

### Camera + HUD

- `Main Camera` (tag `MainCamera`) with `Camera`, `AudioListener`, and `TopDownFollowCamera` —
  `SetTarget(player.transform)`.
- `Tier0Hud` empty GameObject with `Tier0Hud` (throwaway IMGUI overlay so the loop is legible).

## Data assets (only matters for the authored-scene path)

`Tier0RuntimeSpawner` builds items/recipes as in-memory `ScriptableObject.CreateInstance` (no
assets on disk). `Tier0GrayBoxSetup` instead writes real assets under `Assets/Data/Items/` and
`Assets/Data/Crafting/` and an `ItemDatabase_Tier0`/`RecipeDatabase_Tier0`. If you're assembling a
*committed* scene via MCP, you need on-disk data assets and prefabs (see
`examples/02-spawner-to-committed-scene.md`) — the menu command already creates them, which is the
strongest reason to prefer it for the committed-scene endgame.

## Assembly checklist (before you Play)

- [ ] Player present at `(0, 1, 6)` with all 9 components, tagged `Player`.
- [ ] O2 deck at `(0, 0, 8)` with the trigger zone + life-support + objective tracker + raid stub.
- [ ] Both shuttle pads wired to the loop controller (descend `false`, extract `true`).
- [ ] 3 salvage nodes + 3 tool caches placed and `Configure`d.
- [ ] Enemy placed at `(7, 1, −2)`, target wired to the player.
- [ ] Camera follows the player; `Tier0Hud` present.
- [ ] Console clean.

Then go to `guides/06-running-the-graybox-loop.md`.
