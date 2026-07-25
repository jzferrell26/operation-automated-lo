# 10 — EditMode-Safe Patterns (Hard Rule #11)

The single most important architectural constraint in the spine. Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode, so any MonoBehaviour that needs test coverage must be built around that fact. This is `CLAUDE.md` §6 Hard Rule #11 and `ARCHITECTURE.md` §7.

This guide owns the *architecture side* of EditMode safety — shaping code so it *can* be tested. Authoring and running the tests themselves is `unity-test-ci-guardian`.

## The constraint, precisely

When an EditMode test does:

```csharp
var go = new GameObject();
var oxygen = go.AddComponent<OxygenSystem>();
```

Unity creates the component but **calls none of its lifecycle methods**. No `Awake`, no `Start`, no per-frame `Update`. If `OxygenSystem` only built its `SurvivalMeter` in `Awake`, the test would hit a `null` `_meter`. Three patterns, used together, make the component testable anyway.

## Pattern 1 — Lazy init

Initialize state in a guarded method called from `Awake` **and** every public entry point — never only from `Awake`.

```csharp
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

public float Normalized { get { EnsureInitialized(); return _meter.Normalized; } }
public void  Tick(float dt) { EnsureInitialized(); /* ... */ }
```

Real uses: `OxygenSystem.EnsureInitialized` (`:54`), `Health.EnsureInitialized` (`:25`), `SuitPowerSystem.EnsureMeter` (the terse `_meter ??= new SurvivalMeter(...)` form, `:42`), `TopDownPlayerController.EnsureDependencies` (`:25`), `MutatedCrewEnemy.EnsureInitialized` (`:41`). Applies to every component listed in `ARCHITECTURE.md` §7 pattern 1.

**The rule:** if a public method or property reads initialized state, it calls the guard first. A guard called only from `Awake` is **must-fix** — it's a lazy-init in name only.

## Pattern 2 — Explicit `Configure(...)`

Inject cross-object dependencies through a method, instead of resolving them only in `Awake`/`Start`. A test (and the spawner, and the editor) can then wire the object up without the play loop.

```csharp
// MutatedCrewEnemy.cs:84
public void Configure(Transform player, Vector3 spawnPosition)
{
    EnsureInitialized();
    _player = player;
    _spawnPosition = spawnPosition;
}
```

`MutatedCrewEnemy.Start` still has a `FindGameObjectWithTag("Player")` *fallback*, but it does not *depend* on it — `Configure` is the testable path (`04-component-composition.md`). Real uses: `Tier0ObjectiveTracker`, `Tier0LoopController`, `Tier0RaiderAssault`, `Tier0BuildPlanner`, `Tier0ShuttlePad`, `MutatedCrewEnemy` (`ARCHITECTURE.md` §7 pattern 2).

**The rule:** a component that resolves a cross-object dependency *only* in `Awake`/`Start` (e.g. only via `FindObjectOfType`) with no `Configure` seam is **must-fix** — it can't be set up in EditMode.

## Pattern 3 — Extracted `Tick`/`Step`

Pull frame logic out of `Update` into a public method taking `deltaSeconds`. `Update` becomes a one-line forwarder.

```csharp
void Update() => Tick(Time.deltaTime);        // forwarder only

public void Tick(float deltaSeconds)          // deterministic, test-drivable
{
    EnsureInitialized();
    if (deltaSeconds <= 0f) return;
    // ... real logic
}
```

Real uses: `OxygenSystem.Tick` (`:84`), `MutatedCrewEnemy.Step` (`:100`), `TopDownPlayerController.ResolveMove` (`:88`), `SuitPowerSystem.TryConsumeSprint` (`:47`). The extracted method takes `deltaSeconds` as a parameter and never reads `Time.deltaTime` itself — that's what makes `Tick(1f)` deterministic in a test (`07-coroutines-vs-update.md`).

**The rule:** frame/economy logic written directly inside `Update` (so a test can't drive it) on a component that needs coverage is **must-fix**.

## The three together — a testable component looks like this

```csharp
public class ThingSystem : MonoBehaviour
{
    [SerializeField] float rate = 1f;
    State _state; bool _init;

    void Awake() => EnsureInitialized();
    void EnsureInitialized() { if (_init) return; _state = new State(); _init = true; }   // P1

    public void Configure(Dependency dep) { EnsureInitialized(); _dep = dep; }            // P2

    void Update() => Tick(Time.deltaTime);                                                // P3
    public void Tick(float dt) { EnsureInitialized(); if (dt <= 0f) return; /*...*/ }     // P3
}
```

The EditMode test then needs no play loop: `AddComponent`, `Configure(dep)`, `Tick(1f)`, assert. See `examples/02-editmode-safe-monobehaviour.md` and `templates/editmode-safe-monobehaviour.cs`.

## The `Object.Destroy` trap

`Object.Destroy` throws in edit mode. Code reachable from a test must route through the play-mode-aware helper (`Tier0RuntimeSpawner.DestroyObject`: `Object.Destroy` in Play, `Object.DestroyImmediate` otherwise). A bare destroy in test-reachable code is **must-fix** (`08-instantiation-and-prefabs.md`, `ARCHITECTURE.md` §7).

## Caveat from the build history

These patterns were authored **headless** and the suite has **not** been run in a real editor yet (`CLAUDE.md` §3 caveat, `AGENTS.md` build history). Treat "EditMode-safe" as *shaped correctly*, pending a green editor run — which is `unity-test-ci-guardian`'s deliverable, not this Guardian's. When you make a component EditMode-safe, note that the real-editor verification is still owed.

## Findings to raise

- **Must-fix:** state initialized only in `Awake` (no guard at entry points); a cross-object dependency resolvable only in `Awake`/`Start` with no `Configure`; frame logic trapped in `Update` with no extracted step on a coverage-needing component; `Object.Destroy` in test-reachable code without the play-mode guard.
- **Should-refactor:** an extracted step reading `Time.deltaTime` internally (non-deterministic); a `Configure` that doesn't call `EnsureInitialized` first (init-order hazard).
- **Hand off:** writing the actual EditMode tests → `unity-test-ci-guardian`.
