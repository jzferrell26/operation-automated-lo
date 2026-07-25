// Material flash on damage for PROJECT-DRIFT — game-feel-juice-weapon template.
//
// The cheapest, most readable hit feedback on a gray-box (guides/02-hit-feedback-and-hitstop.md).
// Subscribes to Health.Changed (Assets/Scripts/Drift/Core/Combat/Health.cs) and flashes the
// target's MeshRenderer toward a flash color on a DECREASE (damage), then restores.
//
// Uses Drift.Gameplay.Visual.GrayBoxVisuals for the gray-box material; caches the flash
// material at Configure time to avoid allocating a new Material per hit (perf — co-own the
// hard call with mobile-game-perf-guardian; guides/09-restraint-and-perf-budget.md).
//
// EditMode-safe per CLAUDE.md §11 / ARCHITECTURE.md §7:
//   - Configure(...) injects the Health + renderer instead of resolving only in Awake.
//   - EnsureInitialized() lazy-init guards state for both Awake and entry points.
//   - Step(dt) is the extracted restore countdown; Update forwards Time.deltaTime.
//   - A test can Configure, raise a damage event, Step, and assert the flash restored.
//
// HUMAN HANDOFF (CLAUDE.md §7): flashSeconds and flashColor are FIRST-PASS knobs from the
// Vlambeer/Swink hit-feedback stack. Whether it reads/feels right is the human's call —
// tune on a real device (mobile readability, guides/08-mobile-readability.md).

using Drift.Core.Combat;
using Drift.Gameplay.Visual;
using UnityEngine;

namespace Drift.Gameplay.Feel
{
    public class HitFlash : MonoBehaviour
    {
        [Tooltip("How long the struck thing stays lit, seconds.")]
        [SerializeField] float flashSeconds = 0.06f;      // range 0.03–0.12
        [Tooltip("The lit tint. Near-white reads best against the dark gray-box.")]
        [SerializeField] Color flashColor = new Color(1f, 0.95f, 0.9f);

        Health _health;
        MeshRenderer _renderer;
        Material _baseMaterial;
        Material _flashMaterial;     // cached at Configure — no per-hit alloc
        float _flashRemaining;
        float _lastKnownHealth;
        bool _initialized;
        bool _subscribed;

        void Awake()
        {
            // Best-effort self-wire for in-scene use; tests use Configure instead.
            if (_health == null) _health = GetComponentInParent<Health>();
            if (_renderer == null) _renderer = GetComponent<MeshRenderer>();
            Configure(_health, _renderer, flashColor);
        }

        /// <summary>Inject dependencies (EditMode-safe). Safe to call repeatedly.</summary>
        public void Configure(Health health, MeshRenderer meshRenderer, Color? color = null)
        {
            if (color.HasValue) flashColor = color.Value;
            _renderer = meshRenderer != null ? meshRenderer : _renderer;

            if (_renderer != null)
            {
                _baseMaterial = _renderer.sharedMaterial;
                _flashMaterial = GrayBoxVisuals.CreateColorMaterial(flashColor); // cached once
            }

            SetHealth(health);
            EnsureInitialized();
        }

        void SetHealth(Health health)
        {
            if (_subscribed && _health != null) _health.Changed -= OnHealthChanged;
            _health = health;
            if (_health != null)
            {
                _health.Changed += OnHealthChanged;
                _subscribed = true;
                _lastKnownHealth = _health.Current;
            }
        }

        void EnsureInitialized()
        {
            if (_initialized) return;
            _flashRemaining = 0f;
            if (_health != null) _lastKnownHealth = _health.Current;
            _initialized = true;
        }

        void OnHealthChanged(float current, float max)
        {
            EnsureInitialized();
            // Flash only on damage (a decrease), not on heal.
            if (current < _lastKnownHealth) Flash();
            _lastKnownHealth = current;
        }

        public void Flash()
        {
            EnsureInitialized();
            _flashRemaining = flashSeconds;
            if (_renderer != null && _flashMaterial != null)
                _renderer.sharedMaterial = _flashMaterial;
        }

        /// <summary>Extracted restore countdown. Update forwards Time.deltaTime; tests call directly.</summary>
        public void Step(float deltaSeconds)
        {
            EnsureInitialized();
            if (_flashRemaining <= 0f) return;

            _flashRemaining -= deltaSeconds;
            if (_flashRemaining <= 0f)
            {
                _flashRemaining = 0f;
                if (_renderer != null && _baseMaterial != null)
                    _renderer.sharedMaterial = _baseMaterial; // restore
            }
        }

        public bool IsFlashing { get { EnsureInitialized(); return _flashRemaining > 0f; } }

        void Update() => Step(Time.deltaTime);

        void OnDestroy()
        {
            if (_subscribed && _health != null) _health.Changed -= OnHealthChanged;
        }
    }
}
