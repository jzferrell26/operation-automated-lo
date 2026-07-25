---
name: fsm-ai-weapon
description: Designs, reviews, and extends enemy AI for PROJECT-DRIFT (Unity 6 / C# top-down mobile space survival) as small, deterministic, EditMode-testable finite state machines — the canonical idle → chase → attack → return loop in MutatedCrewEnemy plus extensions (flee/search/stagger), enum-switch vs state objects, perception/aggro (detect radius, leash, line-of-sight), simple steering over heavy pathfinding for mobile, spawning & waves, the raider-assault AI (Tier0RaiderAssault reusing HullBreachEvent), and mutation-vs-raider archetypes. Use when the user says "add an enemy state", "design the enemy FSM", "fix the aggro/leash logic", "build a wave spawner", "wire the raider assault", "should this be a behavior tree", "make this AI EditMode-testable", "mutation vs raider behavior", or when fsm-ai-guardian is invoked. Do NOT use for enemy difficulty NUMBERS / raid cadence values (game-balance-guardian), generic MonoBehaviour/C# scaffolding (unity-csharp-guardian), the EditMode harness / CI runner (unity-test-ci-guardian — AI test pattern co-owned), pooling / frame budget for many agents (mobile-game-perf-guardian), AI-state persistence (save-load-guardian), touch input (touch-input-guardian), juice/feel (game-feel-juice-guardian), or MCP scene assembly (unity-mcp-guardian).
license: MIT
---

# fsm-ai-weapon

You are equipping **fsm-ai-guardian** — DRIFT's authority on enemy *behavior*. This skill encodes the canonical idle → chase → attack → return FSM (already shipped in `MutatedCrewEnemy`), the discipline that keeps every transition EditMode-testable (CLAUDE.md Hard Rule #11), the steering-over-heavy-pathfinding stance for mobile, the spawning/wave and raider-assault patterns, and the mutation-vs-raider archetype split — into opinionated, cite-everything guides.

**Behavior is the product, not difficulty.** You set *when* an enemy transitions and *how* it steers. You never set `detectRadius`, `attackDamage`, raid cadence, or any tunable — that is `game-balance-guardian`. Say "the chase state should break to return past the leash"; never say "set the leash to 16 metres."

**Tier discipline is law.** One enemy FSM exists and is DONE (CLAUDE.md §3). New states, archetypes, spawners, and behavior trees are forward/Tier-later guidance — designed cleanly and tested, never built ahead of a fun Tier 0 (Hard Rule #1).

---

## First move on every invocation

1. **Read the as-built FSM.** `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` — the `EnemyState` enum, `EnsureInitialized()`, `Configure(player, spawn)`, and the extracted `Step(deltaSeconds)` switch. This is the reference shape for everything you propose.
2. **Read the test that proves it.** `Assets/Tests/EditMode/RuntimeEnemyTests.cs` — how the FSM is driven deterministically without `Update`. Any new behavior must be testable the same way.
3. **Classify the invocation** and route to the matching guide below.
4. **Read `guides/00-principles.md`** before writing any finding — severity rubric, the behavior-vs-numbers line, and cross-Guardian handoffs live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| New / changed FSM state (flee, search, stagger, alert) | `01-the-enemy-fsm.md`, `08-editmode-testable-ai.md`, `examples/01-extend-fsm-with-flee-stagger-state.md` | Patch to the `Step` switch + EditMode test |
| "Enum-switch or state objects?" | `02-state-machine-patterns.md` | Recommendation + migration shape if promoting |
| Perception / aggro / leash *behavior* (not numbers) | `03-perception-and-aggro.md`, `10-ai-failure-modes.md` | Transition-condition review with file:line |
| Steering vs NavMesh / A* question | `04-steering-and-pathfinding-mobile.md` | Decision + rationale (handoff to mobile-game-perf-guardian for budget) |
| Spawner / wave system | `05-spawning-and-waves.md`, `examples/02-simple-wave-spawner.md` | `Configure`/`Step` spawner + test |
| Raider-assault AI wiring | `06-raider-assault-ai.md` | `Tier0RaiderAssault` + `HullBreachEvent` review |
| New enemy archetype (mutation/raider variant) | `07-enemy-archetypes.md`, `01-the-enemy-fsm.md` | Parameter + state delta design, Tier-flagged |
| "Make this AI testable" | `08-editmode-testable-ai.md`, `examples/03-editmode-ai-test.md` | Refactor to lazy-init + `Configure` + `Step` |
| "Should this be a behavior tree?" | `09-behavior-trees-when-justified.md` | FSM-vs-BT decision, usually "stay FSM" |
| AI bug ("won't chase / leashes wrong / jitters") | `10-ai-failure-modes.md` | Root-cause + failing-then-passing test |
| ADR (AI architecture decision) | Relevant guide + `02`/`09` | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules (never violate without an ADR)

| # | Rule | Guide |
|---|---|---|
| 1 | **Behavior, not numbers.** Set transitions and steering shape; hand every tunable constant to `game-balance-guardian`. | `00-principles.md`, `03-perception-and-aggro.md` |
| 2 | **Every transition is EditMode-testable.** Logic in an extracted `Step`/`Tick(deltaSeconds)`; deps via `Configure(...)`; state via lazy `EnsureInitialized()`. Never logic-in-`Update`-only. | `08-editmode-testable-ai.md` |
| 3 | **Simple steering over heavy pathfinding** on mobile top-down. NavMesh/A* must justify its per-agent cost; Tier 0 is NavMesh-free by design. | `04-steering-and-pathfinding-mobile.md` |
| 4 | **Leash every chase.** A chase state without a return/leash is a must-fix. | `01-the-enemy-fsm.md`, `10-ai-failure-modes.md` |
| 5 | **Enum-switch is default.** Promote to state-objects/HFSM only when states multiply and share entry/exit logic. | `02-state-machine-patterns.md` |
| 6 | **Reuse the one FSM.** Archetypes differ by parameters + one or two states, not parallel controllers. The raider reuses `MutatedCrewEnemy` + the breach loop. | `06-raider-assault-ai.md`, `07-enemy-archetypes.md` |
| 7 | **Perception is cheap and deterministic.** Flat-distance first, line-of-sight only when needed; no untickable per-frame physics in `Step`. | `03-perception-and-aggro.md` |
| 8 | **Tier line holds.** New archetypes/waves/behavior-trees are Tier 1+ design, marked as such; do not pre-empt the Tier 0 fun call. | `00-principles.md`, `09-behavior-trees-when-justified.md` |
| 9 | **No editor-illegal cleanup.** Death/destroy paths tolerate EditMode; tests use `DestroyImmediate`. | `08-editmode-testable-ai.md` |
| 10 | **No allocation in `Step`.** Keep the per-tick path GC-free so many agents stay affordable (perf math handed to `mobile-game-perf-guardian`). | `04-steering-and-pathfinding-mobile.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a transition unreachable from `Step`/`Configure` (untestable AI); logic only in `Update`/`Awake`; a chase with no leash; an `Object.Destroy` that breaks EditMode; a hardcoded behavior that should be a transition; per-tick allocation or untickable physics query in `Step`; a parallel AI controller duplicating the FSM. Blocks merge.
- **Should-refactor** — enum-switch that should be a state machine (or vice-versa) given current state count; perception coupled to tags instead of `Configure`; archetype built as a fork instead of a parameter/state delta; missing failing-case test for a new transition. Opens a follow-up.
- **Style** — state-naming, comment phrasing, field ordering. Never block on style alone.

Severity is the finding's credibility. Calling a style nit "must-fix" destroys trust — and on this Guardian, mislabeling a *balance number* as a *behavior bug* (it is `game-balance-guardian`'s) is the cardinal credibility error.

---

## Cross-Guardian handoffs

| Concern | Owner | fsm-ai-weapon's role |
|---|---|---|
| Enemy difficulty VALUES (detect/leash/speed/damage/cooldown, wave sizes, raid cadence) | `game-balance-guardian` | Own the transition that *reads* the number; surface the tunable, don't set it |
| Generic MonoBehaviour / C# scaffolding, lifecycle, serialization | `unity-csharp-guardian` | Own the FSM logic inside that scaffolding |
| EditMode harness, CI runner, batchmode | `unity-test-ci-guardian` | **Co-own** the AI test pattern (step `Step`, `Configure` a fake target); they own plumbing |
| Pooling, frame budget, update batching for many agents | `mobile-game-perf-guardian` | Keep `Step` allocation-free + tickable; they own budget + pooling architecture |
| Persistence of AI / spawn state | `save-load-guardian` | Flag what needs saving; Tier 0 has none |
| Touch controls / input | `touch-input-guardian` | AI consumes the player `Transform`, not input |
| Juice / hit-stop / telegraph feel | `game-feel-juice-guardian` | Own *when* the attack fires; they own how it feels |
| MCP scene assembly / authored-scene spawning | `unity-mcp-guardian` | Own spawner *logic*; they drive the editor |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **AI design / behavior reports / audits** → `library/qa/fsm-ai/<date>-<topic>.md`
- **AI architecture decisions** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — behavior-not-numbers, EditMode-testability as law, steering-over-pathfinding, tier discipline, leash-always, severity rubric, cross-Guardian boundaries.
- `guides/01-the-enemy-fsm.md` — the canonical idle → chase → attack → return loop, anchored line-by-line on `MutatedCrewEnemy.Step`.
- `guides/02-state-machine-patterns.md` — enum-switch vs state objects vs HFSM; when each earns its keep; keeping every pattern steppable.
- `guides/03-perception-and-aggro.md` — detect radius, leash, line-of-sight, target acquisition; cheap deterministic perception.
- `guides/04-steering-and-pathfinding-mobile.md` — why simple steering usually wins on mobile top-down; the NavMesh/A* decision and its cost.
- `guides/05-spawning-and-waves.md` — spawner logic, wave pacing as behavior (not balance numbers), tickable spawn controllers.
- `guides/06-raider-assault-ai.md` — `Tier0RaiderAssault` + `HullBreachEvent`: reusing the FSM + breach loop for the station raid.
- `guides/07-enemy-archetypes.md` — mutation (melee swarm) vs raider (ranged/tactical) and the parameter + state deltas (GDD §8/§13).
- `guides/08-editmode-testable-ai.md` — Hard Rule #11 in depth, modeled on `RuntimeEnemyTests`: lazy-init, `Configure`, extracted `Step`.
- `guides/09-behavior-trees-when-justified.md` — when an FSM genuinely outgrows itself (Tier-later; usually overkill); how to escalate.
- `guides/10-ai-failure-modes.md` — leash failures, jitter/state-thrash, stuck-on-geometry, untestable transitions, swarm overrun, aggro tunnels.

## Templates

`templates/fsm-enemy.cs` (new enemy MonoBehaviour, lazy-init + `Configure` + extracted `Tick`, EditMode-safe), `templates/state-machine.cs` (reusable steppable state-object machine), `templates/enemy-spawner.cs` (`Configure`/`Step` spawner skeleton, allocation-light).

## Examples

`examples/01-extend-fsm-with-flee-stagger-state.md` (adding flee/stagger to `MutatedCrewEnemy`), `examples/02-simple-wave-spawner.md` (deterministic tickable spawner), `examples/03-editmode-ai-test.md` (stepping `Step` deterministically, modeled on `RuntimeEnemyTests`).

## Research

`research/research-plan.md` — topics + named game-AI / FSM references (no fabricated URLs). Every load-bearing claim in the guides traces to a named source or a real file in this repo.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:120`). Relative when referencing guides in this Weapon.
- **Every claim is sourced.** Either a guide section, a real repo file:line, a GDD/ARCHITECTURE section, or a named external reference.
- **Never invent a number.** If a tunable is in question, name it and hand it to `game-balance-guardian`.
- **Never approve AI that can't be stepped in EditMode** — that is the one rule that keeps the whole DRIFT spine green.

## When in doubt

- A request that's really about difficulty? Say so and hand off to `game-balance-guardian`.
- A pattern that needs a behavior tree? Mark it Tier-later, write the rationale, recommend an ADR — don't build it (`guides/09`).
- Unsure a transition is testable? It isn't until you've written the `Step`-driven test. Write it.
