# 06 — Audio Import & Memory

Per-clip import settings *are* the memory budget. The same set of sounds can cost 2 MB or 20 MB of
RAM depending on compression format and load type. This guide owns the per-clip strategy; the
**hard ceiling** is `mobile-game-perf-guardian`'s (`07-mobile-audio-budget.md`).

> **VERIFY in editor** Unity 6's per-platform import defaults (default compression, default
> sample rate) — authored headless.

## The three levers

### 1. Compression format

| Format | Ratio | Decode cost | Use for |
|---|---|---|---|
| **Vorbis** | good (quality knob) | CPU to decode | Music, ambient beds (long clips) |
| **ADPCM** | ~3.5:1 | very cheap | Frequent short SFX (hits, footsteps) |
| **PCM** | none (uncompressed) | none | Tiny critical cues where decode latency must be zero |

Vorbis has a **Quality** slider — drop it until you can hear the artifact, then back off one step.

### 2. Load type

| Load type | RAM cost | Use for |
|---|---|---|
| **Decompress On Load** | high (resident PCM) | Short SFX you play often — fast, no decode hitch |
| **Compressed In Memory** | medium (stays compressed, decodes on play) | Medium clips, occasional |
| **Streaming** | ~near-zero RAM (off disk) | Music + long ambient beds |

### 3. Channel & rate

- **Force To Mono** — every 3D-spatialized SFX (`02-spatial-3d-audio.md`). Stereo on a panned
  source is wasted memory and spatializes oddly.
- **Sample-rate override** — drop SFX to **22 050 Hz** where nobody hears the difference; halves
  the data vs 44 100. Keep music at full rate.

## The rules of thumb

- **Music / long ambient → Streaming + Vorbis.** Near-zero RAM, decoded off disk.
- **Short, frequent SFX → Decompress On Load (or ADPCM) + Force-To-Mono + 22 kHz.** Fast, small.
- **One-off medium cues → Compressed In Memory.**

A stereo, 44 kHz, Decompress-On-Load clip used as a 3D enemy SFX is the classic memory leak — it's
resident, double-channel, full-rate. Mono + 22 kHz + ADPCM cuts it dramatically. That misconfig is
a **must-fix** when it blows the ceiling.

## Reusable import Presets

Author a Unity **Preset** per clip-class (SFX-short, Ambient-loop, Music-stream) so every imported
clip gets the right settings automatically — the same discipline `unity-art-pipeline-guardian`
uses for textures. This keeps the budget from drifting as content grows. (The Preset asset is
authored in-editor; you specify its contents.)

## EditMode note

Import settings are asset metadata, not runtime logic — there is nothing to unit-test here. The
audit is a *review* pass: scan import settings against the rules above and flag misconfigs. On the
headless VM there are no audio assets yet, so this guide is a **forward spec** for when the human
imports the sound library in the art phase.

## Handoff

You specify per-clip import strategy and the Presets; the human imports the assets and applies
them. The **hard memory ceiling** that this strategy must fit under is
`mobile-game-perf-guardian`'s — propose the per-clip plan, defer the budget number.
