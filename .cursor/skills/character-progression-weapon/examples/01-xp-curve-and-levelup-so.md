# Example 01 — An XP Curve + Level-Up ScriptableObject

A worked walk-through of designing the leveling curve as data. **Design artifact — Tier 1** (`guides/09`). **Values are placeholders for `game-balance-guardian`** (`guides/06`).

## The ask (typical)

> "Design the XP/leveling system. XP comes from salvaging, crafting, fighting, and engineering. Players level up and get points."

## The tier-discipline opener (always)

> Leveling is a Tier 1+ system — the Tier 0 gray-box ships with no XP (GDD §13, CLAUDE.md §3/§4). Building it now violates Hard Rule #1. Here is the **design** for when scope elevates. Note up front: the curve **values** (how much XP, the steepness, the cap) are `game-balance-guardian`'s, not mine — I design the container.

## The shape

XP is earned by activity (GDD §6). The plumbing is an `XpSource` enum + a grant hook:

```csharp
public enum XpSource { Salvage, Craft, Combat, Engineering }
// progression.GrantXp(XpSource.Salvage);  // the AMOUNT per source is a game-balance value
```

The curve is one `ProgressionProfile` ScriptableObject (`templates/progression-profile.cs`), sampled by level — never a `switch` on level (Principle #9):

```csharp
[CreateAssetMenu(fileName = "Progression_", menuName = "Drift/Progression Profile")]
public class ProgressionProfile : ScriptableObject
{
    public string id;
    public int[] xpToReach = { 0, 100, 250, 450 };  // PLACEHOLDER — game-balance fills
    public int statPointsPerLevel = 1;              // PLACEHOLDER
    public int skillPointsPerLevel = 1;             // PLACEHOLDER
    public int LevelForXp(int totalXp) { /* pure lookup */ }
}
```

## The flow

1. An activity fires → `GrantXp(source)` adds `totalXp += amount` (amount = game-balance).
2. `LevelForXp(totalXp)` derives the level (pure; never stored — `guides/07`).
3. On a level increase, the profile grants `statPointsPerLevel` + `skillPointsPerLevel` (counts = game-balance).

## What I designed vs. what I handed off

| I designed (shape) | Handed to game-balance (numbers) |
|---|---|
| Curve is an SO sampled by level | The `xpToReach` array values |
| Monotonicity invariant (`IsMonotonic`) | The steepness / exponent |
| Level cap = array length | The actual cap |
| Level-up grants points | `statPointsPerLevel`, `skillPointsPerLevel` |
| `XpSource` enum + grant hook | XP amount per source |

## What I handed to other Guardians

- **Persistence** of `totalXp` + points → `save-load-guardian` (`guides/07`). I store `totalXp`, never the derived `level`.
- **Code shape** of the grant hook / where it lives → `unity-csharp-guardian`.

## The EditMode test (shape, not values — `guides/08`)

```csharp
[Test] public void LevelForXp_StartsAtOne() {
    var p = ScriptableObject.CreateInstance<ProgressionProfile>();
    p.ConfigureForTest(new[] { 0, 100, 250 });
    Assert.AreEqual(1, p.LevelForXp(0));
    Assert.AreEqual(2, p.LevelForXp(100));
    Assert.IsTrue(p.IsMonotonic());
}
```

Asserts the structure (starts at 1, monotonic) — not specific tuned amounts.

## Sources
- GDD §6 (XP by activity), §13 (tier roadmap). `templates/progression-profile.cs`. `guides/02`, `06`, `07`, `08`, `09`.
