// Template: a new enemy MonoBehaviour for PROJECT-DRIFT.
//
// Models the EditMode-safe shape of MutatedCrewEnemy (CLAUDE.md Hard Rule #11):
//   1. Lazy init  — EnsureInitialized() guarded by a flag, called from Awake AND every entry point.
//   2. Configure() — dependencies injected, not resolved only in Start/tags.
//   3. Extracted Step(deltaSeconds) — all frame logic; Update just forwards Time.deltaTime;
//      Step RETURNS the resulting state so EditMode tests can assert on it.
//
// BEHAVIOR is yours (transitions, steering shape). Every [SerializeField] VALUE below is a
// tunable -> surface it to game-balance-guardian; the defaults exist only so it runs.
//
// Copy, rename, delete the states you don't need. Keep the three patterns intact.

using Drift.Core.Combat;
using UnityEngine;

namespace Drift.Gameplay.AI
{
    public enum TemplateEnemyState
    {
        Idle = 0,
        Chase = 1,
        Attack = 2,
        Return = 3
        // Add states here (e.g. Stagger, Flee, Search). See guides/01 §6 + examples/01.
    }

    [RequireComponent(typeof(Health))]
    public class TemplateEnemy : MonoBehaviour
    {
        // --- VALUES: tunables. Surface every one to game-balance-guardian. ---
        [SerializeField] float detectRadius = 10f;
        [SerializeField] float leashRadius = 16f;   // INVARIANT: must exceed detectRadius (guides/03 §3)
        [SerializeField] float moveSpeed = 3.5f;
        [SerializeField] float attackRange = 1.4f;
        [SerializeField] float attackDamage = 12f;
        [SerializeField] float attackCooldown = 1.2f;
        [SerializeField] float attackHysteresis = 1.25f;   // band to prevent Attack<->Chase thrash (guides/10 §2)

        // --- runtime state ---
        Transform _target;
        Vector3 _spawnPosition;
        TemplateEnemyState _state = TemplateEnemyState.Idle;
        float _attackCooldownRemaining;
        Health _health;
        bool _initialized;

        public TemplateEnemyState State => _state;

        void Awake() => EnsureInitialized();

        // Pattern 1: lazy init. Idempotent; safe to call from anywhere.
        void EnsureInitialized()
        {
            if (_initialized) return;
            _health = GetComponent<Health>();
            _spawnPosition = transform.position;
            _initialized = true;
            if (_health != null) _health.Died += OnDied;
        }

        void OnDestroy()
        {
            // Symmetric unsubscribe (guides/10 §7). Add a -= for every += you introduce.
            if (_health != null) _health.Died -= OnDied;
        }

        // Production fallback only. Tests/spawner use Configure (Pattern 2). Never the sole path.
        void Start()
        {
            if (_target != null) return;
            var player = GameObject.FindGameObjectWithTag("Player");
            if (player != null) _target = player.transform;
        }

        // Pattern 2: explicit dependency injection.
        public void Configure(Transform target, Vector3 spawnPosition)
        {
            EnsureInitialized();
            _target = target;
            _spawnPosition = spawnPosition;
        }

        void Update() => Step(Time.deltaTime);

        // Pattern 3: extracted deterministic step. Returns the resulting state for tests.
        public TemplateEnemyState Step(float deltaSeconds)
        {
            EnsureInitialized();
            if (_health.IsDead || _target == null) return _state;

            if (_attackCooldownRemaining > 0f) _attackCooldownRemaining -= deltaSeconds;

            var toTarget = Flat(_target.position) - Flat(transform.position);
            var distance = toTarget.magnitude;
            var leashDistance = FlatDistance(_spawnPosition, transform.position);

            switch (_state)
            {
                case TemplateEnemyState.Idle:
                    if (distance <= detectRadius) _state = TemplateEnemyState.Chase;
                    break;

                case TemplateEnemyState.Chase:
                    if (leashDistance > leashRadius) { _state = TemplateEnemyState.Return; break; }  // leash FIRST
                    if (distance <= attackRange) { _state = TemplateEnemyState.Attack; break; }
                    MoveTowards(toTarget.normalized, deltaSeconds);                                   // decide, then act
                    break;

                case TemplateEnemyState.Attack:
                    if (leashDistance > leashRadius) { _state = TemplateEnemyState.Return; break; }
                    if (distance > attackRange * attackHysteresis) { _state = TemplateEnemyState.Chase; break; }
                    Face(toTarget);
                    TryAttack();
                    break;

                case TemplateEnemyState.Return:
                    var toSpawn = Flat(_spawnPosition) - Flat(transform.position);
                    if (toSpawn.magnitude <= 0.25f) { _state = TemplateEnemyState.Idle; break; }
                    MoveTowards(toSpawn.normalized, deltaSeconds);
                    break;
            }

            return _state;
        }

        void MoveTowards(Vector3 direction, float deltaSeconds)
        {
            if (direction.sqrMagnitude <= 0.0001f) return;
            transform.position += direction * (moveSpeed * deltaSeconds);   // direct steering (guides/04)
            Face(direction);
        }

        void Face(Vector3 direction)
        {
            if (direction.sqrMagnitude <= 0.0001f) return;
            transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
        }

        void TryAttack()
        {
            if (_attackCooldownRemaining > 0f) return;
            if (!_target.TryGetComponent<Health>(out var targetHealth))
                targetHealth = _target.GetComponentInParent<Health>();
            if (targetHealth == null || targetHealth.IsDead) return;
            targetHealth.TakeDamage(attackDamage);
            _attackCooldownRemaining = attackCooldown;
        }

        void OnDied() => DestroyObject(gameObject, 0.1f);

        // Play-mode-aware destroy (ARCHITECTURE.md §7): bare Destroy is illegal in EditMode.
        static void DestroyObject(Object target, float delay)
        {
            if (target == null) return;
            if (Application.isPlaying) Destroy(target, delay);
            else DestroyImmediate(target);
        }

        // Top-down: flatten before measuring so vertical offset can't pollute aggro (guides/03 §2).
        static Vector3 Flat(Vector3 p) => new Vector3(p.x, 0f, p.z);
        static float FlatDistance(Vector3 a, Vector3 b) => Vector3.Distance(Flat(a), Flat(b));
    }
}
