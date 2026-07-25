# 03 — Object Pooling

Reuse objects instead of creating and destroying them. `Instantiate` allocates; `Destroy` queues a deferred teardown and (with `MonoBehaviour`s holding references) feeds the GC. A pool turns spawn/despawn into fixed-cost get/release.

## When to pool — and when NOT to

**Pool it when** the object spawns and despawns repeatedly *during play*:

- **Enemies** (mutations, raiders) — spawned in waves, killed, respawned. The headline DRIFT candidate.
- **Salvage drops / pickups** — created on harvest, consumed.
- **Projectiles** — Tier 1 combat; high churn by nature.
- **VFX / particle bursts** — hit flashes, impacts, pickup sparkles (perf budget co-owned with `game-feel-juice-guardian`).
- **Damage-number / floating-text popups** — UI churn.

**Do NOT pool** (it adds complexity for no win):

- One-time setup objects: the floor, lighting, the O2 deck, shuttle pads — built once by `Tier0RuntimeSpawner.Build` (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs:46`) and never destroyed. Pooling these is wasted code.
- Singletons (`Tier0Session`, the HUD).
- Anything that exists for the whole session.

**Tier discipline:** at Tier 0 there is exactly one enemy (`CreateEnemy`, `:299`–`:309`) and it's never respawned. A full pooling framework now would be Tier 1 infrastructure dragged into Tier 0 (CLAUDE.md §6 Rule #1). So pooling here is **forward-guidance**: design the seam, don't build the framework. The moment a wave spawner lands (Tier 1, GDD raider assaults), the pool ships with it.

## The current churn site

`Tier0RuntimeSpawner.CreateEnemy` (`:299`) does `GameObject.CreatePrimitive(...)`, adds `Health` + `MutatedCrewEnemy`, and `GrayBoxVisuals.Tint`s it. On death, `MutatedCrewEnemy.OnDied` calls `Destroy(gameObject, 0.1f)` (`MutatedCrewEnemy.cs:222`). With one enemy this is harmless. With a wave that respawns, this is **Instantiate/Destroy churn** — the exact pattern a pool fixes. Plus: each `Tint` call builds a fresh `Material` (`GrayBoxVisuals.cs:33`), so spawning N enemies leaks N materials — a batching + memory problem covered in `guides/04`.

## Unity 6 gives you the pool — `UnityEngine.Pool.ObjectPool<T>`

Don't hand-roll. Unity 6 ships `UnityEngine.Pool.ObjectPool<T>` (and `LinkedPool<T>`, plus collection pools like `ListPool<T>`/`DictionaryPool<T>` for temporary collections in hot paths). The pool takes four callbacks:

- `createFunc` — make a new instance (called only on a pool miss).
- `actionOnGet` — reset + activate (`SetActive(true)`, re-init state, re-`Configure`).
- `actionOnRelease` — deactivate (`SetActive(false)`, clear transient refs).
- `actionOnDestroy` — real teardown when the pool is trimmed.

See `templates/object-pool.cs` for a generic `MonoBehaviour`-friendly wrapper with pre-warm.

## The lifecycle contract (the part people get wrong)

A pooled object is **reused**, so `Awake`/`Start` run only on first creation, not on every get. Anything that must reset per spawn moves to `actionOnGet` / an explicit re-init.

DRIFT is already shaped for this. `MutatedCrewEnemy` uses the lazy-init + explicit `Configure` convention (CLAUDE.md §6 Rule #11; the enemy's `EnsureInitialized` at `:41` and `Configure(player, spawnPosition)` at `:84`). On pool-get you call `Configure(player, spawnPosition)` to reset the FSM anchor — exactly the seam pooling needs. **Caveat:** the FSM's `_state` field (`:29`) is *not* reset by `Configure` today; a reused enemy would keep its last state. The pooling work must reset `_state = EnemyState.Idle` and re-arm `Health` on get. Flag that as the concrete change when the pool lands; hand the code shape to `unity-csharp-guardian`.

Also: `MutatedCrewEnemy.OnDied` currently `Destroy`s the object (`:222`). Under pooling, "death" becomes `pool.Release(this)` instead of `Destroy`. That's the central edit.

## Pre-warm

Instantiate the expected peak count at load (off the combat critical path) so the first wave doesn't pay N instantiation costs mid-combat. Size the pre-warm to the wave cap from `game-balance-guardian` — they own the number, this Weapon owns "the count must fit the frame budget."

## How to measure the win

1. **Baseline:** Profiler CPU module, GC Alloc column, during a respawning wave with `Instantiate`/`Destroy`. Record per-frame GC Alloc and watch for `GC.Collect` spikes when enemies die/respawn.
2. **After pooling:** same capture. **Pass:** GC Alloc on spawn/despawn drops toward 0 B (no per-spawn heap churn); the `GC.Collect` spikes during the wave disappear.
3. **Memory Profiler:** snapshot before and after a wave; the object count for the pooled type should plateau at the pool size, not grow then collect.
4. Confirm draw-call count is also controlled — pooling reuses materials too, which helps batching (`guides/04`).

Pass/fail: **flat GC Alloc across a spawn wave; pooled-type instance count plateaus at pool size; no per-spawn `GC.Collect`.**

See `examples/01-object-pool-for-mutated-crew.md` for the full worked pool against `CreateEnemy`.

Source: Unity Manual — "Object Pooling" / `UnityEngine.Pool` API docs; Unity "Memory in Unity" (Instantiate/Destroy cost).
