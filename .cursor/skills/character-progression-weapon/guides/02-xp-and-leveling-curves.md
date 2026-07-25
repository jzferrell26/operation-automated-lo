# 02 — XP and Leveling Curves

GDD §6: **"Skill/perk progression — light perk tree; XP by activity (salvage, craft, combat, engineering)."** GDD §7: zones are "gated by gear and level." This guide designs the *shape* of XP earning and the leveling curve — as data. The values are `game-balance-guardian`'s.

## XP sources (shape, from GDD §6)

XP is earned by activity. The shape: an enum of activity types, and a hook where each activity reports XP. The activities exist in the real spine already as the loop's verbs — salvage (`SalvageNode`), craft (`SimpleCrafter`), combat (`PlayerMeleeAttack` / enemy kills), and engineering (station ops, GDD §9). The Weapon designs the *plumbing* (an `XpEvent` with a source + a numeric grant); game-balance owns *how much each grants*.

```csharp
public enum XpSource { Salvage, Craft, Combat, Engineering }
// The grant AMOUNT per source is a game-balance value, ideally on a ScriptableObject — not inlined.
```

## The curve as data — two valid shapes

A leveling curve maps cumulative XP → level. Express it as **one ScriptableObject sampled by level**, never a `switch` on level (Principle #9).

**Shape A — per-level array** (`xpToReach[level]`): explicit, designer-friendly, closed level cap, trivial to read. Best when the cap is small and hand-tuned.

**Shape B — `AnimationCurve` or formula params** (`baseXp`, `exponent`): `xpToReach(level) = baseXp * level^exponent`. Compact, open-ended, smooth. Best when the cap is large.

Both are SOs. The **choice of shape** is this Weapon's; the **array values / `baseXp` / `exponent`** are game-balance's. Common formula families (named, DEGRADED): linear (`a*level`), quadratic (`a*level²` — classic RPG feel), exponential (`a*bᶫᵉᵛᵉˡ` — steep late grind). See `research/research-summary.md` Q1.

## The pure lookup (EditMode-safe)

```csharp
// On the ProgressionProfile SO (templates/progression-profile.cs):
public int LevelForXp(int totalXp)        // pure — no Unity lifecycle
public int XpToReach(int level)           // sampled from the array/curve
public int XpIntoLevel(int totalXp)       // for a progress bar (UI reads it)
```

`LevelForXp` is deterministic and side-effect-free, so an EditMode test can assert `profile.LevelForXp(0) == 1` etc. with no `Awake` (Hard Rule #11; `guides/08`).

## Level-up rewards (shape)

On level-up, the profile grants rewards — stat points, skill points, maybe a perk-tree unlock. Model rewards as data on the profile (`statPointsPerLevel`, `skillPointsPerLevel`, optional per-level overrides). The **counts** are game-balance's; the **fact that level-up grants points** is the shape.

## What NOT to do here

- **Don't tune the curve.** "Level 10 should need 5,000 XP" is a game-balance call. Design the container; flag the number.
- **Don't branch on level in gameplay code.** Sample the curve SO.
- **Don't build it mid-Tier-0.** This is Tier 1 design (Hard Rule #1).

## Sources
- GDD §6 (XP by activity), §7 (level-gated zones), §13 (Tier roadmap).
- `examples/01-xp-curve-and-levelup-so.md`, `templates/progression-profile.cs`.
- `research/research-summary.md` Q1 (DEGRADED — curve families named, not verified).
