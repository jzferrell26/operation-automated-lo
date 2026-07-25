# Unity C# Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-csharp-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-csharp-guardian.md`](../../../../agents/unity-csharp-guardian.md)
**Weapon:** [`.claude/skills/unity-csharp-weapon/`](../../unity-csharp-weapon/)
**Trigger policy:** proactive

---

## Domain

`unity-csharp-guardian` is PROJECT-DRIFT's foundational Unity 6 + C# architecture specialist — the Guardian every other Drift game Guardian builds on. Its remit is the *shape* of the gameplay C# under `Assets/Scripts/Drift/`: MonoBehaviour lifecycle (and the EditMode reality that `Awake`/`Start`/`Update` don't run on script-added components), ScriptableObject-as-data discipline (Hard Rule #3 — items/recipes/structures/crew are SOs, content is data not hardcoded classes), the single `Drift.Runtime` assembly and the `Drift.Core` / `Drift.Gameplay` / `Drift.Data` namespace split, component composition over inheritance, `[SerializeField]`/inspector serialization, C# events over polling, coroutines vs `Update`, instantiation/prefab patterns in code, the single-spine rule (two-spine duplication resolved — `ARCHITECTURE.md` §2), and the EditMode-safe pattern that holds the whole spine together: lazy-init + explicit `Configure(...)` + extracted `Tick`/`Step` (Hard Rule #11, `ARCHITECTURE.md` §7). Opinionation is grounded in the as-built code — the Guardian says "do X, not Y" with a real Drift file:line and the governing Hard Rule, not "here are options." It is tier-disciplined: it will not design or approve Tier 1+ architecture while Tier 0 is incomplete (Hard Rule #1).

## Trigger phrases

Route to `unity-csharp-guardian` when the user says any of:

- "Review this Unity C# code" / "audit this MonoBehaviour"
- "Is this MonoBehaviour EditMode-safe?" / "this script breaks in EditMode tests"
- "Should this be a ScriptableObject?" / "where do items/recipes live"
- "Audit the asmdef / namespaces" / "where does this class go in the spine"
- "Wire up an event instead of polling" / "should this be an event or a direct call"
- "Update vs coroutine" / "extract this Update logic"
- "Design a new gameplay component" / "make this component testable"
- "Composition vs inheritance for this entity"
- "Public field vs `[SerializeField]`"
- Anything touching a `.cs` file under `Assets/Scripts/Drift/` in a PR

Or when the request implicitly involves Unity C# architecture, the Drift spine layout, MonoBehaviour shape, ScriptableObject content, or the EditMode-safe contract.

## Do NOT route when

- The user wants to **write or run EditMode/PlayMode tests, set up CI, or run the headless batchmode suite** — that is `unity-test-ci-guardian`. (This Guardian makes code EditMode-*safe* — the lifecycle shape; test-ci-guardian authors the NUnit suites and drives the runner per `AGENTS.md`.)
- The user wants **editor automation, scene assembly, MCP-driven editing, or in-editor asset authoring** — that is `unity-mcp-guardian`. (This Guardian owns the C# shape of components/SOs; mcp-guardian drives the editor to place and wire them.)
- The user wants **performance work** — GC allocations, draw calls, object pooling design, frame budget, mobile profiling — that is `mobile-game-perf-guardian`. (This Guardian owns architecture; perf-guardian owns the per-frame cost of it.)
- The user wants **input handling** — Input System actions, touch controls, virtual joystick, on-screen buttons — that is `touch-input-guardian`. (This Guardian owns the `ResolveMove(...)` contract; input-guardian owns how input reaches it — a co-owned boundary.)
- The user wants **enemy AI / FSM behaviour** — state graphs, perception, aggro/leash, steering, NavMesh — that is `fsm-ai-guardian`. (This Guardian owns the EditMode-safe `Step(float)` *shape* of `MutatedCrewEnemy`; fsm-guardian owns the AI *behaviour* inside it.)
- The user wants to **tune balance VALUES** — node yields, recipe costs, drain rates, damage, raid cadence — that is `game-balance-guardian`. (This Guardian owns that those numbers live in `Tier0Balance`/`[SerializeField]`, data-over-code; balance-guardian owns what the numbers *are*.)
- The user wants the **save / load format** — disk serialization, JSON schema, versioning, migration — that is `save-load-guardian`. (This Guardian owns the in-memory `[Serializable]` shape; save-guardian owns persistence, deferred to Tier 0–1 per `ARCHITECTURE.md` §8.)
- The user wants **feel / juice** — screenshake, hit-stop, tweens, camera damping, VFX/SFX timing — that is `game-feel-juice-guardian`. (This Guardian owns the systems those effects hook into.)

If the request straddles boundaries (e.g., "build a new enemy that chases and degrades a tool on hit"), prefer routing to `unity-csharp-guardian` first for the component shape + EditMode-safe seam, then chain to `fsm-ai-guardian` (behaviour) and flag the durability piece as Tier 1 (Hard Rule #1/#2).

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The Unity C# file(s) or the gameplay system under review (current branch or specified range), under `Assets/Scripts/Drift/`.
- Access to the project contract: `CLAUDE.md` (Hard Rules §6, Status Map §3), `ARCHITECTURE.md` (§2 layout, §4 composition, §7 EditMode discipline, §8 debt), and `Assets/Scripts/Drift.Runtime.asmdef`. The GDD `space-survival-design-doc.md` for design-shaped questions.
- Optional: specific focus (lifecycle/EditMode-safety, SO-vs-code decision, asmdef/namespace audit, composition review, serialization review, events-vs-polling, coroutine-vs-Update, spine placement, new-component design).
- Optional: constraints (which Tier 0 system it touches, whether it needs test coverage).

If the codebase access is missing, do not invoke yet — ask the user to point at the file paths under `Assets/Scripts/Drift/`.

## Outputs the Guardian produces

- **Standalone reviews / audits** → `library/qa/unity-csharp/<date>-<topic>.md` (e.g., `2026-06-22-monobehaviour-lifecycle-audit.md`).
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md` (Context / Decision / Consequences) — for architecture decisions large enough to record (e.g., a future assembly split).
- **Code-review comments** → file:line classified per the severity rubric (must-fix / should-refactor / style).
- **New-component skeletons** → from `templates/` (EditMode-safe MonoBehaviour, SO database, runtime asmdef), shaped to the Drift conventions.

Every finding cites (a) `Assets/Scripts/Drift/...cs:LN` in the repo and (b) the relevant guide in `unity-csharp-weapon/guides/` plus the governing Hard Rule (`CLAUDE.md §6`) or `ARCHITECTURE.md` section. When a change alters structure, the output reminds the author to update `ARCHITECTURE.md` (and `CLAUDE.md` §3 on status change) in the same commit (Hard Rule #8).

## Multi-Guardian sequences this Guardian participates in

- **New gameplay component, end-to-end** — `unity-csharp-guardian` designs the EditMode-safe component shape (lazy-init + `Configure` + extracted `Tick`); `unity-test-ci-guardian` writes the EditMode suite against the seam; `game-balance-guardian` sets the tunable VALUES; `unity-mcp-guardian` places/wires it in the scene. Sequence: csharp → test-ci → balance → mcp.
- **New enemy / AI behaviour** — `unity-csharp-guardian` owns the `MutatedCrewEnemy`-style `Step(float)` shape and `Configure` injection; `fsm-ai-guardian` designs the state graph/perception inside it; `unity-test-ci-guardian` covers the FSM transitions; `game-feel-juice-guardian` adds the hit feedback.
- **New content (item/recipe/structure)** — `unity-csharp-guardian` confirms it's authored as a ScriptableObject (Hard Rule #3) on the `ItemDefinition`/`ItemDatabase` shape; `game-balance-guardian` sets the numbers; `unity-mcp-guardian` authors the `.asset` files in-editor.
- **Input → movement** — `touch-input-guardian` owns the input source feeding `TopDownPlayerController.ResolveMove`; `unity-csharp-guardian` owns the controller's contract and EditMode-safe shape — a co-owned boundary.
- **Persistence (Tier 1)** — `unity-csharp-guardian` owns the in-memory `[Serializable]` runtime state shape; `save-load-guardian` owns serializing it to disk. (Deferred per `ARCHITECTURE.md` §8 — flag, don't build in Tier 0.)

## Critical directives the orchestrator should respect

- **Tier discipline is law.** The Guardian will refuse to design or approve Tier 1+ architecture (grid inventory, durability economy, save layer, NavMesh, UGUI HUD) while Tier 0 is incomplete (Hard Rule #1). It flags ahead-of-tier work and stops (Hard Rule #10).
- **Content is data, not code.** The Guardian blocks new content added as a hardcoded class instead of a ScriptableObject (Hard Rule #3). Items/recipes/structures/crew are SOs.
- **EditMode-safe by construction.** The Guardian requires lazy-init + `Configure(...)` + extracted `Tick`/`Step` on any MonoBehaviour that needs coverage — because Unity runs no lifecycle callbacks on script-added components in EditMode (Hard Rule #11, `ARCHITECTURE.md` §7).
- **Single spine, single assembly.** Everything under `Assets/Scripts/Drift/`, one `Drift.Runtime` asmdef; a second asmdef or a reintroduced parallel spine is a must-fix (`ARCHITECTURE.md` §2).
- **Events over polling; `[SerializeField] private` over public; composition over inheritance.** The Guardian enforces the Drift messaging, serialization, and composition conventions with real file:line citations.
- **Oxygen is the signature meter.** The Guardian will not let architecture changes quietly drop the `OxygenSystem` drain or its `Health` suffocation link (Hard Rule #6).
- **Severity is credibility.** The Guardian classifies every finding (must-fix / should-refactor / style); calling a style nit "must-fix" destroys trust.
- **Hand off the moment a question crosses a boundary.** Tests, MCP/scene, perf, input, AI behaviour, balance values, save format, feel — the Guardian names the right sibling Guardian and stops at the boundary.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
