# 09 — Render-cost handoff to `mobile-game-perf-guardian`

This is the **co-owned seam**. The single most important boundary this Weapon names: this Guardian
sets the *look and config*; `mobile-game-perf-guardian` *measures the cost*. Neither does the
other's job; the seam is explicit so nothing is duplicated and nothing falls through.

## Who sets what

| This Guardian (unity-rendering) sets… | perf-guardian measures… |
|---|---|
| **Render scale** per quality tier | The actual frame-time delta on-device (Profiler) |
| **MSAA / HDR / shadow** toggles | The bandwidth / GPU ms each costs |
| **Forward vs Forward+** path | The light-culling pass cost when lights are many |
| **The post-process volume stack** | The full-screen fill-rate cost of those effects |
| **The shader pick** (`Simple Lit` / `Lit` / `Unlit`) | The per-pixel ms of that shader on the device |
| **The material baseline** (shared material + which shader) | Whether it **batches** (SRP batcher / Frame Debugger draw calls) |
| **Camera stack** shape (single Base vs Overlay) | The per-camera setup cost of stacking |

## The instruments (perf owns these)

- **Profiler** (CPU/GPU module) — frame-time, on-device.
- **Frame Debugger** — draw-call count, SetPass calls, what batches.
- **Memory Profiler** — material/texture memory.
- **Overdraw draw-mode** — fill-rate hotspots (top-down floors + transparent post-fx are prime
  suspects).

This Guardian **never asserts an ms / draw-call / byte number headless** — it states the *config* and
*what to measure*; perf runs the capture and returns the verdict.

## The recurring co-owned cases

1. **`GrayBoxVisuals` `new Material` per call** — rendering picks the URP shader; perf owns the
   shared-material + `MaterialPropertyBlock` batching fix (`guides/08`,
   `mobile-game-perf-weapon/guides/04`).
2. **Post-process volume on the low tier** — rendering authors the budget profile; perf measures
   the fill-rate pass and says whether the low tier can afford bloom (`guides/05`,
   `mobile-game-perf-weapon/guides/05`).
3. **Render scale vs MSAA trade** — rendering proposes the tier settings; perf measures which buys
   more frame time on the target device (`guides/02`).

## The protocol

When a render-config question becomes a cost question, **write the config decision, then hand the
measurement across with an explicit "perf to confirm on-device: <what to capture>."** Don't guess
the number; don't let perf re-derive the config. That's the seam working.

Sources: `mobile-game-perf-weapon/SKILL.md` (the perf cross-Guardian table names this Guardian's role as
"flag the cost"), `mobile-game-perf-weapon/guides/01-the-frame-budget.md`,
`mobile-game-perf-weapon/guides/04-sprite-atlasing-and-batching.md`,
`mobile-game-perf-weapon/guides/05-overdraw-and-fillrate.md`.
