# 05 — Equipment-Driven Stats

Equipment is the third faucet into the stat stack (`guides/04`), and it is **already half-built in the repo**. `ItemDefinition` carries `StatModifier[] statModifiers`. This guide designs how equipped items contribute to a character's effective stats — without inventing anything new.

## The real surface (read it)

`Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`:

```csharp
public class ItemDefinition : ScriptableObject
{
    public string id;
    public ItemCategory category;     // gates what's equippable
    public int durabilityMax;         // durability is Tier 1 (Hard Rule #2) — game-balance owns the economy
    public StatModifier[] statModifiers; // <-- the equipment stats, already here
}
```

So a weapon, suit, or tool *already* carries its stat modifiers as data. The progression system just needs to **aggregate the modifiers of equipped items** into the stack.

## The aggregation (shape)

```csharp
// For each equipped ItemDefinition:
foreach (var item in equippedItems)
    foreach (var mod in item.statModifiers)
        stack.Add(mod, KindFor(mod));   // funnels into the same stack as perks + level allocation (guides/04)
```

`category` (an `ItemCategory` enum, already in the repo) determines equip slots — which items can be equipped where (weapon / suit / tool). The **slot model** (how many slots, which categories) is a shape decision; coordinate the equip-slot data with `unity-csharp-guardian` for the runtime container.

## Scaling existing systems

When a `maxHealth` or `suitPower` modifier resolves, the effective value flows to the real fields:

- `Health.maxHealth` (`Core/Combat/Health.cs`) — note `Health` reads `maxHealth` as a serialized field with lazy `EnsureInitialized`; a progression hook sets the effective max (and the apply-path must respect that current ≤ max).
- `SuitPowerSystem.maxPower` (`Core/Survival/SuitPowerSystem.cs`) — same pattern via `EnsureMeter`.

The **system shape** that lets a computed stat set these maxes is this Weapon's. The **scalar values** (how much `+maxHealth` a given suit gives) are `game-balance-guardian`'s. The *wiring code* (where the apply call lives) is co-owned with `unity-csharp-guardian`.

## Durability is NOT this Weapon's

`ItemDefinition.durabilityMax` is real, and durability decay is a deliberate **Tier 1** mechanic (CLAUDE.md Hard Rule #2, GDD §8). The durability **economy** (decay rates, ammo as a second sink) belongs to `game-balance-guardian`. This Weapon only notes that an item's *stat contribution* may scale with its durability state — but **how** it scales (a curve, a cliff, a threshold) is a balance number. Flag the interaction; don't design the decay.

## Equip/unequip recompute (EditMode-safe)

Equip and unequip are state changes that trigger a `Recompute` of the stack (`guides/04`), kept pure so an EditMode test can equip an item and assert the effective stat moved — no scene needed (Hard Rule #11).

## What NOT to do here

- **Don't add stat fields to `ItemDefinition`.** It already has `statModifiers[]`. If a new field is genuinely needed, flag `unity-csharp-guardian` (code shape) + `game-balance-guardian` (whether the value belongs there).
- **Don't design the durability decay economy.** game-balance, Tier 1.
- **Don't set the equipment stat values.** game-balance.

## Sources
- `Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`, `ItemCategory.cs`, `StatModifier.cs` (REAL).
- `Assets/Scripts/Drift/Core/Combat/Health.cs`, `Core/Survival/SuitPowerSystem.cs`.
- CLAUDE.md Hard Rule #2, GDD §8 (durability is Tier 1, game-balance's economy).
