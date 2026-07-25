# fsm-ai-weapon

The procedural arsenal for `fsm-ai-guardian`, PROJECT-DRIFT's enemy-AI behavior specialist.

## What this weapon covers

- **The canonical enemy FSM** — idle → chase → attack → return, as shipped in `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs`, plus forward-tier extensions (flee, search, stagger, alert)
- **State-machine patterns** — enum-switch vs state objects vs HFSM, and which earns its keep at DRIFT's scale
- **Perception & aggro** — detect radius, leash radius, line-of-sight, target acquisition — kept cheap and deterministic
- **Steering vs pathfinding on mobile** — why direct steering usually wins on a top-down phone game, and when NavMesh/A* is actually justified
- **Spawning & waves** — tickable, `Configure`-wired spawn controllers
- **Raider-assault AI** — `Tier0RaiderAssault` reusing `MutatedCrewEnemy` + the `HullBreachEvent` seal loop for the station raid
- **Enemy archetypes** — mutation (melee swarm) vs raider (ranged/tactical), as parameter + state deltas (GDD §8, §13)
- **EditMode-testable AI** — CLAUDE.md Hard Rule #11: lazy-init + `Configure(...)` + extracted `Step`/`Tick`, modeled on `Assets/Tests/EditMode/RuntimeEnemyTests.cs`
- **Behavior trees, when justified** — a Tier-later escalation that is usually overkill
- **AI failure modes** — leash failures, state-thrash jitter, stuck-on-geometry, untestable transitions, swarm overrun

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, output paths
2. Read `guides/00-principles.md` — the behavior-not-numbers line and the EditMode-testability law
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Read the real code before proposing changes: `MutatedCrewEnemy.cs` (the FSM) and `RuntimeEnemyTests.cs` (the test pattern)
5. Reference `research/research-plan.md` if you need the named game-AI sources behind a claim

## Key rule

**Behavior is yours; numbers are `game-balance-guardian`'s; and every transition you write must be steppable in EditMode.** If a state change can only fire from inside `Update`, it cannot be tested — and an untestable enemy silently rots. Write the `Step`-driven test before you call the behavior done. The DRIFT spine is green precisely because nothing hides logic in `Awake`/`Start`/`Update` (`ARCHITECTURE.md` §7).
