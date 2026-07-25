# 07 — Audio Feedback

Audio is half of perceived impact. A hit with a good sound and no VFX often feels better than a hit with great VFX and silence. Treat audio cues like VFX: a knob, restraint, voice limits, and no per-frame spam (Principle #10).

> Sources: Swink, *Game Feel* (sound as part of "polish"); Jonasson & Purho, "Juice it or lose it" (audio cues). DRIFT runs headless on the VM (ALSA/FMOD "no sound device" warnings are harmless per AGENTS.md), so audio is authored for the device, not the CI. See `research/research-plan.md`.

## The cues that matter in Tier 0

Match audio to the events that already exist (Hard Rule #1):

| Event | Hook | Cue character |
|---|---|---|
| Melee hit lands | `Health.Changed` (damage) | Short, punchy impact; pitch-varied |
| Enemy dies | `Health.Died` | A heavier "down" cue |
| Salvage pickup | `SalvageNode` collect | A small positive chime |
| Tool-cache open | cache `RecordToolCacheOpened` | A "clunk/unlock" |
| Hull breach | `HullBreachEvent.BreachActivated` | A loud klaxon / depressurize whoosh |
| Breach sealed | `HullBreachEvent.BreachSealed` | A "restored" tone |
| Low oxygen | `OxygenSystem` threshold / `Depleted` | A rising warning (the signature meter — CLAUDE.md §6) |

The oxygen warning is worth special note: oxygen is the signature tension meter (CLAUDE.md §6, GDD §3); a clear audio warning as it drains is high-value feedback. Coordinate the *threshold values* with `game-balance-guardian` (those are balance numbers); you own the *cue* and its feel.

## Voice limits & restraint

- **Cap concurrent voices.** Many enemies/hits at once must not stack into a wall of sound or exceed the audio-source budget. Use a small pool of `AudioSource`s and a max-concurrent limit per cue type.
- **No per-frame `PlayOneShot` spam.** A continuous event (oxygen draining, sprint depleting) is *not* a per-frame sound — it's a one-shot at a threshold, or a single looping source whose volume/pitch is modulated. Calling `PlayOneShot` every `Update` frame is a **must-fix**.
- **Debounce rapid repeats.** A melee that can hit multiple targets in one swing should not fire N identical hit sounds the same frame — play one, or one-per-target with a tiny stagger.

## Pitch & variation (the cheap polish)

Identical samples replayed read as machine-gun sameness. Randomize pitch slightly per play (`source.pitch = Random.Range(0.95f, 1.05f)`) and, where you have them, rotate among a few variant clips. This is the single cheapest way to make audio feedback feel less robotic. Knob: `pitchJitter` (start `±0.05`).

## Spatialization (top-down)

DRIFT is top-down; 2D vs 3D audio is a feel choice:

- **2D** (no spatial falloff) — every cue is heard equally; simplest, fine for a small play area.
- **3D / panned** — cues pan/attenuate with position; adds situational awareness (you hear the enemy to your left) but needs tuning so off-screen events aren't inaudible.

Tier 0 default: 2D for player-centric cues (your own hit, your pickup), light 3D for world events (a distant breach) if it earns it. Surface as a choice; it's the human's call.

## Mobile considerations (Principle #6)

- Players often play **muted** — audio must be *additive* feedback, never the *only* channel for critical information. The breach must read visually too; the low-oxygen warning needs a visual (it has the HUD meter in `Tier0Hud`).
- Keep cue files short and few; audio memory and decode are a (smaller) part of the mobile budget. Co-own the asset-size side with `mobile-game-perf-guardian` if it grows.

## EditMode note

The audio *trigger logic* (the component subscribing to `Health.Changed` and deciding to play) is testable with the usual `Configure` + a callable method; the actual playback is engine-side and not unit-tested (and is silent on the headless VM anyway). Keep the decision testable, mock/skip the `AudioSource` in EditMode.

## Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Hit cue volume | `hitVolume` | `0.8` | `0–1` | Loudness of impact |
| Pitch jitter | `pitchJitter` | `0.05` | `0–0.1` | Variation to avoid sameness |
| Max concurrent voices | `maxVoices` | `8` | per perf-guardian | Voice budget ceiling |
| Low-O2 warning threshold | (coordinate w/ balance) | — | — | When the warning starts (balance owns) |

Cues, mix, and the spatial choice are **the human's to finalize**; you wire the triggers and the knobs. End with the handoff (`guides/10-human-handoff.md`).
