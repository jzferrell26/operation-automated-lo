# character-progression-weapon

The procedural arsenal for `character-progression-guardian`, DRIFT's character-progression **system-design** specialist (Unity 6 / C# / mobile).

## What this weapon covers

- **XP & leveling curves** — XP-by-activity (GDD §6), the curve expressed as ScriptableObject data, level-up rewards
- **Skill / perk trees** — the node-graph data model: nodes, ranks, prerequisites, point costs (GDD §6 "light perk tree")
- **Stat system & modifiers** — deterministic additive-then-percent stacking, grounded in the real `Drift.Data.Items.StatModifier`
- **Equipment-driven stats** — how `ItemDefinition.statModifiers[]` feed a character's effective stats
- **EditMode-safe compute** — `Configure` + pure `LevelForXp` / `EffectiveStat` (Hard Rule #11)

## The two things that lead every response

1. **Tier discipline.** Progression is **Tier 1+**. The GDD §13 Phase 1 gray-box ships with **no leveling**, and CLAUDE.md §3/§4 keep the objective at Tier 0. The default deliverable is a clean DESIGN, not a directive to build now. Building mid-Tier-0 needs explicit scope elevation (Hard Rule #1). See `guides/09-tier-discipline-note.md`.
2. **The numbers boundary.** This Weapon owns the **system SHAPE**. `game-balance-guardian` owns the **curve VALUES, XP amounts, point payouts, and perk magnitudes**. Design the container; let balance fill it. See `guides/06-progression-vs-balance-lane.md`.

## Reading order

1. Read `SKILL.md` — master index, hard rules, severity rubric, routing table, output paths
2. Read `guides/00-principles.md` — the principles and the numbers boundary
3. Read `guides/09-tier-discipline-note.md` — confirm whether the work is design-only
4. Open the guide matching your task (see the routing table in `SKILL.md`)
5. Reference `research/` for the (DEGRADED) source trail behind a claim

## Grounded in real code (Hard Rule #3 — data over code)

This Weapon does **not** invent a stat type. It extends what already exists:

- `Assets/Scripts/Drift/Data/Items/StatModifier.cs` — `[Serializable] struct StatModifier { string statId; float value; }`
- `Assets/Scripts/Drift/Data/Items/ItemDefinition.cs` — already carries `StatModifier[] statModifiers`
- `Assets/Scripts/Drift/Core/Combat/Health.cs` / `Core/Survival/SuitPowerSystem.cs` — the stats progression scales, and the lazy-init precedent for EditMode-safe code

## Key rule

**Design the shape; never declare the number.** If the question is "how much XP / how strong a perk / what level cap," it belongs to `game-balance-guardian` — hand it off. If the objective is still Tier 0, the answer is design, not code.
