# Character Progression Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `character-progression-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/character-progression-guardian.md`](../../../../agents/character-progression-guardian.md)
**Weapon:** [`.claude/skills/character-progression-weapon/`](../../character-progression-weapon/)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`character-progression-guardian` is DRIFT's character-progression **system-design** specialist (Unity 6, C#, mobile) for a survival game that ships *with* leveling/progression (GDD §6). Its remit is the *shape* of progression: XP & leveling curves (XP-by-activity — salvage/craft/combat/engineering), skill/perk trees (the GDD §6 "light perk tree" as an acyclic node graph), stat allocation, and equipment-driven stat modifiers — **all expressed as ScriptableObject data** (CLAUDE.md Hard Rule #3), grounded in the real `Drift.Data.Items.StatModifier` struct and `ItemDefinition.statModifiers[]`, with a deterministic additive-then-percent stacking model and an EditMode-pure compute seam (Hard Rule #11).

**Two defining traits frame every routing decision:**

1. **It leads with tier discipline.** Progression is **Tier 1+** — the Tier 0 gray-box deliberately ships with no leveling (GDD §13 Phase 1; CLAUDE.md §3/§4). The default deliverable is a **clean design / ADR, not committed code.** A request to build progression mid-Tier-0 is the scope jump Hard Rule #1 forbids; the Guardian builds only on explicit user scope elevation. Design is always on the table; building is gated. (Mirrors `save-load-guardian`.)
2. **It owns the SHAPE, not the NUMBERS.** This is the load-bearing boundary — see "Do NOT route when" below. The curve values, XP amounts, point payouts, and perk magnitudes are `game-balance-guardian`'s.

## Trigger phrases

Route to `character-progression-guardian` when the user says any of:

- "Design the XP / leveling system" / "How should progression work in DRIFT"
- "Skill tree data model" / "Perk tree" / "Design the perk tree"
- "Stat allocation" / "How do players spend level-up points"
- "Stat modifier stacking" / "How do stats combine"
- "Equipment stats" / "How does gear affect stats" (the *system*, not the numbers)
- "Level curve" / "XP curve as data"
- "Progression ScriptableObjects"
- "EditMode test for progression"

Or when the request implicitly involves the *structure* of how a character grows over time — XP, levels, perks, stat modifiers — as a data-driven system.

## Do NOT route when

- The user wants the progression **NUMBERS / curve VALUES / difficulty tuning** — how much XP per salvage, the curve steepness, the level cap, points-per-level, how powerful a perk is — that is **`game-balance-guardian`**. **This is the single most important boundary for this Guardian.** character-progression designs *that* there is a curve / node graph / stacking model (the shape); game-balance fills *how much* (the numbers). If the answer is a value a designer would tune in a spreadsheet, it's game-balance's. The two **co-own** progression — route to game-balance for tuning, to character-progression for structure.
- The user wants **persistence** of XP / level / allocated points / unlocked perks — the save model, format, versioning, migration, atomic writes — that is `save-load-guardian`. (character-progression defines what's durable and the capture/apply seam; save-load serializes it.)
- The user wants the **C# code shape** — namespaces, asmdef placement, the `Configure`/`Tick` convention, equip-slot containers, or whether to alter the serialized `StatModifier` struct — that is `unity-csharp-guardian`. (character-progression owns the data model + algorithm inside that shape.)
- The user wants **cosmetic looks / outfits / customization / rig** — that is `character-art-rig-guardian`. (character-progression does stats; art does appearance. Clean split.)
- The user wants the **skill-tree UI** — allocation screens, level-up popups, the tree's visual layout — that is a **future progression-UI Guardian** (note it; out of scope today).
- The user wants the **durability decay economy** (`ItemDefinition.durabilityMax` rates, ammo-as-second-sink, Hard Rule #2 / GDD §8) — that is `game-balance-guardian`. (character-progression only notes the stat-contribution interaction.)
- The user wants the **EditMode test harness / CI mechanics** — that is `unity-test-ci-guardian`. (character-progression writes the pure-compute test honoring Rule #11; the harness belongs to unity-test-ci.)
- The user wants **PRD / requirements authoring** for the progression feature — that is `library-guardian`. (character-progression produces the ADR + architectural rationale that feeds the PRD.)

If the request straddles boundaries (e.g., "design the leveling system and tune the curve"), route to `character-progression-guardian` for the system shape first, then to `game-balance-guardian` for the values. If it's "design progression and the inventory it builds on," route to `unity-csharp-guardian` for the Tier 1 inventory rebuild context, then character-progression for the progression layer.

## The tier gate (route, but expect a design-only answer by default)

Routing to this Guardian during Tier 0 is correct — but expect a **design, not built code**, unless the user has explicitly elevated scope past the Tier 0 gate. If a user during Tier 0 says "build the leveling system now," the Guardian will name the Hard Rule #1 conflict, require an explicit "yes, elevate scope," and otherwise deliver the complete design (curve-as-data model, perk-tree graph, stacking algorithm, persistence-shape handoff, EditMode test plan) with all numeric fields left for `game-balance-guardian`. This is intended behavior, not a refusal. See the Weapon's `guides/09-tier-discipline-note.md`.

## Inputs the Guardian needs

- Access to the real stat substrate: `Assets/Scripts/Drift/Data/Items/StatModifier.cs`, `Data/Items/ItemDefinition.cs`, `Data/Items/ItemCategory.cs`, `Data/Items/ItemDatabase.cs`.
- The systems progression scales: `Core/Combat/Health.cs` (`maxHealth`), `Core/Survival/SuitPowerSystem.cs` (`maxPower`).
- `space-survival-design-doc.md` §6 (progression spec), §7 (level-gated zones), §9 (crew bonuses), §13 (tier roadmap).
- `CLAUDE.md` §3/§4 + Hard Rules #1/#3/#11; `ARCHITECTURE.md`; `TIER0.md`; `AGENTS.md`.
- Optional: which slice (XP curve, perk tree, stat system, equipment stats, persistence shape, EditMode plan).
- Optional: an explicit scope-elevation signal if the user wants Tier 1 construction rather than design.

## Outputs the Guardian produces

- **Design / review / audit** → `library/qa/character-progression/<date>-<topic>.md`.
- **Structural decision** → ADR at `library/architecture/ADR-<n>-<topic>.md` (Context / Decision / Consequences / Alternatives).
- **Templates referenced** (design artifacts, not drop-in for Tier 0): `templates/progression-profile.cs`, `templates/skill-node.cs`, `templates/stat-modifier-stack.cs`.
- **EditMode test plans** honoring Hard Rule #11 (shape invariants, not tuned values).

Every finding cites (a) `Assets/Scripts/Drift/...:LN` and (b) the relevant guide in `character-progression-weapon/guides/`. Research is DEGRADED (no live web) — external sources are named, not linked; no fabricated URLs.

## Multi-Guardian sequences this Guardian participates in

- **Tier 1 progression bring-up** (after scope elevation) — `character-progression-guardian` designs the curve/perk-tree/stat-system shape; `game-balance-guardian` tunes every value; `unity-csharp-guardian` reviews the C# shape; `save-load-guardian` persists the state; `unity-test-ci-guardian` runs the EditMode suite. character-progression goes first (the shape), then game-balance fills it.
- **Stat-system design** — `character-progression-guardian` designs the deterministic stacking on the real `StatModifier`; `game-balance-guardian` sets the magnitudes; `unity-csharp-guardian` owns whether/how the serialized struct evolves.
- **Equipment-driven stats** — `character-progression-guardian` aggregates `ItemDefinition.statModifiers[]` into the stack; `game-balance-guardian` sets the per-item values; `game-balance-guardian` also owns the durability economy interaction (Hard Rule #2).
- **Progression persistence** — `character-progression-guardian` defines what's durable (persist `totalXp`, recompute `level`) and the capture/apply seam; `save-load-guardian` owns the save model, versioning, and migration.

## Critical directives the orchestrator should respect

- **Tier discipline is the lead.** Expect design-only output during Tier 0; building requires explicit scope elevation (Hard Rule #1). This is intended, not a refusal.
- **The numbers belong to game-balance — repeatedly.** The Guardian designs the curve as data, the node graph, the stacking model; it will **not** declare an XP amount, level cap, or perk magnitude. Co-owned with `game-balance-guardian`; the orchestrator should route tuning there.
- **Data over code (Hard Rule #3).** The Guardian blocks on hardcoded level tables, perk effects baked into classes, or a `switch (level)` in logic.
- **Grounded in the real `StatModifier`.** The Guardian extends the existing `statId`+`value` struct and consumes `ItemDefinition.statModifiers[]`; it will not invent a parallel stat type.
- **EditMode-pure (Hard Rule #11).** Progression math is `Configure` + pure compute; the Guardian designs it to be testable with no `Awake`/`Start`/`Update`.
- **Stats, not looks; design, not serialization.** The Guardian hands cosmetics to `character-art-rig-guardian` and persistence to `save-load-guardian` at the boundary.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
