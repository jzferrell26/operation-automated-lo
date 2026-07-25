# 06 — Raider-Assault AI

The station raid is DRIFT's first "horde" beat, and it's a masterclass in Principle #6: it reuses the one enemy FSM and the breach loop rather than building a parallel system. Read `Assets/Scripts/Drift/Gameplay/LifeSupport/Tier0RaiderAssault.cs` and `HullBreachEvent.cs` beside this guide.

## 1. What the raid is (Tier 0 scope)

The GDD's vision is a timed horde: "Raider assault every 24h ... raiders path toward station structures and attack them ... A breach triggers the §5 pressure crisis. Reuses the same FSM" (GDD §8, §13). Tier 0 deliberately scopes that down: **not a 24h timer, but a post-extraction trigger** that fires once (`CLAUDE.md` §3: "post-extraction trigger (not a 24h timer in Tier 0) reusing the breach loop"). `Tier0RaiderAssault` is that scoped-down assault.

The 24h cadence is a *number* — when Tier 1 makes the raid recurring, the interval is `game-balance-guardian`'s (their description names "raider-assault cadence & pacing"). The *what-happens-during-a-raid behavior* is yours.

## 2. The assault state, and how it reuses everything

`Tier0RaiderAssault` is itself a tiny three-flag state machine (`Tier0RaiderAssault.cs:18-20`): `HasStarted`, `IsActive`, `IsComplete`. Its lifecycle:

```
BeginAssault()  ->  IsActive = true
                    SpawnRaider()           // a MutatedCrewEnemy-driven raider
                    hullBreach.ActivateBreach()
HullBreachEvent.BreachSealed  ->  OnBreachSealed -> CompleteAssault()
CompleteAssault()  ->  IsActive=false, IsComplete=true
                       objectives.RecordRaidSurvived()
                       AssaultCompleted?.Invoke()
```

Three reuse points, each worth internalizing:

1. **The raider is a `MutatedCrewEnemy`.** `SpawnRaider()` adds `Health` + `MutatedCrewEnemy` and tints it orange (`Tier0RaiderAssault.cs:117-125`). It is the *same FSM* — idle/chase/attack/return — just a tinted instance. The GDD's "Reuses the same FSM" is literal. The future "ranged raider" archetype (`guides/07`) extends that FSM by parameters/states, still not a new controller.
2. **The crisis is the breach, not the enemy.** Surviving the raid means *sealing the hull*, not killing the raider — `CompleteAssault` is driven by `BreachSealed`, not by enemy death (`Tier0RaiderAssault.cs:98-106`). The enemy is pressure on the player *while* they repair. This is the design: the raid is a fight-and-reseal crisis (GDD §5/§8).
3. **It rides the existing breach loop.** `HullBreachEvent` already vents O2, drains pressure, and seals on Welder repair (`HullBreachEvent.cs`). The assault just *activates* it (`hullBreach?.ActivateBreach()`) and *subscribes* to its `BreachSealed`. No new repair mechanic.

## 3. Event-driven, not polled — and the wiring discipline

The assault never polls. It subscribes to `HullBreachEvent.BreachSealed` and reacts (`Tier0RaiderAssault.cs:71-96`). This matches the spine's event flow (`ARCHITECTURE.md` §5). The subscription wiring is careful and worth copying:

- `Configure(breach, tracker, spawnPos)` **unsubscribes the old breach before subscribing the new** (`Tier0RaiderAssault.cs:35-42`) — so re-`Configure` in a test doesn't double-fire.
- `SubscribeBreach` guards against double-subscribe via `_subscribedBreach` (`Tier0RaiderAssault.cs:71-85`).
- `OnDestroy` unsubscribes (`Tier0RaiderAssault.cs:30-33`).

A new event-driven AI component must follow this subscribe/unsubscribe symmetry, or it leaks handlers and double-fires across test runs — a must-fix (it breaks EditMode determinism).

## 4. EditMode-testability of the assault

`Tier0RaiderAssault` is testable the DRIFT way:

- **`Configure(...)`** injects the breach, the objective tracker, and the spawn position — no scene lookups required (`Tier0RaiderAssault.cs:35`).
- The flags (`HasStarted`, `IsActive`, `IsComplete`) and the `AssaultCompleted` event are observable, so a test can: `Configure` a fake breach → `BeginAssault()` → assert `IsActive` → raise `BreachSealed` → assert `IsComplete` and that `AssaultCompleted` fired.
- This is the pattern behind the life-support suite (`RuntimeLifeSupportTests`, per `CLAUDE.md` §3).

**One gap to flag, not silently fix:** `SpawnRaider()` adds a `MutatedCrewEnemy` but does **not** call `Configure(player, spawn)` on it (`Tier0RaiderAssault.cs:117-125`) — the raider relies on `MutatedCrewEnemy.Start`'s tag lookup to find the player. That's acceptable for the one-shot Tier 0 gray-box (Play mode runs `Start`), but it means the *spawned raider's own FSM* isn't exercised in an EditMode assault test. When the raid becomes a real wave (`guides/05`), route spawning through a factory and `Configure` each raider, so the raider's chase/attack is itself testable. Surface this as a should-refactor tied to the Tier 1 wave work — not a Tier 0 blocker.

## 5. Extending the raid (forward design — Tier 1+)

Keep every extension on the reuse rails:

- **Recurring 24h cadence** — the trigger moves from "post-extraction event" to a timer; the *interval* is `game-balance-guardian`'s, the *"raid fires, breach opens, survive by sealing"* behavior stays.
- **Multiple raiders / waves** — fold into the wave spawner (`guides/05`), not a new path. Count and ramp are numbers.
- **Raiders attacking structures, not just the player** — the GDD's "path toward station structures and attack them" (GDD §8). This is a *new target type* for the FSM's perception (`guides/03`) — inject the structure target through `Configure`; the chase/attack states are unchanged.
- **Ranged raiders** — the archetype delta in `guides/07`. Still the same FSM with an Attack state that fires a projectile instead of melee.

## 6. Raider-assault review checklist

- [ ] The raider is a `MutatedCrewEnemy` instance (parameters/states differ), not a parallel controller (Principle #6).
- [ ] "Survive the raid" is gated on `BreachSealed`, not enemy death (the crisis is the breach).
- [ ] The assault rides the existing `HullBreachEvent` loop — no duplicate repair mechanic.
- [ ] Subscribe/unsubscribe is symmetric (`Configure` unsubscribes first; `OnDestroy` unsubscribes) — no leaked/double handlers.
- [ ] The assault is `Configure`-injectable and its flags/events are observable for EditMode tests.
- [ ] Spawned raiders that need their own FSM exercised are `Configure`-wired (flag the Tier 0 `Start`-fallback gap for the Tier 1 wave refactor).
- [ ] Cadence / counts surfaced to `game-balance-guardian`.
