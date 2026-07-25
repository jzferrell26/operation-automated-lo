# 01 — The Frame Budget

The whole discipline reduces to one number: **how many milliseconds you have per frame, and whether you fit.**

## The math

| Target | Frame time | Where it applies in DRIFT |
|---|---|---|
| 60fps | **16.67ms** | Aspirational on mid-tier; achievable for the top-down gray-box with few agents |
| 30fps | **33.3ms** | The hard floor — never drop below sustained 30fps |
| 120fps | 8.33ms | Out of scope; not a battery-sane target for a survival session |

`frame_time_ms = 1000 / fps`. Invert it: `fps = 1000 / frame_time_ms`. A frame that takes 22ms is running at ~45fps — between target and floor, a yellow flag.

## CPU and GPU run in parallel — the slower one wins

The frame is not "CPU time + GPU time." The CPU prepares frame N+1 while the GPU renders frame N. Frame time is `max(CPU_main_thread, CPU_render_thread, GPU)`, plus stalls when one waits on another. So:

- A CPU-bound frame (too much `Update`/`Tick`/physics/GC) → the GPU sits idle and you're CPU-limited.
- A GPU-bound frame (overdraw, fill-rate, too many draw calls submitted) → the CPU sits idle and you're GPU-limited.

You must know **which** before optimizing. The Profiler's CPU and GPU module timelines tell you (`guides/07-profiling-workflow.md`). Optimizing CPU when you're GPU-bound buys nothing.

## The three threads that matter on mobile

1. **Main thread** — your `Update`/`LateUpdate`/`Tick`, physics step, animation, the bulk of game logic. This is where DRIFT's gameplay cost lives: `MutatedCrewEnemy.Step` (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:100`), `TopDownFollowCamera.LateUpdate` (`Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs:29`).
2. **Render thread** — culling and draw-call submission. Grows with batch/SetPass count → see batching (`guides/04-sprite-atlasing-and-batching.md`).
3. **GPU** — fragment shading, fill-rate, overdraw → see `guides/05-overdraw-and-fillrate.md`.

## A starting per-frame budget at 30fps (33.3ms)

This is a *budget to allocate*, not a measurement — confirm each line on-device.

| System | Budget (ms) | Notes |
|---|---|---|
| Gameplay logic (player, enemies' `Step`, salvage, survival meters) | ~8 | Scales with agent count — this is why pooling + alloc discipline matter |
| Physics (`CharacterController` move, trigger checks) | ~3 | DRIFT uses trigger colliders on salvage/pads (`Tier0RuntimeSpawner`) |
| Rendering submission (render thread) | ~5 | Dominated by draw-call/batch count |
| GPU (fill-rate, overdraw, shading) | ~10 | The top-down floor + transparent layers live here |
| UI (`Tier0Hud`) | ~2 | Watch for per-frame string allocs in HUD text |
| Headroom / GC / spikes | ~5 | The buffer that absorbs a GC hitch — protect it with alloc discipline |

If gameplay logic blows past 8ms because 40 enemies each run an allocating `Step`, the fix is two guides: kill the allocations (`guides/02`) and pool the spawns (`guides/03`).

## How to read frame time

- **Game-view Stats overlay** (in-editor, rough): shows FPS, batches, SetPass, tris. Good for a first sniff, *not* a device measurement.
- **Profiler CPU module**: the timeline shows per-frame main/render-thread ms. Select a spike frame and read the hierarchy.
- **Profiler GPU module** (on-device): the GPU time per frame. Required to confirm CPU-bound vs GPU-bound.
- **On-device only for absolute numbers** — the editor lies (`guides/07`).

## Measurement for this guide

- Confirm the target: are you measuring against 16.67ms or 33.3ms? State it.
- Capture a Profiler frame on-device; record main-thread ms, render-thread ms, GPU ms.
- Identify the bottleneck thread (the one nearest its budget).
- Pass/fail: sustained frame time ≤ target with headroom; no recurring spikes above the floor.

## DRIFT-specific notes

- The game is top-down and portrait — triangle counts are low; the risk is **fill-rate (overdraw)** and **draw calls**, not geometry.
- At Tier 0 there's one enemy (`Tier0RuntimeSpawner.CreateEnemy`, `:299`). The budget is comfortable. The budget *math* matters now so that when waves arrive (Tier 1), you already know the per-enemy ms cost and how many fit.
- Don't over-optimize Tier 0: one enemy's `Step` will not blow 8ms. Establish the measurement habit and the per-agent cost; design the headroom for the wave that's coming (`guides/10-mobile-targets-and-tiers.md`).

Source: Unity Manual — "Optimizing graphics performance" / "Understanding optimization in Unity" / Profiler frame-timing docs.
