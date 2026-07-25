# 08 — Decoupling Input for Tests

**This is the headline guide for this Guardian.** Everything else (joystick, tap-to-move, buttons, gestures) is a *source*; this guide is the *seam* they all feed. Read it before authoring any control.

## The problem (Hard Rule #11)

`CLAUDE.md` §6 #11 and `ARCHITECTURE.md` §7: **Unity does not run `Awake`/`Start`/`Update` on script-added components in EditMode.** A controller that reads its input inside its own `Update` therefore cannot be unit-tested — the test can't make `Update` run, and even if it could, there's no device.

`TopDownPlayerController` already polls the keyboard inside `Update` (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:44-81`). What makes it testable today is that the *logic* was extracted into a public method:

```csharp
// TopDownPlayerController.cs:88
public Vector3 ResolveMove(Vector2 input, bool sprintHeld, float deltaSeconds)
```

`RuntimePlayerTests` drives this directly — `controller.ResolveMove(new Vector2(0f, 1f), sprintHeld: false, 0.5f)` — with no device and no `Update` (`Assets/Tests/EditMode/RuntimePlayerTests.cs`). The seam works for *movement logic*. The job of this Guardian is to make the **input source** equally decoupled, so the whole input→movement path is testable, and so swapping joystick ↔ tap-to-move ↔ keyboard is swapping an implementation, not rewriting the controller.

## The seam: `IInputSource` + `MoveIntent`

Define one interface that every input source implements (`templates/iinput-source.cs`):

```csharp
public readonly struct MoveIntent
{
    public readonly Vector2 Move;       // analog movement, magnitude 0..1
    public readonly bool SprintHeld;    // held boolean (feeds ResolveMove's sprintHeld)
    public MoveIntent(Vector2 move, bool sprintHeld) { Move = move; SprintHeld = sprintHeld; }
    public static MoveIntent None => new MoveIntent(Vector2.zero, false);
}

public interface IInputSource
{
    MoveIntent ReadMoveIntent();        // sampled each frame by the consumer
    bool AttackPressedThisFrame { get; }   // edge — one swing per tap (05)
    bool InteractPressedThisFrame { get; }
    bool BuildPressedThisFrame { get; }
}
```

Implementations:

- **`InputSourceFromActions`** — production. Owns the `InputActionAsset` (`02`), reads `Move`/`Sprint` into `MoveIntent`, reads `Attack`/`Interact`/`Build` `performed` edges. The joystick (`03`) and on-screen buttons (`05`) feed the actions this reads — so this one source covers joystick + buttons.
- **`TapToMoveInputSource`** — alternative (`04`). Emits a `MoveIntent` heading toward the tapped point.
- **`FakeInputSource`** — test double. Public setters/fields so a test scripts the exact intent and edges.

## Wiring the consumer

`TopDownPlayerController` receives its source via `Configure(...)` (the Drift dependency-injection convention — `ARCHITECTURE.md` §7 pattern 2), then in `Update` just samples and forwards:

```csharp
IInputSource _input;
public void Configure(IInputSource input) => _input = input;

void Update()
{
    var src = _input ?? _editorKeyboardFallback;   // keyboard source for editor convenience
    var intent = src.ReadMoveIntent();
    var move = ResolveMove(intent.Move, intent.SprintHeld, Time.deltaTime);
    EnsureDependencies();
    _controller?.Move(move);
}
```

Note: `ResolveMove` is **unchanged** — it still takes `(Vector2, bool, float)`. The decoupling adds a source *in front of* `Update`; it does not touch the movement math. That's the contract: this Guardian co-owns the boundary (`IInputSource`/`MoveIntent`) with `unity-csharp-guardian`, who owns `ResolveMove`'s internals.

The same pattern wraps `PlayerMeleeAttack`: replace the inline `keyboard.spaceKey.wasPressedThisFrame` poll (`PlayerMeleeAttack.cs:25`) with `if (src.AttackPressedThisFrame && _cooldownRemaining <= 0f) TryAttack();`.

## The payoff: an EditMode test feeding a movement vector

```csharp
[Test]
public void PlayerController_ConsumesInjectedMoveIntent_FromInputSource()
{
    var go = new GameObject("Player");
    go.AddComponent<CharacterController>();
    var controller = go.AddComponent<TopDownPlayerController>();

    var fake = new FakeInputSource { MoveIntent = new MoveIntent(new Vector2(0f, 1f), false) };
    controller.Configure(fake);

    // Drive the seam exactly as the existing RuntimePlayerTests drive ResolveMove:
    var intent = fake.ReadMoveIntent();
    var move = controller.ResolveMove(intent.Move, intent.SprintHeld, 0.5f);

    Assert.Greater(move.z, 0f, "Injected forward intent should produce forward movement.");
    Assert.AreEqual(0f, move.y);
}
```

No device, no `Update`, no scene — a vector fed in, movement asserted out. The same `FakeInputSource` sets `AttackPressedThisFrame = true` to test that an attack edge causes a swing. Full version in `examples/03-testable-input-seam.md`. (Writing/running the suite is `unity-test-ci-guardian`'s job; this Guardian ships the *pattern* and one example so the input layer is provably testable.)

## The three EditMode-safe patterns, applied to input

`ARCHITECTURE.md` §7 mandates three patterns; here's how input honors each:

1. **Lazy-init** — a source's action asset is enabled in an `EnsureEnabled()` guard called from `Awake` *and* the first read, so a test that never runs `Awake` still works.
2. **Explicit `Configure(...)`** — the consumer receives its `IInputSource` via `Configure`, not only by resolving a device in `Awake`. This is what makes injection of `FakeInputSource` possible.
3. **Extracted `Tick`/`Step`** — sources that integrate over time (tap-to-move, gesture recognizers) expose a public `Step(...)`/`ReadMoveIntent()` taking the inputs they need, so a test drives them without `Update`.

## Findings to watch for

- **A control writes into `TopDownPlayerController`/`PlayerMeleeAttack` by poking a field or calling a private method** → bypasses the seam, untestable. Must-fix.
- **The consumer has no `Configure(IInputSource)`** — its source is resolved only inside `Awake` → can't inject a fake. Must-fix.
- **`ResolveMove`'s signature changed to take a device/source** → wrong layer; the source belongs in front of it, not inside it. Must-fix (and crosses into `unity-csharp-guardian`'s territory — coordinate).
- **A new source with no `FakeInputSource`-style testability** (logic trapped in `Update`) → ship a `Step`/read method. Must-fix.
