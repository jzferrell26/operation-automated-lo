# Procedural Generation Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `procedural-generation-guardian`. Use this guide to
decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/procedural-generation-guardian.md`](../../../agents/procedural-generation-guardian.md)
**Weapon:** [`.claude/skills/procedural-generation-weapon/`](../../procedural-generation-weapon/)
**Command Brief:** [`ai-tools/command-briefs/procedural-generation-guardian-command-brief.md`](../../../ai-tools/command-briefs/procedural-generation-guardian-command-brief.md)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`procedural-generation-guardian` is DRIFT's authority on the *algorithms* that turn a seed into a
scavenge location — modular-chunk level layout (the LDOE location model), weighted loot/resource
drop tables, enemy spawn distribution (Poisson-disc / blue-noise), seedable determinism
(`System.Random` / `Unity.Mathematics` → reproducible AND EditMode-testable per Hard Rule #11), and
generation-side difficulty scaling. Its remit is the generation METHOD: the layout walk, the
weighted-selection algorithm, the seed-threading contract, the distribution algorithm, the
difficulty-read mechanism, and the EditMode-testability surface that makes all of it verifiable
headless. It owns the ALGORITHM — not the values, not the kit prefabs, not the enemy behavior.

## Trigger phrases

Route to `procedural-generation-guardian` when the user says any of:

- "Generate a random scavenge location" / "procedurally lay out a level"
- "Lay out a level from chunks" / "modular room generation" / "assemble a location from kits"
- "Design the loot drop table" / "weighted loot selection" / "drop-table algorithm"
- "Distribute enemy spawns" / "Poisson-disc placement" / "blue-noise spawn distribution"
- "Make this generation seeded" / "make this deterministic" / "reproducible from a seed"
- "Make this generator EditMode-testable"
- "Scale generation difficulty" / "bigger/harder locations as difficulty rises" (the *mechanism*)
- A generation bug: "the same seed gives different output", "a chunk is unreachable", "spawns clump"

Or when the request implicitly involves the *method* of generating content from a seed.

## Do NOT route when

- The user wants the drop-table NUMBERS, loot amounts, or difficulty-curve VALUES — that is
  `game-balance-guardian`. (**Co-owned:** this Guardian owns the weighted-selection + difficulty-read
  ALGORITHM; balance owns what the weights/amounts/curve actually are. If the question is "what
  should the scrap weight be?", it's balance; if it's "how does the table select?", it's here.)
- The user wants the modular KIT prefabs, room art, or socket authoring — that is
  `unity-level-design-guardian`. (**Co-owned:** this Guardian randomizes the arrangement; they author
  the pieces. "Build the medbay kit" is them; "place the kits randomly with reachability" is here.)
- The user wants enemy BEHAVIOR — FSM, aggro, leash, what a spawned enemy does — that is
  `fsm-ai-guardian`. (This Guardian produces the spawn *point* `Vector3`; the behavior at it is theirs.)
- The user wants instantiation PERF, pooling, or draw-call budget for generated content — that is
  `mobile-game-perf-guardian`. (This Guardian keeps the pass allocation-aware; the budget is theirs.)
- The user wants generic MonoBehaviour / ScriptableObject C# shape, lifecycle, or serialization
  shape — that is `unity-csharp-guardian`. (Generation logic inside the scaffolding is here.)
- The user wants the EditMode harness, CI runner, or batchmode plumbing — that is
  `unity-test-ci-guardian`. (**Co-owned:** this Guardian writes the seed-driven test *pattern*; they
  own the runner.)
- The user wants run-state persistence / save format — that is `save-load-guardian`. (This Guardian
  guarantees same-seed determinism so persistence is "save the seed"; they serialize it.)
- The request is to **replace the Tier 0 gray-box spawner now** — that violates `CLAUDE.md` Hard
  Rule #1. This Guardian designs the Tier-1 procgen future and proves it testable; it does NOT direct
  ripping out `Tier0RuntimeSpawner` mid-Tier-0.

If the request straddles boundaries (e.g., "generate a balanced, good-looking location with smart
enemies"), prefer routing to `procedural-generation-guardian` for the generation algorithm + seed +
reachability, then chain to `game-balance-guardian` (values), `unity-level-design-guardian` (kits),
and `fsm-ai-guardian` (behavior).

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The DRIFT repo (current branch). The Guardian reads `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`,
  `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs`,
  `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs`, and
  `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` as the contracts every generator must satisfy.
- Optional: specific focus (layout, loot table, spawn distribution, seeding, difficulty, testability).
- Optional: constraints (which generation kind, an existing config/SO to extend).

## Outputs the Guardian produces

- **Procgen design / algorithm reports / audits** → `library/qa/procedural-generation/<date>-<topic>.md`.
- **Procgen architecture decisions** → `library/architecture/ADR-<n>-<topic>.md`.
- **Generators** → `Configure` + extracted `Generate()`/`Step()` returning DATA, with the
  three-test shape (reproducibility, variation, invariant). Values handed to `game-balance-guardian`,
  kits to `unity-level-design-guardian`, behavior to `fsm-ai-guardian`.

Every finding cites (a) the absolute path in the user's codebase and (b) the relevant guide in
`procedural-generation-weapon/guides/` plus, where applicable, a NAMED external reference (research
ran DEGRADED — no fabricated URLs).

## Multi-Guardian sequences this Guardian participates in

- **A full generated location** — `procedural-generation-guardian` writes the seeded layout + loot +
  spawn algorithms with reachability + determinism + tests; `game-balance-guardian` fills the weights
  / amounts / difficulty curve; `unity-level-design-guardian` authors the kit prefabs the layout
  places; `fsm-ai-guardian` drives the enemies the spawn points instantiate; `mobile-game-perf-guardian`
  budgets the instantiation; `save-load-guardian` persists the seed.
- **A drop table** — `procedural-generation-guardian` ships the weighted-selection algorithm over a
  data-defined table; `game-balance-guardian` tunes the weights/amounts; `unity-csharp-guardian`
  reviews the SO shape.
- **A spawn system** — `procedural-generation-guardian` produces the Poisson-disc `Vector3` points;
  `fsm-ai-guardian` drives behavior at them; `game-balance-guardian` sets density/separation;
  `mobile-game-perf-guardian` pools the agents.

## Critical directives the orchestrator should respect

- **Algorithm, not numbers.** The Guardian will not invent a weight, amount, or difficulty-curve value
  — it ships those as tunable data fields and hands them to `game-balance-guardian`.
- **Determinism is the contract.** The Guardian will block on `UnityEngine.Random` static, time inputs,
  or unordered iteration in a generator — same `(seed, config)` must give byte-identical output.
- **EditMode-testable or it doesn't ship.** The Guardian will refuse a generator whose logic lives in
  `Awake`/`Start`/`Update`; it requires lazy-init + `Configure` + extracted `Generate()`/`Step()`
  with the three-test shape (Hard Rule #11).
- **Reachability is a must-fix.** A layout that can strand a required cache fails the build.
- **Tier line holds.** The Guardian will NOT direct replacing `Tier0RuntimeSpawner` mid-Tier-0; it
  designs the Tier-1 procgen future and proves it testable now.
- **Hand off at the boundary.** When the question is a VALUE (game-balance), a KIT (level-design), a
  BEHAVIOR (fsm-ai), PERF (mobile-perf), or PERSISTENCE (save-load), the Guardian names the right
  sibling and stops — mislabeling a sibling's concern as a generation bug is its cardinal error.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
