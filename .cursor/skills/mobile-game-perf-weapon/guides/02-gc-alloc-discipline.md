# 02 — GC-Allocation Discipline

The single most preventable cause of mobile frame hitches: heap garbage generated per frame. Every allocation feeds the garbage collector; a GC pass on a mobile chip is a visible stutter. **Target: 0 B/frame in steady state.**

## Why it matters more on mobile

Unity's default GC is non-incremental Boehm-style: when it runs, it can stall the main thread for milliseconds — enough to blow the 16.67ms budget and drop a frame. On desktop you might never notice; on a mid-tier phone it's a hitch every few seconds during combat. You cannot "tune" your way out — you prevent the allocations.

## The hot paths in DRIFT

These run every frame (or per-agent per-frame) and must stay allocation-free:

- `MutatedCrewEnemy.Update` → `Step(Time.deltaTime)` (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:91`, `:100`) — runs per enemy, per frame. With one enemy it's nothing; with a Tier 1 wave it's the dominant gameplay cost.
- `TopDownFollowCamera.LateUpdate` (`Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs:29`) — runs every frame.
- Any HUD update in `Tier0Hud` that builds strings.

## The allocation traps (and the fixes)

### LINQ — never in a hot path
`.Where()`, `.Select()`, `.OrderBy()`, `.ToList()`, `.Any()`, `.First()` allocate iterators, closures, and often a new list every call. One `.Where(...)` in `Update` is bytes per frame per call. **Fix:** plain `for` loops with cached collections.

### `foreach` over a class enumerator
`foreach` over `List<T>` is fine (struct enumerator, no alloc). `foreach` over an `IEnumerable<T>`, a `Dictionary` in some Unity versions, or any interface-typed collection boxes the enumerator → heap alloc per loop. **Fix:** iterate the concrete type, or use indexed `for`.

### Boxing
Passing a `struct` (including `int`, `enum`, `Vector3`) where an `object` is expected boxes it. The classic offender: `string.Format`/`Debug.Log($"...")` with value-type args, and `Dictionary<SomeEnum, T>` using the default comparer (boxes the enum key on older runtimes). **Fix:** keep value types out of `object` parameters; cache or avoid logging in hot paths.

### Closures capturing locals
A lambda that captures a local variable allocates a closure object. Common in callbacks registered per frame. **Fix:** hoist the delegate to a cached field, or capture nothing.

### `new` on reference types per frame
`new List<>()`, `new[] {...}`, `new SomeClass()` inside `Update`/`Step`. **Fix:** allocate once in init, reuse. Note: `new Vector3(...)` is a *struct* — stack, **no heap alloc** — so the `Flat()` helpers in `MutatedCrewEnemy` (`:225`, `:230`) are allocation-free. Don't flag struct construction.

### Uncached `GetComponent` / `Find*`
`GetComponent<T>()` allocates in some paths and costs CPU; `GameObject.Find*` / `FindObjectOfType` walk the scene and are very expensive. **Fix:** resolve once and store. `MutatedCrewEnemy` does this correctly — it caches `_health` in `EnsureInitialized` (`:48`) and resolves `_player` once via `Configure` (`:84`) rather than calling `FindGameObjectWithTag` every frame. `TopDownFollowCamera.LateUpdate` calls `FindGameObjectWithTag("Player")` only until `target` is set (`:33`) — acceptable because it's a one-time fallback, not per-frame steady-state, but the canonical path is `SetTarget` from the spawner (`Tier0RuntimeSpawner:215`).

### String concatenation / interpolation
`"Score: " + n` or `$"O2: {value}"` every frame allocates a new string. Brutal in HUD code. **Fix:** only rebuild the string when the value changes; cache the last value and compare. For numbers, consider a pre-sized `StringBuilder` or a `TextMeshPro` `SetText` overload that takes a number without boxing.

### `TryGetComponent` over the alloc-prone pattern
`MutatedCrewEnemy.TryAttack` uses `_player.TryGetComponent<Health>(out var playerHealth)` (`:206`) — the non-allocating, preferred form over a null-checked `GetComponent`. Good. But it runs only when attacking, not every frame — fine either way here.

## Worked walkthrough: `MutatedCrewEnemy.Step`

Read the method (`:100`–`:176`). Audit it line by line for allocations:

- `Time.deltaTime`, arithmetic, `Vector3` math, `.magnitude`, `.normalized` — all struct/stack. **No heap alloc.** ✓
- `Flat(...)` / `FlatDistance(...)` (`:225`, `:230`) return `Vector3` (struct). **No heap alloc.** ✓
- The `switch` on the enum — no boxing (it's a switch, not a dictionary lookup). ✓
- `Quaternion.LookRotation` in `Face` (`:196`) — struct return. ✓

**Conclusion: `Step` is already allocation-clean.** This is the correct outcome to report — don't invent a problem. The forward-guidance finding is: *when a wave of these runs, the per-`Step` cost is real CPU (even at 0 alloc), so cap concurrent enemies and pool them* (`guides/03`, `guides/10`). The allocation risk would appear if someone later added a `Debug.Log($"...")`, a LINQ query over nearby targets, or a `new List<>` for a perception scan inside `Step` — flag those if they land.

## How to measure

1. **Profiler → CPU module → enable.** Add the **GC Alloc** column to the hierarchy view.
2. Enter play (on-device for truth), let it reach steady state (no spawning, just idle/combat).
3. Read the **GC Alloc** column per frame. **Target: 0 B** in steady state. Any non-zero recurring value is a per-frame allocation — drill into the call tree to find the offending method.
4. Watch the timeline for **`GC.Collect`** markers — a spike there is the stutter you're hunting.
5. For a specific suspect method, wrap it in a `ProfilerMarker` (`guides/07`) or `using (new ProfilerMarker("Enemy.Step").Auto())` and read its GC Alloc in isolation.

Pass/fail: **0 B/frame allocated in steady-state combat; no `GC.Collect` spikes during a spawn wave.**

## DRIFT tier note

At Tier 0 the alloc surface is tiny and mostly clean. The value of this guide now is (a) keeping it clean as systems land, and (b) establishing the 0-B/frame habit before Tier 1 waves, projectiles, and a full inventory UI multiply the hot-path count. Hand the *code pattern* for any fix to `unity-csharp-guardian`; this Weapon owns the cost finding and the measurement.

Source: Unity Manual — "Understanding the managed heap" / "Memory in Unity" / "Common memory-management problems"; Unity Profiler GC Alloc docs.
