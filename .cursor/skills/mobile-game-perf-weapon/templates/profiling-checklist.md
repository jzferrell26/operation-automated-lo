# Template — On-Device Profiling Checklist

Copy this into a perf audit (`library/qa/mobile-perf/<date>-<topic>.md`) and fill it in. The rule: **profile on the target device; the editor lies** (`guides/07`). The human runs the device; this Weapon says what to capture and the pass line (CLAUDE.md §7).

---

## 0. Setup

- [ ] **Target stated:** device class = `__________` (mid-tier Android/iOS), frame target = `____` fps → `_____` ms/frame.
- [ ] **Tier stated:** Tier 0 / Tier 1+ (gates must-fix-now vs forward-guidance).
- [ ] **Development Build** made for the device (IL2CPP backend — the real one, not editor Mono).
- [ ] **Profiler connected to the device** via player-connection (USB/Wi-Fi); confirmed reading *device* timings, not editor.

## 1. Find the bottleneck thread (do this FIRST — don't optimize the wrong side)

- [ ] Capture a representative play frame on-device.
- [ ] Record: **main-thread ms** = `____`, **render-thread ms** = `____`, **GPU ms** = `____`.
- [ ] Bottleneck = the thread nearest its budget: ☐ CPU main ☐ CPU render ☐ GPU.

## 2. CPU-bound path (if main/render thread is the bottleneck)

- [ ] CPU module → hierarchy/timeline → find the costliest method (ms).
- [ ] **GC Alloc column enabled.** Steady-state per-frame GC Alloc = `____` B. **Target: 0 B.**
- [ ] Any non-zero recurring alloc → drill into the call tree; record file:line of the offender.
- [ ] `GC.Collect` spikes in the timeline? ☐ yes ☐ no. (Spikes = the stutter you're hunting — `guides/02`.)
- [ ] Used deep profiling only to *locate*, then measured real cost with a `ProfilerMarker`? ☐ yes (deep-profile ms is inflated — never quote it).

## 3. GPU-bound path (if GPU is the bottleneck)

- [ ] Scene-view **Overdraw draw-mode** checked — large bright/hot regions? ☐ yes ☐ no (`guides/05`).
- [ ] **Resolution test:** halving render resolution drops frame time sharply? ☐ yes (fill-rate-bound) ☐ no.
- [ ] **Frame Debugger:** draw-call / batch count = `____`; any "Objects have different materials" break reasons? ☐ yes (the `new Material` smell — `guides/04`) ☐ no.

## 4. Memory

- [ ] **Memory Profiler** snapshot captured.
- [ ] Snapshot **diff across a suspect action** (e.g. a spawn wave): does any object count grow without releasing? ☐ yes (leak — `guides/03`, `guides/04`) ☐ no.
- [ ] Texture memory matches the **compressed** estimate, not uncompressed source sizes? ☐ yes (`guides/06`).

## 5. Sustained / thermal (long-session truth — `guides/09`)

- [ ] Held a **10–15 min** warm session; recorded the throttle knee (frame time vs time).
- [ ] Frame time stays within budget *after* warm-up (not just cold start)? ☐ yes ☐ no.
- [ ] `Application.targetFrameRate` set and respected (no uncapped battery burn)? ☐ yes ☐ no.

## 6. Build size & startup (`guides/08`)

- [ ] Build Report read; top-10 largest assets recorded; any uncompressed textures/audio? ☐ yes ☐ no.
- [ ] Cold-start-to-interactive = `____` ms on-device; any single phase dominating? `__________`.

## 7. Findings

For each finding, record all three or it's not a finding:

| File:line | Cost (measured) | Instrument | Severity | Fix owner |
|---|---|---|---|---|
| `Assets/.../X.cs:LN` | e.g. 4 KB/frame GC Alloc | GC Alloc column | must-fix / should-optimize / forward-guidance | unity-csharp-guardian / this Weapon / human |

## 8. Verdict

- [ ] Sustained frame time vs target: ☐ pass ☐ fail.
- [ ] 0 B/frame in hot paths: ☐ pass ☐ fail.
- [ ] Draw calls / overdraw within budget: ☐ pass ☐ fail.
- [ ] Build size / startup within target: ☐ pass ☐ fail.
- [ ] Every finding has a measurement + instrument + file:line: ☐ yes.
