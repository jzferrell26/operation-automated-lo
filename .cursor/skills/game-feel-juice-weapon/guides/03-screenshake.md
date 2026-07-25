# 03 — Screenshake (the trauma model)

Screenshake is the loudest piece of juice and the easiest to overdo — especially on a phone held ~30cm from the face. The discipline is **trauma-based, decaying, capped, and mobile-tuned.**

> Source: Squirrel Eiserloh, "Math for Game Programmers: Juicing Your Cameras With Math" (GDC) — the trauma model. Also Jan Willem Nijman / Vlambeer, "The Art of Screenshake." See `research/research-plan.md`.

## Why not "just shake the camera"

The naive approach — on a hit, offset the camera by a random vector for a few frames — has three failure modes:

1. **It stacks badly.** Two hits in quick succession double the offset; a busy moment becomes unreadable chaos.
2. **It's binary.** Shake is either on (full) or off; there's no natural falloff, so it pops.
3. **It's the same for a tap and a cannon.** No scaling with event magnitude.

The trauma model fixes all three.

## The trauma model

Keep a single `trauma` value in `[0, 1]`.

- **Events add trauma**, clamped to 1: a light hit `+0.25`, a heavy hit `+0.5`, the hull breach `+0.7`. `AddTrauma(amount)`.
- **Trauma decays linearly every frame**: `trauma = Max(0, trauma - decayPerSecond * dt)`. Knob `traumaDecayPerSecond` (start `1.2`).
- **Shake magnitude is `trauma²` (or `trauma³`)**, not `trauma`. The square makes small trauma produce *very* little shake and large trauma produce a lot — a natural, non-linear falloff that reads as "settling down."

```
shake     = maxShake * trauma * trauma
angleShake = maxAngle * trauma * trauma
```

- **Offset is smooth, not random-per-frame.** Sample Perlin noise (per axis, with different seeds) over time rather than a fresh `Random` each frame — random-per-frame looks like static; Perlin looks like a real camera being jostled.

```
offsetX = maxShake * trauma² * (Perlin(seedX, t * frequency) * 2 - 1)
```

- **Cap the magnitude.** `maxShake` is a hard ceiling in world units (top-down ortho) — and on mobile it's small. See below.

## Positional vs rotational

- **Positional** shake (offset x/z in DRIFT's top-down ortho) reads as the world jolting. Good default.
- **Rotational** shake (a small roll on the camera) reads as a stronger, more violent impact but is more nausea-prone on a small screen. Use it sparingly and cap it tighter.
- DRIFT's camera looks straight down (`transform.rotation = Quaternion.Euler(90, 0, 0)` in `TopDownFollowCamera.Awake`), so rotational shake is a *roll* (Z) on top of that. Positional shake should be applied in the camera's local X/Z plane.

## Mobile tuning (the gate)

Principle #6. A shake tuned on a monitor is too violent on a phone:

- Keep `maxShake` **small** — a few percent of the orthographic view, not a big jolt. DRIFT's `orthographicSize` is `11`; a `maxShake` of `~0.4–0.6` world units is plenty.
- Bias toward **positional over rotational**; cap rotation to a couple of degrees.
- **Frequency** matters: too high reads as static/buzz, too low reads as a slow wobble. Start `frequency ≈ 20`.
- Test the *worst case*: several trauma sources at once (multi-hit + breach). The cap must keep even a fully-saturated `trauma = 1` tolerable on a phone. This is where you hand the hard "is this nausea?" call to the human (it's a feel call) and the "is this dropping frames?" call to `mobile-game-perf-guardian`.

## Integration with `TopDownFollowCamera`

The shake is a **separate component** that injects an offset; it must not fight the existing follow damping (read `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs` — it `Lerp`s toward `desired` in `LateUpdate`). Two clean options:

1. **Offset hook** — `TopDownFollowCamera` computes its damped `desired`/position, then *adds* the shake offset on top, every `LateUpdate`. The shake component owns `trauma` + `Step` + `CurrentOffset`; the camera reads `CurrentOffset`. This keeps follow and shake independent.
2. **Child rig** — the shake lives on a child transform of the camera; the camera follows, the child shakes. No camera change at all.

Option 1 is the smaller change and keeps everything testable. See `examples/02-trauma-screenshake-utility.md`.

## EditMode-testability

The shake is frame-driven (trauma decay, noise over time). Per CLAUDE.md §11 / ARCHITECTURE.md §7:

- `AddTrauma(float)` is a public entry point.
- `Step(float dt)` decays trauma and recomputes `CurrentOffset` deterministically — for a test, feed a fixed `t` so Perlin is deterministic, or expose the noise time.
- A test asserts: after `AddTrauma(0.5f)`, magnitude > 0; after enough `Step`, trauma decays to 0 and offset returns to zero; offset never exceeds `maxShake`.

See `templates/screenshake.cs`.

## Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Max positional shake | `maxShake` | `0.5` | `0.2–1.0` (world units) | Ceiling of the jolt |
| Max rotational shake | `maxAngle` | `2.0` | `0–5` (degrees) | Roll on top of top-down |
| Trauma decay | `traumaDecayPerSecond` | `1.2` | `0.8–2.0` | How fast it settles |
| Noise frequency | `frequency` | `20` | `12–30` | Jolt vs buzz |
| Trauma exponent | `traumaExponent` | `2` | `2–3` | Steepness of falloff |
| Trauma per light hit | (caller) | `0.25` | `0.15–0.4` | Shake size of a normal hit |
| Trauma per heavy event | (caller, e.g. breach) | `0.7` | `0.5–1.0` | Shake size of a big event |

Starting values are grounded in the Eiserloh model but are **first-pass; the human tunes on device.** End with the handoff (`guides/10-human-handoff.md`).
