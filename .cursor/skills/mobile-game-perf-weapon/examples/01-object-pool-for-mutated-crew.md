# Example 01 — An Object Pool for `MutatedCrewEnemy` Spawns

**Scenario:** Tier 1 lands a wave spawner — raider assaults / mutation waves spawn enemies, they die, more spawn. The Tier 0 spawn path (`Tier0RuntimeSpawner.CreateEnemy`) does `Instantiate`-style creation and the enemy `Destroy`s itself on death. Under a respawning wave, that's `Instantiate`/`Destroy` churn → GC stalls → frame hitches on a mid-tier phone.

**Tier framing:** at Tier 0 there is **one** never-respawned enemy, so this is **forward-guidance** — the pool ships *with* the wave spawner, not before it (CLAUDE.md §6 Rule #1, `guides/10`). This example is the design to apply the moment that spawner exists. We measure the win so it's not speculative.

---

## The current churn site

`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs:299`:

```csharp
static void CreateEnemy(Transform player, Vector3 position)
{
    var enemy = GameObject.CreatePrimitive(PrimitiveType.Capsule);
    enemy.name = "MutatedCrew";
    enemy.transform.position = position;
    enemy.AddComponent<Health>();
    enemy.AddComponent<MutatedCrewEnemy>().Configure(player, position);
    GrayBoxVisuals.Tint(enemy, new Color(0.95f, 0.2f, 0.25f));
}
```

And the despawn, `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:220`:

```csharp
void OnDied()
{
    Destroy(gameObject, 0.1f);
}
```

Two costs per spawn/despawn cycle: (1) `CreatePrimitive` + `AddComponent` allocation and `Destroy` GC churn; (2) a leaked `Material` per spawn (`GrayBoxVisuals.Tint` → `new Material`, `GrayBoxVisuals.cs:33` — see `guides/04`).

---

## The pool (using `templates/object-pool.cs`)

Build the enemy once, hand it to a pool, and reuse it. The pool's callbacks map onto DRIFT's existing `Configure` / lazy-init convention (`MutatedCrewEnemy.EnsureInitialized` at `:41`, `Configure` at `:84`).

```csharp
using UnityEngine;
using UnityEngine.Pool;
using Drift.Gameplay.AI;
using Drift.Core.Combat;
using Drift.Gameplay.Visual;

public class MutatedCrewPool : MonoBehaviour
{
    [SerializeField] int prewarm = 8;
    [SerializeField] int maxSize = 32;

    Transform _player;
    ObjectPool<MutatedCrewEnemy> _pool;

    public void Configure(Transform player)
    {
        _player = player;
        _pool = new ObjectPool<MutatedCrewEnemy>(
            createFunc: Create,
            actionOnGet: OnGet,
            actionOnRelease: OnRelease,
            actionOnDestroy: OnDestroyed,
            collectionCheck: true,
            defaultCapacity: prewarm,
            maxSize: maxSize);

        // Pre-warm off the combat critical path (guides/03).
        var warm = new MutatedCrewEnemy[prewarm];
        for (var i = 0; i < prewarm; i++) warm[i] = _pool.Get();
        for (var i = 0; i < prewarm; i++) _pool.Release(warm[i]);
    }

    public MutatedCrewEnemy Spawn(Vector3 position)
    {
        var enemy = _pool.Get();
        enemy.transform.position = position;
        // Reset the FSM anchor + target for this spawn.
        enemy.Configure(_player, position);
        return enemy;
    }

    public void Despawn(MutatedCrewEnemy enemy) => _pool.Release(enemy);

    MutatedCrewEnemy Create()
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        go.name = "MutatedCrew";
        go.AddComponent<Health>();
        var enemy = go.AddComponent<MutatedCrewEnemy>();
        GrayBoxVisuals.Tint(go, new Color(0.95f, 0.2f, 0.25f)); // created ONCE, not per spawn
        return enemy;
    }

    void OnGet(MutatedCrewEnemy enemy) => enemy.gameObject.SetActive(true);
    void OnRelease(MutatedCrewEnemy enemy) => enemy.gameObject.SetActive(false);
    void OnDestroyed(MutatedCrewEnemy enemy) => Destroy(enemy.gameObject);
}
```

---

## The required code-side change (hand the pattern to `unity-csharp-guardian`)

Pooling only works if the reused enemy fully **resets on get**. Two concrete edits — flag them, let `unity-csharp-guardian` own the shape:

1. **Reset FSM state on get.** `MutatedCrewEnemy._state` (`:29`) is *not* reset by `Configure` today — a reused enemy keeps its last state (could come back already in `Attack`). Add a reset (e.g. extend `Configure` to set `_state = EnemyState.Idle`, or add a `ResetForSpawn()` the pool calls in `OnGet`).
2. **Death releases instead of destroys.** `OnDied` (`:220`) must call `pool.Despawn(this)` instead of `Destroy(gameObject)`. Re-arm `Health` on get so the reused enemy isn't still dead. (`Health.Died` is wired in `EnsureInitialized` at `:52`; confirm the event re-arms cleanly on reuse.)

Both are correctness concerns about reuse — this Weapon flags the cost (`Destroy` churn) and the reset requirement; `unity-csharp-guardian` owns the clean reset pattern, and `unity-test-ci-guardian` adds the EditMode coverage (the `Step`-extraction convention makes the reset testable without a device).

---

## How to measure the win

1. **Baseline (no pool):** Profiler CPU module, GC Alloc column, on-device, during a respawning wave. Record per-frame GC Alloc and note the `GC.Collect` spikes when enemies die and respawn.
2. **After pool:** same capture. **Pass:** spawn/despawn GC Alloc drops toward 0 B (no per-spawn heap churn); the `GC.Collect` spikes during the wave disappear.
3. **Memory Profiler snapshot diff** (`guides/07`) before vs after a full wave: pooled-enemy instance count **plateaus at the pool size** instead of growing-then-collecting. Material count also plateaus (one material reused) instead of leaking one per spawn — proving the `guides/04` fix landed too.
4. **Frame Debugger:** the pooled enemies sharing one material now batch (vs one draw call each).

**Pass/fail:** flat GC Alloc across a spawn wave; no per-spawn `GC.Collect`; instance + material counts plateau at pool size; enemies batch.

Source: `guides/03-object-pooling.md`, `templates/object-pool.cs`, Unity `UnityEngine.Pool.ObjectPool<T>` docs.
