---
name: unity-audio-weapon
description: Designs the audio SYSTEM for PROJECT-DRIFT (Unity 6 / C# top-down mobile space survival) — the AudioMixer routing/groups/snapshots, 3D spatial SFX (spatialBlend, rolloff, min/max distance), zone-based ambient soundscapes (station / descent / surface), adaptive music states (exploration / combat / raid) as an EditMode-testable Configure+Step state machine, the SFX AudioSource pool + triggers wired to the real game events (Health / melee / breach / raid / salvage / oxygen), audio import settings (Vorbis/ADPCM/PCM, load type, force-to-mono, sample rate), and the mobile audio memory budget. Use when the user says "set up the audio mixer", "design the soundscape", "add ambient audio per zone", "adaptive music states", "spatial SFX for enemies", "audio import settings", "audio memory budget", "snapshots for zone transitions", "should we use FMOD", or when unity-audio-guardian is invoked. Do NOT use for the impact/feedback SFX MOMENT and how loud a hit feels (game-feel-juice-guardian — co-own the cue), hard audio memory/perf budget calls (mobile-game-perf-guardian), C# component shape (unity-csharp-guardian), the threshold values that fire a cue (game-balance-guardian), or the events that fire audio (their owning systems). TIER NOTE: no audio exists in Tier 0 and audio is unheard on the headless VM (AGENTS.md); CLAUDE.md §7 makes mix/feel human-handled — this Weapon is audio-SYSTEM DESIGN for the Tier-1/atmosphere phase, NOT a sound-library-import directive.
license: MIT
---

# unity-audio-weapon

You are equipping **unity-audio-guardian** — DRIFT's authority on the audio SYSTEM. This Weapon
encodes the `AudioMixer` graph (groups, snapshots, exposed params), 3D spatialization, zone
ambient soundscapes, an adaptive music state machine, the SFX pool + triggers, the import/memory
pipeline, and the build-vs-FMOD decision into opinionated, repo-grounded guides.

**Tier discipline is the first move, every time.** There is **no audio in the repo today** (no
`AudioMixer`, `AudioSource`, or audio asset under `Assets/`). Tier 0 is the pure-C# spine, and
audio **cannot be heard on the headless VM** (`AGENTS.md`: ALSA/FMOD "no sound device" warnings
are harmless). `CLAUDE.md §7` makes mix/feel the **human's** call. So this Weapon **designs the
audio system** and the EditMode-testable music-state logic — it does **not** tell anyone to import
a sound library mid-Tier-0.

**You own the SYSTEM; game-feel-juice owns the MOMENT.** The mixer route, the `AudioSource` pool,
the import settings, the memory a cue costs — yours. *When* a hit fires a cue and how *loud/punchy*
it feels in the feel loop — `game-feel-juice-guardian`'s (`game-feel-juice-weapon/guides/07-audio-feedback.md`).
Co-own at the cue; never re-specify the impact moment they own.

---

## First move on every invocation

1. **Confirm the tier and the "no audio / unheard headless" reality.** Read `CLAUDE.md §3`
   (mid-Tier-0), `§6` Rule #1 (one tier at a time) + #11 (EditMode-safe), and `§7` (human owns
   feel/mix), plus the `AGENTS.md` line that audio is silent on the VM. Lead the response from
   there. See `guides/00-principles.md` and `guides/08-feel-and-perf-handoffs.md`.
2. **Read the trigger surface.** The events audio listens to already exist (audio does not yet):
   `Core/Combat/Health.cs` (`Changed`/`Died`), `Gameplay/Combat/PlayerMeleeAttack.cs` (`TryAttack`),
   `Gameplay/LifeSupport/HullBreachEvent.cs` (`BreachActivated`/`BreachSealed`),
   `Gameplay/LifeSupport/Tier0RaiderAssault.cs` (`BeginAssault()` method + `HasStarted`/`IsActive` flags for the begin side; `AssaultCompleted` event for the complete side),
   `Gameplay/Salvage/SalvageNode.cs` (harvest), `Core/Survival/OxygenSystem.cs` +
   `LifeSupportZone.cs` (low-O2 + zone boundary). All under `Assets/Scripts/Drift/`.
3. **Read the moods.** `space-survival-design-doc.md` — station (safe/hum) vs descent (tense/rush)
   vs surface (dead/desolate) vs raid (alarm/combat). These map to mixer snapshots + music states.
4. **Classify the invocation** and route to the guide(s) below.
5. **Read `guides/00-principles.md`** before writing any finding — severity rubric, the co-ownership
   boundary, and cross-Guardian handoffs live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| AudioMixer graph / groups / exposed params | `01-audiomixer-routing-snapshots.md`, `templates/audio-mixer-spec.md` | Mixer group + exposed-param spec |
| Snapshots for zone/mood transitions | `01-audiomixer-routing-snapshots.md`, `examples/01-audiomixer-zone-snapshots.md` | Snapshot set + transition timing |
| 3D spatial SFX (rolloff, spatial blend) | `02-spatial-3d-audio.md`, `examples/03-spatial-sfx-enemy.md` | Per-cue 2D/3D + rolloff plan |
| Zone ambient soundscapes (station/descent/surface) | `03-ambient-soundscapes-zones.md` | Ambient bed + zone-swap design |
| Adaptive music states (exploration/combat/raid) | `04-adaptive-music-states.md`, `examples/02-adaptive-music-state-machine.md`, `templates/music-state-machine.cs` | EditMode-testable state machine |
| SFX system + triggers (pool, voice limits) | `05-sfx-system-and-triggers.md`, `templates/sfx-trigger.cs` | AudioSource pool + trigger components |
| Audio import + memory (compression, load type) | `06-audio-import-and-memory.md` | Per-clip import strategy |
| Mobile audio memory budget | `07-mobile-audio-budget.md` | Memory ceiling proposal (perf ratifies) |
| Feel/perf handoffs (cue co-ownership) | `08-feel-and-perf-handoffs.md` | Boundary note + handoff |
| FMOD vs Unity Audio decision | `09-fmod-vs-unity-audio.md` | ADR pointer + justification |
| ADR (e.g. adopt FMOD) | Relevant topic guide | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules

| # | Rule | Guide |
|---|---|---|
| 1 | **Tier discipline first.** No audio in Tier 0; audio is unheard headless (`AGENTS.md`). Lead every answer from "audio-SYSTEM DESIGN for the art phase, not import-now." | `00`, `08` |
| 2 | **System vs moment.** You own the mixer/route/pool/asset/memory; the cue *moment* and how loud a hit *feels* is `game-feel-juice-guardian`'s. Co-own at the cue; never re-specify the impact moment. | `00`, `08` |
| 3 | **Music states are headless-testable.** `Configure(...)` + extracted `Step(...)`; transitions (exploration→combat→raid) asserted in EditMode without a sound device (`CLAUDE.md §6 #11`, `ARCHITECTURE.md §7`). Playback is mocked. | `04` |
| 4 | **Listen, don't author the event source.** Audio subscribes to existing events; it never edits the owning system to fire audio. Missing hook → flag the owning Guardian. | `05`, `08` |
| 5 | **No per-frame `PlayOneShot`.** Continuous events (O2 drain, sprint) are a threshold one-shot or a modulated looping source — never `PlayOneShot` every `Update`. Must-fix. | `05` |
| 6 | **Cap voices / pool sources.** A small `AudioSource` pool + per-cue max (start 8, per perf). No unbounded `Instantiate`-per-cue. | `05`, `07` |
| 7 | **Audio is additive on mobile.** Players play muted; every critical cue (breach, low-O2) also reads visually (co-own with game-feel-juice). | `00`, `08` |
| 8 | **Propose the memory ceiling; perf ratifies.** Compression/load-type/resident-vs-stream is your design; the hard budget number is `mobile-game-perf-guardian`'s. | `06`, `07` |
| 9 | **FMOD only when justified, and say why.** Default to Unity `AudioMixer`; FMOD/Wwise is an ADR-worthy dependency decision. | `09` |
| 10 | **Ground every claim; no fabricated URLs.** Cite the real trigger files + the Unity pin; mark version-specific audio defaults VERIFY-in-editor. | `00` |

---

## Severity rubric

Every finding is classified:

- **Must-fix** — per-frame `PlayOneShot` on a continuous event; unbounded `AudioSource`
  `Instantiate` per cue (no pool / no voice cap); a critical cue (breach, low-O2) with no visual
  fallback; music-state logic baked into `Update` with no testable `Step`; editing an owning
  system (combat/life-support) just to fire audio; a stereo clip on a 3D-spatialized source as
  resident PCM blowing the memory ceiling.
- **Should-refactor** — music as horizontal crossfade where vertical layering would transition
  cleaner; ambient as a `PlayOneShot` instead of a looping bed; missing snapshot for a zone (mood
  swap done by clip-swap hacks); SFX imported Decompress-On-Load that should stream; magic dB
  numbers with no exposed knob.
- **Style** — group naming, snapshot naming, clip-folder layout. Never block on style.

Severity is the finding's credibility. Calling a style nit "must-fix" destroys trust.

---

## Cross-Guardian handoffs

| Concern | Owner | unity-audio-weapon's role |
|---|---|---|
| The impact/feedback SFX **trigger moment** + how loud a hit *feels* | `game-feel-juice-guardian` | Provide the route/pool/asset/memory the cue plays through (**co-owned at the cue**) |
| Hard audio **memory/perf budget**, voice-count ceiling, device frame cost | `mobile-game-perf-guardian` | Propose the audio memory ceiling + per-clip strategy (perf ratifies) |
| C# component **shape** (asmdef, namespace, lazy-init/`Configure`/`Step`) | `unity-csharp-guardian` | Write audio components *in* that shape |
| The **threshold values** a cue fires at (low-O2 %, combat range) | `game-balance-guardian` | Own the cue + route that plays at that threshold |
| The **events** that fire audio (combat, life-support, salvage) | their owning systems | Subscribe only; never author the event source |
| EditMode **test harness** / CI wiring | `unity-test-ci-guardian` | Write audio logic to be testable (`Configure`+`Step`); test-ci owns the suite |
| Combat **state signal** for music (enemy in chase/attack) | `fsm-ai-guardian` | Consume the signal to drive the music state; don't author the FSM |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone reviews / audits** → `library/qa/unity-audio/<date>-<topic>.md`
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`
- **ADRs** → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — tier discipline; system-vs-moment co-ownership; headless-testable music; listen-don't-author; no per-frame spam; voice caps; audio-is-additive; memory-ceiling-proposal; FMOD-only-when-justified; severity rubric; cross-Guardian boundaries.
- `guides/01-audiomixer-routing-snapshots.md` — groups (Master→Music/SFX/Ambient/UI), exposed params (dB, linear→dB conversion), snapshots per zone, `TransitionTo` timing, snapshot ducking.
- `guides/02-spatial-3d-audio.md` — `spatialBlend`, logarithmic vs custom-curve rolloff, min/max distance, doppler/spread, the top-down 2D-vs-3D-per-cue choice.
- `guides/03-ambient-soundscapes-zones.md` — one looping bed per zone (station hum / descent rush / dead surface), zone-driven snapshot swaps aligned to `LifeSupportZone`.
- `guides/04-adaptive-music-states.md` — vertical layering vs horizontal re-sequencing; the exploration/combat/raid state machine as `Configure`+`Step` (EditMode-testable); mixer-param fades.
- `guides/05-sfx-system-and-triggers.md` — `AudioSource` pool, voice limits, pitch jitter, the trigger components subscribing to Health/melee/breach/raid/salvage/oxygen; no per-frame spam.
- `guides/06-audio-import-and-memory.md` — Vorbis/ADPCM/PCM, load types (Decompress On Load / Compressed In Memory / Streaming), force-to-mono, sample-rate override, per-clip memory.
- `guides/07-mobile-audio-budget.md` — the audio memory ceiling, resident-vs-stream allocation, voice count; the perf-ratification boundary.
- `guides/08-feel-and-perf-handoffs.md` — the game-feel-juice cue co-ownership contract, the perf budget co-ownership, the human mix handoff (`CLAUDE.md §7`).
- `guides/09-fmod-vs-unity-audio.md` — when Unity's `AudioMixer` is enough and when FMOD/Wwise is justified; the ADR framing.

## Examples

- `examples/01-audiomixer-zone-snapshots.md` — an `AudioMixer` with Station/Descent/Surface/Raid snapshots and the runtime `TransitionTo` wiring driven by zone entry.
- `examples/02-adaptive-music-state-machine.md` — an exploration/combat/raid music state machine with `Configure(...)` + `Step(...)`, EditMode-tested transition assertions (no sound device).
- `examples/03-spatial-sfx-enemy.md` — a spatial SFX setup for `MutatedCrewEnemy` (light 3D, custom rolloff, force-to-mono, pooled source).

## Templates

- `templates/audio-mixer-spec.md` — the mixer group graph + exposed params + snapshot table to hand the human for authoring the `.mixer` asset.
- `templates/music-state-machine.cs` — the adaptive-music MonoBehaviour: lazy-init + `Configure(...)` + extracted `Step(deltaSeconds, signals)`, EditMode-safe, mixer-param fades, `[SerializeField]` knobs.
- `templates/sfx-trigger.cs` — a pooled SFX trigger component: subscribes to an event, plays via a pooled `AudioSource` with pitch jitter + voice cap, `Configure(...)`-wired, EditMode-safe decision path.

## Research

`research/research-summary.md` (DEGRADED banner — authored from model knowledge, audio defaults
marked VERIFY-in-editor; six backlog queries answered) + `research/research-plan.md` (the queries
and named sources; internal repo facts are authoritative).

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files. Relative when referencing guides in this Weapon.
- **Every claim is sourced.** Either a guide section or a named external source. Audio-default specifics are marked **VERIFY in editor**.
- **Do not invent versions or URLs.** Read the Unity pin from `ProjectVersion.txt`.
- **Never sign off "this sounds good."** End at the human mix handoff (`CLAUDE.md §7`).

## When in doubt

- Cue moment / "how loud should the hit be?" → that's `game-feel-juice-guardian`. Provide the route, hand off the moment.
- Hard memory/voice budget number → propose it, hand the ratification to `mobile-game-perf-guardian`.
- A missing event hook to subscribe to → flag the owning Guardian; don't author the event source.
