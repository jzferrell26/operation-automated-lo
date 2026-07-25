# Example 03 — Camera Follow Damping + Look-Ahead

**Request:** "The camera feels stiff / dead — make the follow feel better."

We tune the existing damped follow and add **look-ahead** (the camera leads the player's movement) — the single biggest feel upgrade to a top-down follow camera. Theory in `guides/06-camera-feel.md`.

## 1. What exists

Read `Assets/Scripts/Drift/Gameplay/CameraRig/TopDownFollowCamera.cs`. Today:

- Orthographic top-down, `orthographicSize = 11`, `height = 18`.
- Damped follow in `LateUpdate`: `Vector3.Lerp(transform.position, desired, followSharpness * Time.deltaTime)` with `followSharpness = 8`.
- No look-ahead, no deadzone, no shake hook.

The "stiff/dead" feeling on a top-down camera is almost always **the lack of look-ahead** — the player can't see where they're going, only where they are.

## 2. Two changes

### a) Frame-rate-correct damping (should-tune correctness nit)

`Lerp(a, b, k*dt)` is the common idiom but isn't perfectly frame-rate independent. The exponential form is correct:

```csharp
float k = 1f - Mathf.Exp(-followSharpness * dt);
follow = Vector3.Lerp(current, desired, k);
```

Same feel at 60fps, but stable across frame rates. The `followSharpness` *value* stays the human's call.

### b) Look-ahead toward movement

Offset the follow target by the player's movement direction, and **damp the look-ahead itself** so reversing direction eases rather than snaps.

```csharp
[SerializeField] float lookAheadDistance = 2.5f;   // range 1–5
[SerializeField] float lookAheadSharpness = 3f;    // range 2–6 (slower than followSharpness)

Vector3 _lookAhead;   // current damped lead offset

public Vector3 ResolveCameraPosition(Vector3 current, Vector3 targetPos, Vector3 moveDir, float dt)
{
    // Damp the lead toward (moveDir * distance) on the XZ plane.
    var flatDir = new Vector3(moveDir.x, 0f, moveDir.z);
    if (flatDir.sqrMagnitude > 1e-4f) flatDir.Normalize();
    var targetLead = flatDir * lookAheadDistance;
    _lookAhead = Vector3.Lerp(_lookAhead, targetLead, 1f - Mathf.Exp(-lookAheadSharpness * dt));

    var desired = new Vector3(targetPos.x, height, targetPos.z) + _lookAhead;
    var k = 1f - Mathf.Exp(-followSharpness * dt);
    return Vector3.Lerp(current, desired, k);
}
```

`LateUpdate` becomes a thin forwarder:

```csharp
var moveDir = _controller != null ? _controller.LastMoveDirection : Vector3.zero;
transform.position = ResolveCameraPosition(transform.position, target.position, moveDir, Time.deltaTime);
```

## 3. The movement-direction seam (stay in your lane)

`ResolveCameraPosition` needs the player's move direction. That comes from `TopDownPlayerController` — **you consume the intent, you don't capture input** (input capture is `touch-input-guardian`; the controller shape is `unity-csharp-guardian`). Coordinate a small read-only accessor (e.g., `LastMoveDirection`) on the controller; if it doesn't exist, propose it and let `unity-csharp-guardian` own its placement. Don't reach into the Input System here.

## 4. EditMode-testability (CLAUDE.md §11)

The math lives in the pure `ResolveCameraPosition(current, targetPos, moveDir, dt)`; `LateUpdate` only forwards `Time.deltaTime`. A test asserts:

```csharp
// No movement -> converges toward the target (x,z), ignoring height.
var p = cam.ResolveCameraPosition(start, target, Vector3.zero, 0.016f);
// Movement +x -> leads in +x: camera target biases ahead of the player.
var lead = cam.ResolveCameraPosition(start, target, Vector3.right, 0.5f);
Assert.Greater(lead.x, target.x);                 // leads forward
Assert.LessOrEqual(lead.x - target.x, lookAheadDistance + 1e-3f); // never over-leads
```

This mirrors `TopDownPlayerController.ResolveMove` / `OxygenSystem.Tick` (ARCHITECTURE.md §7).

## 5. Mobile caveat

Too much look-ahead on a **portrait** screen pushes the player toward the screen edge / under the thumb. Keep `lookAheadDistance` modest (`2.5` start) and verify the player stays comfortably framed in portrait on a device (`guides/08-mobile-readability.md`). Whether the lead/zoom feels right is the human's call.

## 6. Cost

Two extra lerps and a normalize per frame — negligible. No perf concern; if the Profiler says otherwise, defer to `mobile-game-perf-guardian`.

## 7. Tuning table (hand to the human)

| Knob | `[SerializeField]` | Start | Range | Changes |
|---|---|---|---|---|
| Follow sharpness | `followSharpness` | `8` | `5–14` | Tight vs loose follow |
| Look-ahead distance | `lookAheadDistance` | `2.5` | `1–5` | How far the camera leads movement |
| Look-ahead sharpness | `lookAheadSharpness` | `3` | `2–6` | How fast the lead eases in/out |
| Orthographic size | `orthographicSize` | `11` | `8–14` | Zoom / world visible |

## 8. The handoff (CLAUDE.md §7)

> This is yours to tune. I added frame-rate-correct damping and damped look-ahead (camera leads movement), extracted into a pure `ResolveCameraPosition` so it's EditMode-testable, and composed it to sit under the screenshake offset (example 02). Starting values are first-pass. **Whether the camera now feels good — responsive but not twitchy, well-framed in portrait — is your call (§7).** Verify on a device and turn the knobs to taste. The `LastMoveDirection` accessor on the controller is a seam to confirm with `unity-csharp-guardian`.
