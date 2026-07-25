# 09 — Battery & Thermal

A survival game is played in long sessions. A benchmark runs for seconds; a DRIFT session runs for minutes-to-hours. The number that matters is **sustained** frame time after the phone has heated up — not the peak in the first 30 seconds.

## Thermal throttling — the thing that ruins "it ran at 60fps"

Mid-tier phones have small thermal envelopes. Run the GPU/CPU hard and the SoC heats; to avoid damage, the OS **throttles** clock speeds within a few minutes. A game that hits 60fps for the first minute and then runs at 35fps once the phone is warm is, in practice, a 35fps game. **Always validate frame time after a sustained warm-up, not at cold start.**

The corollaries:
- Every ms you spend over budget is also heat. Under-budget frames let the device run cool and *stay* fast.
- The cheapest way to be both cool and smooth is to **not render frames you don't need** (cap the frame rate, below).

## Cap the frame rate — the highest-leverage battery setting

By default a mobile game may try to render as fast as it can, cooking the battery to produce frames the player can't perceive. Cap it:

```csharp
// Once, at startup (e.g. a bootstrap MonoBehaviour):
Application.targetFrameRate = 60;   // or 30 for a battery-first survival cadence
QualitySettings.vSyncCount = 0;     // on mobile, targetFrameRate governs; vSync is desktop-oriented
```

- **`Application.targetFrameRate`** is the mobile frame cap. Set it deliberately. For a top-down survival game where the action isn't twitchy, **30fps is a legitimate, battery-friendly choice** — and the GDD's 30fps floor is then your *target*, halving the energy and heat vs 60. 60 only where the feel demands it.
- **`vSyncCount = 0`** on mobile: vSync is a desktop concept; on mobile `targetFrameRate` is what governs. Leaving vSync on can override your cap.
- This is also a **game-feel** decision (`game-feel-juice-guardian` co-owns the feel call) — but the *energy/thermal* consequence is this Weapon's lane. DRIFT does not appear to set `targetFrameRate` anywhere yet; an uncapped frame rate on a mid-tier phone is a **should-optimize** finding — add a deliberate cap in the bootstrap.

## Other thermal/battery levers

- **Idle/menu cadence** — when the player is in a menu or the game is paused, drop `targetFrameRate` further (e.g. 15–20) or render on demand. No reason to burn battery on a static screen.
- **Fixed timestep** — `Time.fixedDeltaTime` controls physics frequency. The default (50Hz) is often more than a top-down survival game needs; a lower physics rate cuts CPU/heat. DRIFT uses `CharacterController` + trigger colliders (`Tier0RuntimeSpawner`), which run against the physics step — tune `fixedDeltaTime` to the slowest rate that still feels right.
- **Overdraw and allocations are heat too** — `guides/05` and `guides/02` aren't just frame-time wins; less GPU fill-rate and fewer GC stalls mean less energy per frame.
- **Sustained Performance Mode (Android)** — Android exposes a sustained-performance hint that locks the SoC to a clock it can *hold indefinitely* rather than a boost clock it can't. Targeting that steady clock and budgeting to it gives a flat, predictable frame time across a long session instead of a high-then-throttled curve. Design to the sustained clock, not the boost.

## How to measure

1. **Sustained frame-time test:** run a representative play session on-device for **at least 10–15 minutes** while the Profiler (or an on-screen FPS counter) records frame time. **Watch for the throttle knee** — the point where frame time degrades as the device heats. **Pass:** frame time stays within budget *after* warm-up, not just at cold start.
2. **Frame-cap confirmation:** verify `Application.targetFrameRate` is set and respected (frame time floors at ~16.67ms for a 60 cap / ~33.3ms for a 30 cap and doesn't run faster, burning battery).
3. **Battery drain (human, on-device):** measure battery % drop over a fixed session; compare capped vs uncapped to quantify the saving.
4. **Device temperature / OS thermal API** — on Android, read the thermal status; a "moderate/severe" reading during normal play means you're over the sustainable budget.

Pass/fail: **frame time is stable through a 10–15 min warm session (no throttle cliff); `targetFrameRate` is deliberately capped; idle/menu drops the cap; the device reaches a steady thermal state rather than climbing.**

## DRIFT tier note

Tier 0 gray-box draws almost nothing, so it won't heat a phone — but **the one concrete action available now is the frame cap**: add `Application.targetFrameRate` + `vSyncCount = 0` to a bootstrap so the gray-box doesn't render uncapped on-device. Everything else (sustained-mode targeting, fixed-step tuning) is forward guidance for when the world has enough on screen to matter. The device-side battery/thermal measurement is the human's to run (CLAUDE.md §7); this Weapon says what to capture and the pass line.

Source: Unity Manual — "Optimizing for mobile" / `Application.targetFrameRate` / `QualitySettings.vSyncCount` / fixed timestep; Android Sustained Performance Mode / thermal API docs.
