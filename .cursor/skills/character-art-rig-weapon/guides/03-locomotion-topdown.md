# 03 — Top-Down Locomotion

Locomotion under a **fixed angled top-down camera**, code-driven movement, root-motion OFF. Grounded in Unity 2D Freeform Directional blend material + "Root Motion — how it works" (named) and the real `TopDownPlayerController`.

## Root motion is OFF (Principle #6)

DRIFT moves the player with `CharacterController.Move(...)` (`TopDownPlayerController.cs:79`) — **position is code-driven**. Therefore:

- Set `Animator.applyRootMotion = false`.
- The locomotion clips are **in-place** (run/walk/idle cycles that don't translate).
- Animation **follows** the code's movement; it never drives position.

A blend tree or clip that relies on root motion to move the character is a **must-fix** — it fights the `CharacterController` and causes foot-slide/desync. (Tier-later: if you ever want root-motion-driven dodges, that's a deliberate ADR, not a default.)

## The facing model (open question Q2 — a game-feel call)

GDD §8 says "top-down twin-stick-lite." Two models, both supported by the 2D blend (`guides/02`); the human + `game-feel-juice-guardian` pick the feel:

**A. Movement-relative (face the move direction).**
- The character always faces where it walks.
- `MoveX`/`MoveY` are in the character's local frame and reduce to "always forward," so a **1D `Speed` blend** is sufficient.
- Simpler, reads clean for melee-first play.

**B. Aim-relative (strafe).**
- The character faces an aim direction independent of movement (true twin-stick).
- Needs the **2D Freeform Directional** blend: `MoveX`/`MoveY` = the move vector expressed relative to facing, so the tree picks forward/back/strafe-left/strafe-right clips.
- Richer, needed if ranged combat (raiders, GDD §8) wants the player to back-pedal while shooting.

**Recommendation:** design the 2D Freeform Directional tree (it degrades gracefully to model A if facing is locked to movement), and hand the model choice to the human. Document it as Q2.

## Facing under a fixed angled camera

The camera is fixed and angled (not a free orbit). So:

- Compute facing from the **world-space** move/aim vector, flattened to the XZ plane (the enemy already does this — `MutatedCrewEnemy.Flat`/`Face` at `:189`/`:225`). Use the same flatten convention for the player so characters read consistently under the angled view.
- Rotate the character mesh with `Quaternion.LookRotation(flatDir, Vector3.up)` (the enemy's `Face` pattern). Apply a smoothing/turn-rate knob so fast direction flips don't snap.

> The camera itself is `TopDownFollowCamera` (owned by `game-feel-juice-guardian` for feel / `unity-rendering-guardian` for the stack). You consume the camera's fixed angle; you don't configure it.

## The 2D blend set (if model B)

A standard 8-direction locomotion set for 2D Freeform Directional:

- Idle (center, Speed≈0)
- Forward, Back, Left, Right (cardinals at the run pole)
- Forward-Left, Forward-Right, Back-Left, Back-Right (diagonals)

Plus a sprint variant biased by `IsSprinting` (`:17`). Author run + (optionally) walk rings; the `Speed` magnitude scales between idle and the active ring.

## Turn & smoothing knobs (hand to human)

| Knob | Starting value | Range | What it changes |
|---|---|---|---|
| facing turn rate | 720 deg/s | 360–1080 | How fast the character spins to a new direction |
| blend dampTime (`SetFloat`) | 0.1s | 0.05–0.2 | Smoothness of the directional blend |
| move-vs-aim deadzone (model B) | 0.1 | 0.05–0.25 | When tiny stick input stops re-facing |

## What you deliver

- The facing-model recommendation (2D, with the model-A fallback) flagged as Q2 for the human.
- Root-motion-off confirmation + the in-place clip requirement.
- The flatten/`LookRotation` facing approach matching the enemy's existing convention.
- The knob table + the **handoff**: "Pick the facing feel with game-feel; that's the human's call (§7)."

## Cross-Guardian

- **Camera feel / look-ahead / the fixed angle's framing** → `game-feel-juice-guardian` (feel) / `unity-rendering-guardian` (the camera stack).
- **Raw stick/touch input → move/aim vectors** → `touch-input-guardian`. You consume the resulting intent, not raw input.
- **Whether to use model A or B** is ultimately the human's feel decision (§7).
