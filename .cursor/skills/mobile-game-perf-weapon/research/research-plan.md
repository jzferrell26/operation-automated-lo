# Research Plan — mobile-game-perf-weapon

Forge date: 2026-06-22

## Goal

Ground every active guide in `mobile-game-perf-weapon/guides/` against (a) authoritative Unity documentation, (b) the platform GPU-vendor optimization guidance that governs mid-tier mobile, and (c) the actual PROJECT-DRIFT code the guides cite. Every load-bearing perf claim is paired with the Unity instrument that measures it (Profiler / Frame Debugger / Memory Profiler / Build Report) — this Weapon's first principle is "measure or it didn't happen."

No fabricated URLs. Sources are named by document title and owner; the exact URL is resolved against the current Unity 6 (6000.x) documentation set at use time, since Unity's doc URLs are versioned and move between releases.

## Authoritative anchor sources (named, not fabricated)

- **Unity Manual — "Understanding optimization in Unity"** (the optimization hub for Unity 6)
- **Unity Manual — "Optimizing graphics performance"** (draw calls, fill-rate, overdraw)
- **Unity Manual — "Optimizing for mobile devices" / "Practical guide to optimization for mobiles"**
- **Unity Manual — "Profiler overview" + per-module pages** (CPU Usage, GPU Usage, Memory, Rendering)
- **Unity Manual — "Deep profiling"** (the overhead caveat)
- **Unity Manual — "Frame Debugger"**
- **Unity — "Memory Profiler" package documentation** (snapshot + diff workflow)
- **Unity Manual — "Understanding the managed heap" / "Memory in Unity" / "Garbage collector overview"** (GC alloc discipline, incremental GC)
- **Unity Scripting API — `Unity.Profiling.ProfilerMarker`**
- **Unity Manual — "Object Pooling"** + **Scripting API `UnityEngine.Pool.ObjectPool<T>` / `LinkedPool<T>` / collection pools**
- **Unity Manual — "SRP Batcher" / "GPU instancing" / "Optimizing draw calls" / "Static & dynamic batching"**
- **Unity Manual — "Sprite Atlas"** + **Scripting API `MaterialPropertyBlock`**
- **Unity Manual — "Recommended, default, and supported texture formats by platform" / "Texture compression formats for platform-specific overrides"** (ASTC)
- **Unity Manual — "Importing textures" / "Mipmaps" / "Texture Preset" / `AssetPostprocessor`**
- **Unity Manual — "Build Report" / "Reducing the file size of your build" / "Managed code stripping" / "Optimizing load times and build sizes"**
- **Unity Scripting API — `Application.targetFrameRate` / `QualitySettings.vSyncCount` / `Time.fixedDeltaTime`**
- **Android Developers — "Sustained Performance Mode" & thermal status (PowerManager / thermal API)**
- **Arm — "Mali GPU best practices" / Apple — "Optimizing GPU performance" (Metal best practices)** (tile-based deferred rendering, overdraw, fill-rate, ASTC)
- **Unity — "Addressables" package documentation** (Tier 1+ forward guidance)
- **PROJECT-DRIFT repo** — `CLAUDE.md` (tier discipline §6, status §3, human-owns-device §7), `ARCHITECTURE.md` (§7 EditMode/Tick convention), and the cited source files (below).

## Repo files cited by the guides (read during forge)

| File | Cited in | For |
|---|---|---|
| `Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs` | `01`, `02`, `03`, examples `01`/`02` | The per-frame `Step` hot path (`:91`/`:100`); cached `_health` (`:48`); `Configure`/lazy-init (`:84`); FSM `_state` not reset (`:29`); `OnDied` Destroy churn (`:220`); `TryGetComponent` (`:206`); struct `Flat` helpers (`:225`/`:230`) |
| `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0RuntimeSpawner.cs` | `03`, `08`, examples `01`/`03` | The instantiation/churn site (`CreateEnemy` `:299`); the synchronous one-shot `Build` startup cost (`:46`); runtime SO `ItemDatabase` creation (`:90`); `SetTarget` wiring (`:215`) |
| `Assets/Scripts/Drift/Gameplay/Visual/GrayBoxVisuals.cs` | `02`, `03`, `04`, example `03` | The `new Material` per-object batching landmine + leak (`:20`/`:33`) |
| `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs` | `01`, `02` | Per-frame `LateUpdate` (`:29`); one-time `FindGameObjectWithTag` fallback (`:33`); orthographic fixed-zoom (mip policy) |

## Topics → guides → sources

| # | Topic / query | Guide(s) | Primary sources |
|---|---|---|---|
| 1 | Mobile frame budget, CPU/GPU parallelism, ms math | `01-the-frame-budget.md` | Unity "Understanding optimization in Unity", "Optimizing graphics performance", Profiler frame-timing |
| 2 | GC allocation discipline, managed heap, per-frame allocs, LINQ/boxing/foreach traps | `02-gc-alloc-discipline.md` | Unity "Understanding the managed heap", "Memory in Unity", "Garbage collector", GC Alloc column; `Physics.OverlapSphereNonAlloc` |
| 3 | Object pooling, Instantiate/Destroy cost, `ObjectPool<T>` | `03-object-pooling.md`, examples `01` | Unity "Object Pooling", `UnityEngine.Pool` API; DRIFT `Configure` convention |
| 4 | Draw-call batching, SRP batcher, GPU instancing, MaterialPropertyBlock, SpriteAtlas | `04-sprite-atlasing-and-batching.md`, example `03` | Unity "Optimizing draw calls", "SRP Batcher", "GPU instancing", "Sprite Atlas", `MaterialPropertyBlock`, Frame Debugger |
| 5 | Overdraw, fill-rate, tile-based mobile GPUs, transparency | `05-overdraw-and-fillrate.md` | Unity "Optimizing graphics performance" (fill-rate/overdraw), Scene draw-modes; Arm Mali / Apple Metal best-practices (TBDR) |
| 6 | Texture import + ASTC compression, mips, per-platform overrides | `06-texture-import-and-compression.md`, `templates/texture-import-preset.md` | Unity texture-format-by-platform docs, "Importing textures", "Mipmaps", Texture Preset; Arm ASTC guidance |
| 7 | Profiling workflow: Profiler modules, on-device, deep-profile caveat, Frame Debugger, Memory Profiler, ProfilerMarker | `07-profiling-workflow.md`, `templates/profiling-checklist.md` | Unity "Profiler overview" + modules, "Deep profiling", "Frame Debugger", Memory Profiler package, `ProfilerMarker` API |
| 8 | Build size + startup: Build Report, stripping, load time | `08-build-size-and-startup.md` | Unity "Build Report", "Reducing the file size of your build", "Managed code stripping", "Optimizing load times" |
| 9 | Battery + thermal: targetFrameRate, vSync, fixed timestep, sustained performance | `09-battery-and-thermal.md` | Unity `Application.targetFrameRate` / `QualitySettings.vSyncCount` / `Time.fixedDeltaTime`, "Optimizing for mobile"; Android Sustained Performance Mode / thermal API |
| 10 | Mobile targets/tiers, reference devices, Addressables as Tier 1+ | `10-mobile-targets-and-tiers.md` | Unity platform requirements (GLES/Vulkan/ASTC), "Addressables" package; PROJECT-DRIFT `CLAUDE.md` §3/§6 |

## Open questions (carried forward)

- **Incremental GC** — Unity's incremental garbage collector spreads collection across frames and reduces (but does not eliminate) GC stalls. The guides keep the conservative "0 B/frame in hot paths" target because incremental GC is a mitigation, not a license to allocate; revisit if a measured capture shows incremental GC fully hides the project's allocation profile on the target device.
- **URP vs Built-in pipeline** — `GrayBoxVisuals.CreateColorMaterial` probes `Universal Render Pipeline/Unlit` then falls back to `Standard`, so the project may or may not be on URP. The SRP-batcher guidance (`guides/04`) assumes URP; confirm the active render pipeline from the Graphics settings before quoting SRP-batcher behavior, and note Built-in batching differs.
- **30 vs 60 fps target** — the GDD frames 30fps as a floor; this Weapon argues 30fps is a *legitimate target* for a non-twitchy survival game on battery (`guides/09`). The final cadence is a game-feel call co-owned with `game-feel-juice-guardian`; the energy/thermal consequence is documented here, the feel decision is theirs + the human's.
- **ASTC HDR / decode mode** — guides assume LDR sprite art. If HDR or specific decode modes become relevant (lighting, emissive), revisit the format table against the current Unity texture-format docs.
