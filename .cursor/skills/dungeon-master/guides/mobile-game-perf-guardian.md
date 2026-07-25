# Mobile Game Perf Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `mobile-game-perf-guardian`. Use this guide to decide whether a user request belongs to this Guardian.

**Guardian:** [`agents/mobile-game-perf-guardian.md`](../../../../agents/mobile-game-perf-guardian.md)
**Weapon:** [`.claude/skills/mobile-game-perf-weapon/`](../../mobile-game-perf-weapon/)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`mobile-game-perf-guardian` is PROJECT-DRIFT's performance specialist for a Unity 6, top-down, portrait-friendly space-survival game running on mid-tier Android/iOS. Its remit is the *cost* side of the game: the per-frame millisecond budget (60fps target / 30fps floor → 16.67ms / 33.3ms), GC-allocation discipline in hot paths (`Update`/`LateUpdate`/`Tick`/`Step` — zero heap allocs, no LINQ/boxing/closure/foreach-alloc, cached components), object pooling (enemies, salvage nodes, projectiles, VFX) over `Instantiate`/`Destroy` churn, sprite atlasing and draw-call batching (SpriteAtlas, SRP batcher, dynamic/static batching, `MaterialPropertyBlock` over `new Material`), overdraw and fill-rate on tile-based mobile GPUs, texture import and compression (ASTC), the profiling workflow (Unity Profiler, Frame Debugger, Memory Profiler, deep-profiling caveat), build size and startup time, battery/thermal/sustained-performance, and Addressables as Tier 1+ forward guidance. **Measurement is the product** — every recommendation it makes is paired with the Profiler marker, Frame Debugger step, or Build Report number that confirms it. Device builds are run by the human (CLAUDE.md §7); this Guardian advises and measures.

## Trigger phrases

Route to `mobile-game-perf-guardian` when the user says any of:

- "Is this allocating per frame?" / "Audit the GC allocations" / "Why is the GC spiking?"
- "Audit the frame budget" / "Is this 60fps on mid-tier Android?" / "How many ms is this costing?"
- "Set up object pooling" / "Stop the Instantiate/Destroy churn" / "Pool the enemies / salvage / projectiles / VFX"
- "Atlas the sprites" / "Reduce draw calls" / "Why are batches so high?" / "Is the SRP batcher working?"
- "Fix overdraw" / "The GPU is the bottleneck" / "Fill-rate problem"
- "Texture compression" / "Set up ASTC" / "Why is VRAM so high?"
- "Profile the game" / "Set up the Profiler / Frame Debugger / Memory Profiler" / "What should I capture on-device?"
- "Why is the build so big?" / "Reduce startup time"
- "The phone overheats" / "Battery drain" / "It throttles after a few minutes" / "Sustained performance"
- Anything touching a Unity hot path (`Update`/`LateUpdate`/`Tick`/`Step`), an `Instantiate`/`Destroy` site, a `new Material(...)` / shader, or a texture import inspector.

Or when the request implicitly involves mobile frame budget, allocation cost, draw calls, GPU fill-rate, texture/build size, or thermal/battery behavior.

## Do NOT route when

- The user wants C# correctness, architecture, or the actual refactor pattern — that is `unity-csharp-guardian`. (This Guardian flags the *cost*: "this allocates / breaks batching / churns Instantiate." That Guardian owns the clean pattern.)
- The user wants EditMode/PlayMode test wiring, CI, or the `Tick`/`Step` extraction harness — that is `unity-test-ci-guardian`. (This Guardian cares that the hot path is *extractable to a `Tick`* so it can be measured; the test scaffold is theirs.)
- The user wants particle/juice *design intent* — what an effect should look and feel like — that is `game-feel-juice-guardian`. (The VFX **perf budget** — particle caps, effect-quad overdraw, pooling effect objects — is **co-owned**: this Guardian sets the cost ceiling, that Guardian spends it.)
- The user wants touch input handling, gestures, or input latency — that is `touch-input-guardian`. (This Guardian owns the frame budget input runs inside.)
- The user wants balance numbers (spawn counts, damage, drop rates) — that is `game-balance-guardian`. (This Guardian says "200 enemies blows the budget"; that Guardian sets the real number.)
- The user wants save/load format or mechanics — that is `save-load-guardian`. (Save-write frame hitches are flagged here; the format is theirs.)
- The user wants enemy FSM behavior — that is `fsm-ai-guardian`. (The per-frame *cost* of the FSM `Step` is here; the state logic is theirs.)
- The user wants the editor driven over MCP (running the Profiler programmatically) — that is `unity-mcp-guardian`. (This Guardian says what to capture; that Guardian drives the editor.)
- The user wants PRD/IRD authoring — that is `library-guardian`. (Architectural rationale for a Tier 1 perf subsystem that feeds the PRD stays here.)
- The user wants the **device build flashed or submitted** — that is the **human** (CLAUDE.md §7). This Guardian advises what to measure on-device, not how to flash.

If the request straddles boundaries (e.g., "this enemy spawn loop is slow and badly written"), prefer routing to `mobile-game-perf-guardian` for the cost finding and `unity-csharp-guardian` for the pattern fix — chain them.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The Unity project (current branch or specified files). Relevant: the hot-path scripts (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs`, `Bootstrap/Tier0RuntimeSpawner.cs`, `Visual/GrayBoxVisuals.cs`, `CameraRig/TopDownFollowCamera.cs`), any `Instantiate`/`Destroy` or `new Material` sites, texture import settings, and the player/quality settings.
- The **frame target** (default: 60fps aspirational, 30fps floor) and the **device class** (default: mid-tier Android/iOS).
- The **current tier** (Tier 0 gray-box vs Tier 1+) — this gates whether a recommendation is a must-fix-now or forward guidance. Default per CLAUDE.md §3: mid-Tier-0.
- Optional: an existing Profiler capture, Build Report, or device frame-time number.

If only a vague "make it faster" with no code or target, ask for the file paths and the target device/fps before invoking.

## Outputs the Guardian produces

- **Standalone perf audits** → `library/qa/mobile-perf/<date>-<topic>.md` (e.g., `2026-06-22-enemy-spawn-pooling-audit.md`).
- **Feature-tied perf reviews** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`.
- **Issue-tied perf reviews** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`.
- **ADRs** (e.g., introducing a pooling subsystem or Addressables in Tier 1) → `library/architecture/ADR-<n>-<topic>.md`.
- **Code-review comments** → file:line classified per the severity rubric (must-fix / should-optimize / forward-guidance), **each paired with its measurement**.

Every finding cites (a) `Assets/.../File.cs:LN` in the repo and (b) the relevant guide in `mobile-game-perf-weapon/guides/`, plus the upstream Unity reference where applicable.

## Multi-Guardian sequences this Guardian participates in

- **Hot-path perf + correctness review** — `mobile-game-perf-guardian` produces the cost findings (allocations, draw calls, churn) with measurements; `unity-csharp-guardian` owns the resulting code pattern; `unity-test-ci-guardian` confirms the hot path is `Tick`-extractable for measurement.
- **VFX budget negotiation** — `game-feel-juice-guardian` proposes the effect; `mobile-game-perf-guardian` sets the particle/overdraw/pooling budget the effect must fit; the two co-own the result.
- **Spawn-wave hardening** — `game-balance-guardian` sets the enemy count; `mobile-game-perf-guardian` confirms the count fits the frame budget and designs the pool; `fsm-ai-guardian` owns the per-enemy behavior whose `Step` cost is measured here.
- **Tier 1 pooling/Addressables subsystem** — `mobile-game-perf-guardian` writes the architectural rationale + phased plan; `library-guardian` writes the PRD; `unity-csharp-guardian` reviews the implementation pattern.

## Critical directives the orchestrator should respect

- **Budget in milliseconds, not vibes.** Every "is it fast enough" becomes a ms number against a stated target (16.67ms @ 60fps / 33.3ms @ 30fps). The Guardian will not accept "smooth in the editor" — only device ms.
- **Zero heap allocations in per-frame hot paths.** The Guardian blocks on per-frame allocations in `Update`/`LateUpdate`/`Tick`/`Step` (LINQ, boxing, closures, `foreach` over class enumerators, `new` on reference types, string concat) and on uncached `GetComponent`/`Find*` in loops. Target: 0 B/frame in the GC Alloc column.
- **Measurement or it didn't happen.** The Guardian pairs every recommendation with its instrument (Profiler marker, Frame Debugger delta, Memory Profiler snapshot, Build Report). An unmeasured perf claim is downgraded to "unverified."
- **Respect the tier ceiling.** The Guardian optimizes the gray-box where it exists and writes Tier 1 perf infrastructure (full pooling framework, Addressables, atlas pipelines) as forward guidance only — it will not drag Tier 1 systems into Tier 0 (CLAUDE.md §6 Rule #1).
- **Profile on-device.** The Guardian treats editor timings as suspect and the device player-connection as the source of truth; it warns that deep profiling is for relative hunting, not absolute numbers.
- **Severity is credibility.** Per-frame allocs in live hot paths, `new Material` per object, uncompressed textures shipped to device, and Instantiate/Destroy churn in combat are must-fix where the code exists. Pooling a system that doesn't exist yet is forward-guidance, not a block. Calling forward-guidance a must-fix destroys trust.
- **Hand off at the boundary.** Cost is this Guardian's; the code pattern is `unity-csharp-guardian`'s, the test is `unity-test-ci-guardian`'s, the effect's look is `game-feel-juice-guardian`'s, the device flash is the human's. The Guardian names the right owner and stops.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
