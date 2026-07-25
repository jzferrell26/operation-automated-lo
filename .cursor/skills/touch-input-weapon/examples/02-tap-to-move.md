# Example 02 — Tap-to-Move

An alternative locomotion source feeding the **same** `MoveIntent` seam as the joystick (example 01). Proof that locomotion logic lives once, in `ResolveMove`, and the input scheme is swappable.

## The chain

```
Tap (Touchscreen primaryTouch / mouse in editor)
        │  on performed: screen point → world point (raycast onto y=0 ground)
        ▼
TapToMoveInputSource holds _moveTarget
        │  each frame: heading = normalize((_moveTarget - playerPos).xz)
        ▼
ReadMoveIntent() → MoveIntent(heading, sprintHeld:false)
        ▼
TopDownPlayerController.ResolveMove(intent.Move, intent.SprintHeld, dt)   ← identical to the joystick path
```

## The source

```csharp
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem;

namespace Drift.Gameplay.Input
{
    public sealed class TapToMoveInputSource : MonoBehaviour, IInputSource
    {
        [SerializeField] Camera worldCamera;
        // FEEL: human to tune (CLAUDE.md §7)
        [SerializeField] float arrivalRadius = 0.25f;

        Vector3 _moveTarget;
        bool _hasTarget;

        public float ArrivalRadius => arrivalRadius;

        void Update()
        {
            // Editor: mouse click; device: primaryTouch tap. Guard against UI taps so a
            // tap on the joystick / an on-screen button doesn't also issue a move order.
            var ptr = Pointer.current;
            if (ptr != null && ptr.press.wasPressedThisFrame &&
                !(EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()))
            {
                if (TryScreenToGround(ptr.position.ReadValue(), out var world))
                {
                    SetTarget(world);
                }
            }
        }

        public void SetTarget(Vector3 worldPoint)
        {
            _moveTarget = worldPoint;
            _hasTarget = true;
        }

        // Pure step: testable without a camera or touchscreen — feed a player position.
        public MoveIntent StepTowardTarget(Vector3 playerPosition)
        {
            if (!_hasTarget) return MoveIntent.None;

            var to = _moveTarget - playerPosition;
            to.y = 0f;
            if (to.sqrMagnitude <= arrivalRadius * arrivalRadius)
            {
                _hasTarget = false;
                return MoveIntent.None;
            }

            var heading = new Vector2(to.x, to.z).normalized; // magnitude 1 = full speed
            return new MoveIntent(heading, sprintHeld: false);
        }

        // IInputSource: the consumer passes its position via a small adapter, or the
        // controller calls StepTowardTarget directly. ReadMoveIntent() returns the last
        // computed intent for the generic seam.
        MoveIntent _last = MoveIntent.None;
        public MoveIntent ReadMoveIntent() => _last;
        public void Tick(Vector3 playerPosition) => _last = StepTowardTarget(playerPosition);

        public bool AttackPressedThisFrame => false;   // tap-to-move handles locomotion only
        public bool InteractPressedThisFrame => false;
        public bool BuildPressedThisFrame => false;

        bool TryScreenToGround(Vector2 screen, out Vector3 world)
        {
            world = default;
            if (worldCamera == null) return false;
            var ray = worldCamera.ScreenPointToRay(screen);
            var ground = new Plane(Vector3.up, Vector3.zero);
            if (ground.Raycast(ray, out var dist)) { world = ray.GetPoint(dist); return true; }
            return false;
        }
    }
}
```

## Why `StepTowardTarget` is split out

`StepTowardTarget(playerPosition)` is a **pure function of position + stored target** — the extracted `Tick`/`Step` pattern (`ARCHITECTURE.md` §7 pattern 3). A test sets a target, calls it with a known player position, and asserts the heading — no camera, no raycast, no touchscreen (see example 03 for the test shape). The `Update`/raycast plumbing is the device path; the logic is testable in isolation.

## Coexistence with the joystick

Tier 0 ships **one** verified locomotion scheme first (`guides/00-principles.md` #7) — normally the joystick (example 01). Add tap-to-move only as a second verified slice if the design asks. If both run, pick a policy (mutually exclusive, or joystick-overrides-tap) and **flag the choice for the human** — it's a feel/design call (guide 04).

## What this Guardian did vs. handed off

- **This Guardian:** the tap detection, screen→world, the `StepTowardTarget` heading, the source on the seam.
- **Handed off:** what `ResolveMove` does with the heading — `unity-csharp-guardian`. Arrival-radius / move-feel tuning — the human. NavMesh/pathfinding around obstacles, if ever needed — that's `fsm-ai-guardian` territory for agents; for the player, coordinate with `unity-csharp-guardian` (Tier 0 uses straight-line steering, no pathfinding).
