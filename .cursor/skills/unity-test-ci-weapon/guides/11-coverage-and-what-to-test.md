# 11 — Coverage & What to Test

Coverage is a means, not a goal. The question is never "what's our line %?" — it's "is the Tier 0 spine's *behavior* pinned down so a refactor can't quietly break the loop?" This guide is the DRIFT coverage map and the test/don't-test rule.

## The principle: test the spine, not Unity

Assert the gameplay transition or economy; trust Unity's own code. DRIFT does this consistently:

- It tests `TopDownPlayerController.ResolveMove` (the movement *math* — normalization, sprint gating) but **not** `CharacterController.Move` (Unity's collision code).
- It tests `MutatedCrewEnemy.Step` returning `EnemyState.Chase` (the *FSM logic*) but not the steering integration with the physics engine.
- It tests `LifeSupportZone.ApplyLifeSupport(go, dt)` directly but not whether `OnTriggerEnter` fires (Unity's physics).

If an assertion would be verifying Unity rather than DRIFT, it doesn't belong (`SKILL.md` Hard Rule #11).

## The Tier 0 coverage map (what the ten suites pin)

| Suite | System | Behavior pinned |
|---|---|---|
| `RuntimeOxygenTests` | `OxygenSystem` + `LifeSupportZone` | drain on/off, refill clamps to max, suffocation damages Health when depleted, powered zone refills + pauses drain |
| `RuntimeSuitPowerTests` | `SuitPowerSystem` | sprint consumes + blocks at empty, powered zone recharges only when powered |
| `RuntimePlayerTests` | `TopDownPlayerController` | base-speed move, sprint faster + drains suit, no sprint at empty, no drain when idle, diagonal normalized |
| `RuntimeEnemyTests` | `MutatedCrewEnemy` | detect→chase, idle out of range, chase closes gap, attack damages + respects cooldown, leash→return |
| `RuntimeLifeSupportTests` | `HullBreachEvent` + `LifeSupportZone` | breach disables zone + drops pressure, repair reseals + restores |
| `RuntimeInventoryTests` | `SalvageInventory` + `SimpleCrafter` | stack-max across slots, atomic ingredient consume, `Changed` fire count, craft consumes+outputs, output-full doesn't consume |
| `RuntimeObjectiveTests` | `Tier0ObjectiveTracker` + loop | objective state + completion gating |
| `RuntimeSalvageTests` | `SalvageNode` | walk-in pickup + tool-gated caches |
| `RuntimeBuildPlannerTests` | `Tier0BuildPlanner` | deck-plate cost, preview cell, adjacency, placement validity |
| `RuntimeSpawnerTests` | `Tier0RuntimeSpawner` | the gray-box **contract**: required components present, 6 salvage nodes (3 caches), 2 pads (1 extract), 3 recipes, required tool ids |

Together these cover every step of the GDD §3 Tier 0 loop: descend → salvage → craft → fight → extract → survive the raid.

## The spawner contract test is special

`RuntimeSpawnerTests` doesn't test one system — it asserts the **wiring** of the whole gray-box. It's the canary that catches "someone renamed a component and the loop no longer assembles." It encodes the composition from `ARCHITECTURE.md §4` as executable assertions:

```csharp
Assert.AreEqual(6, salvageNodes.Length);              // 3 resources + 3 caches
Assert.AreEqual(3, CountToolCaches(salvageNodes));
Assert.AreEqual(2, shuttlePads.Length);
Assert.AreEqual(1, CountExtractionPads(shuttlePads));
CollectionAssert.Contains(requiredTools, Tier0Balance.CutterId);
```

When you add a system to the spawner, extend this test. It's the cheapest insurance the project has.

## What is intentionally NOT tested (and shouldn't be)

- **`Tier0Hud`** — IMGUI throwaway (`ARCHITECTURE.md §8`). The real UGUI/touch HUD is Tier 1. Don't test disposable code.
- **Game feel / juice** — not unit-testable by nature → `game-feel-juice`.
- **Whether a balance number is right** — `Tier0Balance` values (drain rate, yields, costs) are `game-balance`'s call. Tests assert *direction* (drain reduces oxygen), not *magnitude*.
- **The "is it fun?" question** — a human play-test (CLAUDE.md §4 DoD), not an assertion.
- **Tier 1+ systems** — durability, workstation crafting, save/load, NavMesh. They don't exist yet (`ARCHITECTURE.md §8`); writing tests for them now violates CLAUDE.md Rule #1. Flag and stop.

## Coverage gaps worth filling (when the code lands)

- **Tier 1 durability** — when the decay economy is rebuilt on `ItemDefinition`/`SalvageInventory`/`SimpleCrafter` (CLAUDE.md §6, `ARCHITECTURE.md §8`), it needs tests: tool loses durability per use, breaks at zero, gun durability included (Hard Rule #2 — durability stays). Co-own the design with `unity-csharp-guardian`/`game-balance`; own the tests.
- **Save/load round-trip** — when persistence arrives (Tier 1), serialize → deserialize → assert equality. Owned by `save-load`; this Guardian writes the round-trip test.
- **Full-loop integration** — a PlayMode test driving the assembled scene end-to-end (`guides/09-playmode-tests.md`), once a committed scene exists (`unity-mcp-guardian`).

## The review question

For any new system, ask: *"What transition or economy invariant must hold for the loop to work, and is it pinned by an assertion that survives a balance retune?"* If yes, coverage is sufficient. If the only test is a vacuous "it didn't crash," that's a gap — and if it relies on `Update` firing, it's a false-green must-fix (`guides/03-editmode-safe-design.md`).
