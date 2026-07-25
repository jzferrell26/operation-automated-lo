# 01 — Balance as Data

> CLAUDE.md Hard Rule #3: **Data over code for content.** Items, recipes, structures, crew = ScriptableObjects. Add content as data, not hardcoded classes. Balance numbers obey the same rule.

## The rule

A balance number is a **value the human will want to change without recompiling logic.** It must live in one of two places:

1. **`Tier0Balance`** (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`) — a `static class` of `const` ids and tuning numbers, referenced by both gameplay and tests so a change happens in one place (ARCHITECTURE.md §3). This is the Tier 0 home for *scalar* tuning.
2. **A ScriptableObject / authored asset** — `ItemDefinition` (`stackMax`, `weight`, `durabilityMax`), `RecipeDefinition` (`outputAmount`, `ingredients[]`). This is the home for *content* tuning that designers author per-item.

A number that lives **inline in a method body** is the anti-pattern. It is invisible to the feel pass, can drift between call sites, and can't be tested against an invariant.

## What's already done right

`Tier0Balance` already centralizes the economy scalars:

```csharp
public const int ScrapMetalNodeAmount = 14;   // faucet
public const int CutterScrapCost = 4;          // sink
public const int DeckPlateScrapCost = 2;       // build sink
```

This is the pattern. Yields, recipe costs, and the deck-plate cost are all here, and `SalvageNode` / `SimpleCrafter` / `Tier0BuildPlanner` read from it. Good.

## What's NOT done — the extraction backlog

These balance-load-bearing numbers are still inline `[SerializeField]` defaults with no `Tier0Balance` mirror. They are tunable on the component, which is *acceptable* for a single instance, but the moment they're referenced by tests or a second spawn path they should graduate to `Tier0Balance` so there's one source of truth:

| Number | Current home | Value |
|---|---|---|
| Oxygen drain | `OxygenSystem.cs:12` `drainPerSecond` | `1f` |
| Suffocation damage | `OxygenSystem.cs:13` `suffocationDamagePerSecond` | `8f` |
| Suit sprint drain | `SuitPowerSystem.cs:11` `sprintDrainPerSecond` | `18f` |
| Suit recharge | `SuitPowerSystem.cs:12` `rechargePerSecond` | `20f` |
| Enemy attack damage | `MutatedCrewEnemy.cs:24` `attackDamage` | `12f` |
| Enemy detect radius | `MutatedCrewEnemy.cs:20` `detectRadius` | `10f` |
| Enemy attack cooldown | `MutatedCrewEnemy.cs:25` `attackCooldown` | `1.2f` |

**Finding template:** "`drainPerSecond` is an inline `[SerializeField]` at `OxygenSystem.cs:12`. It is the primary surface-tension lever (GDD §3) and is referenced by `RuntimeOxygenTests`. Extract it to `Tier0Balance.OxygenDrainPerSecond` and have the field default to it, so the tuning surface stays single-source. **Should-tune** (it works today; it becomes must-fix the moment a second spawn path sets it differently)."

## The two-layer pattern: const → ScriptableObject

`Tier0Balance` consts are perfect while the value set is small and code-owned. **Graduate to a ScriptableObject when:**

- the human wants to author *multiple profiles* (easy/normal/hard zone tiers — GDD §7 green/yellow/red),
- the value set grows past ~20 scalars and a flat static class becomes a wall of consts,
- a designer (non-coder) needs to tweak values in the Inspector without touching `.cs`.

`templates/balance-scriptableobject.cs` gives the `[CreateAssetMenu(menuName = "Drift/Balance Profile")]` pattern. The migration is mechanical: copy the consts into serialized fields, have `Tier0RuntimeSpawner` read the profile asset, keep `Tier0Balance` as the *default* profile's values.

> **Don't over-engineer Tier 0.** The flat `Tier0Balance` class is the right call for the gray-box. The SO profile is the Tier 1 move when zone tiers arrive. Spec it; don't build it early (tier discipline).

## EditMode-safety note

Any new MonoBehaviour holding tuning that needs test coverage must follow ARCHITECTURE.md §7 — lazy-init + `Configure(...)` + extracted `Tick`/`Step`. That's `unity-csharp-guardian`'s and `unity-test-ci-guardian`'s domain; you just supply the values. Hand off the code shape.

## Checklist

- [ ] Is this number referenced from more than one place? → must be in `Tier0Balance`.
- [ ] Is it inline in a method body? → must-fix extraction.
- [ ] Is it an inline `[SerializeField]` referenced by a test? → should-tune extraction.
- [ ] Will the human want per-tier profiles of it? → spec a ScriptableObject (Tier 1).
