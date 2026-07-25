// Template: an EditMode-steppable enemy/wave spawner for PROJECT-DRIFT.
//
// SCOPE: waves are Tier 1+ (GDD §13). This is the correct SHAPE to build when the time comes;
// do not add it to the Tier 0 gray-box ahead of the "is it fun?" call (CLAUDE.md Hard Rule #1).
//
// Holds the same contract as every DRIFT system (Hard Rule #11):
//   1. Lazy init (EnsureInitialized).
//   2. Configure(...) — inject target, anchors, and an enemy FACTORY (the pooling seam).
//   3. Extracted Step(deltaSeconds) — wave timing; Update only forwards Time.deltaTime.
//
// BEHAVIOR is yours (cadence shape, placement). VALUES (interval, count, ramp) -> game-balance-guardian.
// POOLING behind the factory seam -> mobile-game-perf-guardian. See guides/05 + examples/02.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Drift.Gameplay.AI
{
    public class EnemySpawner : MonoBehaviour
    {
        // VALUES: surface to game-balance-guardian. Defaults exist only so it runs.
        [SerializeField] int waveCount = 5;
        [SerializeField] float spawnInterval = 2f;

        Transform _target;
        IReadOnlyList<Vector3> _anchors;
        Func<Vector3, MutatedCrewEnemy> _factory;   // SEAM: pool.Get() or Instantiate, decided elsewhere

        int _spawned;
        float _timer;
        bool _running;
        bool _initialized;

        public int Spawned => _spawned;
        public bool IsComplete => _spawned >= waveCount;
        public event Action WaveComplete;

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; _initialized = true; }

        // Pattern 2. The factory is what keeps this testable (no prefabs) and poolable.
        public void Configure(Transform target, IReadOnlyList<Vector3> anchors, Func<Vector3, MutatedCrewEnemy> enemyFactory)
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
            _timer = 0f;   // first Step spawns immediately
        }

        void Update() => Step(Time.deltaTime);

        // Pattern 3.
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
            var enemy = _factory(anchor);        // SEAM — never Instantiate/CreatePrimitive directly in Step
            enemy.Configure(_target, anchor);    // every spawned enemy is wired, not left on the Start tag fallback
            _spawned++;
        }

        // Placement is behavior (ours): nearest anchor to the target. Pure function of inputs.
        Vector3 PickAnchor()
        {
            if (_anchors == null || _anchors.Count == 0) return transform.position;
            var t = _target != null ? _target.position : transform.position;
            var best = _anchors[0];
            var bestSqr = float.MaxValue;
            for (var i = 0; i < _anchors.Count; i++)
            {
                var sqr = (Flat(_anchors[i]) - Flat(t)).sqrMagnitude;   // flat + sqr (guides/03, guides/04)
                if (sqr < bestSqr) { bestSqr = sqr; best = _anchors[i]; }
            }
            return best;
        }

        static Vector3 Flat(Vector3 p) => new Vector3(p.x, 0f, p.z);
    }
}
