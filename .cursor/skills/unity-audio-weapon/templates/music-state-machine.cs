// Template — Adaptive Music State Machine for PROJECT-DRIFT.
//
// EditMode-safe per CLAUDE.md §6 #11 / ARCHITECTURE.md §7:
//   - lazy-init via EnsureInitialized() (Unity does not run Awake/Update on script-added
//     components in EditMode),
//   - explicit Configure(...) to inject dependencies (not resolved only in Awake/Start),
//   - an extracted Step(deltaSeconds, signals) so transitions are deterministic and testable
//     WITHOUT a sound device (Update just forwards Time.deltaTime).
//
// You own the SYSTEM (mixer route, state logic). game-feel-juice-guardian owns the cue MOMENT
// and how loud it feels; game-balance-guardian owns thresholds; fsm-ai-guardian owns the
// "in combat" signal this consumes. Place under Assets/Scripts/Drift/Gameplay/Audio/
// (namespace Drift.Gameplay.Audio) per unity-csharp-guardian's conventions.

using System;
using UnityEngine;
using UnityEngine.Audio;

namespace Drift.Gameplay.Audio
{
    public enum MusicState { Exploration, Combat, Raid }

    [Serializable]
    public struct MusicSignals
    {
        public bool EnemyEngaged; // from fsm-ai-guardian's combat signal
        public bool RaidActive;   // true after Tier0RaiderAssault.BeginAssault() / HasStarted; cleared on the AssaultCompleted event
    }

    public class AdaptiveMusicController : MonoBehaviour
    {
        [Header("Mixer (assigned in-editor; null in EditMode tests)")]
        [SerializeField] AudioMixer mixer;
        [SerializeField] string explorationParam = "MusicExplorationVol";
        [SerializeField] string combatParam = "MusicCombatVol";
        [SerializeField] string raidParam = "MusicRaidVol";

        [Header("Knobs (human tunes these)")]
        [SerializeField, Range(0.1f, 1.5f)] float combatFadeIn = 0.4f;
        [SerializeField, Range(0.1f, 1f)] float raidFadeIn = 0.2f;
        [SerializeField, Range(1f, 6f)] float combatHoldSeconds = 2.5f; // de-escalation hysteresis
        [SerializeField] float silenceDb = -80f;                         // VERIFY in editor

        bool _initialized;
        float _combatHoldRemaining;

        public MusicState State { get; private set; }

        // --- Configure: inject the mixer (call from the spawner / scene wiring) ---
        public void Configure(AudioMixer audioMixer)
        {
            EnsureInitialized();
            mixer = audioMixer;
        }

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized) return;
            State = MusicState.Exploration;
            _combatHoldRemaining = 0f;
            _initialized = true;
        }

        // --- Pure decision with hysteresis. Fully testable, no audio. ---
        public MusicState Resolve(MusicSignals s, float deltaSeconds)
        {
            EnsureInitialized();
            if (s.RaidActive) { _combatHoldRemaining = 0f; return MusicState.Raid; }
            if (s.EnemyEngaged) { _combatHoldRemaining = combatHoldSeconds; return MusicState.Combat; }
            if (_combatHoldRemaining > 0f)
            {
                _combatHoldRemaining = Mathf.Max(0f, _combatHoldRemaining - deltaSeconds);
                return MusicState.Combat; // hold through brief disengage to avoid flicker
            }
            return MusicState.Exploration;
        }

        // --- Extracted deterministic step (Update forwards Time.deltaTime). ---
        public void Step(float deltaSeconds, MusicSignals signals)
        {
            EnsureInitialized();
            State = Resolve(signals, deltaSeconds);
            ApplyTargets();
        }

        void ApplyTargets()
        {
            if (mixer == null) return; // EditMode: no mixer -> skip playback; decision already ran
            mixer.SetFloat(explorationParam, State == MusicState.Exploration ? 0f : silenceDb);
            mixer.SetFloat(combatParam, State == MusicState.Combat ? 0f : silenceDb);
            mixer.SetFloat(raidParam, State == MusicState.Raid ? 0f : silenceDb);
        }

        void Update() => Step(Time.deltaTime, ReadSignals());

        // Wire real signals in Configure (subscribe to the FSM combat flag + raid events).
        // Default keeps the component inert until wired.
        MusicSignals ReadSignals() => default;
    }
}
