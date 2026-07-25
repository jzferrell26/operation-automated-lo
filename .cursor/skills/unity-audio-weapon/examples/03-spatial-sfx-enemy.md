# Example 03 — Spatial SFX for an Enemy

A spatial SFX setup for `MutatedCrewEnemy` (`Assets/Scripts/Drift/Gameplay/AI/MutatedCrewEnemy.cs`):
light 3D so you hear it to your left, custom rolloff so it stays audible across the small top-down
play area, force-to-mono import, and a pooled source. The cue *moment* (attack lands) is
co-owned with `game-feel-juice-guardian`; this example owns the *spatial route and pool*.

> **VERIFY in editor** the rolloff min/max defaults; tune the curve to the actual play-area size.

## Import settings for the enemy cues

Per `06-audio-import-and-memory.md`, the enemy attack/death cues:

- **Force To Mono** — required for 3D spatialization (stereo wastes memory + spatializes oddly).
- **ADPCM** or Vorbis-low — short, frequent.
- **Decompress On Load** — small clips, played often, no decode hitch.
- **22 050 Hz** — nobody hears the difference on an impact at this scale.

## The AudioSource config (3D)

```
AudioSource (on the enemy, or a pooled 3D source positioned at the enemy):
  spatialBlend   = 0.7    // light 3D — panned/attenuated, but not lost off-screen
  rolloffMode    = Custom // AnimationCurve: flat to minDistance, gentle drop after
  minDistance    = 6      // generous: the whole top-down play area is "near"
  maxDistance    = 25
  dopplerLevel   = 0      // no fly-bys in a top-down survival game
  spread         = 40     // a little width so it isn't a pin-point
  outputAudioMixerGroup = SFX
```

## The trigger (subscribes to existing events; EditMode-safe)

The enemy attack already routes damage through `Health.TakeDamage` → `Health.Changed`. The audio
trigger subscribes there — it does **not** modify `MutatedCrewEnemy`. The death cue subscribes to
`Health.Died`.

```csharp
using UnityEngine;
using Drift.Core.Combat;

namespace Drift.Gameplay.Audio
{
    public class EnemySfxTrigger : MonoBehaviour
    {
        [SerializeField] AudioClip attackClip, deathClip;
        [SerializeField] float volume = 0.8f, pitchJitter = 0.05f;

        bool _initialized;
        Health _health;
        SfxPool _pool;

        public int AttackPlays { get; private set; } // observable for tests
        public int DeathPlays { get; private set; }

        public void Configure(Health health, SfxPool pool)
        {
            EnsureInitialized();
            Unsubscribe();
            _health = health; _pool = pool;
            if (_health != null) { _health.Changed += OnHurt; _health.Died += OnDied; }
        }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; _initialized = true; }

        void OnHurt(float cur, float max) { AttackPlays++; _pool?.Play(attackClip, volume, pitchJitter); }
        void OnDied() { DeathPlays++; _pool?.Play(deathClip, volume, pitchJitter); }

        void Unsubscribe() { if (_health != null) { _health.Changed -= OnHurt; _health.Died -= OnDied; } }
        void OnDestroy() => Unsubscribe();
    }
}
```

## The EditMode test (no sound device)

```csharp
[Test]
public void EnemyHit_RequestsAttackCue_WithoutPlayback()
{
    var enemy = new GameObject();
    var health = enemy.AddComponent<Health>();
    var trigger = enemy.AddComponent<EnemySfxTrigger>();
    trigger.Configure(health, null); // null pool -> no playback, decision still runs

    health.TakeDamage(10f); // fires Health.Changed

    Assert.AreEqual(1, trigger.AttackPlays);
}
```

The cue *decision* is asserted via `AttackPlays`; the pool is null so nothing plays. The
spatial config (mono, light-3D, custom rolloff) is data the human applies in-editor; the human and
`game-feel-juice-guardian` finalize how the enemy *sounds* on-device.
