// touch-input-weapon template: virtual-joystick.cs
// A bespoke virtual joystick for cases OnScreenStick can't express (variable
// dead-zone, custom follow behaviour). PREFER UnityEngine.InputSystem.OnScreen.
// OnScreenStick when it suffices (guide 03) — that writes straight into the Move
// action and needs no custom code. Use this only when you need the extra control,
// and even then it EMITS THROUGH THE SEAM (sets MoveIntent on an IInputSource),
// never pokes TopDownPlayerController directly (Hard Rule #2).
//
// Place under: Assets/Scripts/Drift/Gameplay/Input/
// Drag the knob + base RectTransforms in the inspector; anchor the base in the
// bottom-left thumb zone, safe-area aware (guide 07).

using UnityEngine;
using UnityEngine.EventSystems;

namespace Drift.Gameplay.Input
{
    /// <summary>
    /// Reports the current stick value as a Vector2 (magnitude 0..1). A movement
    /// IInputSource reads CurrentValue into MoveIntent.Move. Feel constants are
    /// [SerializeField] private and flagged "human to tune" (CLAUDE.md §7) — ship
    /// defaults, do not declare them correct.
    /// </summary>
    public sealed class VirtualJoystick : MonoBehaviour, IDragHandler, IPointerDownHandler, IPointerUpHandler
    {
        [SerializeField] RectTransform background; // the stick base
        [SerializeField] RectTransform knob;       // the draggable knob

        // --- FEEL: human to tune (CLAUDE.md §7) ---
        [SerializeField] float movementRange = 50f; // px before value saturates to 1
        [SerializeField, Range(0f, 0.5f)] float deadZone = 0.15f; // resting-thumb drift guard
        // ------------------------------------------

        Vector2 _value;
        bool _initialized;

        /// <summary>Stick value, magnitude 0..1, dead-zone applied. Read by the input source.</summary>
        public Vector2 CurrentValue => _value;

        /// <summary>Exposed read-only tunables for any UI/feel layer that needs them.</summary>
        public float MovementRange => movementRange;
        public float DeadZone => deadZone;

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized)
            {
                return;
            }

            _value = Vector2.zero;
            _initialized = true;
        }

        public void OnPointerDown(PointerEventData eventData) => OnDrag(eventData);

        public void OnDrag(PointerEventData eventData)
        {
            EnsureInitialized();
            if (background == null)
            {
                return;
            }

            // Pointer position relative to the base, normalized to the movement range.
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                background, eventData.position, eventData.pressEventCamera, out var local);

            var raw = local / Mathf.Max(1f, movementRange);
            _value = ApplyDeadZone(Vector2.ClampMagnitude(raw, 1f));

            if (knob != null)
            {
                knob.anchoredPosition = _value * movementRange;
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            _value = Vector2.zero;
            if (knob != null)
            {
                knob.anchoredPosition = Vector2.zero;
            }
        }

        Vector2 ApplyDeadZone(Vector2 v)
        {
            var m = v.magnitude;
            if (m < deadZone)
            {
                return Vector2.zero;
            }

            // Rescale so the value ramps from 0 at the dead-zone edge to 1 at full push.
            var scaled = (m - deadZone) / (1f - deadZone);
            return v.normalized * Mathf.Clamp01(scaled);
        }
    }
}
