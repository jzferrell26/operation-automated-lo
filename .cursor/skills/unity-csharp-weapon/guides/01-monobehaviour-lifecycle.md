# 01 — MonoBehaviour Lifecycle

The order Unity calls your callbacks, what runs (and crucially what does NOT run) in EditMode, and the lazy-init guard that makes Drift's spine testable.

## The callback order that matters in Drift

For a component that is enabled when its scene loads:

1. **`Awake()`** — once, when the object is created, before any `Start`. Cache component references and initialize internal state here. In Drift it almost always just calls `EnsureInitialized()` (see below).
2. **`OnEnable()`** — every time the component is enabled. Event subscriptions that must survive disable/enable cycles go here paired with `OnDisable`. Drift's Tier 0 components mostly subscribe in `Configure`/`EnsureInitialized` instead, because they're never toggled.
3. **`Start()`** — once, before the first `Update`, after all `Awake`s. Use it for cross-object lookups that need every object to exist. `MutatedCrewEnemy.Start` uses it to find the player by tag — but note it *also* supports explicit `Configure(player, spawn)` so it doesn't depend on `Start` running (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:66`).
4. **`Update()`** — every frame. In Drift, `Update` is a thin forwarder: it reads input/`Time.deltaTime` and calls an extracted step (`OxygenSystem.Update` → `Tick(Time.deltaTime)`).
5. **`OnDestroy()`** — when the object is destroyed. Unsubscribe every event you subscribed to (`OxygenSystem.OnDestroy` detaches `_meter.Depleted`; `MutatedCrewEnemy.OnDestroy` detaches `_health.Died`).

`FixedUpdate` (physics step) and `LateUpdate` (after all `Update`s — camera follow) exist but Tier 0 leans on `Update`-forwarded steps for determinism.

## The load-bearing constraint: EditMode runs none of this

Unity does **not** call `Awake`, `OnEnable`, `Start`, or `Update` on a component you add via `gameObject.AddComponent<T>()` in an EditMode test. This is the single fact the whole spine is shaped around (`ARCHITECTURE.md` §7). If a component initializes its state only in `Awake`, an EditMode test sees an uninitialized object and `NullReferenceException`s.

The fix is **lazy-init**: a guarded initializer called from `Awake` *and* every public entry point.

```csharp
// OxygenSystem.cs — the canonical lazy-init guard
SurvivalMeter _meter;
bool _initialized;

void Awake() => EnsureInitialized();

void EnsureInitialized()
{
    if (_initialized) return;
    _meter = new SurvivalMeter(maxOxygen, maxOxygen);
    _meter.Depleted += OnOxygenDepleted;
    _health = GetComponent<Health>();
    _initialized = true;
}

public void Tick(float deltaSeconds)
{
    EnsureInitialized();   // <-- entry point re-guards, so tests work without Awake
    // ... drain + suffocation
}
```

Every public property does the same: `OxygenSystem.Meter`, `.Normalized`, `.IsDepleted` all call `EnsureInitialized()` before reading `_meter` (`Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs:20-45`). `Health` uses the identical pattern (`Health.cs:25`), as does `SuitPowerSystem.EnsureMeter` (the terser `_meter ??= new SurvivalMeter(...)` form).

## Subscribe / unsubscribe symmetry

Every `+=` needs a matching `-=`. A subscription that outlives its publisher is a leak and, when the subscriber is destroyed first, a `MissingReferenceException` the next time the event fires. Drift's rule:

- Subscribe in `EnsureInitialized`/`Configure` (or `OnEnable`).
- Unsubscribe in `OnDestroy` (or `OnDisable` if you subscribed in `OnEnable`).

```csharp
void OnDestroy()
{
    if (_meter != null) _meter.Depleted -= OnOxygenDepleted;
}
```

An un-paired subscription is a **must-fix** (event leak).

## What goes where — quick reference

| Need | Callback | Drift example |
|---|---|---|
| Cache own components, init state | `Awake` → `EnsureInitialized()` | `OxygenSystem`, `Health` |
| Subscribe to events | `EnsureInitialized` / `Configure` | `MutatedCrewEnemy` → `Health.Died` |
| Cross-object lookup (with `Configure` fallback) | `Start` | `MutatedCrewEnemy` finds player |
| Per-frame logic | `Update` → extracted `Tick`/`Step` | `OxygenSystem.Tick`, `MutatedCrewEnemy.Step` |
| Unsubscribe / cleanup | `OnDestroy` | `OxygenSystem`, `MutatedCrewEnemy` |

## Findings to raise

- **Must-fix:** state initialized only in `Awake` (no lazy guard) on a component that needs coverage → unfixable in EditMode tests.
- **Must-fix:** event subscribed without a matching unsubscribe in `OnDestroy`.
- **Should-refactor:** cross-object resolution only in `Start` with no `Configure` fallback → fragile, untestable.
- **Should-refactor:** heavy logic directly in `Update` instead of an extracted, testable step (see `07-coroutines-vs-update.md`, `10-editmode-safe-patterns.md`).
