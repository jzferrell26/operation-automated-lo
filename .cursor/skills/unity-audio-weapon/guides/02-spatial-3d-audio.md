# 02 — Spatial 3D Audio

DRIFT is top-down on a small portrait screen. Spatialization is a *feel choice per cue*, not a
blanket on/off. This guide gives you the knobs and the top-down-appropriate defaults; the human
makes the final 2D-vs-3D call (`game-feel-juice-weapon/guides/07` calls it "the human's call").

> **VERIFY in editor** default `minDistance`/`maxDistance` and the rolloff-curve shape.

## The core knob: `spatialBlend`

`AudioSource.spatialBlend` is `0` (pure 2D — heard equally regardless of position) → `1` (full
3D — pans/attenuates with position). For DRIFT:

| Cue class | `spatialBlend` | Why |
|---|---|---|
| Your own hit / pickup / craft / UI | `0` (2D) | Player-centric feedback you must always hear at full level |
| Enemy attack / death, distant breach | `~0.5–0.8` (light 3D) | Situational awareness (hear the enemy to your left) without losing it off-screen |
| Ambient bed | `0` (2D) | A zone-wide bed is non-positional by nature |

The trap on a top-down camera: a *full* 3D source at the play-area edge can be near-inaudible at
the camera's framing distance. Light 3D + a generous `minDistance` keeps off-screen events
present.

## Rolloff

`AudioSource.rolloffMode`:

- **`Logarithmic`** (default) — realistic falloff; fine for most 3D cues.
- **Custom `AnimationCurve`** — full control. For top-down, a *gentle* curve with a large
  `minDistance` (the radius within which volume is flat at max) so the whole play area stays
  audible, then a soft drop past `maxDistance`.

Set `minDistance` generously (the play area is small); a desktop-default `minDistance` of 1 makes
everything fall off within a step. **VERIFY** the defaults and tune in editor.

## Doppler & spread

- **`dopplerLevel`** — keep **low or zero**. DRIFT has no fast fly-bys; doppler pitch-shift on a
  top-down survival cue reads as *wrong*, not as motion.
- **`spread`** — widens the stereo image of a 3D source; a little spread on enemy cues helps them
  feel present rather than a pin-point.

## Force-to-mono for 3D sources

Any 3D-positioned SFX should import **Force To Mono** (see `06-audio-import-and-memory.md`). A
stereo clip on a spatialized source wastes memory and spatializes oddly — Unity collapses it
anyway. Mono in, panned by the engine.

## EditMode note

Spatial *config* (which `spatialBlend`, which rolloff) is data on a component — set via
`Configure(...)` or `[SerializeField]`. The *playback* is engine-side and unheard headless, so
tests assert the *chosen values* (e.g. "enemy source is light-3D, mono, custom rolloff"), not the
sound. See `examples/03-spatial-sfx-enemy.md`.

## Handoff

The 2D-vs-3D *feel* call per cue is the human's (and overlaps `game-feel-juice-guardian`'s cue
moment). You provide the per-cue starting values and the rolloff curve as knobs; the human listens
on-device and finalizes. Never declare a spatialization "feels right."
