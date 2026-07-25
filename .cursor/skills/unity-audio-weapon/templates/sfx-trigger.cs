// Template — Pooled SFX Trigger for PROJECT-DRIFT.
//
// Subscribes to an EXISTING game event and plays a cue through a pooled AudioSource. Audio
// LISTENS to events (Health/melee/breach/raid/salvage/oxygen); it never modifies the owning
// system to fire a cue (Principle #4). If a needed hook is missing, flag the owning Guardian.
//
// EditMode-safe per CLAUDE.md §6 #11 / ARCHITECTURE.md §7:
//   - lazy-init, explicit Configure(...) (subscribe here, not only in Awake), and an observable
//     decision (PlaysRequested) so the trigger is testable WITHOUT a sound device. The pool is
//     null-guarded so EditMode skips playback.
//
// You own the SYSTEM (pool, voice cap, route, import-aware playback). game-feel-juice-guardian
// owns the cue MOMENT and how loud/punchy it feels — do not re-specify that here
// (see game-feel-juice-weapon/guides/07-audio-feedback.md). Place under
// Assets/Scripts/Drift/Gameplay/Audio/ per unity-csharp-guardian's conventions.

using UnityEngine;
using UnityEngine.Audio;
using Drift.Core.Combat; // Health (Changed/Died) — the real trigger source

namespace Drift.Gameplay.Audio
{
    // --- A tiny fixed AudioSource pool with a hard voice cap. ---
    public class SfxPool : MonoBehaviour
    {
        [SerializeField, Range(1, 32)] int maxVoices = 8; // hard cap; mobile-game-perf ratifies
        AudioSource[] _sources;
        int _next;
        bool _initialized;

        public void Configure(AudioMixerGroup group, int voices)
        {
            EnsureInitialized();
            maxVoices = Mathf.Max(1, voices);
            BuildSources(group);
        }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; _initialized = true; }

        void BuildSources(AudioMixerGroup group)
        {
            _sources = new AudioSource[maxVoices];
            for (int i = 0; i < maxVoices; i++)
            {
                var src = gameObject.AddComponent<AudioSource>();
                src.playOnAwake = false;
                src.outputAudioMixerGroup = group;
                _sources[i] = src;
            }
        }

        // Round-robin; if the chosen voice is busy and all are busy, the cue is DROPPED
        // (never exceed the voice budget — Principle #6).
        public void Play(AudioClip clip, float volume, float pitchJitter)
        {
            if (clip == null || _sources == null) return; // EditMode / unwired -> no playback
            var src = _sources[_next];
            _next = (_next + 1) % _sources.Length;
            if (src.isPlaying) return; // budget pressure -> drop, don't stack
            src.pitch = 1f + Random.Range(-pitchJitter, pitchJitter);
            src.PlayOneShot(clip, volume);
        }
    }

    // --- Example trigger: plays a hit cue on Health.Changed (damage). ---
    public class HitSfxTrigger : MonoBehaviour
    {
        [SerializeField] AudioClip hitClip;
        [SerializeField, Range(0f, 1f)] float volume = 0.8f;
        [SerializeField, Range(0f, 0.1f)] float pitchJitter = 0.05f;

        bool _initialized;
        Health _health;
        SfxPool _pool;

        public int PlaysRequested { get; private set; } // observable for EditMode tests

        public void Configure(Health health, SfxPool pool)
        {
            EnsureInitialized();
            Unsubscribe();
            _health = health;
            _pool = pool;
            if (_health != null) _health.Changed += OnDamage;
        }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; _initialized = true; }

        // Pure decision — testable without a sound device.
        void OnDamage(float current, float max)
        {
            EnsureInitialized();
            PlaysRequested++;
            _pool?.Play(hitClip, volume, pitchJitter); // null-guarded -> EditMode skips playback
        }

        void Unsubscribe() { if (_health != null) _health.Changed -= OnDamage; }
        void OnDestroy() => Unsubscribe();
    }
}
