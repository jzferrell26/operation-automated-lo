# Example 03 — An EditMode AI Test, Stepped Deterministically

**Goal:** show the exact pattern for testing enemy AI in EditMode, modeled directly on the shipped `Assets/Tests/EditMode/RuntimeEnemyTests.cs`. This is the pattern every AI change must satisfy (CLAUDE.md Hard Rule #11). It runs in `Drift.Tests.EditMode` (`Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef`).

## 1. Why this pattern exists

Unity does **not** run `Awake`/`Start`/`Update` on script-added components in EditMode (`ARCHITECTURE.md` §7). So an AI test cannot rely on lifecycle methods or `Time.deltaTime`. Instead it:

1. builds the actors with `AddComponent`,
2. injects dependencies with `Configure(...)`,
3. drives the FSM by calling `Step(deltaSeconds)` with explicit time,
4. asserts on the state `Step` returns (or the `State` property),
5. controls the world *between* steps to force each branch,
6. tears down with `DestroyImmediate`.

## 2. The skeleton (lifted from `RuntimeEnemyTests`)

```csharp
using System.Collections.Generic;
using Drift.Core.Combat;
using Drift.Gameplay.AI;
using NUnit.Framework;
using UnityEngine;

namespace Drift.Tests
{
    public class MyEnemyAiTests
    {
        readonly List<Object> _created = new();

        [TearDown]
        public void TearDown()
        {
            for (var i = 0; i < _created.Count; i++)
                if (_created[i] != null) Object.DestroyImmediate(_created[i]);   // NOT Destroy
            _created.Clear();
        }

        // --- the five building blocks ---

        MutatedCrewEnemy CreateEnemy(Vector3 position, out GameObject go)
        {
            go = Track(new GameObject("Enemy"));
            go.transform.position = position;
            go.AddComponent<Health>();                     // RequireComponent dependency
            return go.AddComponent<MutatedCrewEnemy>();
        }

        GameObject CreatePlayer(Vector3 position, out Health health)
        {
            var go = Track(new GameObject("Player"));
            go.transform.position = position;
            health = go.AddComponent<Health>();
            return go;
        }

        T Track<T>(T value) where T : Object { _created.Add(value); return value; }
    }
}
```

## 3. Testing a transition (one step)

The simplest test: place the player in detect range, `Configure`, step once, assert the returned state. This is `RuntimeEnemyTests.Enemy_DetectsPlayerInRange_AndEntersChase` (`RuntimeEnemyTests.cs:32-40`):

```csharp
[Test]
public void Enemy_EntersChase_WhenPlayerInRange()
{
    var enemy = CreateEnemy(Vector3.zero, out _);
    var player = CreatePlayer(new Vector3(0f, 0f, 5f), out _);
    enemy.Configure(player.transform, Vector3.zero);

    Assert.AreEqual(EnemyState.Chase, enemy.Step(0.1f));   // assert on the RETURN value
}
```

## 4. Testing a multi-step transition + a guard

Some transitions need several steps (idle→chase→attack), and guards like cooldowns need *two* attempts to verify the second is blocked. This is `Enemy_Attacks_PlayerInRange_ThenRespectsCooldown` (`RuntimeEnemyTests.cs:77-95`):

```csharp
[Test]
public void Enemy_Attacks_ThenRespectsCooldown()
{
    var enemy = CreateEnemy(Vector3.zero, out _);
    var player = CreatePlayer(new Vector3(0f, 0f, 1f), out var playerHealth);
    enemy.Configure(player.transform, Vector3.zero);

    enemy.Step(0.1f);   // idle -> chase
    enemy.Step(0.1f);   // chase -> attack (in range)
    enemy.Step(0.1f);   // attack swing -> damages player, sets cooldown

    Assert.AreEqual(EnemyState.Attack, enemy.State);
    var hpAfterFirstSwing = playerHealth.Current;
    Assert.Less(hpAfterFirstSwing, playerHealth.Max);          // first swing landed

    enemy.Step(0.1f);                                          // still on cooldown
    Assert.AreEqual(hpAfterFirstSwing, playerHealth.Current);  // second swing blocked
}
```

## 5. Forcing a branch by controlling the world

To test Chase→Return, you don't need to move the enemy across the map — you set the **spawn anchor** far away via `Configure` so the enemy is already past its leash. This is `Enemy_ReturnsToSpawn_WhenLeashed` (`RuntimeEnemyTests.cs:97-107`):

```csharp
[Test]
public void Enemy_Leashes_AndReturns()
{
    var enemy = CreateEnemy(Vector3.zero, out _);
    var player = CreatePlayer(new Vector3(0f, 0f, 2f), out _);
    enemy.Configure(player.transform, new Vector3(0f, 0f, -30f));   // anchor beyond leash

    enemy.Step(0.1f);                                              // idle -> chase (idle ignores leash)
    Assert.AreEqual(EnemyState.Return, enemy.Step(0.1f));          // chase sees leash -> return
}
```

The lesson: **inject the world state that forces the branch** (anchor position, player distance) rather than simulating your way into it. Deterministic and fast.

## 6. Testing movement (not just state)

When the *action* matters (did Chase actually close the gap?), capture position before/after a step. This is `Enemy_Chase_MovesTowardThePlayer` (`RuntimeEnemyTests.cs:61-75`):

```csharp
[Test]
public void Enemy_Chase_ClosesTheGap()
{
    var enemy = CreateEnemy(Vector3.zero, out var go);
    var player = CreatePlayer(new Vector3(0f, 0f, 5f), out _);
    enemy.Configure(player.transform, Vector3.zero);

    enemy.Step(0.1f);   // -> chase
    var before = Vector3.Distance(go.transform.position, player.transform.position);
    enemy.Step(0.5f);   // chase movement
    var after = Vector3.Distance(go.transform.position, player.transform.position);

    Assert.Less(after, before, "Chasing enemy should close the gap.");
}
```

## 7. The coverage bar for any new state

For every state you add, write the four (`guides/08 §4`): the transition *into* it, the transition(s) *out of* it, the *action* it performs, and any *guard* (cooldown/timer). Use §3 for one-step transitions, §4 for guards, §5 to force branches via injected world state, §6 for movement actions.

## 8. Running it headless

Per `AGENTS.md`: after license activation + the tmpfs redirect,

```
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log \
  -testFilter "Drift.Tests.MyEnemyAiTests"
```

Do **not** pass `-quit` with `-runTests`. Run twice on a clean checkout (first run is the import pass). The harness/CI details are `unit-test-ci-guardian`'s; the *test design* above is co-owned with this Guardian.
