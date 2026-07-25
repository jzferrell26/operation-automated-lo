# 03 — Virtual Joystick

The primary movement control on a portrait phone. It feeds the `Move` action, which feeds `MoveIntent`, which feeds `TopDownPlayerController.ResolveMove`.

## Default to `OnScreenStick`

Unity's Input System ships an **`OnScreenStick`** component (in the On-Screen Controls module). Drop it on a UI `Image` (the stick knob) parented to a background `Image` (the stick base), set its **Control Path** to `<Gamepad>/leftStick` *or* directly to the `Move` action's expected control, and it writes a `Vector2` into the bound action as the user drags. It handles pointer-down capture, drag clamping to the movement range, and release-to-center for free. Source: Unity Manual — *Input System / On-Screen Controls* (`OnScreenStick`).

Because it writes into the action, the `IInputSource` that reads `Move` (`08`) sees joystick and keyboard identically — no branching in gameplay code.

### `OnScreenStick` key fields (defaults you ship, human tunes)

- **Movement Range** — pixels the knob travels before the value saturates to magnitude 1. Ship `~50`; **human to tune**.
- **Behaviour** — `RelativePositionWithStaticOrigin` (fixed base), `ExactPositionWithStaticOrigin`, or `ExactPositionWithDynamicOrigin` (floating/follow stick that spawns where the thumb lands). For a portrait survival game a **floating stick** (dynamic origin) anchored to the bottom-left quadrant is the ergonomic default — the thumb doesn't have to find a fixed pad. Ship dynamic-origin; **human to tune** which behaviour feels right.

## When bespoke joystick code is justified

Write a custom joystick (`templates/virtual-joystick.cs`) only when `OnScreenStick` can't express the feel:

- A **variable dead-zone** with a custom response curve.
- A **follow-stick** with re-centering rules `OnScreenStick`'s dynamic origin doesn't cover.
- A **visual** treatment (knob clamping, base fade) tied to logic.

Even then, the custom joystick must **emit through the seam** — it sets a `Vector2` on the `IInputSource` (or writes the `Move` action via `InputSystem`), never reaches into `TopDownPlayerController` and pokes a field. A bespoke joystick that bypasses `ResolveMove` is a must-fix (`SKILL.md` Hard Rule #2).

## The dead zone is feel — flag it

A dead zone (ignore stick magnitude below a threshold so a resting thumb doesn't drift the character) is **feel**, not architecture. Ship a sensible default as a `[SerializeField] private float deadZone` with a read-only property and the comment `// human to tune (CLAUDE.md §7)`. Do not pick a "correct" dead zone — recommend a starting value (`~0.15`) and hand the call to the human.

## Magnitude matters

`Move` is a `Value`/Vector2 action (`02`). The joystick's *magnitude* should pass through to `ResolveMove` — a half-pushed stick is a half-speed walk. Note `ResolveMove` already normalizes when `input.sqrMagnitude > 1f` (`TopDownPlayerController.cs:92`) but preserves sub-unit magnitudes, so analog movement works for free once the joystick feeds a real `Vector2`. Do **not** snap the joystick to 8 directions unless the design explicitly asks for it (it doesn't — top-down free movement).

## Ergonomic placement

The joystick lives in the **bottom-left** thumb zone of the portrait screen, safe-area aware (`07-portrait-ergonomics.md`). A floating origin within that quadrant is the most reachable. Never place it where it overlaps the HUD inventory panel (`Tier0Hud.DrawInventoryPanel` draws top-left in the current IMGUI gray-box — the shipping touch HUD will reorganize, but the joystick must not collide with critical readouts).

## Worked wiring

`examples/01-virtual-joystick-into-player-controller.md` shows the full chain: `OnScreenStick` → `Move` action → `InputSourceFromActions` reads it into `MoveIntent.Move` → `TopDownPlayerController` (in its `Update`, or in a test) calls `ResolveMove(intent.Move, intent.SprintHeld, dt)`.

## Findings to watch for

- **Joystick writes a normalized 8-way direction** when the design wants analog → loses speed control. Should-refactor.
- **Joystick pokes `TopDownPlayerController` directly** instead of feeding the action/seam → must-fix (bypasses `ResolveMove`, breaks testability).
- **Dead zone hardcoded as a magic number** with no `[SerializeField]` exposure → should-refactor; it's the human's to tune.
- **Fixed-origin pad in a corner the thumb can't comfortably reach** → ergonomics finding; recommend floating origin.
