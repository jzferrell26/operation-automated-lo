# Research plan — character-progression-weapon

> **⚠️ DEGRADED RESEARCH.** Forged with **no live web access**. External sources are named, not
> linked; repo facts are read directly and are first-class. No fabricated URLs.

The load-bearing claims rest on two pillars: (1) the **actual DRIFT repo** — read, verifiable —
and (2) established progression-design knowledge, cited by the name of the work so a human can
verify it later.

## Method

- **Project truth before theory.** Every data-model and code-grounding claim is verified against
  the real repo files (`StatModifier.cs`, `ItemDefinition.cs`, `Health.cs`, `SuitPowerSystem.cs`,
  `CLAUDE.md`, the GDD, `ARCHITECTURE.md`, `TIER0.md`, `AGENTS.md`), not from memory.
- **External sources by name.** Design-theory pages are cited by the exact title of the work so
  they can be found without a guessed URL.
- **No fabricated URLs.** Where a guide says "Schreiber, *Game Balance Concepts*", that is the
  lookup key, not a link.
- **The numbers boundary is honored in research too.** Where a query drifts toward "what value",
  it is reframed to "what shape" — values are `game-balance-guardian`'s.

## Queries and the guide each supports

| # | Query | Supports guide | Source posture |
|---|---|---|---|
| 1 | XP curve shapes — linear vs polynomial vs exponential leveling for mobile survival/RPG | `02-xp-and-leveling-curves.md` | Named: Schreiber, *Game Balance Concepts* (transitive/curve chapters); standard RPG curve formulas. **DEGRADED.** |
| 2 | Skill/perk tree data models — node graphs, prerequisites, ranks, point costs | `03-skill-perk-trees.md` | Named: tiered point-buy / prerequisite-graph perk-tree patterns. **DEGRADED.** |
| 3 | Additive vs multiplicative stat-modifier stacking and order of operations | `04-stat-system-and-modifiers.md`, `examples/03-stat-modifier-stacking.md` | Named: flat-add → percent ordering convention. Grounded in real `StatModifier`. **DEGRADED on theory, REAL on type.** |
| 4 | Equipment-driven character stats in Unity via ScriptableObject items | `05-equipment-stats.md` | **REAL** — `ItemDefinition.statModifiers[]`, `StatModifier.cs` read in repo. |
| 5 | ScriptableObject patterns for progression data (`CreateAssetMenu` curves/nodes) | `01-progression-as-data.md`, `02`, `03` | **REAL** — built on the existing `ItemDefinition` SO precedent. |
| 6 | EditMode-testable progression math (pure compute, no Awake/Start) | `08-editmode-testing-progression.md` | **REAL** — `Health.EnsureInitialized`, `SuitPowerSystem.EnsureMeter`, `ARCHITECTURE.md` §7, Hard Rule #11. |

## Repo files read (first-class, verifiable)

- `Assets/Scripts/Drift/Data/Items/StatModifier.cs` — `[Serializable] struct StatModifier { string statId; float value; }`.
- `Assets/Scripts/Drift/Data/Items/ItemDefinition.cs` — carries `StatModifier[] statModifiers`, `durabilityMax`, `category`, `craftCost`.
- `Assets/Scripts/Drift/Core/Combat/Health.cs` — `maxHealth`, lazy `EnsureInitialized` (EditMode-safe precedent).
- `Assets/Scripts/Drift/Core/Survival/SuitPowerSystem.cs` — `maxPower`, lazy `EnsureMeter` (EditMode-safe precedent).
- `space-survival-design-doc.md` §6/§7/§9/§13; `CLAUDE.md` §3/§4 + Hard Rules; `ARCHITECTURE.md`; `TIER0.md`; `AGENTS.md`.

## Open questions for the human (Tier 1, when scope elevates)

- Level-cap shape: closed per-level array vs open formula (affects save & migration).
- Respec policy (affects the save model — coordinate with `save-load-guardian`).
- Do crew "unlockable bonuses" (GDD §9) reuse the stat-modifier pipeline?
- Zone level-gates (GDD §7): single `CharacterLevel` or a derived gear+level score?
