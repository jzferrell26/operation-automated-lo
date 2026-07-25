# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Tier discipline first
Progression is **Tier 1+**. The Tier 0 gray-box (GDD §13 Phase 1) ships with **no leveling**; CLAUDE.md §3 lists no progression in the Status Map and §4 keeps the objective at Tier 0. The default deliverable is a **design / ADR, not committed code.** Building progression mid-Tier-0 is the scope jump CLAUDE.md Hard Rule #1 forbids — it happens only on explicit user scope elevation. Source: `guides/09-tier-discipline-note.md`, CLAUDE.md §3/§4 + Hard Rule #1.

### 2. The numbers belong to game-balance
This Weapon owns the **system SHAPE** — that there is a curve, a node graph, a stacking model. `game-balance-guardian` owns the **VALUES** — how much XP, the curve exponent, points per level, perk power. Stated here, and restated in every guide. Declaring a number is a lane violation. Source: `guides/06-progression-vs-balance-lane.md`.

### 3. Data over code (CLAUDE.md Hard Rule #3)
XP curves, perk nodes, stat-allocation rules, and equipment modifiers are **ScriptableObjects**. A hardcoded level table, a perk effect baked into a gameplay class, or a `switch (level)` in logic is a **must-fix**. The existing `ItemDefinition` is the precedent. Source: `guides/01-progression-as-data.md`.

### 4. Build on the real `StatModifier`
The stat system extends `Drift.Data.Items.StatModifier` (`statId` string + `float value`) and consumes `ItemDefinition.statModifiers[]`. Do **not** invent a parallel stat type. Source: `Assets/Scripts/Drift/Data/Items/StatModifier.cs`, `guides/04-stat-system-and-modifiers.md`.

### 5. Stacking order is deterministic
Modifiers aggregate in a fixed order — flat additive first, then percent/multiplicative. Same inputs → same effective stat, always. Non-determinism is a must-fix (it breaks both balance and save round-trips). Source: `guides/04-stat-system-and-modifiers.md`.

### 6. Progression math is EditMode-pure (Hard Rule #11)
`Configure(...)` + pure `LevelForXp` / `EffectiveStat` / `Recompute` with no `Awake`/`Start`/`Update` logic. Mirror `Health.EnsureInitialized` and `SuitPowerSystem.EnsureMeter`. Source: `guides/08-editmode-testing-progression.md`, ARCHITECTURE.md §7.

### 7. Persistence is save-load's
Define WHAT progression state is durable (XP, level, allocated points, unlocked perks) and shape it capture/apply-friendly. Hand the serialization, schema, and migration to `save-load-guardian`. Source: `guides/07-progression-persistence-handoff.md`.

### 8. Stats, not looks
This Weapon does the numbers a character carries. Cosmetics, outfits, and rig belong to `character-art-rig-guardian`. Source: this guide.

### 9. Curves are sampled, not branched
A leveling curve is one SO sampled by level — never a `switch` on level in code. Branching code is a should-refactor; the same logic as data is correct. Source: `guides/02-xp-and-leveling-curves.md`.

### 10. Progression is content
Like items and recipes, perks and curves are authored as data; the runtime references them by id, never hardcodes them. Source: CLAUDE.md Hard Rule #3, `guides/01-progression-as-data.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] Tier gate checked (CLAUDE.md §3/§4). If Tier 0 and no scope elevation → output is **design-only**, said up front.
- [ ] Real stat substrate read (`StatModifier.cs`, `ItemDefinition.cs`); systems progression scales noted (`Health.cs`, `SuitPowerSystem.cs`).
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] The numbers boundary in mind — any "how much / how strong" goes to `game-balance-guardian`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).

## The numbers boundary (the load-bearing line)

> **character-progression owns the SHAPE. game-balance owns the NUMBERS.**

| You design (shape) | game-balance fills (numbers) |
|---|---|
| The curve is a ScriptableObject sampled by level | The curve's steepness / exponent / per-level XP |
| A skill node has a point cost and prerequisites | How many points; how powerful the perk |
| Stats stack additive-then-percent | The actual `+10 maxHealth`, `+15% craftSpeed` values |
| XP comes from salvage/craft/combat/engineering (GDD §6) | How much XP each activity grants |

When in doubt: if the answer is a number a designer would tune, hand it off.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: surface at the boundary; don't author the other Guardian's work.

| Question | Owner |
|---|---|
| Curve values, XP amounts, point payouts, perk magnitudes, difficulty tuning | `game-balance-guardian` |
| Persistence of XP/level/points; save model & migration | `save-load-guardian` |
| C# code shape, namespaces, asmdef, `Configure`/`Tick` conventions | `unity-csharp-guardian` |
| Cosmetic looks / outfits / rig | `character-art-rig-guardian` |
| Skill-tree UI / allocation screens | future progression-UI Guardian |
| PRD authoring | `library-guardian` |

## Severity rubric

| Severity | Examples | Blocks? |
|---|---|---|
| **Must-fix** | Hardcoded level table / XP formula / perk effect (Hard Rule #3); a parallel stat type ignoring `StatModifier`; non-deterministic stacking; a path that can't EditMode round-trip; **proposing committed progression code while objective is Tier 0**; **declaring a curve value / XP amount / perk power** (that's game-balance's) | Yes |
| **Should-refactor** | Curve as branching code instead of sampled SO; undocumented stacking order; progression state awkward to capture/apply; logic inlined in `Awake` (no `Configure` seam) | No — opens follow-up |
| **Style** | SO field naming, asset file naming, node-id conventions | Never |

Calling a taste note "must-fix" destroys credibility. And, above all: **directing construction mid-Tier-0 is a scope violation; declaring a number is a lane violation** — flag both, don't commit them.

## Citation discipline

Every finding has two citations: (1) where in the user's codebase (`Assets/Scripts/Drift/...:LN`) and (2) why — a guide section or a named design work. Research is **DEGRADED** (no live web); external claims are named, not linked. No invented URLs.
