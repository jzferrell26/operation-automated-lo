# Example 01 — AudioMixer with Zone Snapshots

A worked `AudioMixer` design with Station / Descent / Surface / Raid snapshots and the runtime
wiring that transitions between them on zone change. The `.mixer` asset is authored in-editor (you
can't create it headless); this example specifies it and shows the runtime code.

> **VERIFY in editor** the silence floor dB and snapshot-transition curve.

## The mixer asset (hand to the human to author)

```
DriftMixer.mixer
  Master
  ├── Music     [exposed: MusicVol]
  ├── SFX       [exposed: SfxVol]
  ├── Ambient   [exposed: AmbientVol]
  ├── UI        [exposed: UiVol]
  └── Warning   [exposed: WarningVol]   // low-O2 / breach route, normally silent

  Snapshots:
    Station   : Ambient 0dB, Music -6dB, Warning -80dB
    Descent   : Ambient -3dB, Music -2dB (tension), Warning -80dB
    Surface   : Ambient -6dB (sparse), Music -8dB (exploration), Warning -80dB
    Raid      : Ambient -12dB (ducked), Music 0dB (combat), Warning -2dB
    LowOxygen : Ambient -9dB (ducked), Music -4dB, Warning -6dB   // partial-blend target
```

## The runtime driver (EditMode-safe)

Subscribes to the loop phase + zone boundary; transitions snapshots. The *decision* (phase →
snapshot) is testable; the `TransitionTo` is null-guarded.

```csharp
using UnityEngine;
using UnityEngine.Audio;
using Drift.Gameplay.Bootstrap; // Tier0LoopController / Tier0LoopPhase

namespace Drift.Gameplay.Audio
{
    public class ZoneSnapshotDriver : MonoBehaviour
    {
        [SerializeField] AudioMixerSnapshot station, descent, surface, raid;
        [SerializeField] float defaultTransition = 1.0f;
        [SerializeField] float raidTransition = 0.25f; // snappy alarm

        bool _initialized;
        public string CurrentSnapshotName { get; private set; } // observable for tests

        public void Configure(Tier0LoopController loop /*, snapshots */)
        {
            EnsureInitialized();
            // loop.PhaseChanged += OnPhaseChanged;  // subscribe in Configure, not only Awake
        }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; CurrentSnapshotName = "Station"; _initialized = true; }

        // Pure decision — returns (snapshot, time). Testable without sound.
        public (string name, float time) Resolve(Tier0LoopPhase phase) => phase switch
        {
            Tier0LoopPhase.PlanetSurface => ("Surface", defaultTransition),
            Tier0LoopPhase.RaidActive    => ("Raid", raidTransition),
            _                            => ("Station", defaultTransition),
        };

        public void Apply(Tier0LoopPhase phase)
        {
            EnsureInitialized();
            var (name, time) = Resolve(phase);
            CurrentSnapshotName = name;
            SnapshotFor(name)?.TransitionTo(time); // null-guarded -> EditMode skips playback
        }

        AudioMixerSnapshot SnapshotFor(string name) => name switch
        {
            "Surface" => surface, "Raid" => raid, _ => station,
        };
    }
}
```

## The EditMode test (no sound device)

```csharp
[Test]
public void RaidPhase_SelectsRaidSnapshot_WithSnappyTransition()
{
    var go = new GameObject();
    var driver = go.AddComponent<ZoneSnapshotDriver>();
    driver.Configure(/* loop */ null);

    var (name, time) = driver.Resolve(Tier0LoopPhase.RaidActive);

    Assert.AreEqual("Raid", name);
    Assert.Less(time, 0.5f);                 // alarm is snappy
    driver.Apply(Tier0LoopPhase.RaidActive); // null snapshots -> no playback, no throw
    Assert.AreEqual("Raid", driver.CurrentSnapshotName);
}
```

`Resolve` asserts the mapping; `Apply` runs the null-guarded path without a mixer. This is exactly
the `Configure` + extracted-step shape `ARCHITECTURE.md §7` requires.
