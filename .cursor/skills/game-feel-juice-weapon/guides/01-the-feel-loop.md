# 01 — The Feel Loop

Game feel is a loop: **input → response → feedback**, governed by **latency**. Every juice request maps onto this loop. If you can't place a request on it, you don't yet understand the request.

> Source: Steve Swink, *Game Feel: A Game Designer's Guide to Virtual Sensation* — the "real-time control of virtual objects in a simulated space, with interactions emphasized by polish." See `research/research-plan.md`.

## The three stages

### 1. Input

The player does something. In DRIFT's Tier 0 spine this is keyboard/mouse today, touch later (owned by `touch-input-guardian`). Examples on the existing spine:

- WASD / move intent → `TopDownPlayerController.ResolveMove`
- Space / LMB → `PlayerMeleeAttack.Update` → `TryAttack`
- Walk into a `SalvageNode` → pickup
- `R` near a breach → `HullBreachEvent.Seal`

**You do not own input capture.** You own the response and feedback to it.

### 2. Response

The thing the player *directly controls* changes state. This is the floor of game feel and it must be immediate:

- The character moves (the controller resolves the move this frame).
- The swing fires (`PlayerMeleeAttack.TryAttack` runs, `Health.TakeDamage` lands).
- The resource enters inventory.

**The response must never wait on feedback.** If a flash, a shake, or a tween delays the swing landing or the character moving, you have made the game *less* responsive in the name of polish. That is a **must-fix** regression (Principle #3).

### 3. Feedback

Everything layered on top of the response to make it *read*:

- **Visual:** flash, knockback, hitstop, particles, camera shake/punch.
- **Audio:** the hit cue, the pickup chime, the breach klaxon.
- **Camera:** look-ahead, follow damping, framing.

Feedback is where this Weapon lives. It rides on top of an already-correct, already-instant response.

## Latency: the governing variable

Latency is the time from input to *perceived* response. Three sub-latencies matter:

| Sub-latency | What it is | Who owns it |
|---|---|---|
| **Input latency** | input event → response logic runs | `touch-input-guardian` (capture) + engine |
| **Response latency** | response logic → visible state change | the gameplay code; you must not add to it |
| **Feedback latency** | response → feedback registers | **you** — and it should be ~0 to a few frames, deliberate |

The target is a responsive feel: the response is felt as instantaneous, and feedback lands within a frame or two — *except* deliberate, designed delays like hitstop, which freeze the *world* after the hit has already registered (never before).

## Mapping a request onto the loop

When a request arrives, answer four questions before writing code:

1. **What is the input?** (Which player action triggers this?)
2. **What is the response?** (What does the player-controlled thing do? Is it already instant?)
3. **What feedback are we adding?** (Flash? Shake? Sound? Particles?)
4. **At what latency?** (Same frame? A deliberate N-frame hitstop? An eased tween over 0.2s?)

Worked example — "make the melee hit feel good":

- **Input:** Space/LMB → `PlayerMeleeAttack.TryAttack`.
- **Response:** `Health.TakeDamage(damage)` fires `Health.Changed`. Already instant. **Do not touch it.**
- **Feedback:** flash the enemy (via `GrayBoxVisuals` material swap), a small knockback impulse, a few frames of hitstop, a small trauma bump to the camera, a hit sound.
- **Latency:** flash + sound + shake same frame as `Health.Changed`; hitstop is a *deliberate* 2–4 frame world-freeze *after* the hit registers; knockback eases out over ~0.1s.

That's the full plan. See `examples/01-melee-hit-feedback.md` for the wired version.

## What counts as a regression (must-fix)

- Feedback that delays the response (e.g., the swing won't fire until a windup tween finishes — that's a *design* windup, not feedback; don't smuggle it in as juice).
- Hitstop applied *before* the hit registers, so the player perceives a stutter then a hit instead of a hit then a punch.
- Feedback that drops the frame rate (Principle #7) — felt latency goes up across the board.
- Input dropped during a freeze (Principle #4) — the worst kind, because it reads as the game ignoring the player.

## The handoff

Once the loop is plumbed, the *amount* of each feedback — how long the hitstop, how big the shake, how bright the flash — is the human's to tune. You wire the loop and hand over the knobs (`guides/10-human-handoff.md`).
