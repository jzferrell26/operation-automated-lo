# 07 — Profiling Workflow

The instrument side of the Weapon. Every other guide ends in "measure it" — this is *how*. The cardinal rule: **profile on the target device; the editor lies.**

## Why the editor lies

The editor runs on desktop-class hardware, includes editor-only overhead (inspector, scene view, asset serialization), and uses the Mono/editor scripting backend rather than the IL2CPP build that ships. Editor frame times are *directionally* useful at best and routinely 3–10× off the device. **Absolute numbers come from an on-device capture.** Use the editor to find allocation/draw-call *patterns* (those reproduce); use the device to read *ms*.

## The four instruments

### 1. Unity Profiler — the primary tool
`Window → Analysis → Profiler`. Modules that matter for DRIFT:

- **CPU Usage** — per-frame main/render-thread ms, the hierarchy/timeline of what ran, and the **GC Alloc** column (`guides/02`). This is where you find the bottleneck method.
- **GPU Usage** — GPU ms per frame (on-device). Confirms CPU-bound vs GPU-bound (`guides/01`). Required to diagnose overdraw/fill-rate (`guides/05`).
- **Memory** — total allocated, reserved, and a high-level breakdown. For detail, use the standalone Memory Profiler (below).
- **Rendering** — draw calls, batches, SetPass, triangles — cross-check with the Frame Debugger (`guides/04`).

**Connect to a device:** build a Development Build with "Autoconnect Profiler" (or attach via the player-connection dropdown over USB/Wi-Fi). The Profiler then shows *device* timings. This is the source of truth.

### 2. Deep Profiling — relative only, never absolute
The Profiler's **Deep Profile** toggle instruments *every* method call. It's invaluable for finding *which* method allocates or costs, but it **inflates every call's cost massively** (the instrumentation overhead dwarfs the real work). **Rule: use deep profiling to find the offender, then turn it off and measure the real cost with a `ProfilerMarker` or normal capture.** Never quote a deep-profile ms number as the actual cost — it's wrong by design.

### 3. Frame Debugger — draw-call truth
`Window → Analysis → Frame Debugger → Enable`. Steps through every draw call of a single frame, showing what batched, what didn't, and *why a batch broke* ("Objects have different materials" — the `new Material` smell from `guides/04`). The definitive instrument for draw-call/batching findings.

### 4. Memory Profiler — snapshot diffing
The standalone **Memory Profiler** package captures full memory snapshots (textures, meshes, managed objects, native allocations). Capture **before and after** an action (e.g. a spawn wave) and **diff** the snapshots to find leaks — objects that should have been released but weren't (the leaked-material problem from `guides/04`, the un-released pool object from `guides/03`). This is how you prove a pooling/material fix actually reclaimed memory.

## `ProfilerMarker` — instrument your own hot path

For a precise, low-overhead measurement of a specific method (e.g. `MutatedCrewEnemy.Step`), add a `ProfilerMarker`:

```csharp
using Unity.Profiling;

static readonly ProfilerMarker s_StepMarker = new ProfilerMarker("MutatedCrewEnemy.Step");

public EnemyState Step(float deltaSeconds)
{
    using (s_StepMarker.Auto())
    {
        // ... existing Step body ...
    }
}
```

The marker shows up as a named row in the CPU module with its own ms and GC Alloc — far cleaner than hunting through the call tree, and cheap enough to leave in (it compiles out in non-development builds). Note the marker itself must not allocate — `ProfilerMarker` is a struct and `.Auto()` is allocation-free. This pairs with the `Tick`/`Step` extraction convention (CLAUDE.md §6 Rule #11): because DRIFT extracts `Step` from `Update`, you can wrap and measure it precisely.

## The standard profiling pass (the order matters)

See `templates/profiling-checklist.md` for the full checklist. The short order:

1. **Build a Development Build for the device** (IL2CPP, the real backend). Editor first only to spot obvious alloc/draw-call patterns.
2. **Connect the Profiler to the device.** Confirm you're reading device timings.
3. **Establish the bottleneck thread** (CPU main / CPU render / GPU) from frame times (`guides/01`). Don't optimize the wrong side.
4. **CPU-bound?** → CPU module hierarchy + GC Alloc column. Find the costliest method and any per-frame allocations. Deep-profile to locate, then `ProfilerMarker` to measure.
5. **GPU-bound?** → GPU module + Scene Overdraw draw-mode (`guides/05`) + Frame Debugger draw-call count (`guides/04`).
6. **Memory growth?** → Memory Profiler snapshot diff across the suspect action.
7. **Record the numbers** in the audit report against the budget (`library/qa/mobile-perf/<date>-<topic>.md`). A finding is the number + the instrument + the file:line.

## What this Weapon captures vs what the human does

This Weapon tells you **what to capture and how to read it**. Running the build on a physical device — flashing, the device farm, the actual USB attach — is the **human's** job (CLAUDE.md §7). When you can't run the device yourself, your finding is "capture X on-device with instrument Y; pass is Z" and the human reports back the number. Driving the editor/Profiler programmatically over MCP is `unity-mcp-guardian`'s lane.

Source: Unity Manual — "Profiler overview" / "Profiler modules" / "Deep profiling" / "Frame Debugger" / "Memory Profiler" package docs / `Unity.Profiling.ProfilerMarker` API.
