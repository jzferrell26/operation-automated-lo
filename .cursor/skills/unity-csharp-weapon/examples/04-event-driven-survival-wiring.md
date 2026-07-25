# Example 04 — Event-driven survival wiring

Goal: trace how the signature oxygen meter (Hard Rule #6) is wired end-to-end with **events and direct calls**, not polling — and show how `LifeSupportZone` flips drain on/off. This is the real Drift wiring (`OxygenSystem`, `SurvivalMeter`, `Health`, `LifeSupportZone`), read as an architecture lesson.

## The pieces

- `SurvivalMeter` — a plain `[Serializable]` value object with `Tick`, `Restore`, and an `event Action Depleted` (`Core/Survival/SurvivalMeter.cs`).
- `OxygenSystem` — wraps a meter, drains it, and damages `Health` on depletion (`Core/Survival/OxygenSystem.cs`).
- `Health` — HP with `Changed`/`Died` events (`Core/Combat/Health.cs`).
- `LifeSupportZone` — a trigger volume that pauses drain and refills inside a powered hull (`Core/Survival/LifeSupportZone.cs`).

## Wiring 1 — meter depletion is an EVENT (edge, fires once)

`OxygenSystem` subscribes to its meter's `Depleted` event in lazy-init:

```csharp
void EnsureInitialized()
{
    _meter = new SurvivalMeter(maxOxygen, maxOxygen);
    _meter.Depleted += OnOxygenDepleted;     // subscribe
    _health = GetComponent<Health>();
    _initialized = true;
}

void OnDestroy()
{
    if (_meter != null) _meter.Depleted -= OnOxygenDepleted;   // symmetric unsubscribe
}
```

And `SurvivalMeter.Tick` fires `Depleted` on the **edge**, exactly once:

```csharp
var wasDepleted = IsDepleted;
current = Mathf.Max(0f, current - drainPerSecond * deltaSeconds);
if (!wasDepleted && IsDepleted) Depleted?.Invoke();    // transition, null-conditional
```

No subscriber polls "is the meter empty?" every frame — the meter announces the moment it crosses zero (`06-events-and-messaging.md`).

## Wiring 2 — suffocation is a DIRECT CALL (single collaborator, returns nothing)

When depleted, `OxygenSystem.Tick` damages `Health` directly — not via an event:

```csharp
public void Tick(float deltaSeconds)
{
    EnsureInitialized();
    if (deltaSeconds <= 0f) return;
    if (drainEnabled) _meter.Tick(deltaSeconds, drainPerSecond);
    if (_health == null) _health = GetComponent<Health>();
    if (_meter.IsDepleted && _health != null && !_health.IsDead)
        _health.TakeDamage(suffocationDamagePerSecond * deltaSeconds);   // direct
}
```

Why a direct call here and an event above? `OxygenSystem` *owns* this relationship — it knows exactly one `Health` and there's nothing for an event to decouple. An event would be ceremony (`06-events-and-messaging.md`, "when a direct call beats an event"). The `Depleted` event, by contrast, is for *anyone* who cares about empty oxygen (a HUD warning, an SFX cue) without `OxygenSystem` knowing about them.

This direct link is the **signature mechanic** (Hard Rule #6): O2 → suffocation → Health. Architecture changes must not drop it — dropping it is a **must-fix**.

## Wiring 3 — `Health.Changed` fans out to the loop (one-to-many event)

`Health` broadcasts every HP change as `Changed?.Invoke(current, max)` (`Health.cs:46`). The Tier 0 objective tracker subscribes to it to record "took an enemy hit" — one of the four extraction gates (`ARCHITECTURE.md` §5):

```csharp
// conceptual — Tier0ObjectiveTracker.Configure wires this
playerHealth.Changed += (current, max) => objectiveTracker.TookEnemyHit();
```

This is the one-to-many case: `Health` doesn't know the objective tracker exists; the tracker reacts to the edge. Polling the player's HP each frame to detect a hit would re-introduce ordering bugs and per-frame cost (`06-events-and-messaging.md`).

## Wiring 4 — `LifeSupportZone` flips drain via component lookup

The powered deck pauses oxygen drain and recharges suit power for whatever enters its trigger, resolved with `TryGetComponent` (no event needed — it's a spatial fact, checked on trigger callbacks):

```csharp
// LifeSupportZone.ApplyLifeSupport
var hasOxygen = target.TryGetComponent<OxygenSystem>(out var oxygen);
if (isPowered && hasOxygen)
{
    oxygen.SetDrainEnabled(false);                          // pause drain inside the hull
    oxygen.Refill(refillPerSecond * deltaSeconds);
}
// OnTriggerExit re-enables drain:
oxygen.SetDrainEnabled(true);
```

`SetDrainEnabled` is an **intentional setter** on `OxygenSystem` (not a public field) — controlled external mutation (`05-serialization-and-inspector.md`). The zone composes with the player's components via `TryGetComponent` rather than holding a hard reference, so it works for any oxygen-bearing object that enters (`04-component-composition.md`).

## The architecture lesson

Three messaging styles, each used where it fits:

| Situation | Mechanism | Why |
|---|---|---|
| Meter hits zero | `event Action Depleted` (edge) | many possible listeners; publisher shouldn't know them |
| Empty O2 → damage | direct `Health.TakeDamage` | single owned collaborator; an event would be ceremony |
| HP changed → loop gate | `event Action<float,float> Changed` (edge) | one-to-many; tracker reacts without coupling |
| Inside powered hull? | `TryGetComponent` on trigger | spatial fact, checked on enter/stay/exit |

Choosing the right one — and never polling where an edge event exists — is the review judgment this Guardian applies. The drain/damage VALUES are `game-balance-guardian`'s; the *shape* of the wiring is this Guardian's.
