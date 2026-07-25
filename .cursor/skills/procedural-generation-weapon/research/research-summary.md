# Research Summary — procedural-generation-weapon

> **⚠️ DEGRADED RESEARCH BANNER.** This Weapon was forged in a headless VM with **no live web
> access during the forge**. The summaries below are grounded in (a) the PROJECT-DRIFT repo's
> real code (cited by file:line), (b) the design doc's LDOE-style location intent, and (c) the
> forging agent's prior knowledge of named, well-established procgen literature. **Every external
> source is named, not linked** — no URLs are fabricated. Where a claim rests on memory rather than
> a re-verified source, it is marked `[memory]`. Before treating any external technique as canon,
> a maintainer with web access should re-verify the named source. The **load-bearing truth in this
> Weapon is the repo itself**, which was read directly and is cited throughout the guides.

Forge date: 2026-06-22

## Goal

Ground every guide in `procedural-generation-weapon/guides/` against (a) the as-built DRIFT code
that procgen must produce content for, and (b) named, established procedural-generation references.
Each query below records what was sought, the named sources, and the guides it informs.

## Named anchor sources (no URLs — DEGRADED mode)

- **"Procedural Generation in Game Design"** — Short & Adams (eds.), the standard edited volume on
  PCG technique and philosophy. `[memory]`
- **"Procedural Content Generation in Games"** — Shaker, Togelius & Nelson, the academic PCG
  textbook (constructive vs. search-based vs. grammar-based taxonomy). `[memory]`
- **Last Day on Earth: Survival** (Kefir) — the modular hand-authored-location reference this game
  emulates: readable rooms assembled from a kit, not noise terrain. (GDD §3, observed design.)
- **Robert Bridson, "Fast Poisson Disk Sampling in Arbitrary Dimensions"** — the canonical
  blue-noise spawn-distribution algorithm. `[memory]`
- **Vose's Alias Method** — O(1) weighted random selection; the standard for large drop tables.
  `[memory]`
- **Unity `Unity.Mathematics` / `Unity.Mathematics.Random`** and **.NET `System.Random`** — the two
  seedable PRNG surfaces available in this project. (Verified available; behavior from `[memory]`.)
- **PROJECT-DRIFT repo** — the authoritative, directly-read source for every "what we generate
  content for" claim: `Tier0Balance.cs`, `SalvageNode.cs`, `Tier0RuntimeSpawner.cs`,
  `MutatedCrewEnemy.cs`.

## Search queries (intended; executed against repo + named-source memory in DEGRADED mode)

| # | Query | Source(s) | Guides informed |
|---|---|---|---|
| 1 | Modular chunk vs. noise location generation for survival games (LDOE model) | Short & Adams; Shaker et al. (constructive PCG); GDD §3; LDOE observed | `01-procedural-philosophy.md`, `02-modular-chunk-layout.md` |
| 2 | Connection-socket / grid-walk room assembly with reachability guarantees | Shaker et al. (grammar/constructive); `[memory]` dungeon-gen patterns | `02-modular-chunk-layout.md`, `09-failure-modes.md` |
| 3 | Weighted random selection — cumulative weight vs. Vose alias method, drop-table design | Vose's Alias Method `[memory]`; `Tier0Balance.cs` (real ids/amounts) | `03-loot-and-drop-tables.md` |
| 4 | Poisson-disc / blue-noise spawn distribution with minimum separation | Bridson `[memory]`; `MutatedCrewEnemy`/`Tier0RuntimeSpawner` placement | `04-spawn-distribution.md` |
| 5 | Seedable deterministic PRNG in Unity/C# (`System.Random` vs `Unity.Mathematics.Random`), seed threading | Unity docs `[memory]`; `Step`/`Configure` pattern in repo | `05-seeding-and-determinism.md`, `07-editmode-testing-generation.md` |
| 6 | Generation-side difficulty scaling (chunk count, rarity weight, spawn density as a function of a difficulty parameter) | Shaker et al. (experience-driven PCG) `[memory]`; balance lane boundary | `06-difficulty-scaling.md`, `08-handoff-balance-and-level.md` |

## Key findings carried into the guides

1. **Modular-over-noise is the right default for THIS game.** DRIFT's LDOE-style locations want to
   read as authored spaces (a derelict deck, a collapsed corridor), which constructive modular
   assembly delivers and Perlin/Simplex noise does not. Noise is reserved for sub-detail (rubble
   scatter, surface variation). (Guide 01; Short & Adams `[memory]`, GDD §3.)
2. **Determinism is the spine of testability.** A generator that is a pure function of
   `(seed, config)` is reproducible at runtime AND drivable in an EditMode test with no Unity
   lifecycle — the same property that satisfies `CLAUDE.md` Hard Rule #11. This is the single
   highest-leverage discipline in the Weapon. (Guides 05, 07.)
3. **The algorithm is ours; the numbers are balance's.** Cumulative-weight selection is the method;
   the weights live in data and are tuned by `game-balance-guardian`. Drawing this line keeps the
   Weapon from inventing values. (Guides 03, 06, 08.)
4. **Reachability is a must-fix failure mode.** A modular layout that can strand a required tool
   cache behind an unconnected chunk breaks the loop. Generators validate connectivity. (Guide 09.)
5. **The repo grounds everything.** `Tier0Balance` ids/amounts, `SalvageNode.Configure`, and the
   `MutatedCrewEnemy` spawn path are the concrete contracts every generated piece must satisfy.

## Open questions (re-verify with web access)

- Whether `Unity.Mathematics.Random` (Xorshift) or `System.Random` should be canonical for the
  shipped generators — leaning `Unity.Mathematics.Random` for struct-value determinism and Burst
  compatibility, but the cross-platform stability of each PRNG's stream should be re-confirmed. `[memory]`
- Whether wave-function-collapse is worth its complexity over simple socket-matching for DRIFT's
  location scale — current stance: socket-matching is sufficient; WFC is Tier-later, ADR-gated.
- Exact alias-method vs. cumulative-weight crossover point by table size for mobile — both are
  fast at DRIFT's table sizes; cumulative is simpler and recommended until tables grow large.
