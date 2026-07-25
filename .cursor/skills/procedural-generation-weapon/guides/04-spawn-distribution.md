# 04 — Spawn Distribution

How to scatter enemy (and object) spawn points across a sector so they read as deliberate, not
clumped or gridded. This Guardian owns the **distribution ALGORITHM** and produces **spawn points**;
**what spawns there and how it behaves is `fsm-ai-guardian`'s.**

## The contract this produces against

`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:84` — `Configure(Transform player,
Vector3 spawnPosition)`. A spawn point is a `Vector3`; instantiating an enemy and calling
`Configure(player, spawnPosition)` is the existing wiring (`Tier0RuntimeSpawner.CreateEnemy`,
`:299`). A distribution generator's job is to **produce the set of `Vector3` spawn positions**; the
instantiation + `Configure` call is a thin step, and the FSM is the sibling's.

## Why Poisson-disc (blue noise), not pure-random

Pure uniform random placement clumps — points land on top of each other and leave bare patches. For
enemies that reads as a swarm-then-void, which is bad pacing. **Poisson-disc sampling** (Bridson,
*Fast Poisson Disk Sampling in Arbitrary Dimensions* `[memory]`) produces **blue-noise**: points
that are random but maintain a **minimum separation** `r`. The result looks deliberate and avoids
both clumping and a visible grid.

### Bridson's algorithm (the shape)

1. Pick a seeded first point; add it to the active list and the output.
2. While the active list is non-empty:
   - Pick a random active point.
   - Generate up to `k` candidate points (e.g. `k=30`) in the annulus between `r` and `2r` around
     it, using the **seeded** PRNG (guide 05).
   - For each candidate, reject it if any existing point is within `r` (a background grid of cell
     size `r/√2` makes this O(1) per check).
   - Accept the first valid candidate → add to active + output. If none valid, remove the source
     point from the active list.
3. Return the output point set.

`r` (minimum separation) and the target/max count are **VALUES owned by `game-balance-guardian`**
(spawn density is difficulty — guide 06). This Guardian owns the *algorithm*; balance owns `r` and the
count.

## Spawn-zone budgeting

Spawns are not scattered over the whole sector uniformly — they respect **zones** (data):

- A spawn zone is an area (a chunk tagged `spawn_zone`, or a polygon/bounds in config) with a
  **budget** — how many spawns it may hold (a VALUE → balance).
- Distribute Poisson-disc points *within each zone's bounds*, capped at the zone budget.
- Keep a **safe radius** around the entrance / extract pad (no spawn within `safeRadius` of the
  player's arrival) — `safeRadius` is a balance VALUE; enforcing it is this Guardian's algorithm.

## Determinism + EditMode (guides 05, 07)

- The candidate generation uses the generator's **seeded** PRNG, never `UnityEngine.Random`.
- The active-list "pick a random active point" uses a **seeded** index, and the active list is an
  **ordered** structure so removal order is stable.
- Same `(seed, zone bounds, r, count)` → identical point set.

EditMode shape:

```
Configure(SpawnZone[] zones, float minSeparation, int maxCount, int seed)
IReadOnlyList<Vector3> Generate()     // pure: runs Poisson-disc, returns the points
```

The test calls `Configure` + `Generate` twice with the same seed and asserts (a) identical point
lists and (b) **no two points closer than `minSeparation`** — the invariant that proves the
distribution is correct. See `examples/03-poisson-disc-enemy-spawn.md`.

## Allocation awareness (Hard Rule #10)

The background grid + active list allocate; pre-size them from the zone bounds and reuse buffers
across zones where possible. This Guardian keeps the pass GC-conscious; the **frame budget and whether
to pool the spawned enemies is `mobile-game-perf-guardian`'s.**

## Lane handoffs

- **`minSeparation` (r), spawn counts, zone budgets, safe-radius, density-as-difficulty** →
  `game-balance-guardian`. Algorithm here; numbers there.
- **What spawns at each point + its behavior (FSM, aggro, leash)** → `fsm-ai-guardian`. This Guardian
  hands a `Vector3` list; they instantiate + `Configure` the enemy and drive it.
- **Pooling / instantiation budget for many agents** → `mobile-game-perf-guardian`.

## Output

A spawn invocation produces a **seeded Poisson-disc distribution generator** (`Configure` +
`Generate` returning `Vector3` spawn points, zone-budgeted, safe-radius-respecting) + an EditMode
test asserting reproducibility and minimum separation, with `r`/counts handed to balance and the
spawned behavior handed to fsm-ai.
