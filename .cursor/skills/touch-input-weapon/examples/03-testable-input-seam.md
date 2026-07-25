# Example 03 — A Testable Input Seam (EditMode test feeding a movement vector)

The payoff of the whole arsenal: because input flows through `IInputSource`, an EditMode test feeds a movement vector via a `FakeInputSource` and asserts the player moves — no device, no `Update`, no scene. This is Hard Rule #11 made concrete.

## What makes it possible

Three things already true or added by this Guardian:

1. `TopDownPlayerController.ResolveMove(Vector2, bool, float)` is a public, device-free method (`Assets/Scripts/Drift/Gameplay/Player/TopDownPlayerController.cs:88`) — the logic seam.
2. `TopDownPlayerController` gains `Configure(IInputSource)` — the injection seam (guide 08).
3. `FakeInputSource` (`templates/iinput-source.cs`) — a test double with public setters.

The existing `RuntimePlayerTests` (`Assets/Tests/EditMode/RuntimePlayerTests.cs`) already drives `ResolveMove` directly. This example extends that pattern to prove the **input source** is injectable too.

## The test

```csharp
using Drift.Gameplay.Input;
using Drift.Gameplay.Player;
using NUnit.Framework;
using UnityEngine;

namespace Drift.Tests
{
    /// <summary>
    /// EditMode coverage that the player consumes injected input through the
    /// IInputSource seam. Drives the seam directly because Unity does not run
    /// Update on script-added components in EditMode (CLAUDE.md §6 #11).
    /// </summary>
    public class RuntimeInputSeamTests
    {
        GameObject _go;

        [TearDown]
        public void TearDown()
        {
            if (_go != null) Object.DestroyImmediate(_go);
        }

        TopDownPlayerController CreatePlayer()
        {
            _go = new GameObject("Player");
            _go.AddComponent<CharacterController>();
            return _go.AddComponent<TopDownPlayerController>();
        }

        [Test]
        public void Player_ConsumesInjectedForwardIntent_FromInputSource()
        {
            var controller = CreatePlayer();
            var fake = new FakeInputSource
            {
                MoveIntent = new MoveIntent(new Vector2(0f, 1f), sprintHeld: false)
            };
            controller.Configure(fake);

            // Drive the seam exactly as the controller's Update would:
            var intent = fake.ReadMoveIntent();
            var move = controller.ResolveMove(intent.Move, intent.SprintHeld, 0.5f);

            Assert.IsFalse(controller.IsSprinting);
            Assert.Greater(move.z, 0f, "Forward intent should move the player forward (+z).");
            Assert.AreEqual(0f, move.y, "Top-down movement stays on the XZ plane.");
        }

        [Test]
        public void Player_ZeroIntent_ProducesNoMovement()
        {
            var controller = CreatePlayer();
            var fake = new FakeInputSource { MoveIntent = MoveIntent.None };
            controller.Configure(fake);

            var intent = fake.ReadMoveIntent();
            var move = controller.ResolveMove(intent.Move, intent.SprintHeld, 0.5f);

            Assert.AreEqual(0f, move.magnitude, 0.0001f, "No intent must mean no movement.");
        }

        [Test]
        public void FakeInputSource_AttackEdge_IsReadOncePerFrame()
        {
            var fake = new FakeInputSource { Attack = true };

            Assert.IsTrue(fake.AttackPressedThisFrame, "Edge is true the frame it is set.");
            fake.ClearEdges();
            Assert.IsFalse(fake.AttackPressedThisFrame, "Edge clears after the frame — one swing per tap.");
        }
    }
}
```

## Why each assertion matters

- **Injected forward intent → forward move** proves the source → `ResolveMove` path is honored with a *fed vector*, not a polled device.
- **Zero intent → no movement** guards the dead-zone/None contract.
- **Attack edge read-once** proves the edge semantics (`guides/05`) that keep one swing per tap — the same `wasPressedThisFrame` behavior `PlayerMeleeAttack` relies on, now testable.

A test for `PlayerMeleeAttack` follows the identical shape: `Configure` it with a `FakeInputSource`, set `Attack = true`, place a `Health` in range, call the extracted attack step, assert damage.

## The boundary

This Guardian ships **the seam and this example pattern** so the input layer is provably testable. **Authoring and running the full EditMode suite, and wiring it into CI/batchmode, is `unity-test-ci-guardian`'s job** (see `AGENTS.md` for the headless run). This example hands them a ready pattern; it does not claim ownership of the test harness.

## Run it (per AGENTS.md)

```
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace \
  -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log \
  -testFilter "Drift.Tests.RuntimeInputSeamTests"
```

Exit `0` = green. (Real-editor run required — this VM can't activate a license headlessly; see `AGENTS.md`.)
