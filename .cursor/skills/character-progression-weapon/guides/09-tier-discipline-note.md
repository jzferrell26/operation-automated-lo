# 09 — Tier Discipline Note

Read this **first**, every invocation. It is the spine of the Weapon, exactly as it is for `save-load-guardian`.

## The gate

Progression — XP, leveling, perks, stat allocation — is **Tier 1+**, not Tier 0.

- **GDD §13 Phase 1** (the Tier 0 deliverable) is explicit: "salvage 3 resource types, craft the 3 starter tools, fight one mutation type, extract back to the station, survive one low-level raider assault. Gray-box art. **No save system even.**" There is **no XP, no level, no perk tree** in that list.
- **GDD §6** *does* spec progression ("Skill/perk progression — light perk tree; XP by activity") — but §6 is the **full spec**, the Tier 1+ vision, not the Phase 1 gray-box.
- **CLAUDE.md §3** (Status Map) lists every Tier 0 item; **none of them is progression**. Progression isn't even `[NOT STARTED]` in the map — it's below the Tier 0 line entirely.
- **CLAUDE.md §4** keeps the current objective at Tier 0 ("Tier 0 spine hardening… the gray-box assembly + the 'is it fun?' play test").
- **CLAUDE.md Hard Rule #1:** "Build top-down, one tier at a time. Do NOT build Tier 1+ systems while Tier 0 is incomplete."

So building the progression system now is precisely the scope jump Hard Rule #1 forbids.

## The default deliverable: design, not code

Unless the user **explicitly elevates scope**, every response from this Guardian is:

- A **clean system design** — the SO shapes, the stacking model, the EditMode-test plan, the save handoff.
- An **ADR** when a structural decision is worth recording (`library/architecture/ADR-<n>-<topic>.md`).
- A **review** of a proposed progression design against these guides.

It is **not**:

- A directive to add `ProgressionProfile.cs` / `SkillNodeDefinition.cs` to the project now.
- A set of authored `.asset` files dropped into `Assets/`.
- Any committed code that activates leveling mid-Tier-0.

The templates in this Weapon (`templates/*.cs`) document the **target shape**; they are design artifacts, not drop-in files for the current tier.

## How the user elevates scope (the only way to build)

Construction begins only when the user says something unambiguous, e.g.:

- "Tier 0 is fun and signed off — we're starting Tier 1 progression."
- "Elevate scope: build the leveling system now."

Even then, lead with the dependency order: Tier 0 must be **playable and fun-confirmed** first (CLAUDE.md §4's definition of done), and progression should land *after* (or alongside) the Tier 1 inventory/crafting rebuild it leans on (GDD §13 "Weeks 7–12: expand the inventory ScriptableObject system").

## How to open a response (the framing)

> "Progression (XP, leveling, perks) is a Tier 1+ system — the Tier 0 gray-box deliberately ships with no leveling (GDD §13, CLAUDE.md §3/§4), and building it now would violate Hard Rule #1. So here's the **design** for when scope elevates… (and remember: the curve/perk **values** are `game-balance-guardian`'s, not mine)."

That single sentence carries both spines: tier discipline *and* the numbers boundary.

## When the user pushes to build anyway

Flag the scope jump (Hard Rule #10: "Flag, don't freelance"). Restate that Tier 0 isn't fun-confirmed yet and that progression depends on the Tier 1 inventory/crafting rebuild. If they confirm explicitly, proceed — designing first, building cleanly on the `Drift` spine, EditMode-safe, data-driven, with values left for game-balance.

## Sources
- GDD §6 (full progression spec), §13 (tier roadmap, Phase 1 deliverable).
- CLAUDE.md §3 (Status Map), §4 (objective), Hard Rules #1 and #10.
- `.claude/skills/save-load-weapon/guides/09-tier-discipline-note.md` (the sibling pattern this mirrors).
