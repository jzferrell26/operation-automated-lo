// templates/object-pool.cs
//
// A generic, Unity 6-friendly object pool for PROJECT-DRIFT, wrapping
// UnityEngine.Pool.ObjectPool<T>. Use it for things that spawn/despawn during
// play — enemies, salvage drops, projectiles, VFX (see guides/03-object-pooling.md).
// Do NOT pool one-time setup objects (floor, lighting, O2 deck, pads).
//
// TIER NOTE: at Tier 0 there is one never-respawned enemy, so this is FORWARD
// GUIDANCE — the pool ships WITH the Tier 1 wave spawner, not before (CLAUDE.md
// §6 Rule #1). Drop this in when a respawning system lands.
//
// MEASUREMENT: after wiring, confirm flat GC Alloc across a spawn wave and a
// plateauing instance count in the Memory Profiler (guides/07-profiling-workflow.md).
//
// Hand the integration code shape to unity-csharp-guardian; this template is the
// perf-correct skeleton, not the final gameplay wiring.

using System;
using UnityEngine;
using UnityEngine.Pool;

namespace Drift.Gameplay.Perf
{
    /// <summary>
    /// Generic component pool. T is the MonoBehaviour on the pooled prefab/primitive.
    /// Reuse over Instantiate/Destroy to avoid GC churn on a mid-tier mobile chip.
    ///
    /// REUSE CONTRACT (the part people get wrong): a pooled object is REUSED, so
    /// Awake/Start run only on first creation. Anything that must reset per spawn
    /// goes in OnGet via the resetOnGet callback — NOT in Awake. This matches
    /// DRIFT's lazy-init + explicit Configure convention (CLAUDE.md §6 Rule #11).
    /// </summary>
    public sealed class ComponentPool<T> where T : Component
    {
        readonly Func<T> _create;
        readonly Action<T> _resetOnGet;     // re-init transient state for this spawn
        readonly Action<T> _onRelease;      // tear down transient state
        readonly ObjectPool<T> _pool;

        public ComponentPool(
            Func<T> create,
            Action<T> resetOnGet = null,
            Action<T> onRelease = null,
            int prewarm = 0,
            int defaultCapacity = 16,
            int maxSize = 64,
            bool collectionCheck = true)
        {
            _create = create ?? throw new ArgumentNullException(nameof(create));
            _resetOnGet = resetOnGet;
            _onRelease = onRelease;

            _pool = new ObjectPool<T>(
                createFunc: CreateInstance,
                actionOnGet: OnGet,
                actionOnRelease: OnRelease,
                actionOnDestroy: OnDestroyInstance,
                collectionCheck: collectionCheck,   // catches double-release in dev; cost is dev-only
                defaultCapacity: defaultCapacity,
                maxSize: maxSize);                   // beyond maxSize, released objects are destroyed

            if (prewarm > 0)
            {
                Prewarm(prewarm);
            }
        }

        public int CountActive => _pool.CountActive;
        public int CountInactive => _pool.CountInactive;

        /// <summary>Get a live instance. resetOnGet has already run.</summary>
        public T Get() => _pool.Get();

        /// <summary>Return an instance for reuse. Call this instead of Destroy().</summary>
        public void Release(T instance) => _pool.Release(instance);

        /// <summary>Destroy all inactive instances and reset the pool.</summary>
        public void Clear() => _pool.Clear();

        // Pre-instantiate off the combat critical path so the first wave doesn't pay
        // N instantiation costs mid-combat (guides/03). Sized to the wave cap that
        // game-balance-guardian owns.
        void Prewarm(int count)
        {
            var temp = new T[count];
            for (var i = 0; i < count; i++) temp[i] = _pool.Get();
            for (var i = 0; i < count; i++) _pool.Release(temp[i]);
        }

        T CreateInstance() => _create();           // called only on a pool miss

        void OnGet(T instance)
        {
            instance.gameObject.SetActive(true);
            _resetOnGet?.Invoke(instance);         // e.g. enemy.Configure(player, pos); reset FSM state; re-arm Health
        }

        void OnRelease(T instance)
        {
            _onRelease?.Invoke(instance);          // clear transient refs / events
            instance.gameObject.SetActive(false);
        }

        void OnDestroyInstance(T instance)
        {
            if (instance != null)
            {
                UnityEngine.Object.Destroy(instance.gameObject);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// USAGE SKETCH (see examples/01-object-pool-for-mutated-crew.md for the full version):
//
//   _enemyPool = new ComponentPool<MutatedCrewEnemy>(
//       create:     () => BuildEnemyOnce(),                 // CreatePrimitive + AddComponents + Tint ONCE
//       resetOnGet: e  => { e.ResetForSpawn(); e.Configure(_player, e.transform.position); },
//       onRelease:  e  => { /* clear transient state */ },
//       prewarm:    8, maxSize: 32);
//
//   var enemy = _enemyPool.Get();           // spawn
//   enemy.transform.position = spawnPoint;
//   ...
//   _enemyPool.Release(enemy);              // "death" — replaces Destroy(gameObject)
//
// REQUIRED code-side edits when this lands (flag to unity-csharp-guardian):
//   * MutatedCrewEnemy must reset _state -> Idle and re-arm Health on get
//     (today Configure does NOT reset _state — MutatedCrewEnemy.cs:29/:84).
//   * MutatedCrewEnemy.OnDied (:220) must call pool.Release(this), not Destroy.
// ---------------------------------------------------------------------------
