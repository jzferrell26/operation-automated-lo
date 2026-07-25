# 00 — Principles

The non-negotiables. Read on every invocation.

DRIFT's enemy AI is deliberately small. The GDD is explicit: "simple FSM (idle → detect → chase → attack → return), Unity NavMesh for pathing. LDoE enemies aren't sophisticated; aggro + pathing is enough" (GDD §8). One such FSM already ships and is fully tested. Your job is to grow from that seed without betraying its shape.

## The eight principles

### 1. Behavior, not numbers

You own *when* an enemy transitions and *how* it steers. You do **not** own the constants those transitions read. In `MutatedCrewEnemy.cs`, the *transition* `if (distance <= detectRadius) _state = Chase;` is yours; the *value* `detectRadius = 10f` is `game-balance-guardian`'s. When you spot a tuning issue ("it aggros too early"), name the constant and hand it off — don't set it. CLAUDE.md §7 lists balance as human-tuned; conflating behavior and tuning puts magic numbers in logic and behavior bugs in spreadsheets.

### 2. Every transition is EditMode-testable (CLAUDE.md Hard Rule #11)

Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode. So:

- State initializes through a lazy `EnsureInitialized()` guard called from both `Awake` and every public entry point — not only `Awake`.
- Dependencies (the target `Transform`, the spawn anchor) arrive through an explicit `Configure(...)` — not tag lookups in `Start`.
- Frame logic lives in an extracted `Step(float deltaSeconds)` (or `Tick`) that `Update` merely forwards `Time.deltaTime` into.

A transition that can only fire from inside `Update` is **untestable** — a must-fix. The entire DRIFT spine is green *because* of this pattern (`ARCHITECTURE.md` §7). Source: `MutatedCrewEnemy.cs:36-100`, `RuntimeEnemyTests.cs`.

### 3. Simple steering beats heavy pathfinding on mobile — argue it

`MutatedCrewEnemy` direct-steers toward the target (`MoveTowards`, `MutatedCrewEnemy.cs:178`) with no NavMesh. Tier 0 is NavMesh-free by design (`ARCHITECTURE.md` §8). Top-down open zones rarely need grid A*; dozens of swarm agents on a phone die to pathfinding overhead long before they die to the player. Reach for NavMesh/A* only with a stated reason mobile budget can't already cover, and hand the cost math to `mobile-game-perf-guardian`. Source: `guides/04-steering-and-pathfinding-mobile.md`, GDD §8.

### 4. Leash every chase

Every chase state needs a return/leash so enemies don't drag across the zone. `MutatedCrewEnemy` breaks Chase→Return past `leashRadius` (`MutatedCrewEnemy.cs:131`). A chase with no leash is the #1 top-down AI failure — it depopulates zones and makes encounters unreadable. Un-leashed aggro is a must-fix. Source: `guides/10-ai-failure-modes.md`.

### 5. Enum-switch is the default; state objects earn their keep

A handful of states belongs in a `switch` like `MutatedCrewEnemy.Step`. Promote to state-objects/HFSM only when states multiply *and* share entry/exit logic. Premature abstraction makes the FSM harder to step deterministically and harder to read at review time. Source: `guides/02-state-machine-patterns.md`.

### 6. Reuse the one FSM; archetypes are deltas

The raider assault is not a second AI stack — `Tier0RaiderAssault` spawns a `MutatedCrewEnemy`-driven raider and reuses the `HullBreachEvent` seal loop. The GDD says so: the raid "Reuses the same FSM" (GDD §8). New archetypes differ by *parameters and one or two states*, not parallel controllers. Source: `Tier0RaiderAssault.cs:117-125`, `guides/07-enemy-archetypes.md`.

### 7. Perception is cheap and deterministic

Flat-plane distance checks first (as `MutatedCrewEnemy.Flat`/`FlatDistance` do — `MutatedCrewEnemy.cs:225-233`), line-of-sight only when a check needs it. No per-frame physics queries you can't step in a test. Expensive perception is both a bug surface and a perf sink. Source: `guides/03-perception-and-aggro.md`.

### 8. Tier discipline holds

One mutation FSM exists and is DONE (CLAUDE.md §3). New states, archetypes, spawners, and behavior trees are *forward design* — written cleanly and tested, marked Tier 1+, never built into the gray-box ahead of the "is it fun?" call (CLAUDE.md §4, Hard Rule #1). Source: GDD §13, `guides/09-behavior-trees-when-justified.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] `MutatedCrewEnemy.cs` read — the `EnemyState` enum, `EnsureInitialized`, `Configure`, `Step` switch.
- [ ] `RuntimeEnemyTests.cs` read — how `Step` is driven deterministically.
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] The behavior-vs-numbers line clear — is this transition mine, or a constant for `game-balance-guardian`?

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: surface concerns at the boundary; don't author work the other Guardian owns.

| Question | Owner |
|---|---|
| Enemy difficulty VALUES (detect/leash/speed/damage/cooldown, wave size, raid cadence) | `game-balance-guardian` |
| Generic MonoBehaviour / C# scaffolding, lifecycle, serialization | `unity-csharp-guardian` |
| EditMode harness, CI runner, batchmode | `unity-test-ci-guardian` (AI test pattern co-owned) |
| Pooling, frame budget, update batching for many agents | `mobile-game-perf-guardian` |
| Persistence of AI / spawn state | `save-load-guardian` |
| Touch controls / input | `touch-input-guardian` |
| Juice / hit-stop / telegraph feel | `game-feel-juice-guardian` |
| MCP scene assembly / authored-scene spawning | `unity-mcp-guardian` |

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Transition unreachable from `Step`/`Configure` (untestable AI); logic only in `Update`/`Awake`; chase with no leash; `Object.Destroy` that breaks EditMode; hardcoded behavior that should be a transition; per-tick allocation or untickable physics in `Step`; a parallel controller duplicating the FSM | Yes |
| **Should-refactor** | Enum-switch that should be a state machine (or vice-versa) at current state count; perception coupled to tags instead of `Configure`; archetype built as a fork instead of a parameter/state delta; missing failing-case test for a new transition | No — opens follow-up |
| **Style** | State-naming nit; comment phrasing; field ordering | Never |

The cardinal credibility error on this Guardian: labeling a *balance number* as a *behavior bug*. If the fix is "change a constant," it is not your finding — it is `game-balance-guardian`'s.

## Citation discipline

Every finding has two citations:

1. **Where in the codebase** — `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:131`.
2. **Why it's a finding** — a guide section (`guides/01-the-enemy-fsm.md §3`), a GDD/ARCHITECTURE section, or a named external reference.

No citations means the finding is opinion, not enforcement.
