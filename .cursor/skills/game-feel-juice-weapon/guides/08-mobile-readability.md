# 08 — Mobile Readability

The target is mobile portrait (CLAUDE.md §1). Feedback that reads on a 27" monitor can vanish or overwhelm on a ~6" phone. Readability is a **gate** on every feedback choice (Principle #6), not a polish afterthought.

> The play surface: a phone, held ~30cm from the face, portrait orientation, a thumb (or two) covering the bottom corners, possibly in sunlight, with the device often muted. Every feedback decision is judged against *that*.

## The five readability constraints

### 1. Small physical screen

A flash, particle, or shake calibrated for a large monitor is sized wrong for a phone:

- **Flash:** must be bright/contrasty enough to register at small scale and short duration — a subtle 5% tint that reads on a monitor disappears on a phone. Bias brighter and slightly longer than a desktop value, then have the human tune it down on device.
- **Particles:** a tiny burst can be invisible; size to read at portrait scale (`guides/05-particles-and-vfx.md`).
- **Shake:** the *opposite* — a phone amplifies perceived shake; a desktop-sized shake is nausea. Cap tighter (`guides/03-screenshake.md`).

### 2. Thumb occlusion

In portrait, the player's thumbs cover the **bottom corners** and part of the bottom edge — exactly where touch controls live (owned by `touch-input-guardian`). Feedback placed there is hidden:

- Don't put critical feedback (the low-O2 warning, the breach indicator) under the thumbs.
- VFX that spawns at the bottom of the screen may be occluded — bias important feedback toward the center/upper region.
- The current `Tier0Hud` (IMGUI) draws panels in corners — fine for a debug overlay, but a reminder that the *real* HUD (Tier 1) must respect thumb zones. Coordinate with `touch-input-guardian` on where the safe zones are.

### 3. Sunlight / low contrast

Outdoor mobile play washes out low-contrast feedback. The gray-box already clears to a dark background (`TopDownFollowCamera` → ~`(0.04, 0.05, 0.08)`), which *helps* bright feedback pop — lean into high-contrast, saturated feedback colors and avoid dark-on-dark effects.

### 4. Small scale of the action

Top-down at `orthographicSize = 11` means characters are small on screen. Feedback must be legible at that scale:

- A hit flash on a small enemy needs to be a *whole-body* color change, not a subtle edge highlight.
- Knockback needs to be visible displacement, not a 2-pixel nudge.

### 5. Muted play

Players often play with sound off (Principle: audio is *additive*, `guides/07-audio-feedback.md`). **Every critical feedback event needs a visual channel**, not audio alone:

- The breach is visual (screen state) + audio, never audio-only.
- The low-oxygen warning has the HUD meter + a visual cue, not just a sound.

## The readability review (a deliverable)

When asked "will this read on mobile?", produce a short pass over each feedback element:

| Element | Reads at portrait scale? | Under thumb? | Has visual channel (not audio-only)? | Verdict |
|---|---|---|---|---|

Mark each: OK / **should-tune** (value mistuned for mobile) / **must-fix** (e.g., critical info is audio-only, or feedback is hidden under the thumb). The *values* are then the human's to finalize on a real device — you flag the structural problems, they tune the magnitudes.

## The "tune on device" reality

You cannot judge mobile readability from a headless VM (it has no editor, no device — AGENTS.md). So **every readability call ends "verify on device."** You provide the structurally-correct choice (high contrast, off-thumb, dual-channel) and a starting value; the human confirms it reads on real hardware. This is a concrete instance of the §7 handoff: you scaffold for readability, the human confirms the feel.

## Cross-Guardian note

- Thumb-zone geometry and safe areas → coordinate with `touch-input-guardian` (they place the controls; you keep feedback clear of them).
- If a readability fix implies a perf change (e.g., bigger/brighter particles cost more fill-rate) → co-own with `mobile-game-perf-guardian`.

End readability work with the handoff (`guides/10-human-handoff.md`): structurally-sound choices, starting values, "verify on device."
