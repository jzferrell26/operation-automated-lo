# Example 02 — Adaptive Music State Machine (EditMode-testable)

The exploration / combat / raid music machine with `Configure(...)` + extracted `Step(...)`, and
the EditMode tests that verify the transitions **without a sound device** (Hard Rule #11,
`ARCHITECTURE.md §7`). This is the canonical headless-testable-audio pattern.

## The component

```csharp
using System;
using UnityEngine;
using UnityEngine.Audio;

namespace Drift.Gameplay.Audio
{
    public enum MusicState { Exploration, Combat, Raid }

    [Serializable]
    public struct MusicSignals
    {
        public bool EnemyEngaged; // from fsm-ai-guardian's "in combat" signal
        public bool RaidActive;   // from Tier0RaiderAssault.BeginAssault / AssaultCompleted
    }

    public class AdaptiveMusicController : MonoBehaviour
    {
        [SerializeField] AudioMixer mixer;
        [SerializeField] string explorationParam = "MusicExplorationVol";
        [SerializeField] string combatParam = "MusicCombatVol";
        [SerializeField] float combatHoldSeconds = 2.5f; // de-escalation hysteresis

        bool _initialized;
        float _combatHoldRemaining;

        public MusicState State { get; private set; }

        public void Configure(AudioMixer m) { EnsureInitialized(); mixer = m; }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; State = MusicState.Exploration; _initialized = true; }

        // Pure decision (with hysteresis) — fully testable, no audio.
        public MusicState Resolve(MusicSignals s, float deltaSeconds)
        {
            EnsureInitialized();
            if (s.RaidActive) { _combatHoldRemaining = 0f; return MusicState.Raid; }
            if (s.EnemyEngaged) { _combatHoldRemaining = combatHoldSeconds; return MusicState.Combat; }
            if (_combatHoldRemaining > 0f) { _combatHoldRemaining -= deltaSeconds; return MusicState.Combat; }
            return MusicState.Exploration;
        }

        public void Step(float deltaSeconds, MusicSignals signals)
        {
            EnsureInitialized();
            State = Resolve(signals, deltaSeconds);
            ApplyTargets(); // mixer param fades — null-guarded
        }

        void ApplyTargets()
        {
            if (mixer == null) return; // EditMode: no mixer -> skip playback, decision still ran
            mixer.SetFloat(combatParam, State == MusicState.Exploration ? -80f : 0f);
            mixer.SetFloat(explorationParam, State == MusicState.Raid ? -80f : 0f);
        }

        void Update() => Step(Time.deltaTime, ReadSignals());
        MusicSignals ReadSignals() => default; // wired by Configure subscriptions in the real build
    }
}
```

## The EditMode tests (no sound device)

```csharp
using NUnit.Framework;
using UnityEngine;
using Drift.Gameplay.Audio;

public class RuntimeAdaptiveMusicTests
{
    AdaptiveMusicController Make()
    {
        var c = new GameObject().AddComponent<AdaptiveMusicController>();
        c.Configure(null); // null mixer -> ApplyTargets is a no-op, no playback
        return c;
    }

    [Test]
    public void RaidSignal_WinsOverCombat()
    {
        var c = Make();
        c.Step(0.016f, new MusicSignals { EnemyEngaged = true, RaidActive = true });
        Assert.AreEqual(MusicState.Raid, c.State);
    }

    [Test]
    public void Combat_HoldsThroughBriefDisengage_ThenDropsToExploration()
    {
        var c = Make();
        c.Step(0.1f, new MusicSignals { EnemyEngaged = true });
        Assert.AreEqual(MusicState.Combat, c.State);

        // enemy disengages — hysteresis holds combat
        c.Step(0.1f, new MusicSignals { EnemyEngaged = false });
        Assert.AreEqual(MusicState.Combat, c.State);

        // after the hold window elapses, drop to exploration
        c.Step(3.0f, new MusicSignals { EnemyEngaged = false });
        Assert.AreEqual(MusicState.Exploration, c.State);
    }
}
```

## Why it passes headless

`Resolve`/`Step` are pure C# + a null-guarded mixer apply. Unity never runs `Update` on a
script-added component in EditMode, so the tests call `Step` directly — exactly as
`RuntimeOxygenTests` calls `OxygenSystem.Tick`. No `AudioSource`, no `.mixer` asset, no sound
device needed. The hysteresis test proves the anti-flicker logic the human would otherwise have to
discover by ear.
