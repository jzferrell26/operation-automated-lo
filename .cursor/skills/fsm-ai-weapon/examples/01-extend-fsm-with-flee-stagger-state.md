# Example 01 — Extending the FSM with a Flee / Stagger State

**Scope flag:** this is Tier 1+ forward design (new enemy behavior). It is shown the EditMode-safe way so that *when* it's built, it's built correctly. Do not add it to the gray-box ahead of the Tier 0 fun call (CLAUDE.md Hard Rule #1).

**Goal:** add a **Stagger** state to `MutatedCrewEnemy` — when the enemy takes a hit, it freezes briefly (can't move or attack), then resumes. This is the smallest possible new state and a perfect testability drill. We then sketch **Flee** as the next step.

## 1. The design (per `guides/01 §6`)

A new state must answer four questions:

| Question | Stagger |
|---|---|
| What enters it? | Taking damage (`Health.Changed` shows HP dropped) while alive |
| What does it do per `Step`? | Nothing but tick down a timer; suppress movement + attack |
| What exits it? | Timer reaches 0 → return to the *prior intent* (Chase if a target is in range, else Idle) |
| How does leash apply? | On exit it re-evaluates normally, so leash is respected the next step |

The stagger *duration* is a **number** → `game-balance-guardian`. The *state and its transitions* are ours.

## 2. The enum and field additions

```csharp
public enum EnemyState { Idle = 0, Chase = 1, Attack = 2, Return = 3, Stagger = 4 }

// new fields
[SerializeField] float staggerDuration = 0.4f;   // VALUE: surface to game-balance-guardian
float _staggerRemaining;
```

## 3. Wiring the entry trigger (testably)

The enemy already subscribes to `Health.Died` in `EnsureInitialized()` (`MutatedCrewEnemy.cs:52-55`). We add a subscription to a hit signal the same way, and we expose a public `Stagger()` entry point so a test can trigger it without a real damage event:

```csharp
void EnsureInitialized()
{
    if (_initialized) return;
    _health = GetComponent<Health>();
    _spawnPosition = transform.position;
    _initialized = true;
    if (_health != null)
    {
        _health.Died += OnDied;
        _health.Changed += OnHealthChanged;   // new
    }
}

// Health.Changed is Action<float, float> => (current, max) — see Core/Combat/Health.cs:18
float _lastHealth = -1f;
void OnHealthChanged(float current, float max)
{
    if (_lastHealth >= 0f && current < _lastHealth) Stagger();
    _lastHealth = current;
}

/// <summary>Public so the spawner and EditMode tests can trigger stagger directly.</summary>
public void Stagger()
{
    EnsureInitialized();
    if (_health.IsDead) return;
    _staggerRemaining = staggerDuration;
    _state = EnemyState.Stagger;
}
```

Don't forget the symmetric unsubscribe in `OnDestroy` (`-= OnHealthChanged`) — `guides/10 §7`.

## 4. The Stagger case in `Step`

Add the timer decrement near the cooldown decrement, and the case in the switch. Crucially, the Stagger check happens *before* the normal switch logic, and it suppresses action:

```csharp
public EnemyState Step(float deltaSeconds)
{
    EnsureInitialized();
    if (_health.IsDead || _player == null) return _state;
    if (_attackCooldownRemaining > 0f) _attackCooldownRemaining -= deltaSeconds;

    if (_state == EnemyState.Stagger)
    {
        _staggerRemaining -= deltaSeconds;
        if (_staggerRemaining > 0f) return _state;     // frozen: no move, no attack
        _state = EnemyState.Chase;                     // recover; next step re-evaluates range/leash
        // fall through to normal logic this same step
    }

    // ... existing distance/leash computation and switch unchanged ...
}
```

Note: on recovery we set Chase and let the *existing* Chase transitions decide Attack/Return next — we don't duplicate that logic. That keeps the new state a thin addition (Principle #6).

## 5. The EditMode test (model on `RuntimeEnemyTests`)

```csharp
[Test]
public void Enemy_Staggered_FreezesThenRecovers()
{
    var enemy = CreateEnemy(Vector3.zero, out var go);
    var player = CreatePlayer(new Vector3(0f, 0f, 5f), out _);
    enemy.Configure(player.transform, Vector3.zero);

    enemy.Step(0.1f);                       // idle -> chase
    var posBefore = go.transform.position;

    enemy.Stagger();                        // take a hit
    Assert.AreEqual(EnemyState.Stagger, enemy.Step(0.1f));     // still frozen (duration 0.4)
    Assert.AreEqual(posBefore, go.transform.position, "Staggered enemy must not move.");

    enemy.Step(0.4f);                       // timer elapses -> recover
    Assert.AreNotEqual(EnemyState.Stagger, enemy.State, "Should recover after stagger duration.");
}
```

This covers the four required branches (`guides/08 §4`): into Stagger (`Stagger()`), the freeze action (no movement), out of Stagger (recovery), and the guard (the timer). It uses only `Configure` + `Step` — no `Update`, no tags, no physics.

## 6. Flee, sketched (the next state)

Flee is Stagger's bigger sibling and follows the identical procedure:

- **Enter:** Chase/Attack when `_health.Current / _health.Max < fleeThreshold` (threshold = number → balance; `Health` exposes `Current` and `Max`, not a normalized helper — Core/Combat/Health.cs:13-14).
- **Step action:** `MoveTowards(-toPlayer.normalized, dt)` — steer *away* (reuse the existing `MoveTowards`, just negate direction).
- **Exit:** distance to player > a safe radius → Return; or health recovers → Chase.
- **Leash:** Flee still checks leash first (it could flee past the anchor — break to Return).
- **Test:** `Configure` a low-health enemy, `Step`, assert the gap to the player *grows* (mirror `Chase_MovesTowardThePlayer`, inverted).

Each new state is the same shape: design the four questions, add the case, write the `Step`-driven test, surface the numbers.

## 7. What we did NOT do

- We did not promote to state objects — at 5 states the enum-switch is still right (`guides/02 §2`).
- We did not hardcode `0.4f` anywhere we couldn't surface — it's a serialized field flagged for `game-balance-guardian`.
- We did not build it into the gray-box — it's Tier 1+ design.
