# 06 — Gestures

Drag, swipe, pinch. Powerful but easy to over-scope. The recognition *thresholds* are feel (human-tuned); the recognition *plumbing* is yours; and most gestures are **Tier 1**, not Tier 0.

## Tier-0 restraint first

`CLAUDE.md` §6 #1 forbids building Tier 1 systems mid-Tier-0. The Tier 0 control scheme is: virtual joystick (move) + on-screen buttons (attack/interact/build). A **swipe-to-dodge** is a plausible Tier 0 combat verb if the design asks for it; **pinch-to-zoom**, **two-finger rotate**, **drag-to-inventory** (grid drag-and-drop) are Tier 1 (the full grid inventory is explicitly Tier 1 per `CLAUDE.md` §3). Before building any gesture, confirm it's in Tier 0 scope and the design calls for it. If not, flag and stop (`00-principles.md` #8).

## The three gestures and their shape

### Drag
A pointer-down → move → pointer-up with displacement. Recognized by tracking the start position on `began` and the delta each frame. Use for: dragging a build preview, aiming a throw. Emit the drag vector through `IInputSource` (e.g. `MoveIntent`-adjacent fields or a dedicated `DragDelta`), never poke gameplay.

### Swipe
A fast directional drag that completes on release. Recognized by: displacement exceeds a **distance threshold** *and* the gesture completed within a **time threshold** (or exceeded a **velocity threshold**). Direction = `normalize(endPos - startPos)`. Use for: dodge/roll in a swipe direction. The swipe → a one-shot `MoveIntent`-style impulse or a dedicated `Dodge(Vector2 dir)` edge on the source.

### Pinch
Two-finger distance change. Requires **Enhanced Touch** (`EnhancedTouchSupport.Enable()`, then `Touch.activeTouches`; `01`). `delta = currentDistance - startDistance`. Use for: camera zoom (Tier 1 — and camera is `game-feel-juice-guardian`'s `TopDownFollowCamera`; coordinate, don't author the camera).

## Thresholds are feel — flag every one

Every gesture has constants that *are* the feel:

- Swipe min distance (px), max duration (s) or min velocity (px/s).
- Drag dead zone before it counts as a drag vs. a tap.
- Pinch sensitivity.

Ship each as `[SerializeField] private` with a recommended starting value and a `// human to tune (CLAUDE.md §7)` comment. A swipe that feels twitchy or sluggish is a tuning problem for the human; do not declare a threshold "correct." Source: `CLAUDE.md` §7.

## Tap vs. swipe vs. hold disambiguation

A single pointer-down/up could be a tap (attack), the start of a drag, or a swipe. Disambiguate by:

- **Tap** — released within tap-time and below drag-distance.
- **Swipe** — released above swipe-distance within swipe-time.
- **Hold** — held past hold-time without releasing.

These windows are feel. Keep the state machine small and deterministic (a few enum states + timers) so it's **EditMode-testable** — feed it synthetic pointer events and assert the classified gesture. This is the same `Tick(events, dt)` discipline as the rest of the spine (`ARCHITECTURE.md` §7).

## Testability

Build gesture recognizers as pure-ish classes: a `Recognize(start, end, duration)` or a `Step(pointerSample, dt)` that returns a classified result. No `Update`-only device polling. A test feeds positions/timings and asserts the gesture and direction — no touchscreen. This is the recurring Drift pattern (`08`).

## Findings to watch for

- **A Tier 1 gesture (pinch-zoom, grid drag-drop) built mid-Tier-0** → tier violation. Must-fix (flag and stop).
- **Gesture recognized inside a gameplay `Update` polling `Touchscreen` directly** → untestable, couples input to gameplay. Must-fix (extract a `Step`/`Recognize` + feed via source).
- **Thresholds hardcoded** → they're feel; expose them. Should-refactor.
- **Pinch authoring the camera** → that's `TopDownFollowCamera` / `game-feel-juice-guardian`. Emit the pinch delta; hand off.
- **Enhanced Touch enabled but never disabled** → leak. Should-refactor (disable on teardown).
