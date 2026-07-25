# Research summary — character-progression-weapon

> **⚠️ DEGRADED RESEARCH.** This Weapon was forged in an environment with **no live web access**.
> The "findings" below are grounded in (a) the **actual DRIFT repo** (read directly, verifiable) and
> (b) well-established progression-design knowledge held from training, cited **by name** — not by
> fabricated URL. Where a claim rests on an external source, the source is named as a lookup key
> (e.g. "Schreiber, *Game Balance Concepts*") so a human can verify it; **no URLs are invented.**
> Treat the external-source claims as *pending verification* against the named work. The
> repo-grounded claims (file paths, real types) are first-class and were read, not recalled.

## Why this Weapon exists

PROJECT-DRIFT is a Last-Day-on-Earth-style survival game *with leveling/progression* (GDD §6:
"Skill/perk progression — light perk tree; XP by activity"). Progression is a real designed
system — but it is **Tier 1+**, deliberately absent from the Tier 0 gray-box (GDD §13 Phase 1
has no XP). This Weapon equips `character-progression-guardian` to design that system cleanly,
as ScriptableObject data, EditMode-testable, with the numbers owned by `game-balance-guardian`.

## The six research queries

| # | Query | What it answers | Source posture |
|---|---|---|---|
| 1 | "XP curve shapes for survival/RPG mobile games — linear vs polynomial vs exponential leveling" | How to express a leveling curve as DATA (per-level table vs formula vs `AnimationCurve`); pacing implications | Named: Schreiber *Game Balance Concepts* (progression/curve chapters); common RPG curve formulas (linear, quadratic `n²`, exponential). **DEGRADED** — pending verification. |
| 2 | "Skill tree / perk tree data models — node graphs, prerequisites, ranks, point costs" | The node-graph shape: nodes with prerequisites, ranks, costs; acyclic-prereq invariant; "light perk tree" scope | Named: standard ARPG/survival perk-tree patterns (e.g. tiered point-buy trees). **DEGRADED.** |
| 3 | "Additive vs multiplicative stat modifier stacking — order of operations, modifier sources" | The stacking algorithm: flat (additive) then percent (multiplicative); deterministic order; source attribution | Named: common stat-system architectures (flat-add → percent-add → percent-mult ordering). Grounded in real `StatModifier` struct. **DEGRADED on theory, REAL on the type.** |
| 4 | "Equipment-driven character stats in Unity — ScriptableObject items carrying stat modifiers" | How item stats feed effective character stats; aggregation from equipped items | **REAL** — read `ItemDefinition.statModifiers[]` and `StatModifier.cs` directly in the repo. |
| 5 | "Unity ScriptableObject patterns for progression data — CreateAssetMenu curves and node assets" | Expressing curves/nodes/stat rules as `[CreateAssetMenu]` SOs (Hard Rule #3); the `ItemDefinition` precedent | **REAL** — grounded in the existing `ItemDefinition`/`StatModifier` SO pattern in the repo. |
| 6 | "EditMode-testable progression math in Unity — pure compute without Awake/Start" | The `Configure` + pure-`Recompute` seam (Hard Rule #11); precedent in `Health.EnsureInitialized` / `SuitPowerSystem.EnsureMeter` | **REAL** — read the lazy-init pattern in `Health.cs` and `SuitPowerSystem.cs`; mirrors `ARCHITECTURE.md` §7 and the save-load/game-balance siblings. |

## Load-bearing findings (and where each lands)

1. **A leveling curve is data, not a formula in code.** Express it as a ScriptableObject — either a
   per-level XP-to-next array or an `AnimationCurve` sampled by level. The *exponent / steepness* is a
   `game-balance` number; the *shape-as-asset* is this Weapon's. → `02-xp-and-leveling-curves.md`.

2. **A skill/perk tree is an acyclic prerequisite graph of SO nodes.** Each node: id, ranks, point
   cost per rank, prerequisite node ids, and the `StatModifier[]` (or perk effect) it grants. The
   *power* of each node is a `game-balance` number. → `03-skill-perk-trees.md`.

3. **Stat modifiers stack in a deterministic order, built on the real `StatModifier`.** Flat additive
   first, then percent. The progression stat system aggregates modifiers from level allocation, perks,
   and equipment (`ItemDefinition.statModifiers[]`) keyed by `statId`. → `04-stat-system-and-modifiers.md`,
   `05-equipment-stats.md`, `examples/03-stat-modifier-stacking.md`.

4. **Progression scales existing systems through their max fields.** A `+maxHealth` modifier resolves
   to a scalar that `Health` consumes; `+suitPower` to `SuitPowerSystem.maxPower`. The system shape
   lets stats flow in; the scalar *values* are `game-balance`. → `04`, `05`.

5. **All progression math is EditMode-pure.** `Configure(profile, modifiers)` + `int LevelForXp(int xp)`
   + `float EffectiveStat(statId)` run with no Unity lifecycle, mirroring `Health.EnsureInitialized`.
   → `08-editmode-testing-progression.md`.

6. **The numbers boundary is the whole game.** Every curve value, point payout, and perk magnitude is
   `game-balance-guardian`'s. This Weapon designs the container; balance fills it. → `06-progression-vs-balance-lane.md`.

## Open questions for the human (Tier 1, when scope elevates)

- Level cap and whether the curve is a closed array or an open formula (affects save/migration).
- Respec/refund policy for allocated points (affects the save model — coordinate with `save-load`).
- Whether crew "unlockable bonuses" (GDD §9) reuse the same stat-modifier pipeline or a separate one.
- Whether level gates on zones (GDD §7 "gated by gear and level") read a single `CharacterLevel` or a derived score.
