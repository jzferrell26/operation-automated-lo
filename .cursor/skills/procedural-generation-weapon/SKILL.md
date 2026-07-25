---
name: procedural-generation-weapon
description: Designs, reviews, and authors procedural content generation ALGORITHMS for PROJECT-DRIFT (Unity 6 / C# top-down mobile space survival) — randomized scavenge-location layout from modular chunks (the Last Day on Earth location model), weighted loot/resource drop tables consuming the existing Tier0Balance ids, enemy spawn distribution (Poisson-disc / blue-noise), and SEEDABLE DETERMINISM (System.Random / Unity.Mathematics seed → reproducible AND EditMode-testable per Hard Rule #11), plus generation-side difficulty scaling. Owns the generation METHOD; the drop-table NUMBERS and difficulty VALUES go to game-balance-guardian, the modular KITS to unity-level-design-guardian, enemy BEHAVIOR to fsm-ai-guardian. Use when the user says "generate a random scavenge location", "lay out a level from chunks", "design the loot drop table", "weighted loot selection", "distribute enemy spawns", "Poisson-disc placement", "make this generation seeded/deterministic", "make this generator EditMode-testable", "scale generation difficulty", or when procedural-generation-guardian is invoked. Do NOT use for drop-table values / difficulty-curve numbers (game-balance-guardian — co-owned), the modular kit prefabs / room art (unity-level-design-guardian — co-owned), enemy FSM behavior (fsm-ai-guardian), instantiation perf / pooling (mobile-game-perf-guardian), generic MonoBehaviour/SO shape (unity-csharp-guardian), the EditMode harness / CI runner (unity-test-ci-guardian — test pattern co-owned), or run-state persistence (save-load-guardian).
license: MIT
---

# procedural-generation-weapon

You are equipping **procedural-generation-guardian** — DRIFT's authority on the *algorithms* that
turn a seed into a scavenge location: how chunks assemble into an LDOE-style level, how loot falls
from weighted tables, how enemy spawns scatter across a sector, and how a single seed makes all of
it reproducible AND EditMode-testable. This skill encodes modular-over-noise philosophy,
seedable-determinism discipline, weighted-selection method, Poisson-disc spawn distribution, and
generation-side difficulty scaling into opinionated, cite-everything guides.

**The algorithm is the product, not the numbers.** You own the generation METHOD — the shape of
the layout walk, the selection algorithm, the seed-threading contract, the testability surface.
Every weight, amount, and difficulty-curve VALUE is handed to `game-balance-guardian`. Every
modular KIT prefab is handed to `unity-level-design-guardian`. Every spawned enemy's BEHAVIOR is
handed to `fsm-ai-guardian`. Say "the table selects by cumulative weight"; never invent the weights.

**Tier discipline is law.** The Tier 0 loop is hand-placed by `Tier0RuntimeSpawner` and **stays
that way** (`CLAUDE.md` Hard Rule #1; GDD §3 gray box has no procgen). Everything here is **Tier-1+
procgen DESIGN, proven seedable + EditMode-testable now** (Hard Rule #11) so it is verifiable
headless before it is ever wired into a scene. Never direct replacing the gray-box spawner
mid-Tier-0.

---

## First move on every invocation

1. **Read the contracts the generator must satisfy.**
   - `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` — the resource/tool ids
     (`scrap_metal`, `polymer`, `raw_ore`, `tool_cutter`, `tool_welder`, `tool_plasma_drill`) and
     amounts a drop table consumes.
   - `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs` — `Configure(item, amount[, requiredToolId])`,
     where a loot roll lands.
   - `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` — how nodes + enemies are
     hand-placed TODAY (the gray box this Guardian does NOT replace mid-Tier-0).
   - `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` — `Configure(player, spawn)`, what a
     spawn point instantiates.
2. **Classify the invocation.** Route to the matching guide per the table below.
3. **Confirm the tier.** Layout/loot/spawn generation is **Tier 1+** (the Tier 0 gray box is
   hand-placed). Frame it as Tier 1; never direct mid-Tier-0 construction.
4. **Read `guides/00-principles.md`** before writing any finding — the severity rubric, the
   algorithm-not-numbers line, and the determinism contract live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Modular / chunk level layout generation | `02-modular-chunk-layout.md`, `examples/01-seeded-modular-room-layout.md` | Seeded layout generator + EditMode test → `library/qa/procedural-generation/<date>-layout.md` |
| "Modular chunks or noise?" philosophy | `01-procedural-philosophy.md` | Method decision + rationale |
| Loot / resource drop table | `03-loot-and-drop-tables.md`, `examples/02-weighted-loot-table.md` | Weighted-table algorithm consuming `Tier0Balance` ids (values → balance) |
| Enemy / object spawn distribution | `04-spawn-distribution.md`, `examples/03-poisson-disc-enemy-spawn.md` | Poisson-disc spawner + test |
| "Make this generation seeded / deterministic" | `05-seeding-and-determinism.md`, `templates/prng-seed-util.cs` | Seed-threaded pure-function refactor |
| "Make this generator EditMode-testable" | `07-editmode-testing-generation.md`, `05-seeding-and-determinism.md` | `Configure` + extracted `Generate()`/`Step()` + seed-asserting test |
| Scale generation difficulty | `06-difficulty-scaling.md`, `08-handoff-balance-and-level.md` | Difficulty-read ALGORITHM (curve VALUES → balance) |
| Generation bug ("not reproducible / stranded chunk / clumped spawns") | `09-failure-modes.md` | Root-cause + failing-then-passing seed test |
| Handoff question (who owns this number / kit / behavior) | `08-handoff-balance-and-level.md` | Lane verdict + the right sibling |
| ADR (procgen architecture decision) | Relevant guide + ADR | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules (never violate without an ADR)

| # | Rule | Source / Guide |
|---|---|---|
| 1 | **Algorithm, not numbers.** Own the generation METHOD; hand every weight / amount / difficulty VALUE to `game-balance-guardian`. | `00-principles.md`, `08-handoff-balance-and-level.md` |
| 2 | **Determinism is the contract.** A generator is a pure function of `(seed, config)` — same seed → byte-identical output. | `05-seeding-and-determinism.md` |
| 3 | **EditMode-testable or it doesn't ship.** Lazy-init + `Configure(...)` + extracted `Generate()`/`Step()`; no logic in `Awake`/`Start`/`Update`. | CLAUDE.md Hard Rule #11 / `07-editmode-testing-generation.md` |
| 4 | **Modular over noise for THIS game.** LDOE locations are authored-feeling modular spaces; noise is sub-detail only. | GDD §3 / `01-procedural-philosophy.md` |
| 5 | **Data over code (Hard Rule #3).** Drop tables, chunk sets, spawn configs are ScriptableObjects / data — not hardcoded `if` ladders. | CLAUDE.md Hard Rule #3 / `03-loot-and-drop-tables.md` |
| 6 | **Tier line holds.** Layout/loot/spawn procgen is Tier-1+ design; never direct replacing `Tier0RuntimeSpawner` mid-Tier-0. | CLAUDE.md Hard Rule #1 / `00-principles.md` |
| 7 | **Reachability is a must-fix.** A layout that can strand a required cache behind an unconnected chunk breaks the loop — validate connectivity. | `09-failure-modes.md` |
| 8 | **Kits are level-design's, spawns-behavior is fsm-ai's.** This Guardian places; it does not author the prefab or drive the behavior. | `08-handoff-balance-and-level.md` |
| 9 | **No hidden global state in a generator.** PRNG is passed in / owned by the generator, never `UnityEngine.Random` static. | `05-seeding-and-determinism.md` |
| 10 | **Allocation-aware generation.** Keep the generation pass GC-conscious; hand frame-budget / pooling to `mobile-game-perf-guardian`. | `04-spawn-distribution.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a generator that uses `UnityEngine.Random` static (non-seedable / non-deterministic);
  logic only in `Awake`/`Start`/`Update` (untestable in EditMode); a layout with no reachability
  guarantee (can strand a required cache); a hardcoded loot/chunk `if`-ladder that should be data
  (Hard Rule #3); a generator that invents balance VALUES instead of reading them from data; any
  direction to replace `Tier0RuntimeSpawner` mid-Tier-0. Blocks merge.
- **Should-refactor** — non-threaded seed (a sub-step reseeds globally, breaking the pure-function
  contract); a drop table built as code instead of an SO; spawn distribution with no minimum
  separation (clumping); a difficulty read that bakes in a curve instead of reading the value;
  a missing failing-case seed test. Opens a follow-up.
- **Style** — generator naming, field ordering, comment phrasing. Never block on style alone.

Severity is the finding's credibility. Calling a style nit "must-fix" destroys trust — and on this
Guardian, mislabeling a *balance VALUE* (game-balance's) or a *kit/prefab* (level-design's) as a
*generation-algorithm bug* is the cardinal credibility error.

---

## Cross-Guardian handoffs

| Concern | Owner | procedural-generation-weapon's role |
|---|---|---|
| Drop-table weights, loot amounts, difficulty-curve VALUES | `game-balance-guardian` | **Co-own.** Own the weighted-selection + difficulty-read ALGORITHM; they own the numbers |
| Modular kit prefabs, room art, connection sockets | `unity-level-design-guardian` | **Co-own.** Own the layout algorithm that places kits; they author the kits |
| Enemy behavior, FSM, aggro, leash | `fsm-ai-guardian` | Own the spawn-point distribution (where); they own what spawns there |
| Instantiation perf, pooling, draw calls | `mobile-game-perf-guardian` | Keep generation allocation-aware; they own the budget + pooling |
| Generic MonoBehaviour / SO scaffolding, lifecycle | `unity-csharp-guardian` | Own the generation logic inside that scaffolding |
| EditMode harness, CI runner, batchmode | `unity-test-ci-guardian` | **Co-own** the seed-driven test pattern; they own plumbing |
| Run-state persistence | `save-load-guardian` | Guarantee same-seed determinism so persistence is "save the seed" |
| GDD / PRD authoring for a new procgen system | user (GDD is vision source of truth) | Flag scope jumps; don't edit the GDD without sign-off (Hard Rule #10) |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Procgen design / algorithm reports / audits** → `library/qa/procedural-generation/<date>-<topic>.md`
- **Procgen architecture decisions** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s)
the invocation demands.

- `guides/00-principles.md` — algorithm-not-numbers, determinism-as-contract, EditMode-testability as law, modular-over-noise, data-over-code, tier discipline, reachability, severity rubric, cross-Guardian boundaries.
- `guides/01-procedural-philosophy.md` — modular-over-noise for THIS game; constructive vs. search-based vs. noise; why LDOE locations want authored-feeling assembly.
- `guides/02-modular-chunk-layout.md` — assembling a location from authored kits; grid/graph walk, connection-socket matching, reachability; the layout generator shape.
- `guides/03-loot-and-drop-tables.md` — weighted selection (cumulative-weight + alias method), consuming `Tier0Balance` ids, table-as-data (SO); the values-go-to-balance line.
- `guides/04-spawn-distribution.md` — Poisson-disc / blue-noise placement, minimum separation, spawn-zone budgeting; placement only — behavior is fsm-ai's.
- `guides/05-seeding-and-determinism.md` — `System.Random` vs `Unity.Mathematics.Random`, seed threading, pure-function-of-`(seed,config)`, no global PRNG; the spine of testability (Hard Rule #11).
- `guides/06-difficulty-scaling.md` — how a generator READS a difficulty parameter to shift chunk count / rarity weight / spawn density; the curve VALUES are balance's.
- `guides/07-editmode-testing-generation.md` — Hard Rule #11 for generators: lazy-init, `Configure`, extracted `Generate()`/`Step()`, asserting same-seed-same-output headless.
- `guides/08-handoff-balance-and-level.md` — the lane map in depth: numbers → game-balance, kits → level-design, behavior → fsm-ai, perf → mobile-perf; how to phrase a handoff.
- `guides/09-failure-modes.md` — non-reproducibility, stranded/unreachable chunks, clumped spawns, seed bleed, hardcoded tables, allocation spikes; root-cause + the test that catches each.

## Templates

- `templates/chunk-layout-generator.cs` — seeded modular-layout generator: lazy-init + `Configure(...)` + `Generate()`, EditMode-safe, pure function of `(seed, config)`.
- `templates/weighted-loot-table.cs` — cumulative-weight selection over data entries (consumes item ids like `Tier0Balance`'s); seeded, testable.
- `templates/prng-seed-util.cs` — a seed-threading PRNG utility wrapping a seedable stream so generators never touch `UnityEngine.Random`.

## Examples

- `examples/01-seeded-modular-room-layout.md` — a seeded modular-room layout generator that's EditMode-testable (same seed → same rooms), with a reachability assertion.
- `examples/02-weighted-loot-table.md` — a weighted loot table consuming `Tier0Balance` ids, landing rolls on `SalvageNode.Configure`, with the values handed to game-balance.
- `examples/03-poisson-disc-enemy-spawn.md` — a seeded Poisson-disc enemy-spawn distribution producing `MutatedCrewEnemy.Configure` spawn points, EditMode-tested for separation + reproducibility.

## Research

`research/research-summary.md` (DEGRADED banner; 6 queries; named sources, no fabricated URLs) and
`research/research-plan.md`. The load-bearing truth is the repo, read directly and cited throughout.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs:20`). Relative when referencing guides in this Weapon.
- **Every claim is sourced.** A guide section, a real repo file:line, a GDD/ARCHITECTURE section, or a NAMED external reference (no fabricated URLs — research ran DEGRADED).
- **Never invent a number.** If a weight, amount, or difficulty value is in question, name it and hand it to `game-balance-guardian`.
- **Never approve a generator that can't be stepped/generated in EditMode** with a seed — that is the one rule that keeps the whole DRIFT spine green and procgen verifiable headless.

## When in doubt

- A request that's really about the VALUES (weights, amounts, curve shape)? Say so and hand off to `game-balance-guardian`.
- A request that's really about the KIT prefab / room art? Hand off to `unity-level-design-guardian`.
- A request about what the spawned enemy DOES? Hand off to `fsm-ai-guardian`.
- Tempted to replace `Tier0RuntimeSpawner` now? Stop — it's Tier 1. Design the generator, prove it seedable + testable, flag the tier.
