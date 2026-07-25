# Research Summary — unity-audio-weapon

> **RESEARCH MODE: DEGRADED — authored from model knowledge; Firecrawl/Exa unavailable in
> this environment and no Unity editor is present to verify defaults. Where a number, default,
> or exact API signature matters (default DSP buffer size, default sample rate, compression
> defaults, snapshot-transition curve), the guides mark it for in-editor / live-docs
> verification rather than asserting it. Internal repo facts (`CLAUDE.md`, `ARCHITECTURE.md`,
> `AGENTS.md`, the real trigger files, the Unity pin) are authoritative and cited directly.**
>
> Audio also **cannot be heard on the headless VM** (`AGENTS.md`: ALSA/FMOD "no sound device"
> warnings are harmless). Everything here is designed and tested *logically*; the human
> finalizes the mix on-device (`CLAUDE.md §7`).

This synthesis answers the six backlog queries that scope `unity-audio-weapon`.

---

## 1. `AudioMixer`, groups, snapshots — the zone/mood backbone

Unity's built-in **`AudioMixer`** is an asset holding a graph of **groups** (e.g.
`Master → Music / SFX / Ambient / UI`). Every `AudioSource` routes to a group via its
`outputAudioMixerGroup`. The mixer gives three things this project needs:

- **Exposed parameters** — right-click a group's volume/effect parameter → "Expose to script";
  set at runtime via `AudioMixer.SetFloat("MusicVol", dB)`. Volume is in **dB** (logarithmic),
  so a linear 0–1 slider must be converted (`Mathf.Log10(x) * 20`, clamped). **VERIFY** the
  exact silence floor in editor (commonly `-80 dB`).
- **Snapshots** — a saved set of all mixer parameter values. DRIFT's zones map cleanly to
  snapshots: `Station`, `Descent`, `Surface`, `Raid`. Transition with
  `AudioMixerSnapshot.TransitionTo(seconds)` (or `AudioMixer.TransitionToSnapshots(...)` for a
  weighted blend). This is how the station-hum-to-dead-surface mood shift happens without
  swapping clips — just retarget volumes/cutoffs.
- **Ducking** — route ambient/music through a group whose volume the warning/combat snapshot
  pulls down (a snapshot-driven duck). True sidechain compression needs the **Duck Volume**
  effect with a send; the snapshot approach is simpler and enough for Tier 1. **VERIFY** the
  Duck Volume effect name/availability in Unity 6.

The low-oxygen warning is the canonical use: a `LowOxygen` snapshot (or a partial transition)
ducks ambient and lifts a warning-route as O2 drains — the signature-meter tension made audible
(`CLAUDE.md §6`). The *threshold* belongs to `game-balance-guardian`; the *route and snapshot*
are this Weapon's.

## 2. 3D spatial SFX — `spatialBlend`, rolloff, top-down choices

`AudioSource.spatialBlend` is a 0 (pure 2D) → 1 (full 3D) knob. For DRIFT (top-down, portrait):

- **Player-centric cues** (your own hit, your pickup, UI) → **2D** (`spatialBlend = 0`): heard
  equally regardless of position. Simplest and correct for feedback you must always hear.
- **World events** (a distant breach, an enemy off to one side) → **light 3D**
  (`spatialBlend ≈ 0.5–0.8`) so they pan/attenuate for situational awareness — tuned so
  off-screen events stay audible.
- **Rolloff:** `AudioRolloffMode.Logarithmic` (default) or a **custom `AnimationCurve`** for
  full control of `minDistance`/`maxDistance` falloff. Top-down play areas are small, so set
  `minDistance` generously and a gentle curve — desktop-default rolloff makes everything
  inaudible at the camera's framing distance. **VERIFY** default min/max in editor.
- **Doppler:** keep `dopplerLevel` low/zero — DRIFT has no fast fly-bys; doppler artifacts on a
  top-down survival game read as wrong. `spread` widens the stereo image for 3D sources.

This is the human's final feel call (2D vs 3D per cue); the Weapon surfaces it as a documented
choice with starting values, per `game-feel-juice-weapon/guides/07-audio-feedback.md` (which
also calls spatialization "the human's call").

## 3. Adaptive music states — exploration / combat / raid

Two industry techniques (named, for the human to pull from Winifred Phillips, *A Composer's
Guide to Game Music*):

- **Vertical layering** — one tempo-locked piece in stems (bed / percussion / lead); states
  add/remove layers by fading stem volumes. Smoothest transitions; the recommended Tier-1
  default because state changes (enter combat) are instant and seamless.
- **Horizontal re-sequencing** — distinct cues that crossfade at boundaries; bigger mood jumps
  but audible seams unless transition cues are authored.

DRIFT's states map to real events: **exploration** (default on surface), **combat** (an enemy
in chase/attack range — coordinate the trigger with `fsm-ai-guardian`), **raid**
(`Tier0RaiderAssault.BeginAssault` → raid; `AssaultCompleted` → back to exploration). The state
machine is a small MonoBehaviour: **`Configure(...)` injects the mixer + clip refs, an extracted
`Step(deltaSeconds, signals)` advances state and computes target layer volumes** — so the
transition *logic* is fully EditMode-testable on the headless VM (`CLAUDE.md §6 #11`,
`ARCHITECTURE.md §7`). The actual fade is applied to mixer params; in tests the mixer is mocked
and only the computed target state/weights are asserted.

## 4. Audio import & mobile memory

Per-clip settings drive the memory budget:

- **Compression format:** **Vorbis** (good ratio, CPU to decode) for music/ambient; **ADPCM**
  (cheap decode, ~3.5:1) for frequent short SFX; **PCM** (uncompressed) only for tiny critical
  cues where decode latency matters. **VERIFY** Unity 6 defaults per platform in editor.
- **Load type:** **Decompress On Load** (resident PCM in RAM — fast, memory-heavy → short SFX);
  **Compressed In Memory** (stays compressed, decodes on play → medium clips); **Streaming**
  (off disk, ~near-zero RAM → music/long ambient beds).
- **Force To Mono** for any 3D-positioned SFX (stereo on a spatialized source is wasted memory
  and spatializes oddly). **Sample-rate override** down to 22 050 Hz for SFX where nobody hears
  the difference halves the data.

Rule of thumb: **music/ambient → Streaming + Vorbis; short SFX → Decompress On Load (or ADPCM)
+ mono.** The *hard* memory ceiling is `mobile-game-perf-guardian`'s ratification; this Weapon
proposes the per-clip strategy.

## 5. Voice management & performance

- **Cap concurrent voices** with a small `AudioSource` **pool** + a per-cue max (start `8`,
  per perf-guardian). Many simultaneous hits must not stack into a wall or exceed the budget.
- **No per-frame `PlayOneShot`** — a continuous event (O2 draining, sprint depleting) is a
  one-shot at a *threshold* or a single looping source whose volume/pitch is modulated, never a
  `PlayOneShot` every `Update` (a **must-fix**, echoing `game-feel-juice-weapon/guides/07`).
- **DSP buffer size** (`AudioSettings`) trades latency vs CPU; "Best Latency" costs more CPU on
  mobile. **VERIFY** the default and choose "Good Latency" as a mobile-sane middle. The audio
  mixes on its own thread; the cost the gameplay thread sees is mostly the `Play` calls and GC
  from clip handling — pool to avoid alloc.

## 6. Unity built-in vs FMOD vs Wwise

**Default to Unity's built-in `AudioMixer`.** It covers groups, snapshots, exposed params,
basic effects, and 3D spatialization — enough for DRIFT's Tier-1 atmosphere phase. Escalate to
**FMOD** (or **Wwise**) only when the adaptive-music graph outgrows snapshots/stems —
parameter-driven vertical re-orchestration, complex interactive transitions, a dedicated
audio-designer workflow. That is an **ADR-worthy dependency decision** (build size, learning
curve, a `Packages/manifest.json` change), never a drive-by. Note the justification when
recommending it. **VERIFY** current FMOD/Wwise Unity-6 integration support live before
committing.

---

## Cross-cutting conclusions

1. **System vs moment.** This Weapon owns the mixer/route/pool/asset/memory; the *cue moment and
   how loud a hit feels* is `game-feel-juice-guardian`'s (`07-audio-feedback.md`). Co-own at the
   cue; never re-specify the impact moment.
2. **Headless-testable music.** State logic is `Configure` + `Step`, asserted without a sound
   device. Playback is engine-side and mocked in tests.
3. **Audio is additive on mobile.** Players play muted; every critical cue (breach, low-O2) also
   reads visually — co-owned with game-feel-juice.
4. **Tier discipline.** No audio in Tier 0; this is Tier-1/atmosphere DESIGN. Do not direct a
   sound-library import mid-Tier-0.
