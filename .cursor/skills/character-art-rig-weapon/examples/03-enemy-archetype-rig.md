# Example 03 — Enemy Archetype Rig (Mutation & Raider)

**Invocation:** "Rig the enemies — give the mutation and the raider their look."

A worked design building both archetypes as **deltas off the one humanoid base** (`guides/06`), each consuming the existing `MutatedCrewEnemy` FSM. DESIGN; behavior stays `fsm-ai-guardian`'s, numbers stay `game-balance-guardian`'s.

---

## 1. One base, two deltas (Principle #3)

Both reuse the **one Humanoid avatar + one Animator** (`guides/01`/`02`). They differ only:

| | Mutation (melee swarm) | Raider (ranged/tactical) |
|---|---|---|
| Mesh | mutated body | survivor body |
| Material | discolored skin | gear/cloth |
| Attachments | claws (in-mesh) | gun on `Socket_HandR`, backpack on `Socket_Back` |
| Animator | base locomotion + melee clip | base locomotion + **upper-body aim layer** (masked) + fire clip |
| Avatar mask | none extra | upper-body mask for the aim layer (`guides/01`) |

No parallel rig. GDD §8/§13.

## 2. Consume `EnemyState`, don't drive it (lane boundary — `guides/06`)

`MutatedCrewEnemy` already runs the FSM (`EnemyState` at `:6`, `Step` at `:100`, `State` getter at `:34`). The animator driver **reads** state → clip; it sets no behavior numbers.

```csharp
// Reads the FSM, sets the Animator. Behavior is fsm-ai's; numbers are game-balance's.
public class EnemyAnimatorDriver : MonoBehaviour
{
    Animator _animator;
    MutatedCrewEnemy _enemy;
    bool _initialized;

    void Awake() => EnsureInitialized();
    void EnsureInitialized() { if (_initialized) return; _initialized = true; }

    public void Configure(MutatedCrewEnemy enemy, Animator animator)
    {
        EnsureInitialized();
        _enemy = enemy; _animator = animator;
    }

    void Update() => Tick();

    // Deterministic: a test steps enemy.Step(dt) then calls Tick() and asserts params.
    public void Tick()
    {
        EnsureInitialized();
        if (_animator == null || _enemy == null) return;
        var s = _enemy.State;                                  // public getter :34
        _animator.SetBool("Moving", s == EnemyState.Chase || s == EnemyState.Return);
        _animator.SetBool("Attacking", s == EnemyState.Attack);
    }
}
```

This mirrors `RuntimeEnemyTests`: step `MutatedCrewEnemy.Step(dt)`, then `Tick()`, assert the params — EditMode-safe (Hard Rule #11, `ARCHITECTURE.md` §7).

## 3. The attack frame → feel handoff (`guides/07`)

The melee/fire clip carries an Animation Event (`OnAttackHitFrame` / `OnFireFrame`) at the connect frame. **You place it; `game-feel-juice-guardian` spends it** (hitstop/VFX) and the gameplay damage authority stays in the FSM (`TryAttack` `:199`). Don't relocate the damage decision into the event silently.

## 4. Forward (Tier-later) — non-humanoids

GDD §8 also lists drones (non-humanoid → **Generic** rig, separate), a heavy mutation/mech boss, and fast fauna. **Flag these as their own future rigs** — design the humanoid archetypes now; don't fork the pipeline pre-emptively (Principle #7).

## 5. Handoff

"Two archetypes off one base: mesh/material/attachment/Animator deltas, all consuming the existing FSM. Behavior is fsm-ai's, numbers are game-balance's, the hit feel is game-feel's, and the final look is yours (§7)."

## Cross-Guardian
Transitions/perception → `fsm-ai-guardian`; `detectRadius`/`attackDamage`/cadence → `game-balance-guardian`; hit feel → `game-feel-juice-guardian`; per-agent skinning/pooling cost → `mobile-game-perf-guardian`.
