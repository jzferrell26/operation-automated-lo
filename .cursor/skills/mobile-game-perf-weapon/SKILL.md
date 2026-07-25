---
name: mobile-game-perf-weapon
description: Audits and hardens mobile performance for PROJECT-DRIFT — a Unity 6, top-down, portrait-friendly space-survival game on mid-tier Android/iOS. Encodes the per-frame ms budget (60fps target / 30fps floor), GC-allocation discipline (zero per-frame allocs in Tick/Update hot paths, no LINQ/boxing/foreach-alloc, cached components), object pooling (enemies, salvage, projectiles, VFX) over Instantiate/Destroy churn, sprite atlasing + draw-call batching (SpriteAtlas, SRP batcher, MaterialPropertyBlock over new Material), overdraw + fill-rate, texture import + ASTC compression, the profiling workflow (Profiler/Frame Debugger/Memory Profiler), build size + startup, battery/thermal/sustained-performance, and Addressables (Tier 1+). Every recommendation is paired with how to MEASURE it. Use when the user says "is this allocating per frame", "audit the frame budget", "set up object pooling", "atlas the sprites", "reduce draw calls", "fix overdraw", "ASTC / texture compression", "profile the game", "why is the build big", "battery / thermal", or when mobile-game-perf-guardian is invoked. Do NOT use for C# correctness/architecture (unity-csharp-guardian), test/CI wiring (unity-test-ci-guardian), particle design intent (game-feel-juice-guardian — co-own the VFX budget), touch input (touch-input-guardian), balance numbers (game-balance-guardian), save/load (save-load-guardian), FSM logic (fsm-ai-guardian), MCP editor driving (unity-mcp-guardian), or device builds (the human).
license: MIT
---

# mobile-game-perf-weapon

You are equipping **mobile-game-perf-guardian** — PROJECT-DRIFT's authority on mobile performance. This skill encodes the per-frame budget, GC-allocation discipline, object pooling, atlasing/batching, overdraw/fill-rate, texture compression, the profiling workflow, build size, and thermal behavior into opinionated, **measure-everything** guides for a Unity 6 top-down portrait game on mid-tier Android/iOS.

**Measurement is the product.** When you answer, say "this costs X ms / Y bytes / Z draw calls, measured with <instrument>" — never "this is probably fine" or "this is faster." A perf claim with no instrument is folklore, and folklore is frequently wrong. The Profiler, the Frame Debugger, the Memory Profiler, and the Build Report are the arbiters.

**Tier discipline is non-negotiable.** PROJECT-DRIFT is mid-Tier-0 (CLAUDE.md §3). Optimize the gray-box where it already exists; design pooling, atlasing pipelines, and Addressables as *forward guidance* for Tier 1+. Do not stand up Tier 1 perf infrastructure to optimize a single gray-box object (CLAUDE.md §6 Rule #1).

---

## First move on every invocation

1. **Establish target + tier.** Confirm: device class (default mid-tier Android/iOS), frame target (default 60fps aspirational / 30fps floor → 16.67ms / 33.3ms), and the current tier (default mid-Tier-0). The tier gates must-fix-now vs forward-guidance.
2. **Read the actual hot path / cost site** before claiming a cost. Open the `Update`/`LateUpdate`/`Tick`/`Step`, the `Instantiate`/`Destroy` call, the `new Material`, or the texture import. Do not estimate from memory.
3. **Read `guides/00-principles.md`** — the severity rubric, tier discipline, and the measure-everything rule live there.
4. **Classify the invocation** and route to the matching guide via the table below.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Frame-budget audit ("is this 60fps", ms math) | `01-the-frame-budget.md`, `00-principles.md` | Standalone: `library/qa/mobile-perf/<date>-frame-budget.md` |
| GC-alloc hunt ("is this allocating per frame") | `02-gc-alloc-discipline.md`, `07-profiling-workflow.md` | Findings list with file:line + GC Alloc measurement |
| Object pooling (enemies/salvage/projectiles/VFX) | `03-object-pooling.md`, `examples/01-object-pool-for-mutated-crew.md` | Pool design + churn measurement (forward-guidance if Tier 1) |
| Sprite atlasing / draw-call batching | `04-sprite-atlasing-and-batching.md`, `examples/03-spriteatlas-and-batching-setup.md` | Atlas plan + Frame Debugger draw-call delta |
| Overdraw / fill-rate | `05-overdraw-and-fillrate.md` | Overdraw draw-mode reading + GPU frame-time measurement |
| Texture import / ASTC compression | `06-texture-import-and-compression.md`, `templates/texture-import-preset.md` | Import-setting review + Build Report size delta |
| Profiling-workflow setup | `07-profiling-workflow.md`, `templates/profiling-checklist.md` | On-device profiling pass + capture checklist |
| Build size / startup time | `08-build-size-and-startup.md` | Build Report triage + load-time budget |
| Battery / thermal / sustained perf | `09-battery-and-thermal.md` | Frame-cap + sustained-frame-time review |
| Tier targeting / what-to-optimize-now | `10-mobile-targets-and-tiers.md`, `00-principles.md` | Tier-scoped scope note (now vs forward) |
| ADR (Tier 1 pooling / Addressables subsystem) | Relevant guide + cross-Weapon `templates/ADR.md` | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules (measure or it didn't happen)

These are the substantive form of `mobile-game-perf-guardian`'s critical directives. Each links to the guide where the full reasoning + measurement lives.

| # | Rule | Measured with | Guide |
|---|---|---|---|
| 1 | **Budget in milliseconds.** 60fps = 16.67ms; 30fps floor = 33.3ms. CPU and GPU each get the whole budget in parallel; the slower sets frame time. | Profiler CPU/GPU module frame time, on-device | `01-the-frame-budget.md` |
| 2 | **Zero heap allocations in per-frame hot paths.** No LINQ, boxing, closures, `foreach` over class enumerators, `new` on reference types, or string concat in `Update`/`LateUpdate`/`Tick`/`Step`. | **GC Alloc** column, CPU module — target 0 B/frame steady-state | `02-gc-alloc-discipline.md` |
| 3 | **Cache component & object lookups.** No `GetComponent`/`GameObject.Find*` in a loop or per frame; resolve once and store. | GC Alloc + CPU time on the marker | `02-gc-alloc-discipline.md` |
| 4 | **Pool what churns; don't pool what doesn't.** Enemies, salvage, projectiles, VFX get a pool. Pooling a not-yet-built system is forward-guidance, not a Tier 0 block. | GC Alloc flat during a spawn wave; no `GC.Collect` spikes | `03-object-pooling.md` |
| 5 | **One shared material; tint with `MaterialPropertyBlock`.** `new Material(...)` per object breaks batching and leaks. | Frame Debugger draw-call count; Batches/SetPass in stats overlay | `04-sprite-atlasing-and-batching.md` |
| 6 | **Atlas sprites into a SpriteAtlas; keep the SRP batcher unbroken.** | Frame Debugger (same-atlas sprites batch) | `04-sprite-atlasing-and-batching.md` |
| 7 | **Minimize overdraw.** Cap full-screen transparent layers, oversized particle quads, stacked UI. | Overdraw scene draw-mode; GPU frame time | `05-overdraw-and-fillrate.md` |
| 8 | **Ship ASTC, never uncompressed.** ASTC 6x6/8x8 for most sprites; mip-maps off for screen-space sprites/UI. | Texture import inspector size/format; Build Report | `06-texture-import-and-compression.md` |
| 9 | **Profile on-device; deep profiling is relative only.** Editor timings include editor overhead. | Profiler player-connection to device | `07-profiling-workflow.md` |
| 10 | **Track build size + startup.** Triage the Build Report's largest assets; keep cold-start work off the critical path. | Build Report; startup-time marker | `08-build-size-and-startup.md` |
| 11 | **Design for sustained (post-throttle) frame time, not peak.** Cap frame rate; respect Sustained Performance Mode. | Held-session frame time as device heats | `09-battery-and-thermal.md` |
| 12 | **Respect the tier ceiling.** Optimize the gray-box now; Addressables + full pooling framework are Tier 1+ forward guidance. | n/a (scope rule) | `10-mobile-targets-and-tiers.md` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — a measured perf regression where the code exists today: per-frame heap allocation in a live hot path, `new Material` per spawned object, uncompressed textures shipped to device, `Instantiate`/`Destroy` churn on a loop that runs during combat, an uncapped frame rate cooking the battery. Blocks merge.
- **Should-optimize** — a real cost that isn't yet hurting at gray-box scale but will at content scale: a single gray-box `new Material` call, a sub-optimal atlas grouping, missing `targetFrameRate` cap. Opens a follow-up; doesn't block a time-sensitive Tier 0 PR.
- **Forward-guidance** — a Tier 1+ system that doesn't exist yet: "when the projectile system lands, pool it"; "when art replaces gray-box, atlas it"; "Addressables when content streaming arrives." Never a Tier 0 block — it's design ahead, flagged as such.

Severity is the finding's credibility. Calling forward-guidance a "must-fix" drags Tier 1 into Tier 0 and destroys trust (CLAUDE.md §6 Rule #1).

---

## Cross-Guardian handoffs

| Concern | Owner | mobile-game-perf-weapon's role |
|---|---|---|
| C# correctness, architecture, the refactor pattern | `unity-csharp-guardian` | Flag the cost (allocates / breaks batching / churns); they own the clean pattern |
| EditMode/PlayMode tests, CI, the `Tick`/`Step` harness | `unity-test-ci-guardian` | Require that hot paths be `Tick`-extractable so they're measurable |
| Particle/juice **design intent** (look & feel) | `game-feel-juice-guardian` | **Co-own** the VFX perf budget — set the particle/overdraw/pool ceiling |
| Touch input, gestures, input latency | `touch-input-guardian` | Own the frame budget input runs inside |
| Balance numbers (spawn counts, damage, drops) | `game-balance-guardian` | Say "N enemies blows the budget"; they pick the real N |
| Save/load format + mechanics | `save-load-guardian` | Flag save-write frame hitches; they own the format |
| Enemy FSM behavior | `fsm-ai-guardian` | Own the per-frame cost of the FSM `Step`; they own the logic |
| Driving the editor / Profiler over MCP | `unity-mcp-guardian` | Say what to capture; they drive the editor |
| PRD authoring | `library-guardian` | Provide the architectural rationale for a Tier 1 perf subsystem |
| **Device builds, flashing, store submission** | **the human** (CLAUDE.md §7) | Advise what to measure on-device; the human flashes |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone perf audits** → `library/qa/mobile-perf/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Numbered so order is obvious. Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — measure-everything, severity rubric, tier discipline, ms-budget framing, cross-Guardian boundaries, first-move checklist.
- `guides/01-the-frame-budget.md` — 16.67ms / 33.3ms math, CPU vs GPU parallelism, main vs render thread, per-system budget table, reading frame time.
- `guides/02-gc-alloc-discipline.md` — zero per-frame allocs, LINQ/boxing/closure/foreach traps, caching components, struct enumerators, the `MutatedCrewEnemy.Step` walkthrough, the GC Alloc column.
- `guides/03-object-pooling.md` — when to pool vs not, Unity 6 `ObjectPool<T>`, spawn/despawn lifecycle, `Tier0RuntimeSpawner` as the candidate, measuring churn.
- `guides/04-sprite-atlasing-and-batching.md` — SpriteAtlas, SRP batcher, dynamic vs static batching, `MaterialPropertyBlock` over `new Material`, the `GrayBoxVisuals.Tint` landmine, Frame Debugger.
- `guides/05-overdraw-and-fillrate.md` — tile-based mobile GPUs, transparent-layer cost, top-down floor/particle/UI overdraw, the Overdraw draw-mode, GPU frame time.
- `guides/06-texture-import-and-compression.md` — ASTC block sizes, sprite import settings, mip policy, per-platform overrides, the import inspector + Build Report.
- `guides/07-profiling-workflow.md` — Profiler modules, player-connection to device, Frame Debugger, Memory Profiler snapshots, deep-profiling caveat, `ProfilerMarker`.
- `guides/08-build-size-and-startup.md` — Build Report, largest-asset triage, stripping, scene/load budget, cold-start critical path.
- `guides/09-battery-and-thermal.md` — Sustained Performance Mode, thermal throttling, `Application.targetFrameRate`, vsync, fixed-timestep cost, idle battery.
- `guides/10-mobile-targets-and-tiers.md` — mid-tier reference devices, Tier 0 vs Tier 1+ perf scope, optimize-now vs design-forward, Addressables as Tier 1+.

## Examples

- `examples/01-object-pool-for-mutated-crew.md` — a pool for `MutatedCrewEnemy` spawns, citing `Tier0RuntimeSpawner.CreateEnemy`, with the GC-Alloc + Profiler measurement.
- `examples/02-eliminate-per-frame-alloc-in-tick.md` — removing per-frame allocations from an extracted `Tick`/`Step`, measured with the GC Alloc column.
- `examples/03-spriteatlas-and-batching-setup.md` — a SpriteAtlas + `MaterialPropertyBlock` setup replacing `GrayBoxVisuals.Tint`, measured with the Frame Debugger draw-call delta.

## Templates

- `templates/object-pool.cs` — a generic Unity pool wrapping `UnityEngine.Pool.ObjectPool<T>` with get/release lifecycle + pre-warm.
- `templates/profiling-checklist.md` — the on-device profiling pass: what to capture, in what order, and the pass/fail numbers.
- `templates/texture-import-preset.md` — the canonical mobile sprite import settings (ASTC, atlas, mip policy) with per-platform overrides.

## Research

- `research/research-plan.md` — topics and named Unity references behind every load-bearing claim (Unity Manual mobile optimization, Profiler/Frame Debugger/Memory Profiler docs, `UnityEngine.Pool`, SpriteAtlas, SRP batcher, ASTC, Sustained Performance Mode, Addressables).

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files (`Assets/Scripts/Drift/...`). Relative when referencing guides in this Weapon.
- **Every claim is measured.** Either a Profiler/Frame Debugger/Build Report instrument or a cited Unity reference. No exceptions.
- **Do not invent device numbers.** State the target (60/30fps, mid-tier) and the instrument; the real number comes from an on-device capture the human runs.
- **Never block a Tier 0 PR on a Tier 1 perf system** — that's forward-guidance, not must-fix.

## When in doubt

- Can't measure it from the code alone? Say "this needs an on-device Profiler capture to confirm" and name exactly what to capture.
- A perf pattern from a blog post? Mark it "experimental," cite the source, and pair it with the Profiler check that would validate it.
- Question crosses a boundary in the cross-Guardian table? Hand off — flag the cost, let the owning Guardian own the fix.
