# Example 02 — Refactoring an `Update`-Driven MonoBehaviour into Configure + Tick

**Scenario:** a teammate adds a `ReactorCooler` that vents reactor heat over time and shuts off the `LifeSupportZone` if it overheats. It's written the "obvious" Unity way — all logic in `Update`, dependencies grabbed in `Start`. The EditMode test for it crashes (or worse, passes by no-op). This is the exact failure mode that broke ~9 `Runtime*` tests on 2026-06-15 (`AGENTS.md` build history). Here's the fix.

## Before — untestable in EditMode

```csharp
public class ReactorCooler : MonoBehaviour
{
    [SerializeField] float maxHeat = 100f;
    [SerializeField] float ventPerSecond = 5f;
    [SerializeField] float overheatThreshold = 90f;

    float _heat;
    LifeSupportZone _zone;

    void Start()                              // ❌ never runs in EditMode
    {
        _heat = 0f;
        _zone = FindFirstObjectByType<LifeSupportZone>();   // ❌ implicit, untestable dependency
    }

    void Update()                             // ❌ never runs in EditMode
    {
        _heat = Mathf.Max(0f, _heat - ventPerSecond * Time.deltaTime);
        if (_heat >= overheatThreshold) _zone.SetPowered(false);
    }

    public float Heat => _heat;
}
```

A test doing `AddComponent<ReactorCooler>()`:
- `_heat` is `0` and `_zone` is `null` (`Start` skipped);
- calling nothing changes `_heat` (`Update` skipped);
- `Assert.AreEqual(0f, cooler.Heat)` passes — a **false green** that proves nothing. Or, if the test forces venting somehow, it NREs on `_zone`.

## Apply the three patterns (`guides/03-editmode-safe-design.md`)

### Pattern 1 — lazy-init guarded state

```csharp
bool _initialized;

void EnsureInitialized()
{
    if (_initialized) return;
    _heat = maxHeat;                 // start hot, vent down — whatever the design is
    _initialized = true;
}
```

### Pattern 2 — `Configure(...)` for the dependency

Inject the `LifeSupportZone` instead of `FindFirstObjectByType` in `Start`:

```csharp
LifeSupportZone _zone;
public void Configure(LifeSupportZone zone) => _zone = zone;
```

This matches the spawner convention — `Tier0RuntimeSpawner` wires `assault.Configure(breach, objectives, ...)`, `loop.Configure(...)`, `shuttlePad.Configure(...)` rather than relying on `Start` lookups.

### Pattern 3 — extract the step out of `Update`

```csharp
void Update() => Tick(Time.deltaTime);      // one-line forwarder, runs only in Play

public void Tick(float deltaSeconds)
{
    EnsureInitialized();                     // safe even if Awake never ran
    if (deltaSeconds <= 0f) return;

    _heat = Mathf.Max(0f, _heat - ventPerSecond * deltaSeconds);
    if (_heat >= overheatThreshold && _zone != null)
        _zone.SetPowered(false);
}
```

## After — fully testable in EditMode

```csharp
public class ReactorCooler : MonoBehaviour
{
    [SerializeField] float maxHeat = 100f;
    [SerializeField] float ventPerSecond = 5f;
    [SerializeField] float overheatThreshold = 90f;

    float _heat;
    bool _initialized;
    LifeSupportZone _zone;

    public float Heat { get { EnsureInitialized(); return _heat; } }

    void Awake() => EnsureInitialized();
    void Update() => Tick(Time.deltaTime);

    public void Configure(LifeSupportZone zone) => _zone = zone;

    void EnsureInitialized()
    {
        if (_initialized) return;
        _heat = maxHeat;
        _initialized = true;
    }

    public void Tick(float deltaSeconds)
    {
        EnsureInitialized();
        if (deltaSeconds <= 0f) return;
        _heat = Mathf.Max(0f, _heat - ventPerSecond * deltaSeconds);
        if (_heat >= overheatThreshold && _zone != null) _zone.SetPowered(false);
    }
}
```

## Now the test is straightforward

```csharp
[Test]
public void ReactorCooler_VentsHeatOverTicks()
{
    var cooler = Track(new GameObject("Cooler")).AddComponent<ReactorCooler>();
    var start = cooler.Heat;                 // lazy-init fires; Heat == maxHeat

    cooler.Tick(2f);                          // drive the step directly

    Assert.Less(cooler.Heat, start, "Cooler should vent heat over a tick.");
}

[Test]
public void ReactorCooler_Overheat_ShutsOffLifeSupport()
{
    var deck = Track(new GameObject("Deck"));
    deck.AddComponent<BoxCollider>().isTrigger = true;
    var zone = deck.AddComponent<LifeSupportZone>();

    var cooler = Track(new GameObject("Cooler")).AddComponent<ReactorCooler>();
    cooler.Configure(zone);                   // inject the real zone — no mock

    // start at maxHeat (>= overheatThreshold), one tick triggers shutoff
    cooler.Tick(0.001f);

    Assert.IsFalse(zone.IsPowered, "Overheat must shut off life support.");
}
```

The second test injects a **real** `LifeSupportZone` via `Configure` and asserts the cross-system effect — exactly how `RuntimeOxygenTests` drives `LifeSupportZone.ApplyLifeSupport` and `RuntimeLifeSupportTests` drives `HullBreachEvent` against a real zone.

## Division of labor

- **This Guardian** specifies the contract: "needs lazy-init + `Configure(LifeSupportZone)` + `Tick(deltaSeconds)`," and writes the tests.
- **`unity-csharp-guardian`** owns whether the production shape is otherwise sound (naming, namespace, whether `ReactorCooler` should even exist as a separate component). Design-for-testability is co-owned — this is the seam where the two Guardians meet.
