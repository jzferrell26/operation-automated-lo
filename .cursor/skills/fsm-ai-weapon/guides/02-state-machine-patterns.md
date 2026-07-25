# 02 — State-Machine Patterns (enum-switch vs state objects)

The structural question: how do you *hold* the state machine in code? DRIFT's answer today is enum-switch, and for Tier 0 that is correct. This guide is the decision framework for when — and only when — to change it.

## 1. The three patterns

### A. Enum-switch (DRIFT's current pattern)

State is an enum field; `Step` is one `switch`. `MutatedCrewEnemy.cs:120` is the reference. All logic is in one method, all transitions visible at a glance, trivially steppable.

```csharp
switch (_state)
{
    case EnemyState.Idle:   /* guard + transition */ break;
    case EnemyState.Chase:  /* guards + action */    break;
    // ...
}
```

**Best for:** 3–6 states, little shared entry/exit work, one author. **This is the default. Stay here until you have a concrete reason to leave.**

### B. State objects (one class per state, polymorphic)

Each state is an object implementing `Enter`/`Tick`/`Exit`; a context owns the current one and swaps references on transition. The reusable shape lives in `templates/state-machine.cs`.

```csharp
public interface IEnemyState
{
    void Enter(EnemyContext ctx);
    IEnemyState Tick(EnemyContext ctx, float dt);   // returns next state (or self)
    void Exit(EnemyContext ctx);
}
```

**Best for:** many states (8+), real per-state entry/exit work (timers, target re-selection on enter), states reused across archetypes. **Cost:** more files, indirection, and you must keep `Tick(ctx, dt)` deterministic and `Configure`-fed exactly as the enum-switch was, or you lose EditMode-testability.

### C. Hierarchical FSM (HFSM) — superstates

States grouped under a parent (e.g. a "Combat" superstate containing Chase/Attack/Flee, all sharing the leash check). Useful when several states share a guard. **For DRIFT this is Tier-later and almost certainly overkill** — see `guides/09-behavior-trees-when-justified.md`, which applies equally to HFSM. Note it; don't reach for it.

## 2. The decision rubric

Promote from enum-switch to state objects only when **two or more** of these are true:

1. **State count > ~6** and the `switch` no longer fits on a screen.
2. **Real shared entry/exit work** — multiple states need "on entering, pick a direction / start a timer / clear a flag" rather than carrying it in fields.
3. **States are reused across archetypes** — a Flee or Stagger that both the mutation and the raider share verbatim.
4. **The `switch` is becoming a merge-conflict magnet** because several features touch different cases.

One of these alone? Stay enum-switch and absorb it. Premature promotion is a should-refactor *against you* — it makes the FSM harder to step and read for no payoff (Principle #5).

## 3. The non-negotiable constraint on every pattern

Whatever the pattern, the EditMode contract (Hard Rule #2) holds identically:

- **Lazy init** — `EnsureInitialized()` guards state regardless of whether it lives in a field or a state object.
- **`Configure(...)`** — dependencies are injected; the context object is `Configure`-fed exactly as `MutatedCrewEnemy.Configure(player, spawn)` is (`MutatedCrewEnemy.cs:84`).
- **Extracted step** — enum-switch `Step(dt)` or state-object `ctx.Tick(dt)`; `Update` only forwards `Time.deltaTime`.

A state-object machine that calls `Time.deltaTime` *inside* a state, or resolves its target via `FindGameObjectWithTag` *inside* `Enter`, has thrown away testability. The whole point of the pattern migration is to keep — not lose — the green suite. `templates/state-machine.cs` is written to preserve all three; if you hand-roll one, check it against that template.

## 4. What does NOT justify a pattern change

- **"It would be cleaner."** Cleanliness at four states is the enum-switch.
- **"We might add states later."** Add them as `case`s; promote when the rubric trips, not in anticipation (Principle #8 — tier discipline; don't build ahead).
- **"Behavior trees are more modern."** Modern isn't the goal; testable-and-fun is. See `guides/09`.

## 5. Migration shape (if the rubric genuinely trips)

When you do migrate, do it as a behavior-preserving refactor with the suite as the safety net:

1. Keep `MutatedCrewEnemy`'s public surface (`State`, `Configure`, `Step`) identical so `RuntimeEnemyTests` still compiles and passes — the tests are the proof the refactor preserved behavior.
2. Move each `case` body into an `IEnemyState.Tick` verbatim first; refactor *after* green.
3. Carry `_attackCooldownRemaining` and the leash check into the shared context, not duplicated per state.
4. Run the EditMode suite; it must stay green with no test edits. If a test needs editing to pass, you changed behavior — stop and review.

A pattern change that requires rewriting `RuntimeEnemyTests` is not a refactor; it's a redesign, and it needs an ADR (`library/architecture/ADR-<n>-state-machine-pattern.md`).
