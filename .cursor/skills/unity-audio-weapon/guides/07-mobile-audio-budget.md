# 07 — Mobile Audio Budget

Audio is a smaller slice of the mobile budget than textures or meshes, but it is easy to
over-spend (resident music, uncapped voices, stereo SFX). This guide owns the **budget design**;
the **hard numbers** are `mobile-game-perf-guardian`'s ratification (Principle #8).

## The three audio costs on mobile

1. **Memory (RAM)** — resident decompressed clips. Driven by import settings
   (`06-audio-import-and-memory.md`): music/ambient stream (≈0), short SFX are resident PCM.
2. **CPU (audio thread)** — decode (Vorbis costs more than ADPCM/PCM), DSP effects, voice count.
   Mixes on its own thread, but `Play` calls + GC from clip handling hit the gameplay thread.
3. **DSP latency vs CPU** — `AudioSettings` DSP buffer size trades latency for CPU. "Best Latency"
   costs more on mobile; **"Good Latency"** is the mobile-sane middle. **VERIFY** the default and
   the exact enum in editor.

## The budget shape (proposal — perf ratifies)

| Lever | Proposed Tier-1 starting point | Owner of the final number |
|---|---|---|
| Resident SFX memory ceiling | propose a cap (e.g. a few MB of short cues) | `mobile-game-perf-guardian` |
| Max concurrent voices | `8` | `mobile-game-perf-guardian` |
| Music/ambient | Streaming (≈0 RAM) | this Weapon |
| DSP buffer | "Good Latency" | this Weapon (perf can override) |

The voice cap is enforced by the `AudioSource` pool (`05-sfx-system-and-triggers.md`): when full,
**drop** the cue. Unbounded `Instantiate`-per-cue is a **must-fix** — it's how audio quietly blows
both the voice and the alloc budget.

## Resident vs stream — the one decision that matters most

The single biggest audio-memory lever is **streaming music + ambient instead of loading it
resident.** A few minutes of resident music can dwarf the entire SFX set. Stream the long stuff,
keep only short frequent SFX resident. (`06` covers the per-clip mechanics.)

## GC discipline

`AudioSource.PlayOneShot` and clip handling can allocate. Pooling sources (vs
`Instantiate`/`Destroy` per cue) avoids the per-cue GC churn that causes frame hitches —
co-owned with `mobile-game-perf-guardian` and `game-feel-juice` (a frame hitch on a hit is the
opposite of juice).

## The headless caveat

Audio is **unheard and unprofiled on the VM** (`AGENTS.md`). The real memory/CPU measurement
happens on-device in the art phase, run by the human / `mobile-game-perf-guardian`. This guide is
the **budget design** that measurement will validate — not a measured result.

## Handoff

Propose the ceiling, the voice cap, the resident-vs-stream split, the DSP setting. Hand the hard
ratification and the on-device profiling to `mobile-game-perf-guardian`. The human runs the device
profile (`CLAUDE.md §7`).
