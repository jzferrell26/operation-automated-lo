# 00 — Principles

The non-negotiables. Read on every invocation.

## The ten principles

### 1. Establish target + tier before anything else

A perf recommendation for the wrong device or the wrong tier is wrong advice. Before any finding, capture:

- **Device class** — default mid-tier Android/iOS (a 3-4-year-old mid-range phone, not a flagship, not the editor).
- **Frame target** — default 60fps aspirational, 30fps floor → **16.67ms** and **33.3ms** per frame.
- **Current tier** — default mid-Tier-0 (CLAUDE.md §3). The tier decides whether a finding is must-fix-now or forward-guidance.

Source: every guide assumes you've done step 1.

### 2. Measure or it didn't happen

Every recommendation is paired with the instrument that confirms it: a Profiler marker, the GC Alloc column, a Frame Debugger draw-call delta, a Memory Profiler snapshot diff, or a Build Report number. "This is faster" with no instrument is downgraded to "unverified." Source: `guides/07-profiling-workflow.md`.

### 3. Budget in milliseconds, not vibes

60fps = 16.67ms/frame; 30fps floor = 33.3ms/frame. CPU and GPU each have the whole budget and run in parallel — the slower one sets the frame time. Every "is this fast enough" becomes a ms number against the stated target. "Smooth in the editor" is not a measurement. Source: `guides/01-the-frame-budget.md`.

### 4. Zero heap allocations in per-frame hot paths

`Update`/`LateUpdate`/`Tick`/`Step` and everything they call must not allocate. No LINQ, no `foreach` over a class enumerator, no boxing, no string concat, no closures capturing locals, no `new` on reference types per frame. Cache `GetComponent`; never `GameObject.Find*` in a loop. Target: **0 B/frame** in the GC Alloc column, steady-state. Source: `guides/02-gc-alloc-discipline.md`.

### 5. Pool what churns; don't pool what doesn't

Enemies, salvage drops, projectiles, and play-spawned VFX get a pool instead of `Instantiate`/`Destroy`. But pooling a system Tier 0 hasn't built is **forward-guidance** — don't build a pooling framework for one gray-box enemy. Source: `guides/03-object-pooling.md`.

### 6. Protect batching — one shared material, tint with `MaterialPropertyBlock`

`new Material(...)` per object creates a unique instance that breaks the SRP batcher / dynamic batching and leaks. Tint via `MaterialPropertyBlock` or a shared material + atlas. Source: `guides/04-sprite-atlasing-and-batching.md`.

### 7. Overdraw is the mobile GPU killer

Top-down means large flat surfaces and stacked transparent sprites; tile-based mobile GPUs pay per fragment per layer. Minimize full-screen transparent layers, oversized particle quads, stacked UI. Fill-rate, not triangle count, melts a mobile GPU on a 2D-ish top-down game. Source: `guides/05-overdraw-and-fillrate.md`.

### 8. Ship ASTC, never uncompressed

Mobile sprites use ASTC (6x6/8x8 for most, 4x4 only when quality demands); sprite sheets pack into a SpriteAtlas; mip-maps off for screen-space sprites/UI that never scale. Source: `guides/06-texture-import-and-compression.md`.

### 9. Profile on-device; deep profiling is relative only

The editor runs on desktop hardware and includes editor overhead. The Profiler's player-connection to a real device is the source of truth. Deep profiling inflates every call — use it to *find* the hot path, not to read absolute numbers. Source: `guides/07-profiling-workflow.md`.

### 10. Respect the tier ceiling

Tier 0 is the gray-box loop. Do not build Tier 1 perf infrastructure (Addressables, a full pooling framework, atlas pipelines for art that doesn't exist) while Tier 0 is incomplete (CLAUDE.md §6 Rule #1). Optimize what's there; write the rest as forward guidance. Source: `guides/10-mobile-targets-and-tiers.md`.

---

## First-move checklist

Before writing findings, confirm:

- [ ] Device class + frame target + current tier captured.
- [ ] The actual hot-path / cost site read (not estimated from memory).
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-optimize / forward-guidance).
- [ ] For every finding, the measurement instrument named.
- [ ] Cross-Guardian handoff lines clear — flag the cost, let the owning Guardian own the fix.

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Per-frame heap alloc in a live hot path; `new Material` per spawned object; uncompressed textures shipped to device; `Instantiate`/`Destroy` churn on a combat-time loop; uncapped frame rate cooking the battery | Yes |
| **Should-optimize** | A single gray-box `new Material` call; sub-optimal atlas grouping; missing `targetFrameRate` cap; a `foreach` alloc on a rarely-hit path | No — opens follow-up |
| **Forward-guidance** | "Pool the projectile system when it lands"; "atlas the art when it replaces gray-box"; "Addressables when content streaming arrives" | Never — design-ahead, flagged as such |

Calling forward-guidance a "must-fix" drags Tier 1 into Tier 0 and destroys credibility (CLAUDE.md §6 Rule #1). Calling a real per-frame leak a "style nit" lets it ship. Be disciplined.

## Citation discipline

Every finding has three parts:

1. **Where** — `Assets/Scripts/Drift/.../File.cs:LN` in the repo.
2. **Why it's a finding** — the guide section (`guides/02-gc-alloc-discipline.md §3`) or the Unity reference.
3. **How to measure it** — the exact instrument and the pass/fail number.

A finding missing the measurement is opinion, not enforcement.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: own the *cost*; hand off the *fix* at the boundary.

| Question | Owner |
|---|---|
| C# correctness / architecture / the refactor pattern | `unity-csharp-guardian` |
| EditMode/PlayMode tests, CI, the `Tick`/`Step` harness | `unity-test-ci-guardian` |
| Particle/juice design intent (look & feel) | `game-feel-juice-guardian` (VFX budget **co-owned**) |
| Touch input, gestures, latency | `touch-input-guardian` |
| Balance numbers (spawn counts, damage, drops) | `game-balance-guardian` |
| Save/load format + mechanics | `save-load-guardian` |
| Enemy FSM behavior | `fsm-ai-guardian` |
| Driving the editor / Profiler over MCP | `unity-mcp-guardian` |
| PRD authoring | `library-guardian` |
| Device builds / flashing / submission | the **human** (CLAUDE.md §7) |

When in doubt, flag the cost and escalate.
