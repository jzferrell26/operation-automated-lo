// Lightweight, zero-dependency tween helper for PROJECT-DRIFT — game-feel-juice-weapon template.
//
// This is the "custom tween" baseline from guides/04-tweening.md — the Tier 0 lean
// over DOTween (zero dependency, trivially EditMode-testable, curve authored in the
// Inspector). Use it for pickup pops, flash fades, knockback ease, small UI nudges.
//
// The library choice (custom vs DOTween) is the HUMAN's call — do NOT add DOTween to
// Packages/manifest.json as a side effect of a juice task (Hard Rule #8). This template
// is the no-dependency option; present DOTween's trade-off and let the human decide.
//
// EditMode-safe per CLAUDE.md §11 / ARCHITECTURE.md §7:
//   - Evaluate(t) is a pure function: deterministic, trivially testable.
//   - Tween is a plain struct driven by an explicit Step(dt); no coroutine required,
//     so it composes with the spine's extracted-Tick pattern.
//
// HUMAN HANDOFF (CLAUDE.md §7): `ease` (an AnimationCurve) and `duration` are the knobs.
// The human authors the curve shape in the Inspector and sets the feel. You wire it.

using UnityEngine;

namespace Drift.Gameplay.Feel
{
    /// <summary>
    /// A one-shot scalar tween. Drive it with Step(dt); read Value. Reusable via Restart.
    /// Caller maps Value (0..1, eased) onto whatever it's animating (scale, color, offset).
    /// </summary>
    public struct Tween
    {
        public float Duration;       // seconds; knob, start 0.18, range 0.08–0.4
        public AnimationCurve Ease;  // knob; default ease-out; null => linear

        float _elapsed;
        bool _running;

        public bool IsRunning => _running;
        public bool IsDone => !_running && _elapsed >= Duration;

        /// <summary>Normalized eased progress in [0,1].</summary>
        public float Value
        {
            get
            {
                var t = Duration <= 0f ? 1f : Mathf.Clamp01(_elapsed / Duration);
                return Evaluate(Ease, t);
            }
        }

        public void Restart()
        {
            _elapsed = 0f;
            _running = Duration > 0f;
        }

        /// <summary>Deterministic step. Returns true on the frame it completes.</summary>
        public bool Step(float deltaSeconds)
        {
            if (!_running) return false;
            _elapsed += deltaSeconds;
            if (_elapsed >= Duration)
            {
                _elapsed = Duration;
                _running = false;
                return true;
            }
            return false;
        }

        /// <summary>Pure, deterministic easing eval — the unit-test seam.</summary>
        public static float Evaluate(AnimationCurve curve, float normalizedTime)
        {
            var t = Mathf.Clamp01(normalizedTime);
            return curve != null && curve.length > 0 ? curve.Evaluate(t) : t; // null curve = linear
        }
    }

    /// <summary>Common easing curves as AnimationCurves, for code that has no Inspector slot.</summary>
    public static class Easing
    {
        public static AnimationCurve Linear() => AnimationCurve.Linear(0, 0, 1, 1);
        public static AnimationCurve EaseInOut() => AnimationCurve.EaseInOut(0, 0, 1, 1);

        /// <summary>Ease-out: fast start, slow settle — the most useful juice default.</summary>
        public static AnimationCurve EaseOut()
        {
            var c = new AnimationCurve(
                new Keyframe(0f, 0f, 0f, 2f),
                new Keyframe(1f, 1f, 0f, 0f));
            return c;
        }

        /// <summary>Overshoot/"pop": passes 1 then settles. Use with restraint on mobile.</summary>
        public static AnimationCurve Overshoot(float peak = 1.12f)
        {
            return new AnimationCurve(
                new Keyframe(0f, 0f),
                new Keyframe(0.7f, peak),
                new Keyframe(1f, 1f));
        }
    }
}
