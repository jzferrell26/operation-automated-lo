# 08 — EditMode Testing Progression

CLAUDE.md Hard Rule #11: **"Unity does not run `Awake`/`Start`/`Update` on script-added components in EditMode. New MonoBehaviours that need coverage must use lazy-init + explicit `Configure(...)` + an extracted `Tick`/`Step` method."** Progression is almost entirely pure math — it is the *easiest* DRIFT system to make EditMode-testable, if it's designed right.

## The precedent already in the repo

`Health` (`Core/Combat/Health.cs`) shows the pattern: a serialized `maxHealth`, a lazy `EnsureInitialized()`, and pure methods (`TakeDamage`, `Heal`) that work whether or not `Awake` ran. `SuitPowerSystem.EnsureMeter()` is the same. Progression follows suit: **no logic in `Awake`/`Start`/`Update`; all compute in pure methods reachable after an explicit `Configure`.**

## The three testable seams

### 1. The curve (`ProgressionProfile`)
A ScriptableObject — but its methods are pure functions of its data:

```csharp
[Test]
public void LevelForXp_IsMonotonic()
{
    var profile = ScriptableObject.CreateInstance<ProgressionProfile>();
    profile.ConfigureForTest(/* small placeholder array — values are game-balance's */);
    Assert.AreEqual(1, profile.LevelForXp(0));
    Assert.LessOrEqual(profile.LevelForXp(100), profile.LevelForXp(500)); // never decreases
}
```

`ScriptableObject.CreateInstance` works in EditMode (it's how `save-load`'s tests build their fixtures too). Test the **shape invariants** — monotonicity, bounds — not the tuned values (those are game-balance's).

### 2. The stat stack (`StatModifierStack`)
A plain C# class — trivially testable, no Unity needed:

```csharp
[Test]
public void Stack_AppliesFlatThenPercent()
{
    var stack = new StatModifierStack();
    stack.Configure(new Dictionary<string, float> { ["maxHealth"] = 100f });
    stack.Add(new StatModifier { statId = "maxHealth", value = 20f }, ModifierKind.Flat);
    stack.Add(new StatModifier { statId = "maxHealth", value = 0.10f }, ModifierKind.Percent);
    Assert.AreEqual(132f, stack.EffectiveStat("maxHealth")); // (100+20)*1.10 — determinism
}
```

This is the most important test: it pins the **deterministic stacking order** (Principle #5).

### 3. The perk tree (validation)
```csharp
[Test] public void Tree_HasNoPrerequisiteCycles() { Assert.IsTrue(SkillTree.IsCycleFree(nodes)); }
[Test] public void Tree_EveryNodeReachableFromRoot() { ... }
```

## The Configure discipline

Every progression MonoBehaviour (if any — most of this is plain classes + SOs) exposes:

```csharp
public void Configure(ProgressionProfile profile, StatModifierStack stack);  // explicit init
public void RecomputeStats();   // pure; safe to call repeatedly
```

No state set in `Awake` that a test can't reach. A test calls `Configure` then `RecomputeStats` and asserts — exactly the path `RuntimeOxygenTests` / `RuntimeSuitPowerTests` use against the survival meters.

## What to test (shape invariants — not values)

- Curve monotonicity and bounds.
- Stacking determinism and order (flat-then-percent).
- Perk-tree acyclicity and reachability.
- Capture→Apply round-trip equality (the `guides/07` seam) — so the save handoff is provably lossless.

Do **not** assert specific XP amounts or perk magnitudes — those are game-balance's, and pinning them in a progression test would couple the two lanes wrongly. Test the structure; let `game-balance-guardian` (and `unity-test-ci-guardian` for balance-invariant tests) own value assertions.

## Sources
- CLAUDE.md Hard Rule #11; ARCHITECTURE.md §7.
- `Assets/Scripts/Drift/Core/Combat/Health.cs`, `Core/Survival/SuitPowerSystem.cs` (the lazy-init precedent).
- AGENTS.md (batchmode `-runTests -testPlatform EditMode`).
