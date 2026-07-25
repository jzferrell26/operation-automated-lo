# 06 — Camera Feel

The camera is the player's eye; its motion is felt continuously, so its feel is some of the highest-leverage juice in the game. DRIFT already has a working `TopDownFollowCamera` — this guide tunes and extends it without breaking it.

> Sources: Eiserloh, "Juicing Your Cameras With Math" (camera as a juicing surface); Swink, *Game Feel* (camera as the "metaphor" layer). See `research/research-plan.md`.

## What exists today

Read `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs`. As built:

- **Orthographic**, top-down (`rotation = Euler(90, 0, 0)`), `orthographicSize = 11`, fixed `height = 18`, dark clear color.
- **Damped follow**: in `LateUpdate` it lerps toward `desired = (target.x, height, target.z)` at `followSharpness * Time.deltaTime` (`followSharpness = 8`).
- Auto-acquires the `Player`-tagged target if none is set; exposes `SetTarget`.

It has **damping but no look-ahead, no deadzone, and no shake hook.** Those are the extensions this guide adds.

## 1. Follow damping (`followSharpness`)

The existing `Vector3.Lerp(pos, desired, followSharpness * dt)` is a frame-rate-aware exponential smoothing — good. The knob:

- **Higher `followSharpness`** = camera sticks tightly to the player (responsive, but can feel jittery / nauseating on a small screen if too high).
- **Lower** = camera lags behind (smooth, cinematic, but can feel sluggish and let the player outrun the frame).

Start `8`; range `5–14`. This is a pure feel knob — recommend, hand to the human.

> Note on correctness: `Lerp(a, b, k*dt)` is the common idiom but is *not* perfectly frame-rate independent. For a more stable result across frame rates, the exponential form `Vector3.Lerp(pos, desired, 1 - Mathf.Exp(-followSharpness * dt))` is correct. Flag this as a **should-tune** correctness nit (it slightly changes feel at variable frame rates); the actual `followSharpness` value remains the human's.

## 2. Look-ahead (the headline extension)

Look-ahead pushes the camera target *in the direction the player is moving*, so the player sees more of where they're going than where they've been. It is the single biggest upgrade to a top-down follow camera's feel.

Pattern:

- Read the player's movement direction/velocity (from `TopDownPlayerController` — coordinate the seam with `unity-csharp-guardian`/`touch-input-guardian`; you consume the intent, you don't capture input).
- Offset the camera's `desired` target by `moveDir * lookAheadDistance`.
- **Damp the look-ahead itself** so it eases in/out rather than snapping when the player changes direction (a second, slower lerp on the look-ahead offset). Otherwise reversing direction yanks the camera.

Knobs: `lookAheadDistance` (start `2.5` world units; range `1–5`), `lookAheadSharpness` (start `3`; lower than `followSharpness` so the lead eases). See `examples/03-camera-follow-damping-and-look-ahead.md`.

Mobile caveat (Principle #6): too much look-ahead on a portrait screen pushes the player toward the screen edge / under the thumb. Keep it modest and bias the framing (below).

## 3. Framing & deadzone

- **Orthographic size** (`orthographicSize = 11`) sets how much world is visible. On portrait mobile, a smaller value (more zoomed in) reads better for a top-down survival game than a wide RTS view — but it trades situational awareness. This is a feel + readability call for the human; surface it as a knob.
- **Deadzone** — a small region around screen-center where player movement *doesn't* move the camera, so tiny adjustments don't cause constant micro-pan. Reduces motion-sickness on mobile. Optional Tier 0; propose if the human reports the camera feels "twitchy."

## 4. Shake injection hook (clean integration with guide 03)

The screenshake from `guides/03-screenshake.md` must compose with follow + look-ahead, not fight them. The clean seam: `TopDownFollowCamera` computes its damped, look-ahead-adjusted position, **then adds the shake offset on top** each `LateUpdate`:

```
transform.position = dampedFollowPosition + shake.CurrentOffset;
```

The shake component owns trauma/decay/offset; the camera just reads `CurrentOffset`. This keeps the three systems (follow, look-ahead, shake) independent and each testable. See `examples/02-trauma-screenshake-utility.md`.

## EditMode-testability

`TopDownFollowCamera` currently does its work in `LateUpdate` (not run in EditMode). When extending it, follow CLAUDE.md §11 / ARCHITECTURE.md §7: extract the position math into a pure method, e.g.

```
public Vector3 ResolveCameraPosition(Vector3 current, Vector3 targetPos, Vector3 moveDir, float dt)
```

so a test can assert: with no movement the camera converges to the target; with movement it leads in the move direction; the lead never exceeds `lookAheadDistance`. `LateUpdate` just forwards `Time.deltaTime` into it. This mirrors how `TopDownPlayerController.ResolveMove` and `OxygenSystem.Tick` are written.

## Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Follow sharpness | `followSharpness` | `8` | `5–14` | Tight vs loose follow |
| Look-ahead distance | `lookAheadDistance` | `2.5` | `1–5` | How far the camera leads movement |
| Look-ahead sharpness | `lookAheadSharpness` | `3` | `2–6` | How fast the lead eases in/out |
| Orthographic size | `orthographicSize` | `11` | `8–14` | Zoom / how much world is visible |
| Height | `height` | `18` | (keep) | Camera distance (ortho, mostly cosmetic) |

These shape continuous feel and **belong to the human to tune** — give them the knobs and the hook, then hand it over (`guides/10-human-handoff.md`).
