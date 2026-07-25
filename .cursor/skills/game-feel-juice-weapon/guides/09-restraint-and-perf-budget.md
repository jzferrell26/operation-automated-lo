# 09 — Restraint & the Perf Budget (co-owned with mobile-game-perf-guardian)

Two truths govern this guide:

1. **More juice is not better juice.** Past a point it's noise — and on mobile, dropped frames.
2. **Juice that drops frames is a net feel *loss*.** Felt latency goes up across the whole game (`guides/01-the-feel-loop.md`), so the "punch" you added costs you the responsiveness that is the *floor* of game feel.

So every technique carries a **frame-budget cost and a cap**, and the hard perf numbers are **co-owned with `mobile-game-perf-guardian`** (Principle #7).

## Restraint as a design discipline

The instinct of a juice pass is to add. The discipline is to ask, for each effect: *does this make the event read more clearly, or just add motion?* Vlambeer's screenshake talk and "Juice it or lose it" both stack many effects — but they also note that the stack must serve clarity, not bury it. On a small mobile screen the line is closer than on desktop.

Practical restraint rules:

- **One clear primary per event, then layer.** A hit reads from flash + sound first; hitstop, knockback, shake, particles are *additive weight*, not requirements. Ship the minimum that reads; let the human add weight by turning knobs up.
- **Reserve the big effects.** Long hitstop, heavy shake, big particle bursts are for *heavy* events (a kill, the breach), not every light hit. Constant maximum juice reads as chaos and as stutter.
- **Default to off / low, hand up the knob.** Start values lean conservative; the human turns them *up* to taste rather than you shipping them maxed.

## The per-technique cost ledger

Every juice deliverable includes a cost line. The recurring costs:

| Technique | Primary cost | Cheap-side cap to propose |
|---|---|---|
| Material flash | A `Material`/`MaterialPropertyBlock` swap; **alloc if `new Material` per hit** (`GrayBoxVisuals.CreateColorMaterial` allocates) | Cache two materials at `Configure`, or use `MaterialPropertyBlock`; zero per-hit alloc |
| Hitstop | `Time.timeScale` is ~free, but it touches *all* time-based code | Count with `unscaledDeltaTime`; keep ≤ a few frames |
| Screenshake | A few Perlin samples + an offset per frame; ~free CPU | Cap magnitude (mobile nausea is the real limit, not CPU) |
| Tween (custom) | Coroutine alloc per tween; cheap CPU | Pool for many concurrent tweens |
| Tween (DOTween) | Per-tween GC unless configured | Enable safe/recycle settings; a deliberate package decision |
| Particles/VFX | **Overdraw / fill-rate** — the big one on mobile | Few/small/short; cap concurrent systems + `maxParticles` |
| Audio | Voices + decode | Cap concurrent voices; no per-frame `PlayOneShot` |

The **must-fix** here: a technique shipped with **no cost noted and no cap**. You must always state your estimate.

## The co-ownership protocol with `mobile-game-perf-guardian`

The boundary is clean:

- **You own the design intent and the proposal.** "This impact burst is ~6 particles, ~0.2s, pooled; I estimate negligible CPU but it adds transparent overdraw at the hit point; proposed cap: 8 concurrent bursts, `maxParticles` 12."
- **`mobile-game-perf-guardian` owns the hard numbers.** The actual overdraw budget, the draw-call ceiling, the GC-alloc audit, the frame-budget ms — those are perf-guardian's to set and verify (it pairs every recommendation with *how to measure it*).
- **You defer hard calls.** When the question is "does this fit the frame budget?" or "how many particles can we afford?", you propose and **hand the hard call to perf-guardian** — you do not adjudicate the budget yourself.

In a sentence: **you say what the effect is and what it should cost; perf-guardian says whether the device can pay.**

## When to defer vs decide

- **Decide yourself:** what the feedback *is*, its design intent, its starting values, its readability.
- **Defer to perf-guardian:** particle ceilings, overdraw budget, draw-call counts, GC-alloc verification, whether a technique fits the ms budget, pooling sizes.
- **Defer to the human:** whether it *feels good* and whether it's *fun* (CLAUDE.md §7, §4) — always.

## The verification reality

This VM is headless (no editor, no device — AGENTS.md). You cannot profile here. So every cost estimate is exactly that — an estimate — and it ends "profile on device / hand to perf-guardian to measure." Never claim a technique "is within budget" from a static read; claim "I estimate X; verify with the Profiler." That honesty is the same discipline as the §7 feel handoff.

## Deliverable shape

A juice deliverable's cost section reads:

> **Cost:** `<technique>` — `<estimated CPU/alloc/overdraw>`. **Proposed cap:** `<cap>`. **Hard call:** deferred to `mobile-game-perf-guardian` to measure (Profiler/Frame Debugger). **Feel call:** the human's.

Then the tuning table, then the handoff (`guides/10-human-handoff.md`).
