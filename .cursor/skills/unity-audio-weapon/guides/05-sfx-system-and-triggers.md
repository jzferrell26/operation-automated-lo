# 05 — SFX System & Triggers

The SFX layer is a **pool** of `AudioSource`s + **trigger components** that subscribe to the
real game events and play through the pool. This guide owns the system (pool, voice limits,
import-aware playback); the *cue moment and how loud it feels* is co-owned with
`game-feel-juice-guardian` (`game-feel-juice-weapon/guides/07-audio-feedback.md` — do not
contradict it).

## The real trigger points (audio listens; it does not author these)

All under `Assets/Scripts/Drift/`:

| Event | Hook | Cue character (game-feel owns final feel) |
|---|---|---|
| Melee swing | `PlayerMeleeAttack.TryAttack` | Whoosh |
| Hit lands | `Health.Changed` (damage) | Short punchy impact, pitch-varied |
| Enemy dies | `Health.Died` | Heavier "down" cue |
| Salvage pickup | `SalvageNode` collect | Small positive chime |
| Tool-cache open | cache `RecordToolCacheOpened` | Clunk / unlock |
| Hull breach | `HullBreachEvent.BreachActivated` | Klaxon / depressurize whoosh |
| Breach sealed | `HullBreachEvent.BreachSealed` | Restored tone |
| Low oxygen | `OxygenSystem.Normalized`/`IsDepleted` threshold (the `Depleted` event lives on `OxygenSystem.Meter`, a `SurvivalMeter`) | Rising warning (the signature meter) |

The trigger component **subscribes** in `Configure(...)` (not only `Awake`) and unsubscribes
cleanly. It never modifies the owning system to add an audio call — if a needed hook is missing,
flag the owning Guardian (Principle #4).

## The AudioSource pool

Do **not** `Instantiate` an `AudioSource` per cue. Build a small fixed pool, hand out a free
source per play, recycle on completion:

```csharp
public class SfxPool : MonoBehaviour
{
    [SerializeField] int maxVoices = 8;          // per perf-guardian
    AudioSource[] _sources;
    bool _initialized;

    public void Configure(AudioMixerGroup group, int voices) { /* build sources, route to group */ }

    AudioSource NextFree() { /* round-robin / oldest-steal within maxVoices */ }

    public void Play(AudioClip clip, float volume, float pitchJitter)
    {
        var src = NextFree();
        if (src == null) return;                  // voice budget full -> drop, don't stack
        src.pitch = 1f + Random.Range(-pitchJitter, pitchJitter);
        src.PlayOneShot(clip, volume);
    }
}
```

`maxVoices` is the **voice cap** — when full, **drop** the cue rather than exceed the budget. The
hard number is `mobile-game-perf-guardian`'s ratification (start `8`).

## Must-fix rules

- **No per-frame `PlayOneShot`.** A continuous event (O2 draining, sprint depleting) is a
  **threshold one-shot** or a **single looping source** modulated by volume/pitch — never
  `PlayOneShot` every `Update`. Per-frame spam is a **must-fix**.
- **Debounce multi-hit swings.** A melee hitting N targets in one swing must not fire N identical
  impacts the same frame — play one, or one-per-target with a tiny stagger.
- **Pitch jitter** (`±0.05` start) — identical samples replayed read as machine-gun sameness;
  jitter per play is the cheapest de-robotizer. Rotate variant clips where you have them.

## EditMode-safe trigger (Hard Rule #11)

The trigger's *decision* (event fired → play which cue at what volume) is testable; the
`AudioSource` call is null-guarded so EditMode skips playback:

```csharp
public class HitSfxTrigger : MonoBehaviour
{
    bool _initialized;
    public int PlaysRequested { get; private set; }   // observable for tests

    public void Configure(Health health, SfxPool pool, AudioClip clip) { /* subscribe to health.Changed */ }

    // Pure decision, called by the event handler — testable without sound.
    public void OnDamage(float current, float max)
    {
        EnsureInitialized();
        PlaysRequested++;
        _pool?.Play(_clip, _volume, _pitchJitter);    // null-guarded -> EditMode skips playback
    }
}
```

A test wires a real `Health`, calls `health.TakeDamage(10)`, and asserts `PlaysRequested == 1` —
no sound device needed. See `templates/sfx-trigger.cs`.

## Handoff

The cue clips, their loudness, and "does the hit feel punchy?" belong to
`game-feel-juice-guardian` and ultimately the human. You own the pool, the voice cap, the
subscribe/unsubscribe correctness, and the import-aware playback. Co-own the cue; defer the moment.
