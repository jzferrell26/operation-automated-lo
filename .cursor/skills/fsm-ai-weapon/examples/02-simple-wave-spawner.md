# Example 02 — A Simple Wave Spawner

**Scope flag:** waves are Tier 1+ (GDD §13: "scales over time"). This shows the *correct shape* — tickable, `Configure`-wired, factory-seamed — so it's testable and poolable when built. Do not add it to the gray-box ahead of the Tier 0 fun call (Hard Rule #1).

**Goal:** a spawner that releases N enemies over time at a set of anchors, each enemy `Configure`-wired to the player, with every number surfaced to `game-balance-guardian` and every dependency injectable for tests.

## 1. The shape (per `guides/05 §2`)

Same contract as every DRIFT system: lazy-init + `Configure(...)` + extracted `Step(deltaSeconds)`. Spawning goes through an injected **factory** so (a) tests don't instantiate real prefabs and (b) `mobile-game-perf-guardian` can drop a pool in behind the seam without touching wave logic.

```csharp
using System;
using System.Collections.Generic;
using Drift.Gameplay.AI;
using UnityEngine;

namespace Drift.Gameplay.AI
{
    public class WaveSpawner : MonoBehaviour
    {
        // VALUES — surface to game-balance-guardian; do NOT treat as final tuning.
        [SerializeField] int waveCount = 5;
        [SerializeField] float spawnInterval = 2f;

        Transform _target;
        IReadOnlyList<Vector3> _anchors;
        Func<Vector3, MutatedCrewEnemy> _factory;   // injectable seam (pool or Instantiate)

        int _spawned;
        float _timer;
        bool _running;
        bool _initialized;

        public int Spawned => _spawned;
        public bool IsComplete => _spawned >= waveCount;
        public event Action WaveComplete;

        void Awake() => EnsureInitialized();
        void EnsureInitialized()
        {
            if (_initialized) return;
            _initialized = true;
        }

        /// <summary>
        /// Wires the spawner explicitly so the runtime spawner AND EditMode tests can
        /// drive it without scene tags or real prefabs.
        /// </summary>
        public void Configure(
            Transform target,
            IReadOnlyList<Vector3> anchors,
            Func<Vector3, MutatedCrewEnemy> enemyFactory)
        {
            EnsureInitialized();
            _target = target;
            _anchors = anchors;
            _factory = enemyFactory;
        }

        public void Begin()
        {
            EnsureInitialized();
            _running = true;
            _timer = 0f;
        }

        void Update() => Step(Time.deltaTime);

        /// <summary>
        /// Advances the wave one step. Update forwards Time.deltaTime; tests drive it
        /// directly since Unity does not run Update on script-added components in EditMode.
        /// </summary>
        public void Step(float deltaSeconds)
        {
            EnsureInitialized();
            if (!_running || IsComplete || _factory == null) return;

            _timer -= deltaSeconds;
            if (_timer > 0f) return;

            SpawnOne();
            _timer = spawnInterval;

            if (IsComplete)
            {
                _running = false;
                WaveComplete?.Invoke();
            }
        }

        void SpawnOne()
        {
            var anchor = PickAnchor();
            var enemy = _factory(anchor);          // seam: pool or Instantiate, decided elsewhere
            enemy.Configure(_target, anchor);      // every spawned enemy is wired (guides/05 §7)
            _spawned++;
        }

        // Placement is behavior (ours): nearest anchor to the target. Pure function of inputs.
        Vector3 PickAnchor()
        {
            if (_anchors == null || _anchors.Count == 0) return transform.position;
            var best = _anchors[0];
            var bestSqr = float.MaxValue;
            var t = _target != null ? _target.position : transform.position;
            for (var i = 0; i < _anchors.Count; i++)
            {
                var sqr = (Flat(_anchors[i]) - Flat(t)).sqrMagnitude;   // flat + sqr (guides/03)
                if (sqr < bestSqr) { bestSqr = sqr; best = _anchors[i]; }
            }
            return best;
        }

        static Vector3 Flat(Vector3 p) => new Vector3(p.x, 0f, p.z);
    }
}
```

## 2. What's behavior vs numbers here

| Behavior (ours) | Number (game-balance-guardian's) |
|---|---|
| "spawn at intervals until the wave count is reached" | `spawnInterval`, `waveCount` |
| "spawn at the nearest anchor to the player" | how many anchors, where they sit |
| "fire `WaveComplete` when the field is drained" | inter-wave delay (Tier 1 multi-wave) |

`spawnInterval` and `waveCount` are `[SerializeField]` and flagged in comments — they exist so the spawner *works*, but they are not tuned here. Surface them.

## 3. The EditMode test (factory is the key)

The factory seam is what makes this testable with no prefabs and no `Update`:

```csharp
[Test]
public void Spawner_ReleasesWaveCount_OverTime_AndWiresEachEnemy()
{
    var player = new GameObject("Player");
    var spawner = new GameObject("WaveSpawner").AddComponent<WaveSpawner>();
    var anchors = new List<Vector3> { new(0, 0, 3), new(3, 0, 0) };

    var created = new List<MutatedCrewEnemy>();
    spawner.Configure(player.transform, anchors, anchor =>
    {
        var go = new GameObject("Enemy");
        go.transform.position = anchor;
        go.AddComponent<Health>();
        var e = go.AddComponent<MutatedCrewEnemy>();
        created.Add(e);
        return e;
    });

    spawner.Begin();
    // first step spawns immediately (timer starts at 0); then one per interval
    for (var i = 0; i < 12; i++) spawner.Step(2f);

    Assert.IsTrue(spawner.IsComplete);
    Assert.AreEqual(5, spawner.Spawned);                 // waveCount default
    Assert.AreEqual(5, created.Count, "Each spawn goes through the factory.");
    // each enemy is Configure-wired: stepping it makes it act on the target
    Assert.AreEqual(EnemyState.Chase, created[0].Step(0.1f));
}
```

The last assertion proves the spawned enemy was wired — its FSM acts on the injected target. A spawner that left enemies on the `Start` tag fallback would fail this in EditMode (no tagged scene), which is exactly the gap flagged in `guides/06 §4`.

## 4. Pooling handoff

`SpawnOne` calls `_factory(anchor)`, never `Instantiate`/`CreatePrimitive` directly. That's the seam: today the factory might `new GameObject` + `AddComponent`; tomorrow `mobile-game-perf-guardian` swaps in a pool's `Get()` — wave logic and tests don't change. Design the seam (ours); own the pool (theirs).

## 5. The raid is this spawner with count = 1, event-triggered

Per `guides/05 §6` and `guides/06`: `Tier0RaiderAssault` is the degenerate case — `Begin` is replaced by an event (`BeginAssault`), `waveCount = 1`. When you build waves, express the raid through this spawner rather than maintaining two spawn paths.
