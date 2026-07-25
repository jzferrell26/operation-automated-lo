# unity-audio-weapon

The procedural arsenal for `unity-audio-guardian`, PROJECT-DRIFT's audio-SYSTEM specialist.

## What this weapon covers

- **AudioMixer** — groups (Master → Music / SFX / Ambient / UI), exposed parameters, and
  **snapshots** for zone/mood transitions (station ↔ descent ↔ surface ↔ raid).
- **3D spatial SFX** — `spatialBlend`, rolloff (logarithmic / custom curve), min/max distance,
  and the top-down 2D-vs-3D-per-cue choice.
- **Zone ambient soundscapes** — one looping bed per zone, swapped on zone entry via snapshots.
- **Adaptive music states** — exploration / combat / raid as an **EditMode-testable**
  `Configure` + `Step` state machine (verifiable on the headless VM with no sound device).
- **SFX system + triggers** — a small `AudioSource` pool, voice limits, pitch jitter, and the
  trigger components that subscribe to the real game events (Health / melee / breach / raid /
  salvage / oxygen).
- **Audio import & memory** — Vorbis / ADPCM / PCM, load types, force-to-mono, sample-rate
  override, per-clip memory.
- **Mobile audio memory budget** — the ceiling, resident-vs-stream, voice count.
- **FMOD vs Unity Audio** — when the built-in mixer is enough and when middleware is justified.

## Reading order

1. Read `SKILL.md` — master index, routing table, hard rules, severity rubric, handoffs, outputs.
2. Read `guides/00-principles.md` — the non-negotiables (tier discipline, system-vs-moment,
   headless-testable music, the co-ownership boundary).
3. Open the guide matching the task (see the routing table in `SKILL.md`).
4. Reference `research/` for the sources behind a claim.

## Two key rules

- **You own the SYSTEM; `game-feel-juice-guardian` owns the MOMENT.** The mixer route, the
  `AudioSource` pool, the import settings, the memory a cue costs — yours. *When* a hit fires a
  cue and how *loud/punchy* it feels — theirs (`game-feel-juice-weapon/guides/07-audio-feedback.md`).
  Co-own at the cue; never re-specify the impact moment.
- **No audio in Tier 0, and audio is unheard headless.** This is audio-SYSTEM **design** for the
  Tier-1/atmosphere phase. Music-state *logic* is `Configure`+`Step` so it tests without a sound
  device (`CLAUDE.md §6 #11`). The human finalizes the mix on-device (`CLAUDE.md §7`).
