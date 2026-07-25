# mobile-game-perf-weapon

The procedural arsenal for `mobile-game-perf-guardian`, PROJECT-DRIFT's mobile performance specialist — a Unity 6, top-down, portrait-friendly space-survival game targeting mid-tier Android/iOS.

## What this weapon covers

- **The frame budget** — 16.67ms @ 60fps / 33.3ms @ 30fps floor; CPU vs GPU parallelism; per-system budget allocation
- **GC-allocation discipline** — zero per-frame allocations in `Update`/`LateUpdate`/`Tick`/`Step`; LINQ/boxing/closure/foreach traps; cached components; struct enumerators
- **Object pooling** — enemies, salvage nodes, projectiles, VFX; Unity 6 `UnityEngine.Pool.ObjectPool<T>`; when to pool and when not to
- **Sprite atlasing & batching** — SpriteAtlas, the SRP batcher, dynamic/static batching, `MaterialPropertyBlock` over `new Material`
- **Overdraw & fill-rate** — the silent killer on tile-based mobile GPUs; transparent layers, particle quads, stacked UI
- **Texture import & compression** — ASTC block sizes, sprite import settings, mip policy, per-platform overrides
- **Profiling workflow** — Unity Profiler, Frame Debugger, Memory Profiler, on-device player-connection, the deep-profiling caveat
- **Build size & startup** — Build Report triage, asset stripping, cold-start critical path
- **Battery & thermal** — Sustained Performance Mode, thermal throttling, frame-rate capping
- **Mobile targets & tiers** — reference devices, Tier 0 vs Tier 1+ scope, Addressables as forward guidance

## Reading order

1. Read `SKILL.md` — master index, hard rules (each with its measurement), severity rubric, routing table
2. Read `guides/00-principles.md` — the measure-everything rule and tier discipline
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Reference `research/research-plan.md` for the Unity sources behind a claim

## Two key rules

**Measure or it didn't happen.** Every recommendation ships with the instrument that confirms it — a Profiler marker, a Frame Debugger draw-call delta, a Memory Profiler snapshot, or a Build Report number. "This is probably faster" is not a finding; "this drops GC Alloc from 4 KB/frame to 0 B/frame, measured in the CPU module's GC Alloc column" is. Unmeasured perf advice is folklore and is frequently wrong.

**Respect the tier ceiling.** PROJECT-DRIFT is mid-Tier-0 (CLAUDE.md §3). Optimize the gray-box where it already exists; design pooling, atlas pipelines, and Addressables as *forward guidance* for Tier 1+. Do not stand up Tier 1 perf infrastructure to optimize a single gray-box object (CLAUDE.md §6 Rule #1). Device builds are run by the human (CLAUDE.md §7) — this Weapon advises what to measure on-device, it does not flash the device.
