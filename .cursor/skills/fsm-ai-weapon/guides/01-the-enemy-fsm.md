# 01 — The Enemy FSM (idle → chase → attack → return)

The canonical loop, anchored line-by-line on the real code. Read `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` open beside this guide.

## 1. The four states

`MutatedCrewEnemy` declares them as a flat enum (`MutatedCrewEnemy.cs:6-12`):

```csharp
public enum EnemyState { Idle = 0, Chase = 1, Attack = 2, Return = 3 }
```

This matches the GDD's prescribed shape exactly: "simple FSM (idle → detect → chase → attack → return)" (GDD §8). The "detect" step isn't a state — it's the Idle→Chase *transition condition*. That is the right call: detection is a guard on a transition, not a place the agent dwells.

| State | Meaning | Exits to |
|---|---|---|
| **Idle** | Standing at spawn, scanning for a target | Chase (target within detect radius) |
| **Chase** | Steering toward the target | Attack (in range), Return (past leash) |
| **Attack** | In range, swinging on cooldown, facing target | Chase (target stepped out), Return (past leash) |
| **Return** | Steering back to spawn anchor | Idle (arrived) |

## 2. The transition table (what fires when)

This is the heart of what `fsm-ai-guardian` owns — the *conditions*, not the numbers in them. From `MutatedCrewEnemy.Step` (`MutatedCrewEnemy.cs:120-173`):

| From | Guard (condition) | To |
|---|---|---|
| Idle | `distance <= detectRadius` | Chase |
| Chase | `leashDistance > leashRadius` | Return |
| Chase | `distance <= attackRange` | Attack |
| Attack | `leashDistance > leashRadius` | Return |
| Attack | `distance > attackRange * 1.25f` | Chase |
| Return | `toSpawn.magnitude <= 0.25f` | Idle |

Two design decisions worth internalizing:

- **Leash is checked first in both Chase and Attack.** Breaking off always wins over engaging. This is what keeps an enemy from being dragged across the zone (Principle #4). If you add a state that pursues the player, it inherits this obligation.
- **Attack→Chase uses `attackRange * 1.25f`, not `attackRange`.** That `1.25` hysteresis band is deliberate: without it, an enemy hovering exactly at the range boundary thrashes Attack↔Chase every frame. **The multiplier is structural (yours); its exact size is tunable (`game-balance-guardian`'s).** See `guides/10-ai-failure-modes.md` on state-thrash.

## 3. The deterministic step

`Step(float deltaSeconds)` (`MutatedCrewEnemy.cs:100`) is the whole behavior, extracted from `Update`:

```csharp
void Update() { Step(Time.deltaTime); }

public EnemyState Step(float deltaSeconds)
{
    EnsureInitialized();
    if (_health.IsDead || _player == null) return _state;   // guard
    if (_attackCooldownRemaining > 0f) _attackCooldownRemaining -= deltaSeconds;
    // ... compute distance, leashDistance ...
    switch (_state) { /* transitions + per-state action */ }
    return _state;
}
```

Three properties make this testable (the reason the suite is green):

1. **`EnsureInitialized()` at the top** — state is ready even though `Awake` never ran in EditMode (`MutatedCrewEnemy.cs:41-56`).
2. **No reliance on `Update`** — tests call `Step(0.1f)` directly (`RuntimeEnemyTests.cs:39`).
3. **`Step` returns the resulting state** — tests assert on the return value: `Assert.AreEqual(EnemyState.Chase, enemy.Step(0.1f));`.

When you add a state, preserve all three. A new transition that you cannot assert by calling `Step` and reading the return is, by definition, untestable (Hard Rule #2).

## 4. Per-state actions vs transitions

Keep them separate inside each `case`:

- **Transition logic** mutates `_state` and `break`s.
- **Action logic** (`MoveTowards`, `Face`, `TryAttack`) runs only if no transition fired.

In Chase, the leash and range checks come first and `break`; only if neither fires does `MoveTowards(toPlayer.normalized, deltaSeconds)` run (`MutatedCrewEnemy.cs:130-144`). This ordering — *decide, then act* — is what makes each `Step` a clean function of (state, world) → (new state, side-effects). Don't interleave them.

## 5. Entry/exit work

The enum-switch FSM has no explicit OnEnter/OnExit hooks — it doesn't need them at four states. The one piece of "exit" work, the attack cooldown, is carried as a field (`_attackCooldownRemaining`) decremented every `Step` and reset in `TryAttack` (`MutatedCrewEnemy.cs:217`). When entry/exit work starts to pile up (a flee state that needs to pick a direction *on entry*, a stagger that needs a timer), that's the signal to consider state objects — see `guides/02-state-machine-patterns.md`.

## 6. Extending the loop (forward design — Tier 1+)

The GDD's enemy roster (GDD §13: "enemy variety") implies states this Tier 0 enemy doesn't have. Design them as *additions to the same switch*, each leashed and each testable:

- **Flee** — low-health melee breaking contact; entered from Attack/Chase on a health threshold, steers *away* from the target, returns to Idle/Chase when recovered. Worked through in `examples/01-extend-fsm-with-flee-stagger-state.md`.
- **Stagger** — a brief stunned state on taking a hit; a timer-driven state that suppresses movement and attack, then returns to the prior intent.
- **Search** — for raiders that lose line-of-sight; move to last-known position, scan, then Return.
- **Alert** — a telegraph beat before Chase (feel is `game-feel-juice-guardian`'s; the *state* is yours).

Each new state must answer: what enters it, what it does per `Step`, what exits it, and how leash still applies. If it can't answer all four, it isn't designed yet.

## 7. Review checklist for any FSM change

- [ ] New transition is reachable and assertable via `Step` (Hard Rule #2).
- [ ] Any pursuing state still respects the leash (Principle #4).
- [ ] Boundary transitions have hysteresis or a clear reason they can't thrash (`guides/10`).
- [ ] Decide-then-act ordering preserved inside each `case`.
- [ ] No new magic number introduced into logic — tunables surfaced to `game-balance-guardian`.
- [ ] A failing-then-passing EditMode test accompanies the change (`examples/03`).
