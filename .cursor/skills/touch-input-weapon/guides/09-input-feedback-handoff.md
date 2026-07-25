# 09 — Input Feedback Handoff

The boundary between this Guardian and `game-feel-juice-guardian`. Clean rule: **this Guardian makes the input register and emits the edge; `game-feel-juice-guardian` makes it *feel* good.**

## The line

| Concern | Owner |
|---|---|
| The tap is detected; the action fires; the edge/intent reaches gameplay | **touch-input-guardian** (this Guardian) |
| The button visually depresses / highlights on press | `game-feel-juice-guardian` |
| Haptic buzz (`Handheld.Vibrate`, advanced haptics) on press/hit | `game-feel-juice-guardian` |
| Hit-stop / screenshake / material flash when the attack lands | `game-feel-juice-guardian` (wired to `PlayerMeleeAttack`/`Health`) |
| Joystick knob tween / base fade as *visual juice* | `game-feel-juice-guardian` |
| Camera look-ahead / follow damping in response to movement | `game-feel-juice-guardian` (`TopDownFollowCamera`) |

If a request is "the attack button should feel punchy," that's feel — hand off. If it's "the attack button doesn't fire," that's input — yours.

## What this Guardian exposes for the handoff

The feedback layer needs *signals* to react to. This Guardian provides them as part of the input seam (`08`), so `game-feel-juice-guardian` subscribes rather than re-detecting input:

- **Action edges** — `AttackPressedThisFrame` / `AttackPerformed` event, same for Interact/Build. A button-bounce or haptic hooks the same edge the gameplay consumes.
- **Press/release events on on-screen controls** — `OnScreenButton` pointer-down/up already drives the action; expose the raw press if the feel layer wants to animate the button independent of whether the action did anything.
- **Joystick state** — current `MoveIntent.Move` magnitude/direction, so a knob visual or look-ahead can read it. Read-only; the feel layer never writes movement.

The principle: **emit, don't animate** (`00-principles.md` #9). This Guardian never tweens a knob, never calls `Vibrate`, never shakes the camera. It surfaces the event; the feel layer consumes it.

## Why the split matters

- **Testability stays clean.** The input seam is a pure intent/edge stream with no `UnityEngine` animation/audio dependencies, so it stays EditMode-testable (`08`). The moment you put a `Vibrate()` or a tween inside the input source, you've coupled it to device-only APIs and broken the seam.
- **Tuning ownership stays clear.** Feel (button bounce curve, haptic strength, shake trauma) is the human's / `game-feel-juice-guardian`'s per `CLAUDE.md` §7. Input thresholds (what counts as a tap vs. swipe) are *also* feel, but they govern *recognition*, not *response* — those stay here but ship as human-tunable defaults (`06`, `07`).

## Coordination cases

- **Latency.** "Input → response → feedback" latency is a feel concern (`game-feel-juice-guardian`'s feel loop), but the *input* half of that latency (when the edge fires) is yours. If the feel is laggy, first confirm the edge fires on the right frame (here), then hand the response timing to feel.
- **Readability under the thumb.** Where feedback shows so it's not hidden by the thumb (`07`) is co-owned — this Guardian knows where the thumbs sit; `game-feel-juice-guardian` knows what feedback must be visible. Coordinate.
- **Haptics on a gesture.** A swipe-dodge buzzing on activation: the swipe *recognition* is here (`06`); the buzz is `game-feel-juice-guardian`. Emit the dodge edge; they buzz.

## Findings to watch for

- **A `Handheld.Vibrate()` / haptic call inside an input source** → wrong owner + breaks the testable seam. Must-fix (move to game-feel-juice-guardian; emit an edge instead).
- **A knob tween / button-press animation inside the input component** → wrong owner. Should-refactor (expose the press event; let feel animate).
- **Screenshake/hit-stop driven from the input layer** → wrong owner. Must-fix (hand to game-feel-juice-guardian, wired to `PlayerMeleeAttack`/`Health`).
- **No edge/event exposed for the feel layer to subscribe to** → the feel layer is forced to re-poll input. Should-refactor (surface the edge from the seam).
