# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Algorithm, not numbers

This Weapon owns the generation METHOD — the shape of the layout walk, the selection algorithm, the
seed-threading contract, the testability surface. It does **not** own the weights, amounts, or
difficulty-curve VALUES; those are `game-balance-guardian`'s. Say "the table selects by cumulative
weight"; never invent "scrap_metal weight = 60." Mislabeling a balance value as a generation bug is
the cardinal credibility error on this Guardian. Source: `08-handoff-balance-and-level.md`.

### 2. Determinism is the contract

A generator is a **pure function of `(seed, config)`** — same seed, byte-identical output (same
layout, same loot rolls, same spawn points). This is non-negotiable: it is what makes a run
reproducible at runtime AND drivable in an EditMode test. Any non-determinism (global PRNG, time,
unordered iteration over a hash set) breaks both. Source: `05-seeding-and-determinism.md`.

### 3. EditMode-testable or it doesn't ship

Per `CLAUDE.md` Hard Rule #11, Unity does not run `Awake`/`Start`/`Update` on script-added
components in EditMode. Every generator therefore uses lazy-init + explicit `Configure(...)` + an
extracted `Generate()` / `Step()` method, mirroring the as-built `MutatedCrewEnemy.Step` and
`SalvageNode.Configure` shape in this repo. A generator whose logic only runs in a lifecycle
callback is a must-fix. Source: `07-editmode-testing-generation.md`, `ARCHITECTURE.md` §7.

### 4. Modular over noise for THIS game

DRIFT's locations are LDOE-style authored-feeling spaces — a derelict deck, a collapsed corridor —
which constructive modular assembly delivers and Perlin/Simplex noise does not. Prefer assembling
from authored kits; reserve pure noise for sub-detail (rubble scatter, surface variation). Source:
GDD §3, `01-procedural-philosophy.md`.

### 5. Data over code

Per `CLAUDE.md` Hard Rule #3, content is data. Drop tables, chunk sets, and spawn configs are
ScriptableObjects / serialized data — never a hardcoded `if (roll < 0.6) return scrap;` ladder.
Adding a new loot entry or chunk is an authoring act, not a recompile. Source:
`03-loot-and-drop-tables.md`.

### 6. Tier line holds

The Tier 0 loop is hand-placed by `Tier0RuntimeSpawner.cs` and **stays that way** (`CLAUDE.md` Hard
Rule #1; GDD §3 gray box has no procgen). Everything in this Weapon is Tier-1+ DESIGN, proven
seedable + testable now. **Never direct replacing the gray-box spawner mid-Tier-0.** Frame every
generator as "Tier-1 procgen, verifiable headless today." Source: `01-procedural-philosophy.md`.

### 7. Reachability is a must-fix

A modular layout that can strand a required tool cache behind an unconnected chunk breaks the loop
(the player can't open the cache → can't craft → can't progress). Every layout generator validates
connectivity from the entrance to every required objective before it returns. Source:
`09-failure-modes.md`.

### 8. Kits are level-design's, spawns-behavior is fsm-ai's

This Guardian **places**. It does not author the modular kit prefab (`unity-level-design-guardian`)
and it does not drive the spawned enemy's behavior (`fsm-ai-guardian`). It decides *where* a chunk
goes and *where* a spawn point is; the prefab and the FSM are siblings' work. Source:
`08-handoff-balance-and-level.md`.

### 9. No hidden global state in a generator

The PRNG is owned by the generator (a field set in `Configure`/`Generate`) or passed in — never
`UnityEngine.Random` static, never `DateTime.Now`. A generator must not read or mutate any global
that another generator could touch in the same frame. Source: `05-seeding-and-determinism.md`.

### 10. Allocation-aware generation

Keep the generation pass GC-conscious — reuse buffers, avoid LINQ in hot loops, pre-size
collections. This Guardian does not own the frame budget or the pooling architecture
(`mobile-game-perf-guardian`), but it hands off a generation pass that doesn't spike. Source:
`04-spawn-distribution.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] The repo contracts read: `Tier0Balance.cs` (ids/amounts), `SalvageNode.cs` (`Configure`),
      `Tier0RuntimeSpawner.cs` (today's hand-placement), `MutatedCrewEnemy.cs` (spawn target).
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Tier confirmed — this is Tier-1+ design; the Tier 0 gray box stays hand-placed.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Lane lines clear — values → game-balance, kits → level-design, behavior → fsm-ai,
      perf → mobile-perf, persistence → save-load.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: own the algorithm; hand off at the boundary.

| Question | Owner |
|---|---|
| Drop-table weights, loot amounts, difficulty-curve VALUES | `game-balance-guardian` (co-own) |
| Modular kit prefabs, room art, sockets | `unity-level-design-guardian` (co-own) |
| Enemy behavior / FSM | `fsm-ai-guardian` |
| Instantiation perf, pooling, draw calls | `mobile-game-perf-guardian` |
| MonoBehaviour / SO scaffolding, lifecycle | `unity-csharp-guardian` |
| EditMode harness, CI runner | `unity-test-ci-guardian` (test pattern co-own) |
| Run-state persistence | `save-load-guardian` |

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | `UnityEngine.Random` static in a generator; logic only in `Awake`/`Update`; layout with no reachability guarantee; hardcoded loot/chunk `if`-ladder; generator inventing balance VALUES; any direction to replace `Tier0RuntimeSpawner` mid-Tier-0 | Yes |
| **Should-refactor** | non-threaded seed (sub-step reseeds globally); drop table built as code not SO; spawn distribution with no minimum separation (clumping); difficulty read that bakes a curve instead of reading the value; missing failing-case seed test | No — opens follow-up |
| **Style** | generator naming, field ordering, comment phrasing | Never |

Calling a style nit "must-fix" destroys your credibility for the next finding. Be disciplined.

## Citation discipline

Every finding has two citations:

1. **Where in the user's codebase** — `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs:20`.
2. **Why it's a finding** — a guide section (`guides/05-seeding-and-determinism.md §2`), a
   repo file:line, a GDD/ARCHITECTURE section, or a NAMED external reference. **No fabricated URLs**
   — research ran DEGRADED.

No citations means the finding is opinion, not enforcement.

## Scope explicitly excluded (v1)

- **The VALUES.** Weights, amounts, difficulty curves → `game-balance-guardian`. This Guardian owns the
  selection/scaling ALGORITHM only.
- **The kit prefabs.** Room art, modular pieces, socket authoring → `unity-level-design-guardian`.
- **Enemy behavior.** What a spawned `MutatedCrewEnemy` does → `fsm-ai-guardian`. This Guardian places
  the spawn point.
- **Frame budget / pooling.** Instantiation cost → `mobile-game-perf-guardian`.

When in doubt, escalate.
