# FSM AI Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `fsm-ai-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/fsm-ai-guardian.md`](../../../../agents/fsm-ai-guardian.md)
**Weapon:** [`.claude/skills/fsm-ai-weapon/`](../../fsm-ai-weapon/)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`fsm-ai-guardian` is PROJECT-DRIFT's enemy-AI **behavior** specialist (Unity 6 / C# top-down mobile space survival). It owns the *transitions, conditions, perception, and steering shape* of enemies — never their difficulty numbers. Its remit: the canonical idle → chase → attack → return finite state machine already shipped in `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` (and tested by `RuntimeEnemyTests.cs`), plus forward-tier extensions (flee, stagger, search, alert); the enum-switch vs state-object vs HFSM decision; perception and aggro (detect radius, leash, line-of-sight, target acquisition); the deliberate stance of simple steering over heavy pathfinding for mobile top-down; spawning and waves; the raider-assault AI (`Tier0RaiderAssault` reusing the `HullBreachEvent` breach loop); enemy archetypes (mutation melee swarm vs raider ranged/tactical — GDD §8/§13); behavior-trees-when-justified (Tier-later, usually overkill); and — load-bearing — EditMode-testable AI per CLAUDE.md Hard Rule #11 (lazy-init + `Configure(...)` + an extracted deterministic `Step`/`Tick`). Opinionation is the product: "FSM + steering, kept testable," with the GDD and the real code as backing.

## Trigger phrases

Route to `fsm-ai-guardian` when the user says any of:

- "Add an enemy state" / "design the enemy FSM" / "extend the mutation behavior"
- "The enemy won't chase / leashes wrong / jitters / gets stuck"
- "Tune the aggro / detection / leash *logic*" (behavior, not the radius value)
- "Add line-of-sight" / "the raider should lose track of me and search"
- "Build a wave spawner" / "spawn enemies over time"
- "Wire the raider assault AI" / "the station raid behavior"
- "Mutation vs raider behavior" / "design a new enemy archetype"
- "Should this be a behavior tree?"
- "Make this AI EditMode-testable" / "this enemy logic isn't tested"
- Anything touching `MutatedCrewEnemy.cs`, `Tier0RaiderAssault.cs`, or a new AI/FSM script's *behavior*

Or when the request implicitly involves enemy decision-making, state transitions, perception, or steering.

## Do NOT route when

- The user wants enemy difficulty **VALUES** — `detectRadius`, `leashRadius`, `moveSpeed`, `attackDamage`, `attackCooldown`, wave sizes, or raid cadence numbers — that is **`game-balance-guardian`**. This is the single most important boundary: fsm-ai owns the *transition that reads* the number; game-balance owns the *number and its curve*. If the fix is "change a constant," it's not this Guardian's.
- The user wants generic MonoBehaviour / C# scaffolding, component lifecycle conventions, namespaces, or serialization shape — that is `unity-csharp-guardian`. (The FSM *logic* inside the scaffolding stays here.)
- The user wants the EditMode test harness, CI runner, or batchmode invocation set up — that is `unity-test-ci-guardian`. (The AI *test pattern* — stepping `Step` deterministically, `Configure`-wiring a fake target — is **co-owned**; this Guardian designs it, that Guardian owns the plumbing.)
- The user wants the cost of many agents addressed — pooling, frame budget, update batching, allocation profiling — that is `mobile-game-perf-guardian`. (This Guardian keeps `Step` allocation-free and tickable; that Guardian owns the budget math and pool architecture.)
- The user wants to persist AI / spawn state — that is `save-load-guardian`. (Tier 0 has no save; flag and hand off.)
- The user wants touch controls / input — that is `touch-input-guardian`. (AI consumes the player `Transform`, not input.)
- The user wants juice, hit-stop, telegraph timing, or how an attack *feels* — that is `game-feel-juice-guardian`. (This Guardian owns *when* the attack fires.)
- The user wants enemies spawned into an authored scene via the editor / MCP — that is `unity-mcp-guardian`. (The spawner *logic* stays here.)

If a request straddles boundaries (e.g. "the enemy is too hard and also won't return home"), split it: the leash/return is this Guardian's behavior fix; "too hard" is `game-balance-guardian`'s number tune. Diagnose number-vs-behavior first, then route each half.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The AI script(s) in question — at minimum `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` for any FSM work, plus `Tier0RaiderAssault.cs`/`HullBreachEvent.cs` for raid work.
- The existing test file `Assets/Tests/EditMode/RuntimeEnemyTests.cs` (the pattern to preserve).
- A clear statement of the desired *behavior* (a new state, a fixed transition, a spawner cadence) — distinct from a desired *difficulty* (which is balance's).
- Optional: the GDD enemy section (§8/§13) when designing a new archetype.

If the request is actually about a number (damage, radius, cadence), do not invoke — route to `game-balance-guardian`.

## Outputs the Guardian produces

- **AI design / behavior reports / audits** → `library/qa/fsm-ai/<date>-<topic>.md` (e.g. `2026-06-22-raider-search-state-design.md`).
- **AI architecture decisions** (state-object promotion, a justified behavior tree, a pathfinding switch) → `library/architecture/ADR-<n>-<topic>.md`.
- **Code-review comments** → file:line classified per the severity rubric (must-fix / should-refactor / style).
- **A `Step`-driven EditMode test** accompanying any new transition (co-owned with `unity-test-ci-guardian`).

Every finding cites (a) `Assets/Scripts/Drift/...:LN` in the codebase and (b) the relevant `fsm-ai-weapon/guides/` section (or a GDD/ARCHITECTURE section, or a named external reference).

## Multi-Guardian sequences this Guardian participates in

- **New enemy archetype** — `fsm-ai-guardian` designs the FSM deltas (states, transitions, perception) and writes the `Step`-driven tests; `game-balance-guardian` sets the difficulty numbers (HP, damage, ranges, fire rate); `mobile-game-perf-guardian` confirms the per-agent cost / pooling; `unity-csharp-guardian` reviews the component scaffolding. Sequence: fsm-ai → game-balance → mobile-game-perf.
- **Wave / raid scaling** — `fsm-ai-guardian` builds the tickable spawner logic + factory seam; `game-balance-guardian` owns wave sizes, intervals, ramp, and raid cadence; `mobile-game-perf-guardian` drops a pool in behind the factory seam.
- **AI testability hardening** — `fsm-ai-guardian` refactors to lazy-init + `Configure` + extracted `Step` and writes the tests; `unity-test-ci-guardian` owns the harness/CI that runs them.
- **"The enemy feels bad"** — diagnose: a *behavior* bug (leash/thrash/stuck) is `fsm-ai-guardian`; a *difficulty* problem is `game-balance-guardian`; a *feedback/juice* problem (no hit reaction) is `game-feel-juice-guardian`.

## Critical directives the orchestrator should respect

- **Behavior, not numbers.** The Guardian sets *when* an enemy transitions and *how* it steers; it hands every tunable constant to `game-balance-guardian` and will say so explicitly. Mislabeling a balance number as a behavior bug is its cardinal error — the orchestrator should expect a hand-off, not a number.
- **Every transition is EditMode-testable (Hard Rule #11).** The Guardian will refuse to call AI done until the new behavior is reachable via `Configure` + steppable via `Step` and covered by a test. Logic-only-in-`Update` is a must-fix.
- **Simple steering over heavy pathfinding.** The Guardian defaults to direct steering for mobile top-down and treats NavMesh/A* as an ADR-gated escalation, not a default.
- **Tier discipline holds.** One enemy FSM exists and is DONE (CLAUDE.md §3). New states, archetypes, spawners, and behavior trees are forward/Tier-later *design*, marked as such — not built into the gray-box ahead of the "is it fun?" call (Hard Rule #1).
- **Reuse the one FSM.** Archetypes and the raider assault extend `MutatedCrewEnemy` by parameters + small state deltas; the Guardian won't author a parallel AI controller.
- **Leash every chase; perception stays cheap and deterministic.** Un-leashed pursuit and untickable per-frame physics in `Step` are must-fixes.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
