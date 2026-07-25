# Example 01 — Assembling the Station-Hub Gray-Box via MCP

**Scenario:** the bridge is wired and the smoke test is green. You want to stand up the *station-hub*
half of the gray-box (the part the player starts on and returns to) by driving the Editor via MCP,
mirroring `Tier0RuntimeSpawner.Build()`. The planet zone (nodes + enemy) and the committed-scene
step are separate examples.

> **Prefer the menu command for the whole world.** This example exists to show the MCP-driven path
> and the wiring discipline (Hard Rule #4 says don't hand-rebuild what `Drift → Setup Tier 0 Gray
> Box` already builds idempotently). Use it when you specifically need MCP — e.g. assembling onto an
> existing scene, or to learn/verify the layout.

## Pre-flight

1. Bridge **Running**, client configured, connection **Allowed** (`guides/02`).
2. Smoke test green — "create a cube" appeared in the Hierarchy (`guides/03`).
3. An active scene open. Read the Hierarchy first so you don't duplicate objects (`guides/08`).

## Step 1 — Environment

Drive these via MCP, mirroring the spawner:

- `Sun` — empty GameObject + `Light` (Directional, intensity `1.25`, rotation `(50, −25, 0)`). Set
  ambient to flat `(0.35, 0.38, 0.42)`.
- `SectorFloor` — `Plane`, scale `(4, 1, 4)`, tint `(0.12, 0.14, 0.18)`.
- `StationReturnPoint` — empty marker at `(0, 1, 6)`.

## Step 2 — Player (at the station return point)

Create a `Capsule` named `Player` at `(0, 1, 6)`, tag `Player`:

- Remove the default `CapsuleCollider`; add `CharacterController` (height `2`, radius `0.45`, center
  `(0, 1, 0)`).
- Add, in order: `TopDownPlayerController`, `SalvageInventory`, `OxygenSystem`, `SuitPowerSystem`,
  `Health`, `PlayerMeleeAttack`, `Tier0BuildPlanner`, `SimpleCrafter`.
- Wire `Tier0BuildPlanner.Configure(inventory, database)` and `SimpleCrafter.ConfigureRecipes(...)`
  with the 3 starter recipes (Style A, `guides/05`).
- Tint `(0.35, 0.95, 0.45)`.

> The `database`/`quickRecipes` need to come from somewhere. Via MCP on a live scene, the cleanest
> source is the on-disk `ItemDatabase_Tier0` / recipe assets the menu command authors — which is
> another nudge toward running `Drift → Setup Tier 0 Gray Box` first.

## Step 3 — Station deck / O2 (`O2Generator` root at `(0, 0, 8)`)

- Create empty `O2Generator` at `(0, 0, 8)`.
- Child `Deck` cube: scale `(7, 0.25, 7)`, local pos `(0, 0.12, 0)`, **remove its collider**, tint
  `(0.15, 0.75, 0.95)` cyan.
- On the root: `BoxCollider` (trigger, size `(7, 3, 7)`, center `(0, 1.5, 0)`), `LifeSupportZone`,
  `O2Generator`, `HullBreachEvent` (`SetAutoStartEnabled(false)`), `Tier0ObjectiveTracker`,
  `Tier0RaiderAssault` → `Configure(breach, objectives, new Vector3(−4, 1, 8))`.

## Step 4 — Loop controller + shuttle pads

- Empty `Tier0LoopController` → `Configure(player.transform, stationSpawn, planetSpawn, objectives,
  assault)` (you'll create `PlanetDropPoint` at `(0, 1, −9)` when you build the planet half).
- `ShuttlePad_Descend` — cylinder at `(−5, 0.25, 8)`, scale `(2.2, 0.12, 2.2)`, trigger, blue
  `(0.25, 0.55, 1)` → `Configure(loop, objectives, false)`.
- `ShuttlePad_Extract` — cylinder at `(0, 0.25, −13)`, gold `(1, 0.8, 0.2)`, trigger →
  `Configure(loop, objectives, true)`.

## Step 5 — Camera + HUD

- `Main Camera` (tag `MainCamera`) with `Camera`, `AudioListener`, `TopDownFollowCamera` →
  `SetTarget(player.transform)`.
- `Tier0Hud` empty GameObject + `Tier0Hud`.

## Step 6 — Verify (read-back, not assume)

- Console clean.
- Player has all 9 components + `Player` tag.
- O2 root has the trigger zone + life-support + objective tracker + raid stub; the `Deck` visual has
  **no** collider.
- Both pads `Configure`d; loop controller wired.

## Step 7 — Build the planet half + Play

Add `PlanetDropPoint`, the 3 salvage nodes + 3 tool caches, and the enemy
(`guides/04-scene-assembly.md` tables), then run the loop (`guides/06`). If you can't Play here
(headless VM), **flag the Play verification as pending a real-Editor run** (`guides/08`).

## When this is done

You have a station hub assembled via MCP that matches the spawner. The next step toward the Tier 0
deliverable is making it a *committed* scene — see `examples/02-spawner-to-committed-scene.md`.
