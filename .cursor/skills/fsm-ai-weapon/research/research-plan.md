# Research Plan — fsm-ai-weapon

The topics and named sources behind this Weapon's load-bearing claims. **No fabricated URLs.** Where a source is a book, talk, article series, or engine doc, it is named precisely enough to locate; specific editions/sections are noted where they matter. The primary sources for DRIFT-specific claims are the repo files themselves.

## Primary sources (this repo — the authoritative anchors)

These outrank any external reference for *how DRIFT actually works*:

- `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` — the canonical idle→chase→attack→return FSM, `EnsureInitialized`/`Configure`/`Step`. Every FSM and testability claim traces here.
- `Assets/Tests/EditMode/RuntimeEnemyTests.cs` — the EditMode test pattern (the coverage bar; the `Step`-driven, `Configure`-wired shape).
- `Assets/Scripts/Drift/Gameplay/LifeSupport/Tier0RaiderAssault.cs` + `HullBreachEvent.cs` — the raider-assault reuse-the-FSM pattern, event-driven subscribe/unsubscribe discipline.
- `Assets/Scripts/Drift/Core/Combat/Health.cs` — `Changed`/`Died` event signatures used in the flee/stagger example.
- `space-survival-design-doc.md` (GDD) §8, §13 — enemy design ("simple FSM ... aggro + pathing is enough"), archetypes (mutation melee swarm vs raider ranged/tactical), raid-every-24h, "Reuses the same FSM".
- `ARCHITECTURE.md` §7, §8 — the EditMode conventions (lazy-init / Configure / extracted Step) and the NavMesh-free-by-design / Tier-1-NavMesh note.
- `CLAUDE.md` Hard Rules #1 (tier discipline), #3 (data over code), #11 (EditMode testability); §3 Status Map; §7 (human owns balance/feel).
- `TIER0.md`, `AGENTS.md` — scope guard; headless EditMode test invocation.

## External topics + named references

### 1. Finite state machines for game AI
- **Topic:** the FSM as the default game-AI structure; states, transitions, guards, entry/exit.
- **Named sources:** Ian Millington & John Funge, *Artificial Intelligence for Games* (3rd ed.) — the "State Machines" chapter (the standard reference). Mat Buckland, *Programming Game AI by Example* — the "State-Driven Game Agents" chapter (West-world example; the enum-style and state-object styles contrasted). *Game Programming Patterns* by Robert Nystrom — the "State" chapter (free online edition; covers enum-switch vs state objects vs the State pattern, and the hierarchical/pushdown variants).
- **Used in:** `guides/01`, `guides/02`.

### 2. Enum-switch vs state objects vs HFSM
- **Topic:** when to keep an FSM as a switch and when to promote.
- **Named sources:** Nystrom, *Game Programming Patterns*, "State" chapter (the explicit "the simplest thing that works" framing). Millington & Funge, *AI for Games* — hierarchical state machines section.
- **Used in:** `guides/02`, `guides/09`.

### 3. Steering behaviors
- **Topic:** seek/flee/arrive as vector steering; why direct steering suffices for open top-down fields.
- **Named sources:** Craig Reynolds, "Steering Behaviors For Autonomous Characters" (GDC 1999 paper — the origin of seek/flee/arrive/pursue). Millington & Funge, *AI for Games* — "Movement" / steering chapter.
- **Used in:** `guides/04`.

### 4. Pathfinding cost on mobile (the steering-over-A* stance)
- **Topic:** why grid A*/NavMesh is usually the wrong default for many cheap agents on phones.
- **Named sources:** Amit Patel, "Red Blob Games — Introduction to A*" (the canonical explainer; used to characterize A* cost, not to recommend it here). Unity Manual — *AI Navigation* package (`com.unity.ai.navigation`) docs (NavMesh bake/agent model; the package DRIFT reserves for Tier 1). Unity's per-agent NavMeshAgent cost is the reason it's deferred.
- **Used in:** `guides/04`.

### 5. Aggro, leashing, hysteresis
- **Topic:** detection radius, leash/return, de-aggro hysteresis to prevent state thrash.
- **Named sources:** general MMO/action-RPG "leash" design (a well-documented pattern; described from the mechanic, not a single citable URL). Hysteresis/dead-band framing from control theory applied to the `attackRange * 1.25f` band — corroborated directly by `MutatedCrewEnemy.cs:153`.
- **Used in:** `guides/03`, `guides/10`.

### 6. Behavior trees (and why they're usually overkill here)
- **Topic:** BT node model (selector/sequence/decorator, Running/Success/Failure), and the cost/benefit vs an FSM at small scale.
- **Named sources:** Millington & Funge, *AI for Games* — "Behavior Trees" chapter. Chris Simpson, "Behavior trees for AI: How they work" (Gamasutra/Game Developer article — widely cited primer). Unity's behavior-tree tooling (the *Behavior* package / formerly Behavior Designer-style assets) as the "designer-editable" argument — named to characterize the strength, not to endorse adoption.
- **Used in:** `guides/09`.

### 7. Object pooling for many agents (handoff context)
- **Topic:** why instantiate/destroy churn hurts on mobile; the factory-seam approach that defers pooling to perf.
- **Named sources:** Nystrom, *Game Programming Patterns*, "Object Pool" chapter. Unity Manual — *Object Pooling* / `UnityEngine.Pool` (`ObjectPool<T>`). (Budget + pool architecture is `mobile-game-perf-guardian`'s; cited here only to justify the seam.)
- **Used in:** `guides/05`, `templates/enemy-spawner.cs`.

### 8. EditMode/deterministic testing of MonoBehaviours
- **Topic:** Unity not running Awake/Start/Update on script-added components in EditMode; designing for determinism.
- **Named sources:** Unity Manual — *Unity Test Framework* (EditMode vs PlayMode test docs). The repo's own `ARCHITECTURE.md` §7 and `RuntimeEnemyTests.cs` are the authoritative, project-specific source — the external doc only explains *why* the constraint exists.
- **Used in:** `guides/08`, all three examples, all three templates.

## Open questions (TBD — revisit at Tier 1)
- Does the raider archetype's LOS + Search warrant promotion to the state-object pattern, or stay enum-switch? (Decide against `guides/02 §2` rubric when built.)
- At what measured agent count does the mutation swarm justify local avoidance, then NavMesh? (Co-own the threshold with `mobile-game-perf-guardian`.)
- When the raid becomes recurring (24h), where does the cadence timer live so balance owns the number cleanly? (Coordinate with `game-balance-guardian`.)
