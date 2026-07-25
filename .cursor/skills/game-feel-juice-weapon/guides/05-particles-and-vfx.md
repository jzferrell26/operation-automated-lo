# 05 — Particles & VFX

Particles are high-impact feedback and the **single cheapest way to blow a mobile frame budget** via overdraw. The discipline: small, pooled, capped, and co-owned with `mobile-game-perf-guardian` (Principle #7).

> Sources: Jonasson & Purho, "Juice it or lose it" (particles as juice); Unity Particle System docs; Vlambeer "The Art of Screenshake" (impact effects). See `research/research-plan.md`.

## Where VFX earns its keep in Tier 0

Juice the events that already exist in the gray-box (Hard Rule #1 — don't invent Tier 1 systems):

- **Melee impact** — a tiny burst at the hit point (on `Health.Changed` damage), 4–8 particles, ~0.2s.
- **Salvage pickup** — a small upward sparkle when a `SalvageNode` is collected.
- **Tool-cache open** — a one-shot puff when a gated cache opens.
- **Hull breach** — a venting/depressurize effect when `HullBreachEvent` activates (and a seal puff on repair).
- **Extraction** — a shuttle thruster/dust kick on the pad.

Each is a *one-shot* or short burst, not a continuous emitter. Continuous emitters are where mobile budgets die.

## The overdraw trap (the must-watch cost)

Particles are usually transparent quads. Transparent pixels **don't early-z**, so every overlapping particle re-shades every pixel underneath it — this is **overdraw**, and on mobile (tile-based GPUs, fill-rate bound) it's the primary particle cost. A handful of *big, overlapping, semi-transparent* particles can cost more than hundreds of small opaque ones.

Rules of thumb (propose these; perf-guardian ratifies the hard caps):

- **Few, small, short.** A hit burst is 4–8 particles, small, ~0.2s — not a 50-particle cloud.
- **Avoid large overlapping alpha.** Big soft smoke quads stacked over the play area = overdraw spike.
- **Cap concurrent systems.** A ceiling on simultaneous active VFX (and per-system `maxParticles`).
- **Prefer additive/opaque where it reads** over heavy alpha blending when you can.

The hard numbers — `maxParticles`, overdraw budget, draw-call impact — are **co-owned**: you propose, `mobile-game-perf-guardian` ratifies (Principle #7). Always note the estimated cost.

## Pooling (don't Instantiate/Destroy per hit)

Spawning and destroying a particle GameObject on every hit churns the GC and the engine. Pool them:

- Pre-instantiate N impact-burst systems at startup; on a hit, grab a free one, move it to the hit point, `Play()`; return it on `Stop`.
- This is shared discipline with `mobile-game-perf-guardian`'s pooling guide — co-own the pool; you own *what* the effect is, perf owns the *pool sizing and alloc audit*.

## Gray-box restraint

DRIFT is at gray-box (`GrayBoxVisuals` tints primitives; no art). VFX at this stage is **placeholder-appropriate**: a simple colored burst that *communicates the event*, not a polished art-pass effect. The goal in Tier 0 is "the hit/pickup/breach reads," not "this looks shipped." Over-investing in VFX art before the loop is proven fun is building ahead (Hard Rule #1, Hard Rule #4). Keep it cheap and legible; the art pass is the human's later call.

## Mobile readability (Principle #6)

A VFX that reads on a monitor can vanish or smear on a phone:

- **Size for the small screen** — a tiny burst can disappear; scale to read at portrait size, but not so big it occludes the thumb-controlled action.
- **Contrast** — gray-box backgrounds are dark (`TopDownFollowCamera` clears to ~`(0.04,0.05,0.08)`); bright bursts read, dark ones vanish.
- **Don't bury the response** — VFX over the player/enemy must not hide what the player needs to see (the enemy's position, the breach location).

See `guides/08-mobile-readability.md`.

## EditMode note

Particle systems themselves are engine-driven and not the thing you unit-test. What you *can* keep testable is the **trigger logic** — the component that decides "on `Health.Changed` damage, fire the impact burst" — written with the usual `Configure` + a method you can call directly (e.g., `OnDamaged()`), so a test can assert the spawn was requested. Keep the decision testable; the visual is the engine's.

## Tuning table (hand to the human)

| Knob | Where | Start | Range | Changes |
|---|---|---|---|---|
| Burst count | per-system `Emission` | `6` | `4–12` | Density of an impact burst |
| Particle lifetime | `Main.startLifetime` | `0.2` | `0.1–0.4` | How long it lingers |
| Particle size | `Main.startSize` | small | tune | Readability vs occlusion |
| Concurrent VFX cap | pool size | `8` | per perf-guardian | Overdraw/draw-call ceiling |
| Color | `Main.startColor` | high-contrast | any | Reads against the dark gray-box |

Counts and sizes are first-pass and **co-owned with `mobile-game-perf-guardian` for the hard caps**; the *look* is the human's to tune. End with the handoff (`guides/10-human-handoff.md`).
