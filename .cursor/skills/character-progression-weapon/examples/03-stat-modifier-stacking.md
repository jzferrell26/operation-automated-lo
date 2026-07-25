# Example 03 — Stat-Modifier Stacking (grounded in `StatModifier.cs`)

The most load-bearing example: how modifiers from level allocation, perks, and equipment combine into an effective stat — built on the **real** `StatModifier` struct. **Design artifact — Tier 1** (`guides/09`). **The magnitudes are `game-balance-guardian`'s** (`guides/06`).

## The ask

> "How do a player's level bonuses, perks, and equipped gear combine into their actual stats?"

## The real substrate (read, not recalled)

`Assets/Scripts/Drift/Data/Items/StatModifier.cs`:

```csharp
[Serializable]
public struct StatModifier { public string statId; public float value; }
```

`ItemDefinition.cs` already has `public StatModifier[] statModifiers;`. So the game *already* attaches stat modifiers to items. The progression system is the **aggregator** — it does not invent a parallel type (Principle #4).

## The three faucets, one stack

```csharp
var stack = new StatModifierStack();                  // templates/stat-modifier-stack.cs
stack.Configure(new Dictionary<string, float> { ["maxHealth"] = 100f }); // base — value is game-balance's

// 1) Level allocation: player put 2 points into maxHealth (per-point value = game-balance)
stack.Add(new StatModifier { statId = "maxHealth", value = 20f }, ModifierKind.Flat);

// 2) Perk "Tough I" grants a flat bonus (magnitude = game-balance)
stack.Add(new StatModifier { statId = "maxHealth", value = 10f }, ModifierKind.Flat);

// 3) Equipped suit's ItemDefinition.statModifiers[] — a percent bonus (value = game-balance)
stack.Add(new StatModifier { statId = "maxHealth", value = 0.10f }, ModifierKind.Percent);

float effective = stack.EffectiveStat("maxHealth");   // (100 + 20 + 10) * (1 + 0.10) = 143
```

## The deterministic order (Principle #5 — the whole point)

```
effective = (base + Σflat) * (1 + Σpercent)
          = (100  +  30  ) * (1 + 0.10)
          = 130 * 1.10
          = 143
```

Flat first, then percent. **Always.** Same inputs → 143, every time. Non-determinism here would be a must-fix: it breaks game-balance's reasoning *and* the save round-trip.

## The flat-vs-percent "kind" carried out-of-band

The serialized `StatModifier` has only `statId` + `value` — no kind. The aggregator carries `ModifierKind` **at aggregation time** (a convention by `statId` suffix, or a thin wrapper), so the **real struct stays untouched**. Changing the serialized type would be a `unity-csharp-guardian` decision — flag it, don't freelance.

## Where the effective stat lands

`maxHealth` 143 flows to `Health.maxHealth` (`Core/Combat/Health.cs`); a `suitPower` stat to `SuitPowerSystem.maxPower` (`Core/Survival/SuitPowerSystem.cs`). The **wiring** is co-owned with `unity-csharp-guardian`; the **scalar values** are game-balance's; the **shape** (a stat resolves to a max) is mine.

## What I designed vs. handed off

| I designed (shape) | game-balance fills | csharp owns |
|---|---|---|
| Aggregator funnels 3 sources into one stack | the base 100, the +20/+10/+10% | the equip-slot container |
| Deterministic flat-then-percent order | per-point / per-perk magnitudes | where the apply-call lives |
| Built on the real `StatModifier` | — | whether to alter the struct |

## The EditMode test (pins determinism — `guides/08`)

```csharp
[Test] public void Stack_AppliesFlatThenPercent() {
    var s = new StatModifierStack();
    s.Configure(new Dictionary<string, float> { ["maxHealth"] = 100f });
    s.Add(new StatModifier { statId = "maxHealth", value = 30f }, ModifierKind.Flat);
    s.Add(new StatModifier { statId = "maxHealth", value = 0.10f }, ModifierKind.Percent);
    Assert.AreEqual(143f, s.EffectiveStat("maxHealth"));
}
```

No scene, no `Awake` — pure compute (Hard Rule #11).

## Sources
- `Assets/Scripts/Drift/Data/Items/StatModifier.cs`, `ItemDefinition.cs` (REAL).
- `Assets/Scripts/Drift/Core/Combat/Health.cs`, `Core/Survival/SuitPowerSystem.cs`.
- `templates/stat-modifier-stack.cs`. `guides/04`, `05`, `06`, `08`.
