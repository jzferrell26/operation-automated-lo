// Template: a reusable, EditMode-steppable state-object machine for PROJECT-DRIFT.
//
// USE THIS ONLY when the enum-switch (see templates/fsm-enemy.cs) has outgrown itself —
// the rubric in guides/02 §2: >6 states AND real shared entry/exit work, OR states reused
// across archetypes. At four states the enum-switch is correct; do not promote prematurely.
//
// The whole point of this template is to keep Hard Rule #11 intact under the new pattern:
//   - The context is Configure-fed (Pattern 2).
//   - The machine ticks from ONE extracted Step(deltaSeconds) (Pattern 3) that Update forwards.
//   - States never call Time.deltaTime, FindGameObjectWithTag, or Physics directly — they read
//     from the context, which holds injected dependencies and seams.
//
// If your states do any of those forbidden things, you've lost testability — see guides/08.

using System;
using Drift.Core.Combat;
using UnityEngine;

namespace Drift.Gameplay.AI
{
    // --- The blackboard: everything a state needs, injected via Configure. ---
    public sealed class EnemyContext
    {
        public Transform Self;
        public Transform Target;
        public Vector3 SpawnPosition;
        public Health Health;

        // Tunables live here so states read them but balance owns them. Surface to game-balance-guardian.
        public float MoveSpeed = 3.5f;
        public float DetectRadius = 10f;
        public float LeashRadius = 16f;        // invariant: > DetectRadius
        public float AttackRange = 1.4f;

        // Physics seams (guides/08 §5): default to real raycasts in play, override in tests.
        public Func<Vector3, Vector3, bool> HasLineOfSight = (_, _) => true;

        public float FlatDistanceToTarget()
        {
            if (Target == null) return float.MaxValue;
            return Vector3.Distance(Flat(Self.position), Flat(Target.position));
        }

        public float FlatDistanceFromSpawn() => Vector3.Distance(Flat(Self.position), Flat(SpawnPosition));

        public void MoveTowards(Vector3 target, float dt)
        {
            var dir = Flat(target) - Flat(Self.position);
            if (dir.sqrMagnitude <= 0.0001f) return;
            dir.Normalize();
            Self.position += dir * (MoveSpeed * dt);
            Self.rotation = Quaternion.LookRotation(dir, Vector3.up);
        }

        public static Vector3 Flat(Vector3 p) => new Vector3(p.x, 0f, p.z);
    }

    // --- A state: Enter/Tick/Exit. Tick returns the NEXT state (or itself to stay). ---
    public interface IEnemyState
    {
        void Enter(EnemyContext ctx);
        IEnemyState Tick(EnemyContext ctx, float dt);   // pure-ish: (ctx, dt) -> next state
        void Exit(EnemyContext ctx);
    }

    // --- The machine. Configure-fed, single Step entry, swaps state objects on transition. ---
    public sealed class EnemyStateMachine : MonoBehaviour
    {
        EnemyContext _ctx;
        IEnemyState _current;
        bool _initialized;

        public string CurrentStateName => _current?.GetType().Name ?? "<none>";

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized) return;
            _initialized = true;
        }

        // Pattern 2: inject the context + the initial state.
        public void Configure(EnemyContext ctx, IEnemyState initial)
        {
            EnsureInitialized();
            _ctx = ctx;
            Transition(initial);
        }

        void Update() => Step(Time.deltaTime);

        // Pattern 3: the single deterministic tick. Tests call this directly.
        public void Step(float dt)
        {
            EnsureInitialized();
            if (_ctx == null || _current == null) return;
            var next = _current.Tick(_ctx, dt);
            if (next != null && next != _current) Transition(next);
        }

        void Transition(IEnemyState next)
        {
            _current?.Exit(_ctx);
            _current = next;
            _current.Enter(_ctx);
        }
    }

    // --- Example states. Note leash is checked FIRST in any pursuing state (guides/01 §2). ---

    public sealed class IdleState : IEnemyState
    {
        readonly ChaseState _chase = new();
        public void Enter(EnemyContext ctx) { }
        public IEnemyState Tick(EnemyContext ctx, float dt)
            => ctx.FlatDistanceToTarget() <= ctx.DetectRadius ? _chase : this;
        public void Exit(EnemyContext ctx) { }
    }

    public sealed class ChaseState : IEnemyState
    {
        readonly ReturnState _return = new();
        public void Enter(EnemyContext ctx) { }
        public IEnemyState Tick(EnemyContext ctx, float dt)
        {
            if (ctx.FlatDistanceFromSpawn() > ctx.LeashRadius) return _return;   // leash first
            if (ctx.FlatDistanceToTarget() <= ctx.AttackRange) return this;       // (swap to an AttackState)
            ctx.MoveTowards(ctx.Target.position, dt);
            return this;
        }
        public void Exit(EnemyContext ctx) { }
    }

    public sealed class ReturnState : IEnemyState
    {
        readonly IdleState _idle = new();
        public void Enter(EnemyContext ctx) { }
        public IEnemyState Tick(EnemyContext ctx, float dt)
        {
            if (ctx.FlatDistanceFromSpawn() <= 0.25f) return _idle;
            ctx.MoveTowards(ctx.SpawnPosition, dt);
            return this;
        }
        public void Exit(EnemyContext ctx) { }
    }
}
