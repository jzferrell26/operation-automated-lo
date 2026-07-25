# 04 — Stat System and Modifiers (grounded in `StatModifier.cs`)

This is the heart of the Weapon, and it is grounded in a **real type already in the repo**. Do not invent a parallel stat type (Principle #4).

## The real substrate (read it, don't recall it)

`Assets/Scripts/Drift/Data/Items/StatModifier.cs`:

```csharp
[Serializable]
public struct StatModifier
{
    public string statId;
    public float value;
}
```

And `ItemDefinition.cs` already carries `public StatModifier[] statModifiers;`. So the game *already* has a stat-modifier concept attached to items. The progression stat system is the **aggregator** that turns a pile of these (from level allocation, perks, and equipment) into an effective stat. It extends this struct; it does not replace it.

## What a "stat" is

A stat is a named scalar — `statId` is the key. Candidate stats map onto systems that already exist:

| `statId` (example) | Scales | Real field |
|---|---|---|
| `maxHealth` | survivability | `Health.maxHealth` (`Core/Combat/Health.cs`) |
| `suitPower` | sprint/O2 budget | `SuitPowerSystem.maxPower` (`Core/Survival/SuitPowerSystem.cs`) |
| `meleeDamage` | combat | `PlayerMeleeAttack` |
| `craftSpeed`, `salvageYield` | economy | crafting / salvage |

The **set of stat ids** is a shape decision (this Weapon, ideally a `StatDefinition` SO per `guides/01`). The **base values and how much each modifier adds** are `game-balance-guardian`'s.

## The stacking algorithm (deterministic — Principle #5)

Given a base value and a list of `StatModifier` from all sources, the effective stat is computed in a **fixed order**:

```
effective = base
flat sum   = Σ (value of modifiers tagged additive)        // applied first
percent sum= Σ (value of modifiers tagged percent)         // applied to (base + flat)
effective  = (base + flatSum) * (1 + percentSum)
```

The bare `StatModifier` struct has only `statId` + `value`, so the aggregator needs to know *which* modifiers are flat vs percent. Two clean options (a Tier-1 design choice, flag to `unity-csharp-guardian` for the code shape):

- **Convention by `statId` suffix** — e.g. `craftSpeed` (flat) vs `craftSpeed.pct` (percent). Zero schema change to the real struct.
- **A thin wrapper** — `ModifierKind { Flat, Percent }` alongside the `StatModifier` at aggregation time, kept *out* of the serialized struct so the real type is untouched.

Either way the **order is fixed** so the result is deterministic — same inputs, same effective stat, every time. Non-determinism is a must-fix (it breaks both balance reasoning and save round-trips).

`templates/stat-modifier-stack.cs` implements this as a pure aggregator.

## Modifier sources (all funnel through the stack)

1. **Level allocation** — points the player spends raise a stat (a `StatModifier` per allocated point; the *per-point value* is game-balance).
2. **Perks** — `SkillNodeDefinition.grantsPerRank` (`guides/03`) emit `StatModifier[]`.
3. **Equipment** — `ItemDefinition.statModifiers[]` from equipped items (`guides/05`).

All three produce `StatModifier` lists keyed by `statId`; the aggregator sums them per stat. One pipeline, three faucets.

## The pure compute seam (EditMode-safe, Hard Rule #11)

```csharp
public sealed class StatModifierStack
{
    public void Configure(IReadOnlyDictionary<string, float> baseStats); // no Awake
    public void Add(StatModifier mod, ModifierKind kind);
    public float EffectiveStat(string statId);   // deterministic, pure
}
```

A test asserts `base 100 + flat 20, +10% → 132` with no scene. See `examples/03-stat-modifier-stacking.md`.

## What NOT to do here

- **Don't add fields to the serialized `StatModifier` struct** without flagging `unity-csharp-guardian` (code shape) — keep the real type stable; carry kind out-of-band.
- **Don't set the per-point or per-perk magnitudes.** game-balance.
- **Don't build it mid-Tier-0.** Tier 1 design.

## Sources
- `Assets/Scripts/Drift/Data/Items/StatModifier.cs`, `ItemDefinition.cs` (REAL).
- `Assets/Scripts/Drift/Core/Combat/Health.cs`, `Core/Survival/SuitPowerSystem.cs` (the stats scaled).
- `templates/stat-modifier-stack.cs`, `examples/03-stat-modifier-stacking.md`.
- `research/research-summary.md` Q3 (DEGRADED on stacking theory; REAL on the type).
