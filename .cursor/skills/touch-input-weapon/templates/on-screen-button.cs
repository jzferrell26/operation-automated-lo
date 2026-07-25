// touch-input-weapon template: on-screen-button.cs
// An on-screen action button (Attack / Interact / Build) that emits an EDGE.
// PREFER UnityEngine.InputSystem.OnScreen.OnScreenButton when you just need to
// drive an action by control path (guide 05). Use this when you want a plain UI
// Button that raises a one-frame edge directly into an IInputSource implementation,
// without binding through a control path.
//
// EMIT, DON'T ANIMATE (guide 09): this raises the press; the visual depress,
// highlight, and haptic belong to game-feel-juice-guardian. Hook OnPressed for feel.
//
// Place under: Assets/Scripts/Drift/Gameplay/Input/
// Anchor in the bottom-right thumb zone, sized for a thumb (guide 07).

using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace Drift.Gameplay.Input
{
    /// <summary>
    /// Raises OnPressed once per pointer-down. An input source latches this into a
    /// one-frame edge (e.g. AttackPressedThisFrame), matching the wasPressedThisFrame
    /// semantics PlayerMeleeAttack expects. game-feel-juice-guardian may also
    /// subscribe OnPressed/OnReleased for button feel — input emits, feel responds.
    /// </summary>
    public sealed class OnScreenActionButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
    {
        public enum DriftAction { Attack, Interact, Build }

        [SerializeField] DriftAction action = DriftAction.Attack;

        /// <summary>Raised on pointer-down. The input source latches it to an edge.</summary>
        public event Action<DriftAction> OnPressed;

        /// <summary>Raised on pointer-up. For feel/visual release only.</summary>
        public event Action<DriftAction> OnReleased;

        public DriftAction Action => action;

        public void OnPointerDown(PointerEventData eventData) => OnPressed?.Invoke(action);

        public void OnPointerUp(PointerEventData eventData) => OnReleased?.Invoke(action);
    }
}
