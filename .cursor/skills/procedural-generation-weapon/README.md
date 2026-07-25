# procedural-generation-weapon

The procedural arsenal for `procedural-generation-guardian`, PROJECT-DRIFT's authority on the
**algorithms** that turn a seed into a scavenge location — modular-chunk level layout, weighted
loot/resource drop tables, enemy spawn distribution, seedable determinism, and generation-side
difficulty scaling.

## What this weapon covers

- **Modular chunk layout** — assembling an LDOE-style location from authored kits (grid/graph walk,
  socket matching, reachability) — the modular-over-noise philosophy for this game.
- **Loot & drop tables** — weighted selection (cumulative-weight / alias method) consuming the real
  `Tier0Balance` ids; table-as-data.
- **Spawn distribution** — Poisson-disc / blue-noise placement with minimum separation; producing
  `MutatedCrewEnemy.Configure` spawn points.
- **Seeding & determinism** — `System.Random` / `Unity.Mathematics.Random`, seed threading,
  pure-function-of-`(seed, config)` — the spine of reproducibility AND EditMode-testability.
- **Difficulty scaling** — how a generator READS a difficulty parameter (the curve VALUES are
  game-balance's).
- **EditMode testing of generation** — Hard Rule #11 for generators.

## The one line that defines the lane

**This Weapon owns the generation ALGORITHM.** The drop-table NUMBERS and difficulty-curve VALUES
belong to `game-balance-guardian` (co-owned); the modular KIT prefabs belong to
`unity-level-design-guardian` (co-owned); the spawned enemy's BEHAVIOR belongs to
`fsm-ai-guardian`. Say "the table selects by cumulative weight"; never invent the weights.

## Tier discipline

The Tier 0 loop is **hand-placed** by `Tier0RuntimeSpawner` and stays that way (`CLAUDE.md` Hard
Rule #1; GDD §3 gray box has no procgen). Everything here is **Tier-1+ procgen DESIGN, proven
seedable + EditMode-testable now** so it is verifiable on a headless VM with no editor. Never direct
replacing the gray-box spawner mid-Tier-0.

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, cross-Guardian handoffs.
2. Read `guides/00-principles.md` — the non-negotiables (algorithm-not-numbers, determinism,
   EditMode-testability, tier discipline).
3. Open the guide matching your task (see the routing table in `SKILL.md`).
4. Reference `examples/` for worked, repo-grounded generators and `templates/` for drop-in seeded,
   EditMode-safe skeletons.

## Key rule

**Determinism is the contract, and the test proves it.** A generator must be a pure function of
`(seed, config)` — same seed, byte-identical output. That single property makes a run reproducible
at runtime AND drivable in an EditMode test with no Unity lifecycle (Hard Rule #11). A generator
that touches `UnityEngine.Random` static, or hides logic in `Awake`/`Update`, is a must-fix.

## Research note

The research trail (`research/research-summary.md`, `research/research-plan.md`) ran **DEGRADED** —
no live web during the forge. External sources are **named, not linked** (no fabricated URLs). The
load-bearing truth is the PROJECT-DRIFT repo, read directly and cited by file:line throughout the
guides.
