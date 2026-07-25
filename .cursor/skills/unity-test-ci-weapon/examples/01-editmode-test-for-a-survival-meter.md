# Example 01 — Writing an EditMode Test for a Survival Meter

**Scenario:** a new survival meter has landed — say a `HeatSystem` that drains a heat reserve outside the station and damages `Health` when it hits zero (structurally a sibling of `OxygenSystem`). Write its EditMode coverage. We model directly on `RuntimeOxygenTests.cs`.

## Step 1 — Confirm the system is EditMode-safe

Before writing a test, verify the system under test follows the three patterns (`guides/03-editmode-safe-design.md`). For a meter, that means:

- a lazy-init `EnsureInitialized()` so `Meter` is non-null even though `Awake` never fires;
- an extracted `public void Tick(float deltaSeconds)` (not logic buried in `Update`);
- a `Refill`/`SetDrainEnabled` API the test can call.

If `HeatSystem` only drains in `Update`, **stop** — the test would no-op. Hand the Configure/Tick refactor back per `examples/02-...`. (Drive the decision with `unity-csharp-guardian`.)

## Step 2 — Lay down the fixture

Copy the `Track` + `[TearDown]` skeleton verbatim — it's the project standard (`guides/10-test-doubles-and-fixtures.md`):

```csharp
using System.Collections.Generic;
using Drift.Core.Combat;
using Drift.Core.Survival;
using NUnit.Framework;
using UnityEngine;

namespace Drift.Tests
{
    public class RuntimeHeatTests
    {
        readonly List<Object> _created = new();

        [TearDown]
        public void TearDown()
        {
            for (var i = 0; i < _created.Count; i++)
                if (_created[i] != null)
                    Object.DestroyImmediate(_created[i]);
            _created.Clear();
        }

        HeatSystem CreateHeat() => Track(new GameObject("HeatOnly")).AddComponent<HeatSystem>();

        T Track<T>(T value) where T : Object { _created.Add(value); return value; }
    }
}
```

## Step 3 — Test drain on/off (drive `Tick` directly)

Mirrors `Oxygen_DrainsWhileEnabled_AndStopsWhenDisabled`:

```csharp
[Test]
public void Heat_DrainsWhileEnabled_AndStopsWhenDisabled()
{
    var heat = CreateHeat();
    var start = heat.Meter.Current;        // accessing Meter triggers lazy-init

    heat.Tick(2f);                          // ACT — call the step; Update will not fire in EditMode
    var afterDrain = heat.Meter.Current;
    Assert.Less(afterDrain, start, "Heat should drain while drain is enabled.");

    heat.SetDrainEnabled(false);
    heat.Tick(2f);
    Assert.AreEqual(afterDrain, heat.Meter.Current, "Disabled drain should leave heat untouched.");
}
```

Note: **assert direction** (`Assert.Less`), not the exact value — the drain rate is a `game-balance` number (`guides/04-nunit-assertion-patterns.md` Rule 2).

## Step 4 — Test refill clamps to max

Mirrors `Oxygen_Refill_RestoresUpToMax` — here an exact compare is correct because `Restore` clamps:

```csharp
[Test]
public void Heat_Refill_RestoresUpToMax()
{
    var heat = CreateHeat();
    heat.Tick(10f);
    var drained = heat.Meter.Current;
    Assert.Less(drained, heat.Meter.Max);

    heat.Refill(5f);
    Assert.AreEqual(Mathf.Min(heat.Meter.Max, drained + 5f), heat.Meter.Current);

    heat.Refill(10000f);
    Assert.AreEqual(heat.Meter.Max, heat.Meter.Current, "Refill must clamp at max.");
}
```

## Step 5 — Test the cross-system effect (depletion damages Health)

This mirrors the subtlest test in the oxygen suite (`Oxygen_WhenDepleted_DamagesHealthOnTick`). The ordering trick matters: drain to empty **before** attaching `Health`, so suffocation only applies on the explicit damage tick — otherwise one huge drain tick would also damage for the whole step and you couldn't isolate the assertion.

```csharp
[Test]
public void Heat_WhenDepleted_DamagesHealthOnTick()
{
    var go = Track(new GameObject("HeatPlayer"));
    var heat = go.AddComponent<HeatSystem>();

    heat.Tick(heat.Meter.Max + 5f);                 // empty it first
    Assert.IsTrue(heat.IsDepleted);

    var health = go.AddComponent<Health>();          // attach Health AFTER it's empty
    var full = health.Max;

    heat.Tick(1f);                                    // now one tick applies damage

    Assert.Less(health.Current, full, "Depleted heat must damage health.");
    Assert.Greater(health.Current, 0f, "A single tick should not instantly kill.");
}
```

## Step 6 — Run it

```bash
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log \
  -testFilter "Drift.Tests.RuntimeHeatTests"
```

Remember the two-pass import behavior and the tmpfs redirect first (`examples/03-...`). Exit `0` + a `results.xml` with `passed="4" failed="0"` = green (and only *real* green if this was an actual editor run — `guides/00-principles.md` Rule #7).

## The takeaways

1. **Never wait for `Awake`/`Update`** — call `Tick` yourself.
2. **Assert direction for balance-owned values, exact for clamped values.**
3. **Order your arrange step** to isolate cross-system effects (Health attached after depletion).
4. **Copy the `Track`/`[TearDown]`/`DestroyImmediate` fixture** — it's the standard, not a choice.
