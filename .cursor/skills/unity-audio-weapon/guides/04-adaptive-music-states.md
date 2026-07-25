# 04 — Adaptive Music States

The music state machine is the one piece of this Weapon that ships as **code** with the others as
spec — and it is **the** place Hard Rule #11 (`CLAUDE.md §6`) bites: it must be EditMode-testable
on a VM with no sound device. Get the `Configure` + `Step` shape right and the transitions are
verifiable headless.

## The technique: vertical layering (default)

Two industry techniques (named from Winifred Phillips, *A Composer's Guide to Game Music*, for the
human to pull):

- **Vertical layering** (recommended Tier-1 default) — one tempo-locked piece authored in **stems**
  (bed / percussion / lead-tension). States add/remove layers by **fading stem volumes** on the
  mixer. Transitions are instant and seamless — entering combat just lifts the tension stem.
- **Horizontal re-sequencing** — distinct cues crossfaded at boundaries. Bigger mood jumps, but
  audible seams unless you author transition cues. A **should-refactor** if used where layering
  would transition cleaner.

DRIFT's small scope + need for snappy state changes → **vertical layering**. Each state is a
target set of stem volumes; `Step` drives current volumes toward the target.

## The states and their real signals

| State | Entered when | Signal source |
|---|---|---|
| `Exploration` | default on surface / station-calm | `Tier0LoopPhase` (StationHub/PlanetSurface, no combat) |
| `Combat` | an enemy is in chase/attack | `MutatedCrewEnemy` state — coordinate the signal with `fsm-ai-guardian` |
| `Raid` | station assault active | `Tier0RaiderAssault.BeginAssault` → on; `AssaultCompleted` → back to Exploration |

The machine **consumes** these signals; it does **not** author the FSM (that's `fsm-ai-guardian`)
or the loop (that's `Tier0LoopController`). If the FSM doesn't yet expose a clean "in combat"
signal, flag it — don't reach into `MutatedCrewEnemy` to add audio.

## The EditMode-safe shape (Hard Rule #11)

Follow `ARCHITECTURE.md §7` exactly — lazy-init + `Configure(...)` + extracted `Step(...)`:

```csharp
public enum MusicState { Exploration, Combat, Raid }

[Serializable]
public struct MusicSignals
{
    public bool EnemyEngaged;   // from fsm-ai-guardian's signal
    public bool RaidActive;     // from Tier0RaiderAssault
}

public class AdaptiveMusicController : MonoBehaviour
{
    // ... [SerializeField] knobs: fade times, target stem volumes ...
    bool _initialized;

    public MusicState State { get; private set; }

    public void Configure(/* mixer, exposed-param names, knobs */) { EnsureInitialized(); /* inject */ }

    void Awake() => EnsureInitialized();
    void EnsureInitialized() { if (_initialized) return; State = MusicState.Exploration; _initialized = true; }

    // Pure decision — no AudioSource calls here. Returns the NEW state.
    public MusicState Resolve(MusicSignals s) =>
        s.RaidActive ? MusicState.Raid : s.EnemyEngaged ? MusicState.Combat : MusicState.Exploration;

    // Deterministic step: advance state + move stem volumes toward target.
    public void Step(float deltaSeconds, MusicSignals signals)
    {
        EnsureInitialized();
        State = Resolve(signals);
        // compute target stem volumes for State; lerp current -> target by deltaSeconds * fadeSpeed
        // apply to mixer ONLY when a mixer is wired (null-guarded so EditMode tests skip playback)
    }

    void Update() => Step(Time.deltaTime, ReadSignals()); // Update just forwards
}
```

**Why this passes headless:** `Resolve` and the target-volume math are pure C# and assert without
a sound device — a test calls `Configure(...)`, then `Step(dt, {RaidActive=true})` and asserts
`State == Raid`. The mixer apply is **null-guarded** so EditMode (where no mixer/`AudioSource`
runs) skips the playback line entirely. This is the same pattern as `OxygenSystem.Tick` and
`MutatedCrewEnemy.Step` (`ARCHITECTURE.md §7`).

## Knobs to expose

| Knob | Start | Range | Changes |
|---|---|---|---|
| Combat fade-in | `0.4s` | 0.1–1.5 | How fast the tension stem rises on engage |
| Combat fade-out (de-escalate hysteresis) | `2.5s` | 1–6 | Delay before dropping combat after the last enemy disengages (avoids flicker) |
| Raid fade-in | `0.2s` | 0.1–1 | Snappy alarm onset |

The **de-escalation hysteresis** matters: without it, music flickers Combat↔Exploration as an
enemy enters/leaves range each frame. Hold Combat for N seconds after the last engage signal.

## Handoff

The stems, the actual fade *feel*, and "does the combat music land?" are the human's
(`CLAUDE.md §7`). You ship the testable state machine + the knobs. See
`examples/02-adaptive-music-state-machine.md` and `templates/music-state-machine.cs`.
