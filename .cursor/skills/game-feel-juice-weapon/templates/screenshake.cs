// Trauma-based screenshake for PROJECT-DRIFT — game-feel-juice-weapon template.
//
// Implements Squirrel Eiserloh's trauma model: a [0,1] trauma value that decays,
// with shake magnitude proportional to trauma^2 (or ^3), sampled via Perlin noise,
// and a hard magnitude cap (mobile-considerate). See guides/03-screenshake.md.
//
// Designed to COMPOSE with TopDownFollowCamera, not fight it: the camera computes
// its damped/look-ahead position, then ADDS `CurrentOffset` on top each LateUpdate
// (guides/06-camera-feel.md). This component owns only trauma -> offset.
//
// EditMode-safe per CLAUDE.md §11 / ARCHITECTURE.md §7:
//   - AddTrauma(...) is a public entry point (lazy-init guarded).
//   - Step(dt) is an extracted deterministic tick (Update just forwards Time.deltaTime).
//   - A test can call AddTrauma + Step and assert the offset decays and stays capped.
//
// HUMAN HANDOFF (CLAUDE.md §7): these [SerializeField] values are FIRST-PASS starting
// points grounded in the Eiserloh model. The feel call is the human's — tune on device.
// The hard perf/nausea cap is co-owned with mobile-game-perf-guardian.

using UnityEngine;

namespace Drift.Gameplay.CameraRig
{
    public class CameraShake : MonoBehaviour
    {
        [Header("Magnitude caps (mobile-considerate — tune on device)")]
        [Tooltip("Max positional shake in world units. DRIFT ortho size ~11; keep small.")]
        [SerializeField] float maxShake = 0.5f;          // range 0.2–1.0
        [Tooltip("Max rotational roll in degrees, on top of the top-down view.")]
        [SerializeField] float maxAngle = 2f;            // range 0–5

        [Header("Trauma model")]
        [Tooltip("How fast trauma decays back to zero, per second.")]
        [SerializeField] float traumaDecayPerSecond = 1.2f; // range 0.8–2.0
        [Tooltip("Perlin sampling frequency. Too high = buzz, too low = wobble.")]
        [SerializeField] float frequency = 20f;          // range 12–30
        [Tooltip("trauma^exponent. 2 = standard Eiserloh falloff; 3 = even softer small shakes.")]
        [SerializeField] float traumaExponent = 2f;      // range 2–3

        float _trauma;          // [0,1]
        float _noiseTime;       // advances with Step; seedable for deterministic tests
        bool _initialized;

        // The offset the camera adds on top of its damped follow position.
        public Vector3 CurrentOffset { get; private set; }
        public float CurrentRoll { get; private set; }
        public float Trauma { get { EnsureInitialized(); return _trauma; } }

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized) return;
            _trauma = 0f;
            _noiseTime = 0f;
            CurrentOffset = Vector3.zero;
            CurrentRoll = 0f;
            _initialized = true;
        }

        /// <summary>Add trauma from an event. Light hit ~0.25, heavy event ~0.7.</summary>
        public void AddTrauma(float amount)
        {
            EnsureInitialized();
            _trauma = Mathf.Clamp01(_trauma + Mathf.Max(0f, amount));
        }

        /// <summary>
        /// Deterministic per-frame step. Decays trauma and recomputes the offset.
        /// Update forwards Time.deltaTime; tests call this directly with a fixed dt.
        /// </summary>
        public void Step(float deltaSeconds)
        {
            EnsureInitialized();

            _trauma = Mathf.Max(0f, _trauma - traumaDecayPerSecond * deltaSeconds);
            _noiseTime += deltaSeconds * frequency;

            // shake = maxShake * trauma^exponent
            var shake = Mathf.Pow(_trauma, traumaExponent);

            // Perlin per-axis with distinct offsets so axes don't correlate.
            var nx = Mathf.PerlinNoise(0.0f, _noiseTime) * 2f - 1f;
            var nz = Mathf.PerlinNoise(7.3f, _noiseTime) * 2f - 1f;
            var nr = Mathf.PerlinNoise(13.1f, _noiseTime) * 2f - 1f;

            CurrentOffset = new Vector3(maxShake * shake * nx, 0f, maxShake * shake * nz);
            CurrentRoll = maxAngle * shake * nr;
        }

        void LateUpdate()
        {
            // Note: if the camera reads CurrentOffset in its own LateUpdate, ensure
            // ordering (or have the camera call Step itself). Kept here for the
            // standalone case; remove if the camera drives Step.
            Step(Time.deltaTime);
        }

        /// <summary>Test seam: pin the noise phase for deterministic assertions.</summary>
        public void SetNoiseTimeForTest(float t) { EnsureInitialized(); _noiseTime = t; }
    }
}
