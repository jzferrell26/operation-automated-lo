# 09 — FMOD vs Unity Audio

Default to **Unity's built-in `AudioMixer`.** Escalating to FMOD or Wwise is an **ADR-worthy
dependency decision** — never a default, never a drive-by `Packages/manifest.json` change.

> **VERIFY live** current FMOD-for-Unity and Wwise-Unity integration support for Unity 6 before
> recommending either — authored headless; integration versions move.

## What Unity's built-in audio covers (enough for DRIFT Tier 1)

- `AudioMixer` with groups, exposed parameters, and **snapshots** (zone/mood transitions —
  `01-audiomixer-routing-snapshots.md`).
- Basic effects (lowpass/highpass, reverb, Duck Volume) on mixer groups.
- 3D spatialization with rolloff (`02-spatial-3d-audio.md`).
- Vertical-layering adaptive music via stem volumes on the mixer (`04-adaptive-music-states.md`).

For a top-down mobile survival game in its atmosphere phase, this is **sufficient**. The mixer +
snapshots + a stem-based music machine cover the moods (station/descent/surface/raid) without a
dependency.

## When FMOD/Wwise is justified (the ADR triggers)

Escalate **only** when the design genuinely outgrows the built-in mixer, e.g.:

- **Parameter-driven vertical re-orchestration** — the music must continuously re-orchestrate on
  many gameplay parameters (intensity, distance, threat) beyond a few stem on/off layers.
- **Complex interactive transition logic** — authored transition segments, stingers, and
  beat-synced switches that would be painful to hand-roll.
- **A dedicated audio-designer workflow** — a composer/sound designer who works *in* FMOD Studio /
  Wwise and wants to author without round-tripping through code.
- **Advanced runtime DSP** — convolution reverb, complex sidechaining, profiling tools beyond
  Unity's audio profiler.

If none of these apply, the answer is **Unity's built-in audio.**

## The cost of the dependency (state it in the ADR)

- **Build size** — the FMOD/Wwise runtime + banks add to the binary (mobile-sensitive; co-own with
  `unity-build-guardian` / `mobile-game-perf-guardian`).
- **Learning curve** — a second authoring tool + a banks pipeline.
- **A `Packages/manifest.json` / plugin change** — a deliberate architectural commitment.
- **EditMode-test impact** — the music-state *logic* can still be `Configure`+`Step`, but the
  playback layer changes; keep the decision testable regardless of the playback backend.

## The recommendation shape

When asked "should we use FMOD?", answer with:

1. Default: **Unity built-in `AudioMixer`** — and why it covers the current need.
2. The specific ADR trigger(s) that would change the answer.
3. If a trigger applies → hand off an **ADR** (`library/architecture/ADR-<n>-audio-middleware.md`)
   with the justification, the cost, and the verification (confirm Unity-6 integration support
   live). Never adopt middleware as a side effect of an audio task.

Source: `research/research-summary.md` §6.
