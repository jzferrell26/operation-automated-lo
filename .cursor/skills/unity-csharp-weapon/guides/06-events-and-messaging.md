# 06 — Events and Messaging

Drift's loop is event-driven, not poll-driven. State changes broadcast via C# `event Action`; subscribers react. This is `ARCHITECTURE.md` §5 ("Event flow is C# events, not polling").

## The Drift event catalog

These are the events the spine already exposes. Know them; wire to them; don't reinvent them.

| Publisher | Event | Fires when |
|---|---|---|
| `Health` | `event Action Died` | HP hits 0 (`Health.cs:17`) |
| `Health` | `event Action<float,float> Changed` | HP changes — `(current, max)` (`Health.cs:18`) |
| `SurvivalMeter` | `event Action Depleted` | meter crosses 0, **once** (`SurvivalMeter.cs:17`) |
| `SalvageInventory` | `event Action Changed` | items added/removed (`SalvageInventory.cs:15`) |
| `HullBreachEvent` | `BreachActivated` / `BreachSealed` | raid vents / welder seals the deck (`ARCHITECTURE.md` §5) |
| `Tier0RaiderAssault` | `AssaultCompleted` | breach sealed, raid survived (`ARCHITECTURE.md` §5) |

The objective tracker and loop controller subscribe to these in their `Configure` and drive the whole Tier 0 loop off them (`ARCHITECTURE.md` §5): `Health.Changed` → `TookEnemyHit`; `HullBreachEvent.BreachSealed` → `RecordRaidSurvived`; etc.

## Why events, not polling

Compare the two ways the objective tracker could learn "the player took a hit":

```csharp
// POLLING — wrong. Re-checks every frame, needs to remember last value, races the loop.
void Update() {
    if (playerHealth.Current < _lastHealth) objectiveTracker.TookEnemyHit();
    _lastHealth = playerHealth.Current;
}

// EVENT — right. Fires exactly when it happens, once, no per-frame cost.
health.Changed += (current, max) => objectiveTracker.TookEnemyHit();
```

Polling re-introduces ordering bugs (who runs first this frame?), wastes frames, and forces every observer to cache last-known state. Events fire at the moment of change. Polling where a Drift event already exists is a **should-refactor**.

## The "fire once" discipline

`SurvivalMeter.Tick` guards against re-firing `Depleted`:

```csharp
var wasDepleted = IsDepleted;
current = Mathf.Max(0f, current - drainPerSecond * deltaSeconds);
if (!wasDepleted && IsDepleted) Depleted?.Invoke();   // edge, not level
```

Events should fire on the **edge** (the transition), not the **level** (the ongoing state). `Depleted` fires the frame the meter *reaches* 0, not every frame it *stays* at 0. When you add an event, ask: am I broadcasting a transition or a condition? Broadcast transitions.

## Subscribe / unsubscribe symmetry (the leak rule)

Every `+=` needs a matching `-=`, or you get a leak and eventually a `MissingReferenceException` when the destroyed subscriber's handler fires. The Drift rule:

```csharp
void EnsureInitialized()      // or Configure(...)
{
    _meter.Depleted += OnOxygenDepleted;
    _health.Died += OnDied;       // (MutatedCrewEnemy)
}

void OnDestroy()
{
    if (_meter != null)  _meter.Depleted -= OnOxygenDepleted;
    if (_health != null) _health.Died   -= OnDied;
}
```

See `OxygenSystem.OnDestroy` (`:67`) and `MutatedCrewEnemy.OnDestroy` (`:58`). An unpaired subscription is a **must-fix** (event leak). Null-guard the unsubscribe — the publisher may have been destroyed first.

## The `?.Invoke()` null-conditional

Always raise an event with the null-conditional operator: `Changed?.Invoke(current, max);`. With zero subscribers the backing delegate is `null`; a bare `Changed.Invoke(...)` throws `NullReferenceException`. Drift does this consistently (`Health.Changed?.Invoke`, `SurvivalMeter.Depleted?.Invoke`, `SalvageInventory.Changed?.Invoke`). A raised event without `?.` is a **must-fix**.

## When a direct call beats an event

Events are for **one-to-many, fire-and-forget** notification where the publisher shouldn't know its observers. Use a **direct method call** when:

- There's exactly one known collaborator and a clear ownership line. `OxygenSystem.Tick` calls `_health.TakeDamage(...)` directly — it owns that relationship; an event would be ceremony (`OxygenSystem.cs:105`).
- You need a **return value** or back-pressure. `SuitPowerSystem.TryConsumeSprint(dt)` returns a `bool` the controller acts on immediately — an event can't return "did it work?" (`TopDownPlayerController.cs:99`).
- Ordering must be deterministic and synchronous (the extracted `Tick`/`Step` chain).

Don't event-ify everything. An event where a direct call is clearer is over-engineering (a mild **should-refactor**).

## Avoid `SendMessage` and string-based messaging

Unity's `SendMessage`/`BroadcastMessage` resolve handlers by **string method name** at runtime: no compile-time safety, slow, and invisible to refactoring tools. Drift uses none of it and neither should new code. If you find `SendMessage`, replace it with a typed C# event or a `Configure`-injected reference — **should-refactor**.

## Findings to raise

- **Must-fix:** an event raised without `?.Invoke`; a subscription without a matching unsubscribe in `OnDestroy`/`OnDisable`.
- **Should-refactor:** polling a value every frame when a Drift event already broadcasts the change; `SendMessage`/`BroadcastMessage`/string-based messaging; an event firing on level instead of edge; over-eventing a single-collaborator relationship that wants a direct call.
- **Note:** dropping the `OxygenSystem`→`Health` suffocation link while reworking events is a **must-fix** (Hard Rule #6 — oxygen is the signature meter).
