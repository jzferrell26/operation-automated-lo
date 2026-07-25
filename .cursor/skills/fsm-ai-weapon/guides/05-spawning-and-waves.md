# 05 — Spawning and Waves

Spawning is where AI behavior meets the encounter. Tier 0 spawns enemies imperatively; waves are Tier 1+ forward design. This guide covers both, holding the same EditMode-testability and behavior-vs-numbers lines.

## 1. How DRIFT spawns today

There is no spawner abstraction yet — enemies are created inline:

- The gray-box places **one** mutation directly: `Tier0RuntimeSpawner.Build()` makes a capsule with `Health` + `MutatedCrewEnemy` (`ARCHITECTURE.md` §4).
- The raid spawns **one** raider imperatively inside `Tier0RaiderAssault.SpawnRaider()` (`Tier0RaiderAssault.cs:117-125`):

```csharp
var raider = GameObject.CreatePrimitive(PrimitiveType.Capsule);
raider.AddComponent<Health>();
raider.AddComponent<MutatedCrewEnemy>();
GrayBoxVisuals.Tint(raider, new Color(0.95f, 0.45f, 0.1f));
```

Note what's *missing* and why it's fine for Tier 0: the spawned enemy isn't `Configure`-wired to a target here (it falls back to the `Start` tag lookup), there's no pooling, and there's exactly one. That's correct scope — but it's also the shape a real spawner must improve on.

## 2. The spawner contract (forward design — Tier 1+)

A wave system is Tier 1 (GDD §13: "enemy variety," "scales over time"). Design it now as guidance, build it when Tier 0 is fun (Principle #8). The contract mirrors every other DRIFT system (Hard Rule #2):

- **Lazy init** — `EnsureInitialized()` guard.
- **`Configure(...)`** — inject the target `Transform`, spawn anchors, and an enemy *factory* (so tests don't instantiate real prefabs).
- **Extracted `Step(float deltaSeconds)`** — advances wave timers and decides when to spawn; `Update` only forwards `Time.deltaTime`.
- **Spawn through the factory + `Configure` each enemy** — every spawned `MutatedCrewEnemy` gets `Configure(target, spawnPos)` so it doesn't depend on the `Start` tag path, and so the spawner is testable without a tagged player in the scene.

`templates/enemy-spawner.cs` is the skeleton. `examples/02-simple-wave-spawner.md` works it through end to end.

## 3. Behavior vs numbers in a spawner

This split is sharp here — get it right:

| Yours (behavior) | game-balance-guardian's (numbers) |
|---|---|
| "spawn at intervals until the wave count is reached" | the interval, the count |
| "spawn at the nearest free anchor to the player" | how near, how many anchors |
| "start the next wave when the field is cleared" | inter-wave delay, wave-size curve |
| "ramp difficulty by adding a tougher archetype per wave" | *which* numbers ramp, and how steeply |

You design the *cadence shape and spawn-placement logic*; every duration, count, and curve is surfaced to `game-balance-guardian` (raid cadence is explicitly theirs — see their Guardian's description). A spawner with `spawnInterval = 3f` hardcoded in logic is a must-fix: extract it.

## 4. Spawn placement as behavior

Where an enemy appears is behavior you own. Options, cheapest first:

- **Fixed anchors** — a list of spawn `Transform`s passed via `Configure` (what a gray-box wants). Deterministic, trivially testable.
- **Ring around the player** — pick a point on a circle at radius R from the target; good for "they came from the dark." The *radius* is a number; "on a ring around the player" is behavior.
- **Off-screen edge** — spawn just outside the camera frustum so pop-in isn't visible (portrait mobile makes this tight — coordinate the frame with `game-feel-juice-guardian`/`unity-mcp-guardian` for camera).

Whatever the rule, it must be a pure function of (anchors, target, RNG-with-injectable-seed) so a test can assert "spawned within the expected set." Don't call `Random` un-seeded inside `Step` — pass a seed or an `IRandom` through `Configure` so spawns are reproducible in tests.

## 5. Pooling is a perf concern, not a behavior concern

`Tier0RaiderAssault` uses `CreatePrimitive` + (eventually) `Destroy`. At wave scale, instantiate/destroy churn is a mobile GC problem — but **pooling is `mobile-game-perf-guardian`'s architecture, not yours.** Your obligation is to spawn *through a factory seam* (`Func<EnemyHandle>` or an injected pool interface) rather than calling `Instantiate`/`CreatePrimitive` directly in `Step`. That seam is what lets perf drop a pool in behind you without touching wave logic — and what lets tests inject a fake factory. Design the seam; hand the pool to perf.

## 6. The raid is a degenerate wave

Don't build a parallel system for the raid. `Tier0RaiderAssault` is effectively a one-enemy wave triggered by an event (`BeginAssault`) rather than a timer (`guides/06-raider-assault-ai.md`). A general wave spawner should be able to express the raid as a special case: count = 1 (Tier 0), trigger = event, archetype = tinted raider. When you build waves, fold the raid into them rather than maintaining two spawn paths — Principle #6 (reuse the one FSM extends to reusing one spawn path).

## 7. Spawner review checklist

- [ ] Spawner follows lazy-init + `Configure` + extracted `Step` (Hard Rule #2).
- [ ] Every spawned enemy is `Configure`-wired to its target (not left on the `Start` tag fallback).
- [ ] Spawning goes through an injectable factory seam, not direct `Instantiate`/`CreatePrimitive` in `Step` (lets perf pool, lets tests fake).
- [ ] All intervals/counts/curves surfaced to `game-balance-guardian` — none hardcoded in logic.
- [ ] Placement is a pure function of (anchors, target, seeded RNG) — reproducible in tests.
- [ ] Tier-flagged: waves are Tier 1+ design, not built into the gray-box ahead of the fun call.
