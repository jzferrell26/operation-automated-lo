# 03 — EditMode-Safe Design (Hard Rule #11)

This is the most important guide in the Weapon. It explains *why* EditMode skips lifecycle methods and *how* the Drift spine is written around that, with real before/after.

## The fact

Unity does **not** call `Awake`, `Start`, or `Update` on a MonoBehaviour that was added to a GameObject via `AddComponent<T>()` **in an EditMode test**. The component exists; its lifecycle does not run.

This is not a bug — EditMode tests run in the editor's edit loop, where there is no game session, no frame, and no `Update` pump. Unity only runs those callbacks during Play. So:

```csharp
var go = new GameObject("X");
var oxygen = go.AddComponent<OxygenSystem>();
// In EditMode, Awake has NOT run. _meter is null until something forces init.
// Update will NEVER run, so nothing drains on its own.
```

## Why this matters — the false green

CLAUDE.md §3's standing caveat exists because of this. Per `AGENTS.md` build history: on 2026-06-15, "~9 of the `Runtime*` MonoBehaviour tests failed," root-caused to "Unity not running `Awake`/`Start`/`Update` on script-added components in EditMode." A test written naively against an `Update`-driven component will either:

1. **Crash** — because `Awake` never ran, the meter is `null`, and the test NREs; or
2. **No-op silently** — because `Update` never ran, "drain" never happened, and an assertion like "oxygen ≥ 0" passes vacuously. This is the dangerous case: a **false green**.

A green suite that's full of no-ops is worse than a red one. Hence Hard Rule #11.

## The three patterns (from `ARCHITECTURE.md §7`)

Every new MonoBehaviour that needs coverage uses all three.

### Pattern 1 — Lazy init

Initialize state in an `EnsureInitialized()` guarded by a flag, called from `Awake` **and** every public entry point — not only `Awake`. So the first test call that touches the component initializes it, even though `Awake` never fired.

### Pattern 2 — Explicit `Configure(...)`

Inject dependencies through a public `Configure(...)` method instead of resolving them only in `Awake`/`Start` (which won't run). The test wires the graph itself.

### Pattern 3 — Extracted `Tick`/`Step`/`Resolve`

Pull the per-frame logic out of `Update` into a public method taking `deltaSeconds`. `Update` becomes a one-line forwarder of `Time.deltaTime`; the test drives the method directly and deterministically.

`ARCHITECTURE.md §7` names the components using each: lazy-init in `Health`, `OxygenSystem`, `SuitPowerSystem`, `HullBreachEvent`, `MutatedCrewEnemy`, `TopDownPlayerController`; `Configure(...)` in `Tier0ObjectiveTracker`, `Tier0LoopController`, `Tier0RaiderAssault`, `Tier0BuildPlanner`, `Tier0ShuttlePad`, `MutatedCrewEnemy`; extracted step in `OxygenSystem.Tick`, `MutatedCrewEnemy.Step`, `TopDownPlayerController.ResolveMove`.

## Before / after — `OxygenSystem`

### ❌ Before (untestable in EditMode — hypothetical pre-consolidation shape)

```csharp
public class OxygenSystem : MonoBehaviour
{
    [SerializeField] float maxOxygen = 100f;
    [SerializeField] float drainPerSecond = 1f;
    SurvivalMeter _meter;

    void Awake()  { _meter = new SurvivalMeter(maxOxygen, maxOxygen); }   // never runs in EditMode
    void Update() { _meter.Tick(Time.deltaTime, drainPerSecond); }         // never runs in EditMode
}
```

A test doing `AddComponent<OxygenSystem>()` then asserting drain gets a `null` `_meter` (Awake skipped) and zero drain (Update skipped). Crash or false green.

### ✅ After (the real `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs`)

```csharp
public class OxygenSystem : MonoBehaviour
{
    [SerializeField] float maxOxygen = 100f;
    [SerializeField] float drainPerSecond = 1f;
    SurvivalMeter _meter;
    bool _initialized;

    public SurvivalMeter Meter { get { EnsureInitialized(); return _meter; } }  // lazy-init on access

    void Awake() => EnsureInitialized();          // also runs in Play

    void EnsureInitialized()                       // Pattern 1
    {
        if (_initialized) return;
        _meter = new SurvivalMeter(maxOxygen, maxOxygen);
        _meter.Depleted += OnOxygenDepleted;
        _health = GetComponent<Health>();
        _initialized = true;
    }

    void Update() => Tick(Time.deltaTime);         // one-line forwarder

    public void Tick(float deltaSeconds)           // Pattern 3 — the testable step
    {
        EnsureInitialized();                        // safe even if Awake never ran
        if (deltaSeconds <= 0f) return;
        if (drainEnabled) _meter.Tick(deltaSeconds, drainPerSecond);
        if (_meter.IsDepleted && _health != null && !_health.IsDead)
            _health.TakeDamage(suffocationDamagePerSecond * deltaSeconds);
    }
}
```

Now the test (`RuntimeOxygenTests.cs:34`) reads `oxygen.Meter.Current` (lazy-init fires), calls `oxygen.Tick(2f)` (drives drain deterministically), and asserts. No lifecycle method needed. **This is the pattern.**

## Before / after — `MutatedCrewEnemy` (Configure + Step)

The enemy FSM uses Configure (inject the target + spawn anchor) and Step (return the resulting state). From `RuntimeEnemyTests.cs:33`:

```csharp
var enemy = CreateEnemy(Vector3.zero, out _);        // AddComponent — no Awake/Start
var player = CreatePlayer(new Vector3(0, 0, 5), out _);
enemy.Configure(player.transform, Vector3.zero);     // Pattern 2 — inject deps the test controls
Assert.AreEqual(EnemyState.Chase, enemy.Step(0.1f)); // Pattern 3 — Step returns the new state
```

Without `Configure`, the enemy would (in Play) find its target via a tag lookup in `Start` — which never runs in EditMode, leaving it targetless. `Tier0RuntimeSpawner.CreateEnemy` even comments this: it wires the target "explicitly (matches the Configure convention) instead of relying on the enemy's `Start()` tag lookup."

## How to review for this

When a new testable MonoBehaviour lands, confirm:

- [ ] State init is in an `EnsureInitialized()`-style guard called from public entry points, not only `Awake`. (Pattern 1)
- [ ] Dependencies are injectable via `Configure(...)`, not resolved only in `Awake`/`Start`. (Pattern 2)
- [ ] Frame logic is in a public `Tick`/`Step`/`Resolve(deltaSeconds)`; `Update` just forwards. (Pattern 3)
- [ ] The test drives those methods directly — it does **not** wait for `Awake`/`Update`.

A new test that depends on a lifecycle method firing is a **must-fix** (`guides/00-principles.md` Rule #2). The remedy is co-owned with `unity-csharp-guardian`: this Guardian specifies the Configure/Tick contract; csharp-guardian shapes the production class to honor it.

See `examples/02-refactor-update-monobehaviour-to-configure-tick.md` for a full walkthrough of converting a non-conforming component.
