# 04 — NUnit Assertion Patterns

UTF ships the classic NUnit `Assert` API (the `nunit.framework.dll` precompiled reference in `Drift.Tests.EditMode.asmdef`). This guide is the assertion vocabulary DRIFT actually uses, with the project's conventions.

## The assertions DRIFT uses

| Assertion | Use | DRIFT site |
|---|---|---|
| `Assert.AreEqual(expected, actual, tolerance, msg)` | float comparison with tolerance | `RuntimePlayerTests.cs:41` (`0.0001f`) |
| `Assert.AreEqual(expected, actual, msg)` | exact comparison (ints, enums, clamped floats) | `RuntimeSpawnerTests.cs:51` (`3` recipes) |
| `Assert.Less(a, b, msg)` / `Assert.Greater(a, b, msg)` | direction of change | `RuntimeOxygenTests.cs:41` (drained < start) |
| `Assert.IsTrue(x, msg)` / `Assert.IsFalse(x, msg)` | boolean state | `RuntimeSuitPowerTests.cs:32` (`TryConsumeSprint`) |
| `Assert.NotNull(x)` / `Assert.IsNotNull(x, msg)` | presence | `RuntimeSpawnerTests.cs:37` (player exists) |
| `Assert.AreEqual(EnumValue, actual)` | FSM state transition | `RuntimeEnemyTests.cs:39` (`EnemyState.Chase`) |
| `CollectionAssert.Contains(collection, item)` | membership | `RuntimeSpawnerTests.cs:62` (`Tier0Balance.CutterId`) |

## Rule 1 — floats get a tolerance, always

Floating-point math never lands on an exact value. Compare with an explicit tolerance:

```csharp
// RuntimePlayerTests.cs:41 — diagonal movement must equal speed * dt, within epsilon
Assert.AreEqual(controller.CurrentMoveSpeed * 0.5f, move.magnitude, 0.0001f);
```

A bare `Assert.AreEqual(expectedFloat, actualFloat)` without tolerance, or `==` on floats, is a **must-fix** (`SKILL.md` Hard Rule #9). Exception: a value the production code explicitly *clamps* to a known constant can be compared exactly — `RuntimeOxygenTests` asserts `oxygen.Meter.Current == oxygen.Meter.Max` after an over-refill, because `Restore` clamps to `Max` exactly.

## Rule 2 — assert the *direction* when the exact value is balance-owned

You own *behavior*; `game-balance` owns *numbers*. So assert "drain reduced oxygen" (`Assert.Less`), not "oxygen is now 98.0" (which breaks the moment a designer retunes `drainPerSecond`):

```csharp
// Good — behavior, survives a balance change
oxygen.Tick(2f);
Assert.Less(oxygen.Meter.Current, startCurrent, "Oxygen should drain while enabled.");

// Brittle — couples the test to a tuning number game-balance owns
Assert.AreEqual(98f, oxygen.Meter.Current);   // breaks when drainPerSecond changes
```

## Rule 3 — reference `Tier0Balance`, not magic literals

When a test *must* assert an identity or count tied to content, reference the single source of truth (`Tier0Balance`) so a content change can't silently desync the test:

```csharp
// RuntimeSpawnerTests.cs:62 — ids come from Tier0Balance, not "tool_cutter" string literals
CollectionAssert.Contains(requiredTools, Tier0Balance.CutterId);
CollectionAssert.Contains(requiredTools, Tier0Balance.WelderId);
CollectionAssert.Contains(requiredTools, Tier0Balance.PlasmaDrillId);
```

A hardcoded `"tool_cutter"` string in a test is a **should-refactor** finding (`SKILL.md` Hard Rule #12).

## Rule 4 — every non-obvious assertion carries a message

The message is what a future reader (or a CI log) sees when it fails. DRIFT writes them as the *expected behavior*:

```csharp
Assert.IsFalse(controller.IsSprinting, "Empty suit power must block sprinting.");
Assert.Greater(move.z, 0f);                                  // obvious — message optional
Assert.AreEqual(healthAfterFirstSwing, playerHealth.Current,
    "Attack must respect its cooldown.");                    // non-obvious — message required
```

A missing message on a non-obvious check is a **should-refactor**.

## Rule 5 — assert atomicity and side-effect counts where they matter

DRIFT tests transactional behavior explicitly:

```csharp
// RuntimeInventoryTests.cs:45 — a partial-ingredient craft must consume nothing
Assert.IsFalse(inventory.ConsumeIngredients(ingredients));
Assert.AreEqual(4, inventory.GetCount("scrap_metal"));   // unchanged — proves atomic
Assert.AreEqual(0, inventory.GetCount("polymer"));

// RuntimeInventoryTests.cs:64 — event fired exactly twice (one Add, one Consume)
var changedCount = 0;
inventory.Changed += () => changedCount++;
inventory.Add(scrap, 4);
inventory.ConsumeIngredients(...);
Assert.AreEqual(2, changedCount);
```

Counting event fires is the EditMode way to verify a C# event contract (DRIFT's systems communicate by events, not polling — `ARCHITECTURE.md §5`). Subscribe a counter, act, assert the count.

## Patterns NOT in use (yet) but worth knowing

- `Assert.Throws<T>(() => ...)` — for "this should reject bad input." DRIFT mostly returns `bool` (`TryCraft`, `TryConsumeSprint`) rather than throwing, so it asserts the `false` return instead.
- `[TestCase(1, 2, 3)]` — parameterized table tests. Good future fit for asserting several balance rows in one method.
- `Assert.That(actual, Is.EqualTo(expected).Within(0.01))` — the constraint model. DRIFT uses the classic model (`Assert.AreEqual`) consistently; stay consistent within a suite.

Pick the classic model to match the existing suites unless you have a reason. Consistency across the ten suites is itself a value.
