# Example 01 — Virtual Joystick into TopDownPlayerController

The canonical movement wiring: an on-screen joystick → the `Move` action → an `IInputSource` → `TopDownPlayerController.ResolveMove`. No gameplay code reads a device; swapping joystick for tap-to-move is swapping a source.

## The chain

```
OnScreenStick (UI)  ──writes──►  Move action (.inputactions)
                                      │ ReadValue<Vector2>()
                                      ▼
                          InputSourceFromActions : IInputSource
                                      │ ReadMoveIntent()  →  MoveIntent(Move, SprintHeld)
                                      ▼
                      TopDownPlayerController.Update  →  ResolveMove(intent.Move, intent.SprintHeld, dt)
                                      ▼
                              CharacterController.Move(...)
```

## Step 1 — the action asset

Use `templates/input-actions.inputactions.json`. The `Move` action is `Value`/Vector2 with a keyboard composite (editor) and is the action the on-screen stick writes to on device.

## Step 2 — the on-screen stick

Add a `UI > Canvas`, parent a base `Image` and a knob `Image`, and add Unity's **`OnScreenStick`** to the knob (guide 03). Set its **Control Path** to the `Move` action's binding and **Behaviour** to dynamic-origin (floating). Anchor the base in the bottom-left thumb zone, safe-area aware (guide 07). Movement range and dead zone are **human to tune** (`CLAUDE.md` §7) — ship defaults.

(If `OnScreenStick`'s feel is insufficient, swap in `templates/virtual-joystick.cs` and have the source read `VirtualJoystick.CurrentValue` instead of the action — same seam.)

## Step 3 — the production input source

```csharp
using UnityEngine;
using UnityEngine.InputSystem;

namespace Drift.Gameplay.Input
{
    public sealed class InputSourceFromActions : MonoBehaviour, IInputSource
    {
        [SerializeField] InputActionAsset asset;

        InputAction _move, _sprint, _attack, _interact, _build;
        bool _enabled;

        void Awake() => EnsureEnabled();
        void OnEnable() => EnsureEnabled();
        void OnDisable() => asset?.FindActionMap("Player")?.Disable();

        void EnsureEnabled()
        {
            if (_enabled || asset == null) return;
            var map = asset.FindActionMap("Player", throwIfNotFound: true);
            _move = map.FindAction("Move");
            _sprint = map.FindAction("Sprint");
            _attack = map.FindAction("Attack");
            _interact = map.FindAction("Interact");
            _build = map.FindAction("Build");
            map.Enable();
            _enabled = true;
        }

        public MoveIntent ReadMoveIntent()
        {
            EnsureEnabled();
            var move = _move?.ReadValue<Vector2>() ?? Vector2.zero;
            var sprint = _sprint != null && _sprint.IsPressed();
            return new MoveIntent(move, sprint);
        }

        public bool AttackPressedThisFrame => _attack != null && _attack.WasPressedThisFrame();
        public bool InteractPressedThisFrame => _interact != null && _interact.WasPressedThisFrame();
        public bool BuildPressedThisFrame => _build != null && _build.WasPressedThisFrame();
    }
}
```

Note the **lazy-init `EnsureEnabled()`** (called from `Awake` *and* every read) — `ARCHITECTURE.md` §7 pattern 1, so the source survives EditMode where `Awake` may not run.

## Step 4 — the controller consumes the source

`TopDownPlayerController` gets a `Configure(IInputSource)` seam and forwards in `Update`. `ResolveMove` is **unchanged** (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:88`); the source sits in front of it:

```csharp
IInputSource _input;
public void Configure(IInputSource input) => _input = input;

void Update()
{
    var intent = (_input ?? _keyboardFallback).ReadMoveIntent();
    var move = ResolveMove(intent.Move, intent.SprintHeld, Time.deltaTime);
    EnsureDependencies();
    _controller?.Move(move);
}
```

The current `Update`'s inline `Keyboard.current` block (`TopDownPlayerController.cs:44-81`) becomes one `IInputSource` implementation (`KeyboardInputSource`) used as the editor fallback — the keyboard logic isn't lost, it's relocated behind the seam.

## Wiring in the spawner

The Tier0 spawner (`ARCHITECTURE.md` §4, the canonical wiring diagram) adds `InputSourceFromActions` and calls `playerController.Configure(inputSource)` — the same explicit `Configure` wiring the rest of the spine uses, so it works in code, editor, and tests identically.

## What this Guardian did vs. handed off

- **This Guardian:** the action asset, the on-screen stick, `InputSourceFromActions`, the `Configure` seam on the controller. The joystick *registers* movement.
- **Handed off:** `ResolveMove`'s internals (suit power, speed) — `unity-csharp-guardian`. Joystick knob juice / look-ahead camera — `game-feel-juice-guardian`. Final dead-zone/range tuning — the human (`CLAUDE.md` §7). The EditMode suite — `unity-test-ci-guardian` (example 03 ships the pattern).
