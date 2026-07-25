# Research Plan — procedural-generation-weapon

Forge date: 2026-06-22

> Runs **DEGRADED** (no live web during the forge). See `research-summary.md` for the banner and
> the named-source list. This plan records the intended research shape so a maintainer with web
> access can re-verify each query against its named source.

## Goal

Ground every active guide in `procedural-generation-weapon/guides/` against (a) the as-built DRIFT
code that procgen produces content for — read directly and cited by file:line — and (b) named,
established procedural-generation literature. The repo is the load-bearing source of truth; the
external literature provides the algorithm shapes (Poisson-disc, alias selection, modular
assembly, seedable PRNG).

## Authoritative anchor sources (named — DEGRADED, no URLs)

- **PROJECT-DRIFT repo (primary, directly read):**
  - `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` — resource/tool ids + amounts a drop table consumes.
  - `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs` — `Configure(item, amount[, requiredToolId])`, where a loot roll lands.
  - `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` — the hand-placed Tier 0 gray box procgen will eventually replace (Tier 1+).
  - `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` — `Configure(player, spawn)`, what a spawn point instantiates.
  - `space-survival-design-doc.md` §3 — descend → scavenge loop, LDOE-style randomized locations.
  - `ARCHITECTURE.md` §7 — the EditMode-safe lazy-init + `Configure` + `Step` pattern.
  - `CLAUDE.md` — Hard Rules #1 (tier discipline), #3 (data over code), #11 (EditMode-safe).
- **Named external (re-verify with web access):**
  - Short & Adams (eds.), *Procedural Generation in Game Design*.
  - Shaker, Togelius & Nelson, *Procedural Content Generation in Games*.
  - Robert Bridson, *Fast Poisson Disk Sampling in Arbitrary Dimensions*.
  - Vose's Alias Method (O(1) weighted selection).
  - Unity `Unity.Mathematics.Random`; .NET `System.Random`.
  - Last Day on Earth: Survival (Kefir) — modular-location reference (observed design).

## Search queries (mapped to guides)

| # | Query | Note in summary | Primary guides informed |
|---|---|---|---|
| 1 | Modular chunk vs noise location generation, LDOE survival model | finding 1 | `01-procedural-philosophy.md`, `02-modular-chunk-layout.md` |
| 2 | Socket/grid-walk room assembly + reachability guarantees | finding 4 | `02-modular-chunk-layout.md`, `09-failure-modes.md` |
| 3 | Weighted random selection (cumulative vs alias), drop tables | finding 3 | `03-loot-and-drop-tables.md` |
| 4 | Poisson-disc / blue-noise spawn distribution | — | `04-spawn-distribution.md` |
| 5 | Seedable deterministic PRNG in Unity/C#, seed threading | finding 2 | `05-seeding-and-determinism.md`, `07-editmode-testing-generation.md` |
| 6 | Generation-side difficulty scaling | — | `06-difficulty-scaling.md`, `08-handoff-balance-and-level.md` |

## Method

1. Read the four real DRIFT files above first — they define the contracts every generator must
   satisfy (item ids, `Configure` signatures, the spawn path, the EditMode-safe shape).
2. For each algorithm, name the established source and describe the algorithm shape from memory,
   marked `[memory]`, deferring exact-detail verification to a web-enabled re-check.
3. Draw the lane line in every guide: this Weapon owns the ALGORITHM; values go to
   `game-balance-guardian`, kits to `unity-level-design-guardian`, behavior to `fsm-ai-guardian`.
4. Make every generator a pure function of `(seed, config)` so it is reproducible AND
   EditMode-testable (Hard Rule #11) on a VM with no editor.

## Open questions (carried into research-summary.md)

- `Unity.Mathematics.Random` vs `System.Random` as the canonical shipped PRNG.
- Wave-function-collapse vs simple socket-matching at DRIFT's location scale (ADR-gated, Tier-later).
- Alias-method vs cumulative-weight crossover by table size on mobile.
