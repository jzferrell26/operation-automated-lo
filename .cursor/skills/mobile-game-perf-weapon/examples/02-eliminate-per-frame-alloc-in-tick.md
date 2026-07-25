# Example 02 — Eliminating Per-Frame Allocations in an Extracted `Tick`

**Scenario:** a hot path runs every frame (per agent). Someone adds a perception scan, a debug log, or a LINQ filter inside it. Each is invisible in the editor on a desktop CPU and a visible hitch on a mid-tier phone. This example shows how to find and kill the allocation, measured against the **0 B/frame** target (`guides/02`).

**Why DRIFT is well-shaped for this:** the project follows the `Tick`/`Step` extraction convention (CLAUDE.md §6 Rule #11) — `MutatedCrewEnemy.Update` forwards to `Step(Time.deltaTime)` (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs:91`, `:100`). Because `Step` is an isolated method, you can wrap it in a `ProfilerMarker` and measure its GC Alloc precisely.

---

## Step 1 — the clean baseline (what good looks like)

Read `Step` (`:100`–`:176`). It is **already allocation-free**: only `Vector3`/`Quaternion`/float math, struct returns from `Flat`/`FlatDistance` (`:225`, `:230`), an enum `switch`, and a cached `_health` (`:48`). Reporting "this is clean" is a valid, correct finding — do **not** invent a problem (`guides/02`).

Confirm it with the instrument:

```csharp
using Unity.Profiling;

static readonly ProfilerMarker s_StepMarker = new ProfilerMarker("MutatedCrewEnemy.Step");

public EnemyState Step(float deltaSeconds)
{
    using (s_StepMarker.Auto())
    {
        EnsureInitialized();
        // ... existing body ...
    }
}
```

In the Profiler CPU module, the `MutatedCrewEnemy.Step` row should read **GC Alloc: 0 B**. Baseline established.

---

## Step 2 — the regression (what a future PR might add)

Suppose a perception upgrade lands inside `Step` to pick the nearest of several targets:

```csharp
// BAD — allocates every frame, per enemy
var targets = GameObject.FindGameObjectsWithTag("Player")   // allocates an array every call
    .Where(t => Vector3.Distance(t.transform.position, transform.position) < detectRadius) // LINQ closure + iterator
    .OrderBy(t => Vector3.Distance(t.transform.position, transform.position)) // more allocs + sort garbage
    .ToList();                                              // a new List every frame
if (targets.Count > 0) _player = targets[0].transform;
Debug.Log($"[{name}] targets={targets.Count}");            // string interpolation + boxing
```

Every line here allocates: `FindGameObjectsWithTag` (array), `.Where`/`.OrderBy` (iterators + closures), `.ToList` (list), the `$"..."` (string + boxed `int`). The `ProfilerMarker` row now reads **GC Alloc: several KB/frame, ×N enemies** — and `GC.Collect` spikes appear in the timeline during combat.

---

## Step 3 — the fix (0 B/frame)

```csharp
// GOOD — no per-frame allocation
// _player is resolved once via Configure (:84); no per-frame Find* needed at all.
// If multi-target selection is genuinely required, hold a reused buffer and a plain loop:

readonly Collider[] _perceptionBuffer = new Collider[8]; // allocated ONCE in init

void RepickTarget()
{
    int count = Physics.OverlapSphereNonAlloc(   // non-alloc overload — writes into the buffer
        transform.position, detectRadius, _perceptionBuffer, _playerLayerMask);

    float best = float.MaxValue;
    Transform nearest = null;
    for (int i = 0; i < count; i++)               // plain for, no LINQ, no foreach-on-interface
    {
        var t = _perceptionBuffer[i].transform;
        float d = (t.position - transform.position).sqrMagnitude; // sqrMagnitude: no sqrt, no alloc
        if (d < best) { best = d; nearest = t; }
    }
    if (nearest != null) _player = nearest;
    // No per-frame Debug.Log. If needed, gate behind a build flag and rebuild a cached string only on change.
}
```

Fixes applied (each maps to a trap in `guides/02`):
- `FindGameObjectsWithTag` per frame → `_player` cached via `Configure`, or `OverlapSphereNonAlloc` into a **pre-allocated buffer**.
- LINQ `.Where/.OrderBy/.ToList` → a **plain indexed `for`** loop.
- `Vector3.Distance` (sqrt) → `sqrMagnitude` (cheaper, still alloc-free).
- `Debug.Log($"...")` per frame → removed / gated, no string interpolation in steady state.

Hand the final code shape to `unity-csharp-guardian`; this Weapon owns the "this allocates" finding and the 0-B target.

---

## How to measure

1. **Profiler CPU module → GC Alloc column**, on-device, steady-state combat. Read the `MutatedCrewEnemy.Step` `ProfilerMarker` row.
2. **Baseline:** 0 B. **Regression:** non-zero KB/frame and `GC.Collect` spikes. **After fix:** back to **0 B/frame**.
3. **Deep-profile only to *locate*** the allocating call, then turn it off and read the real cost via the marker — deep profiling inflates numbers (`guides/07`).

**Pass/fail:** `Step`'s GC Alloc row reads 0 B/frame in steady state; no `GC.Collect` spikes during a sustained combat capture.

Source: `guides/02-gc-alloc-discipline.md`, `guides/07-profiling-workflow.md`; Unity `Physics.OverlapSphereNonAlloc` / `ProfilerMarker` docs.
