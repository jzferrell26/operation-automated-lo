# Example 02 — An EditMode-safe MonoBehaviour from scratch

Goal: build a new survival-style component — a `HungerSystem` (a second drain meter that damages `Health` when it empties) — using the three EditMode-safe patterns, so `unity-test-ci-guardian` can cover it without a play loop.

> This is a *worked illustration* of the pattern, not a Tier 0 build request. Hunger isn't on the Tier 0 checklist — if you actually wanted this in the game you'd flag it (Hard Rule #1). It mirrors `OxygenSystem` exactly so the seam is clear.

## The component

```csharp
using Drift.Core.Combat;
using UnityEngine;

namespace Drift.Core.Survival
{
    public class HungerSystem : MonoBehaviour
    {
        [SerializeField] float maxHunger = 100f;          // P (serialize-private, not public)
        [SerializeField] float drainPerSecond = 0.5f;
        [SerializeField] float starvationDamagePerSecond = 4f;
        [SerializeField] bool drainEnabled = true;

        SurvivalMeter _meter;
        Health _health;
        bool _initialized;

        public float Normalized { get { EnsureInitialized(); return _meter.Normalized; } }
        public bool  IsDepleted { get { EnsureInitialized(); return _meter.IsDepleted; } }

        void Awake() => EnsureInitialized();              // Pattern 1: lazy init

        void EnsureInitialized()
        {
            if (_initialized) return;
            _meter = new SurvivalMeter(maxHunger, maxHunger);
            _meter.Depleted += OnStarving;
            _health = GetComponent<Health>();
            _initialized = true;
        }

        void OnDestroy()                                  // event symmetry
        {
            if (_meter != null) _meter.Depleted -= OnStarving;
        }

        void Update() => Tick(Time.deltaTime);            // Pattern 3: forwarder only

        public void Tick(float deltaSeconds)              // Pattern 3: extracted, deterministic
        {
            EnsureInitialized();
            if (deltaSeconds <= 0f) return;

            if (drainEnabled) _meter.Tick(deltaSeconds, drainPerSecond);

            if (_health == null) _health = GetComponent<Health>();
            if (_meter.IsDepleted && _health != null && !_health.IsDead)
                _health.TakeDamage(starvationDamagePerSecond * deltaSeconds);
        }

        public void Feed(float amount) { EnsureInitialized(); _meter.Restore(amount); }
        public void SetDrainEnabled(bool e) => drainEnabled = e;   // Pattern 2-ish: intentional setter
    }
}
```

## Why each piece is there

- **Pattern 1 — lazy init.** `EnsureInitialized()` builds the `SurvivalMeter`, subscribes its `Depleted` event, and caches `Health`. It's called from `Awake` *and* from `Tick`/`Normalized`/`Feed` — so a test that never triggers `Awake` still gets an initialized object (`10-editmode-safe-patterns.md` P1).
- **Pattern 3 — extracted `Tick(float)`.** `Update` only forwards `Time.deltaTime`; the real logic takes `deltaSeconds` as a parameter and early-returns on `<= 0f`. A test drives `Tick(1f)` directly (`07-coroutines-vs-update.md`).
- **Serialization (`05`).** Tunables are `[SerializeField] private`, not public, with read-only properties for external reads.
- **Events (`06`).** It reuses `SurvivalMeter.Depleted` (fires once on the edge) and calls `Health.TakeDamage` directly — a single-collaborator relationship where a direct call beats an event. The subscription is unsubscribed in `OnDestroy`.
- **Composition (`04`).** It's a sibling component on whatever GameObject carries `Health`; it finds `Health` via `GetComponent`, lazily and cached.

## The test seam this buys (illustrative — owned by unity-test-ci-guardian)

Because of the three patterns, the EditMode test needs no Play mode:

```csharp
[Test]
public void Hunger_Depletes_And_Damages_Health()
{
    var go = new GameObject();
    var health = go.AddComponent<Health>();           // no Awake runs — lazy-init handles it
    var hunger = go.AddComponent<HungerSystem>();

    for (var i = 0; i < 300; i++) hunger.Tick(1f);    // drive time deterministically
    Assert.IsTrue(hunger.IsDepleted);
    Assert.Less(health.Current, health.Max);          // starvation damaged Health
}
```

If `HungerSystem` had built its meter only in `Awake`, or kept the drain inside `Update` with no `Tick`, this test would be impossible — exactly the failure the spine's convention prevents (`AGENTS.md` build history: ~9 Runtime* tests failed for precisely this reason before the spine was made EditMode-safe).

## Handoff

- Authoring/running the actual NUnit test above → `unity-test-ci-guardian`.
- The drain/damage VALUES (`0.5`, `4f`) → `game-balance-guardian`.
- Copy-paste skeleton → `templates/editmode-safe-monobehaviour.cs`.
