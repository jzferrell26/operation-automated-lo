// touch-input-weapon template: iinput-source.cs
// The input abstraction that decouples device reading from gameplay logic.
// Hard Rule #11 (CLAUDE.md §6 / ARCHITECTURE.md §7): gameplay consumes an
// IInputSource, never polls Keyboard/Mouse/Touchscreen in its own Update, so it
// stays EditMode-testable. Every control (joystick, tap-to-move, on-screen
// buttons, keyboard) is just an implementation of this interface.
//
// Place under: Assets/Scripts/Drift/Gameplay/Input/
// Namespace mirrors the Drift spine (ARCHITECTURE.md §2).

using System;
using UnityEngine;

namespace Drift.Gameplay.Input
{
    /// <summary>
    /// A frame's worth of locomotion intent. Maps directly onto
    /// TopDownPlayerController.ResolveMove(Vector2 input, bool sprintHeld, float deltaSeconds):
    /// Move -> input, SprintHeld -> sprintHeld. Analog magnitude is preserved
    /// (a half-pushed stick is a half-speed walk); ResolveMove normalizes only
    /// when magnitude exceeds 1.
    /// </summary>
    public readonly struct MoveIntent
    {
        public readonly Vector2 Move;
        public readonly bool SprintHeld;

        public MoveIntent(Vector2 move, bool sprintHeld)
        {
            Move = move;
            SprintHeld = sprintHeld;
        }

        public static MoveIntent None => new MoveIntent(Vector2.zero, false);
    }

    /// <summary>
    /// The seam. Production sources read the new Input System; the editor source
    /// reads the keyboard; tests inject a FakeInputSource. Consumers receive an
    /// IInputSource via Configure(...) (the Drift DI convention) and sample it
    /// each frame — they never touch a device directly.
    /// </summary>
    public interface IInputSource
    {
        /// <summary>Sampled each frame for movement + sprint.</summary>
        MoveIntent ReadMoveIntent();

        // Action edges — true for exactly the frame the press happens, matching the
        // existing wasPressedThisFrame semantics in PlayerMeleeAttack. Read once per
        // frame. (Held actions like Sprint live in MoveIntent.SprintHeld; Repair, if
        // added, would expose a held bool here.)
        bool AttackPressedThisFrame { get; }
        bool InteractPressedThisFrame { get; }
        bool BuildPressedThisFrame { get; }
    }

    /// <summary>
    /// Test double. Public setters let an EditMode test script the exact intent and
    /// edges, then drive TopDownPlayerController.ResolveMove / PlayerMeleeAttack with
    /// no device, no Update, no scene. See examples/03-testable-input-seam.md.
    /// </summary>
    public sealed class FakeInputSource : IInputSource
    {
        public MoveIntent MoveIntent = MoveIntent.None;
        public bool Attack;
        public bool Interact;
        public bool Build;

        public MoveIntent ReadMoveIntent() => MoveIntent;
        public bool AttackPressedThisFrame => Attack;
        public bool InteractPressedThisFrame => Interact;
        public bool BuildPressedThisFrame => Build;

        /// <summary>Call after each simulated frame to clear one-frame edges.</summary>
        public void ClearEdges()
        {
            Attack = false;
            Interact = false;
            Build = false;
        }
    }
}
