# Example 01 — Top-Down Locomotion Blend Tree

**Invocation:** "Build the locomotion blend tree for the player."

A worked design for a 2D directional locomotion blend tree wired onto the **existing** `TopDownPlayerController` seam. DESIGN + spec — the human authors the controller in-editor and judges the feel (`CLAUDE.md` §7).

---

## 1. Read the seam (Principle #5)

`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs` already exposes:
- `IsSprinting` (`:17`) — bool
- `CurrentMoveSpeed` (`:18`) — float (`moveSpeed = 6`, sprint = `* 1.45`)
- `ResolveMove(input, sprintHeld, dt)` (`:88`) — returns the world-space move delta; `input` is the raw 2D direction.
- Movement is applied via `CharacterController.Move` (`:79`) → **root motion OFF** (`guides/03`).

## 2. Animator parameters

| Param | Type | Fed from |
|---|---|---|
| `Speed` | float | `CurrentMoveSpeed` (normalized 0..1 against sprint speed) |
| `MoveX` | float | `input.x` (move vector relative to facing if strafing — `guides/03` model B) |
| `MoveY` | float | `input.y` |
| `IsSprinting` | bool | `IsSprinting` |

## 3. The blend tree (2D Freeform Directional)

Base-layer locomotion state = one blend tree:

```
Locomotion (2D Freeform Directional, params MoveX/MoveY)
├─ Idle        (0, 0)
├─ RunForward  (0, 1)
├─ RunBack     (0,-1)
├─ RunLeft     (-1,0)
├─ RunRight    (1, 0)
└─ Run diagonals at (±0.7, ±0.7)
```

Sprint biases via `IsSprinting` (either a faster playback or a sprint ring). If the human picks the **movement-relative** facing model (`guides/03` model A, Q2), collapse this to a 1D `Speed` tree (Idle→Walk→Run) — both are valid; it's a feel call.

## 4. The driver (EditMode-safe — `ARCHITECTURE.md` §7)

```csharp
// Thin driver: reads the controller, writes Animator params. No new control path.
public class PlayerAnimatorDriver : MonoBehaviour
{
    Animator _animator;
    TopDownPlayerController _controller;
    bool _initialized;

    void Awake() => EnsureInitialized();

    void EnsureInitialized()
    {
        if (_initialized) return;
        _animator ??= GetComponentInChildren<Animator>();
        _controller ??= GetComponent<TopDownPlayerController>();
        _initialized = true;
    }

    // Inject deps for tests (Unity skips Awake on script-added components in EditMode).
    public void Configure(TopDownPlayerController controller, Animator animator)
    {
        EnsureInitialized();
        _controller = controller;
        _animator = animator;
    }

    void Update() => Tick(Vector2.zero);

    // Extracted so a test can drive it deterministically.
    public void Tick(Vector2 localMove)
    {
        EnsureInitialized();
        if (_animator == null || _controller == null) return;
        _animator.SetBool("IsSprinting", _controller.IsSprinting);
        _animator.SetFloat("Speed", _controller.CurrentMoveSpeed, 0.1f, Time.deltaTime);
        _animator.SetFloat("MoveX", localMove.x, 0.1f, Time.deltaTime);
        _animator.SetFloat("MoveY", localMove.y, 0.1f, Time.deltaTime);
    }
}
```

## 5. Knob table (hand to human)

| Knob | Start | Range | Effect |
|---|---|---|---|
| idle→walk `Speed` | 0.1 | 0.05–0.3 | when legs start |
| walk→run `Speed` | ~6 (`moveSpeed`) | 5–7 | when it runs |
| `SetFloat` dampTime | 0.1s | 0.05–0.2 | blend smoothness |
| sprint pole | 6×1.45 | — | matches code |

## 6. Handoff

"Author this controller in-editor; pick the facing model (movement-relative vs strafe — Q2) with game-feel; tune the thresholds. I haven't judged the feel — that's yours (`CLAUDE.md` §7, §4)."

## Cross-Guardian
Camera feel → `game-feel-juice-guardian`; input → `touch-input-guardian`; animator culling cost → `mobile-game-perf-guardian`.
