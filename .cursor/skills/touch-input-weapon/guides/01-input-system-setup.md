# 01 — Input System Setup

The new Input System is already in play. This guide confirms the wiring and sets the rules for using it without re-introducing the legacy backend.

## It's already a dependency

`Assets/Scripts/Drift.Runtime.asmdef:5` references `Unity.InputSystem`, and `Packages/manifest.json` lists `com.unity.inputsystem` (see `ARCHITECTURE.md` §2 packages). You do **not** need to add the package — you need to use it correctly. The current consumers already import `UnityEngine.InputSystem`:

- `TopDownPlayerController.Update` reads `Keyboard.current` directly (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:46`).
- `PlayerMeleeAttack.Update` reads `Keyboard.current` / `Mouse.current` directly (`Assets/Scripts/Drift/Gameplay/Combat/PlayerMeleeAttack.cs:23`).

These direct-device reads are the editor-convenience path. They are fine **as one `IInputSource` implementation**, but they must not stay welded inside gameplay `Update` — see `08-decoupling-input-for-tests.md`.

## The Active Input Handling project setting

The new Input System requires `Active Input Handling` set to **"Input System Package (New)"** or **"Both"** in Project Settings → Player. This VM has no committed `ProjectSettings/` (`AGENTS.md`: Unity regenerates it), so when the project is opened in a real editor, confirm this setting. If it reads "Input Manager (Old)" only, the `.inputactions` asset will not drive anything. Source: Unity Manual — *Input System / Installation & Settings*.

## Two ways to consume an action asset

1. **`PlayerInput` component** — drops on a GameObject, references the action asset, and dispatches via `SendMessage` / `UnityEvent` / C# events. Convenient for prototyping, but its messaging shapes are awkward to unit-test.
2. **Direct asset reference** — generate a C# wrapper class from the `.inputactions` asset (the "Generate C# Class" checkbox) or reference `InputActionAsset` and read `action.ReadValue<Vector2>()` / subscribe to `action.performed`. More explicit, easier to wrap behind `IInputSource`.

**For Drift, prefer the direct asset reference behind an `IInputSource`.** It keeps the device-reading in one swappable place and preserves the test seam. `PlayerInput` is acceptable for the on-screen-control prototype phase but should still feed `IInputSource`, not gameplay directly. Source: Unity Manual — *Input System / Workflows* (`PlayerInput` vs. direct bindings).

## Touchscreen and Enhanced Touch

- `Touchscreen.current` is the device; `Touchscreen.current.primaryTouch` gives position/phase. The On-Screen controls (`OnScreenStick`, `OnScreenButton`) sit on top of this and feed actions — prefer them over raw `Touchscreen` reads (`03`/`05`).
- For multi-touch gestures (`06-gestures.md`), enable the **Enhanced Touch** API: `EnhancedTouchSupport.Enable()`, then read `UnityEngine.InputSystem.EnhancedTouch.Touch.activeTouches`. Enable it once on startup and disable on teardown. Source: Unity Manual — *Input System / Touch* and *EnhancedTouch*.
- In the editor with no touchscreen, the **simulated touchscreen** (`Touchscreen` via the Input Debugger's "Simulate Touch Input From Mouse") lets you exercise on-screen controls with the mouse.

## Hard "do not" list

- **Do not call `UnityEngine.Input.GetAxis` / `Input.GetKey` / `Input.GetMouseButton`.** That's the legacy Input Manager. Mixing backends means some input fires twice or not at all depending on the `Active Input Handling` setting. The new system's equivalents are `Keyboard.current`, `Mouse.current`, `Touchscreen.current`, or — preferably — an action.
- **Do not poll a device inside a gameplay `Update`.** Route it through `IInputSource` (`08`).
- **Do not hardcode a control scheme that assumes a keyboard.** Keyboard is the editor source; touch is the shipping source.

## What "setup" produces

A first-time setup invocation yields:

1. Confirmation that `Unity.InputSystem` is referenced and `Active Input Handling` is correct.
2. A minimal `.inputactions` asset (`templates/input-actions.inputactions.json`, see `02`).
3. The `IInputSource` + `MoveIntent` seam (`templates/iinput-source.cs`, see `08`).
4. One source implementation (keyboard for editor, or the joystick for device) feeding the seam.
5. An EditMode example proving the seam is testable (`examples/03-testable-input-seam.md`).

Stop there for Tier 0. Gestures and tap-to-move are additive sources on the same seam, added one verified slice at a time (`00-principles.md` #7).
