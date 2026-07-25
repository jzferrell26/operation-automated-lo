# 04 — Tweening (custom vs DOTween)

Tweening — interpolating a value over time with an easing curve — is the workhorse of juice: a pickup that pops in, a UI panel that slides, a knockback that eases out, a flash that fades. The question is rarely "should we tween" but "with what." **This is a deliberate human call; present the trade-off, don't smuggle a dependency** (Principle #8 / Hard Rule #8).

> Sources: Jonasson & Purho, "Juice it or lose it" (easing/tweening as the core juice tool); Unity DOTween docs. See `research/research-plan.md`.

## The two options

### Lightweight custom tween (coroutine + `AnimationCurve`)

A small helper that drives a value from A to B over a duration, shaped by an `AnimationCurve` (or a math easing function). Zero dependencies. See `templates/tween-util.cs`.

**Pros:**
- **Zero dependency** — nothing added to `Packages/manifest.json`, no build-size cost, no version risk.
- **Trivially EditMode-testable** — expose a `Step(dt)` that advances normalized time and returns the eased value; assert it at `t=0`, `t=0.5`, `t=1`.
- **Total control** — you see exactly what it allocates and when.
- **Curve authoring in the Inspector** — `AnimationCurve` is a `[SerializeField]`, so the human tunes the ease shape visually. This is the *knob* (Principle #2).

**Cons:**
- You implement sequencing, chaining, and kill/restart yourself.
- A coroutine per tween allocates; for many concurrent tweens you'd want pooling (co-own perf).

### DOTween

A mature, widely-used tweening library: rich API, sequences, callbacks, huge feature set.

**Pros:**
- Feature-rich (sequences, loops, callbacks, `DOShakePosition`, etc.).
- Battle-tested, well-documented, fast to author with.

**Cons:**
- **A package decision** — adds a dependency, build size, and a version to maintain. That is an architectural call for the human, not a side effect of a juice ticket (Hard Rule #8).
- **GC unless configured** — DOTween allocates per-tween; on mobile you must enable the safe/recycling settings and pool, or it churns the GC (co-own with `mobile-game-perf-guardian`).
- **Harder to EditMode-test** — it's time/coroutine-driven internally; you can't cleanly `Step` it in a pure EditMode test the way the spine wants (CLAUDE.md §11).

## The recommendation framework (present, don't decide)

For DRIFT's **Tier 0 gray-box**, the lean default is the **lightweight custom tween**:

- Tier 0 needs a handful of simple tweens (pickup pop, flash fade, knockback ease, a UI nudge), not a sequencing engine.
- Zero-dependency keeps the project light, which `TIER0.md` explicitly values ("stays light on project configuration").
- It's EditMode-testable, which the whole spine is built around (ARCHITECTURE.md §7).

If/when **Tier 1** brings a real UGUI HUD with lots of coordinated UI motion, **DOTween becomes worth a deliberate evaluation** — at which point it's an ADR-style decision (record it; co-own the GC config with perf-guardian).

**But the call is the human's.** Lay out the table above, state the lean, and let them decide. Do not add DOTween to `manifest.json` as part of a juice task.

## Easing primer

Easing is what makes a tween feel alive instead of robotic. The shape matters more than the duration:

- **Linear** — robotic; almost never what you want for juice.
- **Ease-out** (fast start, slow settle) — the most useful default; reads as "arriving and settling." Knockback decay, pickup pop, panel slide-in.
- **Ease-in** (slow start, fast end) — "winding up and launching"; anticipation.
- **Ease-in-out** — smooth both ends; UI motion.
- **Back / overshoot** (goes past then settles) — the classic "pop"; a pickup that scales to 1.1 then back to 1.0. High-juice, use with restraint.
- **Elastic / bounce** — very expressive, very easy to overuse on mobile; reserve for special moments.

With the custom tween, all of these are just `AnimationCurve` shapes the human authors in the Inspector — which is exactly the knob handoff this Weapon wants (Principle #2). With DOTween they're named `Ease` enums.

## EditMode-testability of the custom tween

`templates/tween-util.cs` exposes:

- `Evaluate(float normalizedTime)` → eased value for `t ∈ [0,1]` (pure, deterministic, trivially testable).
- A `Step(dt)` driver that advances normalized time and reports done.

A test asserts `Evaluate(0) == from`, `Evaluate(1) == to`, monotonicity for a monotonic curve, and that `Step` reaches done after `duration`.

## Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Duration | `duration` | `0.18` | `0.08–0.4` | How long the tween takes |
| Ease curve | `ease` (`AnimationCurve`) | ease-out | any | The shape/feel of the motion |
| Overshoot (if any) | curve-encoded | 1.0 (none) | `1.0–1.2` | "Pop" intensity |

**Library choice itself is the human's call.** Present custom vs DOTween, state the Tier 0 lean (custom), and hand it over (`guides/10-human-handoff.md`).
