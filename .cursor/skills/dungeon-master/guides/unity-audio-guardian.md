# Unity Audio Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-audio-guardian`. Use this guide to decide
whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-audio-guardian.md`](../../../../agents/unity-audio-guardian.md)
**Weapon:** [`.claude/skills/unity-audio-weapon/`](../../unity-audio-weapon/)
**Command Brief:** [`ai-tools/command-briefs/unity-audio-guardian-command-brief.md`](../../../../ai-tools/command-briefs/unity-audio-guardian-command-brief.md)
**Trigger policy:** on-demand (proactive: false)

---

## Domain

`unity-audio-guardian` is PROJECT-DRIFT's audio-SYSTEM specialist — it designs *how sound is
plumbed*. Its remit is the **audio SYSTEM**: the `AudioMixer` graph (groups, exposed params,
snapshots for zone/mood transitions), 3D spatial SFX (spatial blend, rolloff, distance),
zone-based ambient soundscapes (station / descent / surface), adaptive music states (exploration /
combat / raid), the SFX `AudioSource` pool + the trigger components that subscribe to the real
game events, audio import settings (compression, load type, memory), and the mobile audio memory
budget.

**Its defining constraints: tier discipline, the co-ownership boundary, and headless testability.**
There is **no audio in the repo** (no `AudioMixer`/`AudioSource`/audio asset under `Assets/`), and
audio is **unheard on the headless VM** (`AGENTS.md`). `CLAUDE.md §7` makes mix/feel the *human's*
call. So this Guardian designs the audio system + budget for the **Tier-1/atmosphere phase** — it
never directs importing a sound library mid-Tier-0, and it never signs off "this sounds good." It
owns the **SYSTEM** (mixer/route/pool/asset/memory); `game-feel-juice-guardian` owns the **MOMENT**
(when a hit fires a cue and how loud it feels). The cue is **co-owned**. Music-state *logic* is
`Configure`+`Step` so it tests in EditMode with **no sound device** (`CLAUDE.md §6 #11`).

## Trigger phrases

Route to `unity-audio-guardian` when the user says any of:

- "Set up the audio mixer" / "design the AudioMixer routing" / "add mixer groups"
- "Snapshots for zone transitions" / "switch the mood between station and surface"
- "Design the soundscape" / "add ambient audio per zone" / "the station should hum, the surface should be dead"
- "Adaptive music states" / "combat music" / "raid music" / "music should ramp when an enemy engages"
- "Spatial SFX for enemies" / "3D audio" / "set the rolloff / spatial blend"
- "Audio import settings" / "compress these clips" / "Vorbis vs ADPCM" / "stream the music"
- "Audio memory budget" / "how much RAM does the audio cost"
- "Should we use FMOD / Wwise?"
- Any request to design or audit the *audio system* (mixer, spatializer, music machine, import
  pipeline) on PROJECT-DRIFT

Or when the request implicitly involves the audio *plumbing* — how sound routes, spatializes,
transitions, imports, or fits the memory budget — as opposed to how a specific hit *feels*.

## Do NOT route when

- The user wants the **impact/feedback SFX moment** — *when* a cue fires on a hit, how *loud/punchy*
  it feels, "make the hit sound meatier" — that is `game-feel-juice-guardian`. **Co-owned at the
  cue:** unity-audio-guardian provides the route/pool/asset/memory; game-feel-juice owns the moment
  (`game-feel-juice-weapon/guides/07-audio-feedback.md`). When the ask is *feel*, route there; when
  it's *route/mixer/import*, route here. This is the key boundary.
- The user wants a **hard audio memory / voice / perf call** — the memory ceiling number, the
  voice-count cap, device frame cost, on-device profiling — that is `mobile-game-perf-guardian`.
  (unity-audio proposes the strategy; perf ratifies the hard numbers.)
- The user wants **C# component shape** — MonoBehaviour patterns, asmdef/namespace placement, the
  lazy-init/`Configure` conventions themselves — that is `unity-csharp-guardian`. (This Guardian writes
  audio components *in* that shape.)
- The user wants **cue threshold values** — the low-O2 % at which the warning starts, combat-engage
  range, raid cadence — that is `game-balance-guardian`. (This Guardian owns the cue + route that plays
  *at* that threshold.)
- The user wants to change **the events that fire audio** — the combat, life-support, or salvage
  systems themselves — those belong to their owning systems. (This Guardian *subscribes*; it never
  authors the event source. A missing hook is flagged to the owning Guardian.)
- The user wants the **EditMode test harness / asmdef / CI runner** — that is
  `unity-test-ci-guardian`. (This Guardian writes audio logic to *be* testable via `Configure`+`Step`;
  test-ci owns the suite.)
- The user wants the **combat signal for music** authored — the FSM "is an enemy engaged?" logic —
  that is `fsm-ai-guardian`. (This Guardian *consumes* the signal to drive the music state.)
- The user wants the **final mix** — "does this sound good?" — that is **the human**
  (`CLAUDE.md §7`). This is the boundary the Guardian does not cross.

If the request straddles boundaries (e.g., "make the combat sound better"), split it: route the
*system* (mixer route, music machine, spatializer, import) to `unity-audio-guardian`, the *moment*
(how loud/punchy the hit feels) to `game-feel-juice-guardian`, the *numbers* to
`game-balance-guardian`, and the *hard budget* to `mobile-game-perf-guardian`.

## Inputs the Guardian needs

Before invoking, ensure the Guardian can read (or you can point it at):

- The real SFX **trigger files** (the events exist; audio doesn't yet): `Health.cs`
  (`Changed`/`Died`), `PlayerMeleeAttack.cs` (`TryAttack`), `HullBreachEvent.cs`
  (`BreachActivated`/`BreachSealed`), `Tier0RaiderAssault.cs` (`BeginAssault()` method +
  `HasStarted`/`IsActive` flags begin it; `AssaultCompleted` event ends it),
  `SalvageNode.cs` (harvest), `OxygenSystem.cs` + `LifeSupportZone.cs` (low-O2 + zone) — all under
  `Assets/Scripts/Drift/`.
- `space-survival-design-doc.md` — the moods (station / descent / surface / raid).
- `CLAUDE.md` (§6 Hard Rules, esp. #11; §7 human owns mix/feel; §3 Status Map),
  `ARCHITECTURE.md` §7 (the `Configure`+`Step` contract), `AGENTS.md` (headless: audio unheard,
  ALSA/FMOD warnings harmless), `TIER0.md` (scope guard).
- `.claude/skills/game-feel-juice-weapon/guides/07-audio-feedback.md` — the cue co-ownership
  contract (do not contradict it).
- Optional: a specific focus (mixer/snapshots, spatial, ambient, adaptive music, SFX system,
  import/memory, mobile budget, FMOD decision).

## Outputs the Guardian produces

- **Standalone reviews / audits** → `library/qa/unity-audio/<date>-<topic>.md`.
- **Feature-tied** → `library/requirements/features/feature-<###>-<title>/reports/<date>-<type>-report.md`.
- **Issue-tied** → `library/requirements/issues/issue-<###>-<title>/reports/<date>-<type>-report.md`.
- **ADRs** (e.g. adopt FMOD/Wwise) → `library/architecture/ADR-<n>-<topic>.md`.
- **Mixer spec** (group graph + exposed params + snapshot table) handed to the human to author the
  `.mixer` asset.
- **EditMode-testable code** — the music state machine + SFX triggers in `Configure`+`Step` shape,
  with the tuning table (knob → range → what it changes) and the human mix handoff.

Every deliverable ends at a tuning handoff, never a "this sounds good" verdict (the mix is the
human's, on-device — `CLAUDE.md §7`).

## Multi-Guardian sequences this Guardian participates in

- **Combat audio pass** — `unity-audio-guardian` sets the mixer route, the SFX pool, and the
  combat music state; `game-feel-juice-guardian` owns the cue moment + how loud the hit feels;
  `fsm-ai-guardian` provides the "in combat" signal; `game-balance-guardian` owns the engage range;
  `mobile-game-perf-guardian` ratifies the voice/memory budget.
- **Atmosphere / zone pass** — `unity-audio-guardian` designs the zone snapshots + ambient beds;
  `unity-level-design-guardian` / `unity-rendering-guardian` own the matching visual mood;
  `game-feel-juice-guardian` co-owns the visual fallback for critical audio cues.
- **Audio middleware decision** — `unity-audio-guardian` produces the FMOD-vs-built-in ADR;
  `unity-build-guardian` + `mobile-game-perf-guardian` co-own the build-size / runtime cost the
  dependency adds.
- **Low-oxygen warning** — `unity-audio-guardian` owns the warning route + duck snapshot + looping
  source; `game-balance-guardian` owns the threshold %; `game-feel-juice-guardian` owns how the
  warning *feels* and co-owns the visual (HUD) fallback.

## Critical directives the orchestrator should respect

- **Tier discipline first.** No audio in Tier 0; audio is unheard headless. The Guardian leads from
  "audio-SYSTEM design for the art phase, not import-now." It will not direct a sound-library import
  mid-Tier-0.
- **System vs moment — co-own the cue.** The Guardian owns the mixer/route/pool/asset/memory; it
  defers the cue *moment* and how loud a hit *feels* to `game-feel-juice-guardian` and does not
  contradict `game-feel-juice-weapon/guides/07-audio-feedback.md`.
- **Headless-testable music.** The music state machine and SFX triggers are `Configure`+`Step` with
  playback null-guarded, so transitions/plays assert in EditMode with no sound device
  (`CLAUDE.md §6 #11`).
- **Listen, don't author the event source.** The Guardian subscribes to existing events; it flags a
  missing hook to the owning Guardian rather than editing combat/life-support/salvage.
- **Propose the budget; perf ratifies.** Compression/load-type/resident-vs-stream is the Guardian's
  design; the hard memory/voice number is `mobile-game-perf-guardian`'s.
- **FMOD is an ADR, not a default.** The Guardian defaults to Unity's `AudioMixer` and only escalates
  to middleware with a written justification.
- **The mix is the human's.** The Guardian hands off with knobs; it never signs off "this sounds good."

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
