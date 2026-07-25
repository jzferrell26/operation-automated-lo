# Research Plan — unity-audio-weapon

The six backlog queries that scope `unity-audio-weapon`, with the named (not fabricated)
sources each draws on. No URLs are invented; sources are named for the human/Guardian to pull
from live Unity 6 docs and the cited references.

## Queries

1. **Unity 6 `AudioMixer` — groups, exposed parameters, snapshots, and snapshot transitions
   for zone/mood switching on mobile.** Sources: Unity Manual "Audio Mixer", "Audio Mixer
   Snapshots", "Exposed AudioMixer Parameters"; Unity ScriptingAPI `AudioMixer`,
   `AudioMixerSnapshot.TransitionTo`, `AudioMixer.SetFloat`.

2. **3D spatial audio in Unity — `spatialBlend`, rolloff (logarithmic/custom), min/max
   distance, doppler, spread — and the top-down 2D-vs-3D tradeoff.** Sources: Unity Manual
   "Audio Source", "Audio Spatializer", "Distance and rolloff"; ScriptingAPI `AudioSource`,
   `AudioRolloffMode`, `AnimationCurve` for custom rolloff.

3. **Adaptive / vertical music in Unity — layered stems vs horizontal re-sequencing, and how
   to drive a music state machine (exploration/combat/raid) from gameplay events.** Sources:
   Unity "Audio" docs; Winifred Phillips, *A Composer's Guide to Game Music* (vertical layering
   / horizontal resequencing concepts, named for the human to pull); general adaptive-music
   practice. Mark technique-vs-tool claims for verification.

4. **Audio import settings & mobile memory — Vorbis vs ADPCM vs PCM, load types (Decompress
   On Load / Compressed In Memory / Streaming), force-to-mono, sample-rate override, and
   per-clip memory tradeoffs.** Sources: Unity Manual "AudioClip", "Importing Audio Files",
   "Audio import settings"; Unity mobile-optimization guidance.

5. **Unity audio voice management & performance on mobile — voice count, `AudioSource` pooling,
   `PlayOneShot` cost, DSP buffer size, and the audio thread.** Sources: Unity Manual "Audio
   profiler", "DSP Buffer Size" (`AudioSettings`); Unity mobile performance docs;
   `mobile-game-perf-weapon` for the budget-ratification boundary.

6. **Unity built-in audio vs FMOD vs Wwise — when the built-in `AudioMixer` is enough and when
   a middleware dependency is justified for a small mobile project.** Sources: FMOD for Unity
   docs (named), Wwise Unity integration docs (named), Unity Audio Manual. Framed as an
   ADR-worthy dependency decision, not a default.

## Internal (authoritative) sources

These are read directly from the repo and are authoritative — no live verification needed:

- `Assets/Scripts/Drift/Core/Combat/Health.cs` — `Changed`/`Died` SFX trigger events.
- `Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs` — `TryAttack` swing.
- `Assets/Scripts/Drift/Gameplay/LifeSupport/HullBreachEvent.cs` — `BreachActivated`/`BreachSealed`.
- `Assets/Scripts/Drift/Gameplay/LifeSupport/Tier0RaiderAssault.cs` — `BeginAssault`/`AssaultCompleted`.
- `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs` — harvest/cache-open.
- `Assets/Scripts/Drift/Core/Survival/OxygenSystem.cs`, `LifeSupportZone.cs` — low-O2 warning + zone boundary.
- `CLAUDE.md` (§6, §7), `ARCHITECTURE.md` (§7), `AGENTS.md` (headless), `TIER0.md`, `space-survival-design-doc.md` (moods).
- `.claude/skills/game-feel-juice-weapon/guides/07-audio-feedback.md` — the cue co-ownership contract.

## Verification discipline

This environment has no Firecrawl/Exa and no Unity editor. Every version-specific or
default-specific claim (API-method exact signature, default DSP buffer size, default sample
rate, compression-format defaults) is marked **VERIFY in editor / live docs** in the guides
rather than asserted. Internal repo facts are cited directly and are authoritative.
