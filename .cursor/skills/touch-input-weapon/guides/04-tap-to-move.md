# 04 — Tap-to-Move

An alternative locomotion scheme: tap a point on the ground, the drifter walks there. It is **another `IInputSource`** feeding the same `MoveIntent` seam — not a parallel movement system.

## Why it's a source, not a system

The whole point of the `IInputSource` seam (`08`) is that locomotion logic lives once, in `TopDownPlayerController.ResolveMove`. Tap-to-move does **not** add a second mover. It computes a per-frame `Vector2` heading toward the tapped world point and emits it as `MoveIntent.Move`, exactly like the joystick. Swapping joystick ↔ tap-to-move is swapping the source behind the seam, with zero gameplay-code change. That is the test of whether you've built it right.

## The pipeline

1. **Detect the tap.** A `Button` action (`Tap`) bound to `<Touchscreen>/primaryTouch/tap` (or pointer click in editor). On `performed`, read the screen position from `Pointer.current.position` / `Touchscreen.current.primaryTouch.position`.
2. **Screen → world.** Convert the screen point to a world point. For a top-down game, raycast from the camera onto the ground plane (`Plane` at `y = 0`, or `Physics.Raycast` against a ground collider) and take the hit point. Guard against taps that hit UI — use the EventSystem's `IsPointerOverGameObject()` so a tap on the joystick or an on-screen button doesn't also issue a move order.
3. **Store the target.** Keep `Vector3 _moveTarget` and a `bool _hasTarget`.
4. **Per-frame heading.** While `_hasTarget`, each frame compute `to = _moveTarget - playerPos`, flatten to the XZ plane, and emit `MoveIntent.Move = normalize(to.xz)` (magnitude 1 = full speed; optionally ease near arrival). Clear `_hasTarget` when within an arrival radius (this radius is **feel** — `[SerializeField] private`, human to tune).

The emitted `Vector2` flows into `ResolveMove` identically to a joystick push. `ResolveMove` already handles normalization and suit-power sprint, so tap-to-move inherits sprint/suit behavior for free if the source also sets `SprintHeld` (usually `false` for tap-to-move).

## Editor vs device

In the editor, bind the tap to mouse click so the scheme is exercisable without a touchscreen (or use the simulated touchscreen, `01`). On device it's `primaryTouch`. Same action, two bindings — the source doesn't care which fired.

## Coexistence with the joystick

Two patterns, choose per design (and flag it for the human):

- **Mode A — mutually exclusive.** A setting picks joystick *or* tap-to-move; only that source is active. Cleanest.
- **Mode B — joystick overrides tap.** If the joystick magnitude is non-zero this frame, it wins and any tap target is cleared. Lets a player "drive" but also "tap to go."

Tier 0 should ship **one** locomotion scheme verified end-to-end first (`00-principles.md` #7) — almost certainly the joystick — and add tap-to-move as a second verified slice only if the design calls for it. Do not build both at once unverified.

## Testability

Because tap-to-move emits a `MoveIntent`, a test can bypass the raycast entirely: construct the source with a known `_moveTarget`, call its `Tick(playerPos, dt)`, assert the emitted `MoveIntent.Move` points from player to target. No camera, no touchscreen, no scene. See the pattern in `examples/02-tap-to-move.md` and the seam in `examples/03-testable-input-seam.md`.

## Findings to watch for

- **Tap-to-move calls `_controller.Move()` directly** instead of emitting an intent → bypasses `ResolveMove`, can't sprint/suit, untestable. Must-fix.
- **No UI guard** → tapping the joystick or an action button also issues a move order. Should-refactor (add `IsPointerOverGameObject` check).
- **Arrival radius hardcoded** → it's feel; expose it `[SerializeField] private`. Should-refactor.
- **Both schemes shipped at once, neither verified** → tier/process violation (`#7`). Flag and stage them.
