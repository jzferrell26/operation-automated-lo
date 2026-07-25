# 01 — Unity Test Framework

The Unity Test Framework (UTF, package `com.unity.test-framework`, listed in DRIFT's `Packages/manifest.json`) is NUnit-on-Unity. It runs in two platforms — **EditMode** and **PlayMode** — and surfaces in the editor under **Window → General → Test Runner**. Headless, it runs via batchmode (`guides/06-headless-batchmode-runs.md`).

DRIFT's suite is ten EditMode classes under `Assets/Tests/EditMode/`, all in the `Drift.Tests` namespace, compiled by `Drift.Tests.EditMode.asmdef`:

`RuntimePlayerTests`, `RuntimeLifeSupportTests`, `RuntimeObjectiveTests`, `RuntimeEnemyTests`, `RuntimeOxygenTests`, `RuntimeSuitPowerTests`, `RuntimeBuildPlannerTests`, `RuntimeInventoryTests`, `RuntimeSpawnerTests`, `RuntimeSalvageTests`.

## NUnit attributes you'll use

| Attribute | Meaning | DRIFT example |
|---|---|---|
| `[Test]` | A synchronous EditMode test | every method in `RuntimeOxygenTests` |
| `[TestCase(...)]` | Parameterized test (one method, many inputs) | not yet used; good for table-driven balance assertions |
| `[SetUp]` | Runs before each test | not used in DRIFT — tests arrange their own world inline |
| `[TearDown]` | Runs after each test | `DestroyImmediate` cleanup in every suite |
| `[UnityTest]` | A PlayMode coroutine test (`IEnumerator`) | reserved — see `guides/09-playmode-tests.md` |

DRIFT does **not** use `[SetUp]`: each test builds exactly the world it needs (a bare `OxygenSystem`, or a player + enemy pair), which keeps tests independent and readable. The shared machinery is the `Track<T>()` helper + `[TearDown]`, not a `[SetUp]` fixture.

## The DRIFT test shape

Every suite follows the same skeleton. From `RuntimeOxygenTests.cs`:

```csharp
public class RuntimeOxygenTests
{
    readonly List<Object> _created = new();           // track everything spawned

    [TearDown]
    public void TearDown()
    {
        for (var i = 0; i < _created.Count; i++)
            if (_created[i] != null)
                Object.DestroyImmediate(_created[i]); // EditMode-legal cleanup
        _created.Clear();
    }

    [Test]
    public void Oxygen_DrainsWhileEnabled_AndStopsWhenDisabled()
    {
        var oxygen = CreateOxygen();                  // arrange
        var startCurrent = oxygen.Meter.Current;

        oxygen.Tick(2f);                              // act — drive the extracted step directly
        Assert.Less(oxygen.Meter.Current, startCurrent, "Oxygen should drain while enabled.");
    }

    OxygenSystem CreateOxygen() => Track(new GameObject("OxygenOnly")).AddComponent<OxygenSystem>();

    T Track<T>(T value) where T : Object { _created.Add(value); return value; }
}
```

Note what is **not** here: no waiting for `Awake`, no `yield return null` to let `Update` run. The test calls `oxygen.Tick(2f)` itself, because in EditMode nothing else will (`guides/03-editmode-safe-design.md`).

## Naming convention

DRIFT uses `Subject_Behavior_Condition`:

- `Oxygen_DrainsWhileEnabled_AndStopsWhenDisabled`
- `Enemy_DetectsPlayerInRange_AndEntersChase`
- `Player_CannotSprint_WhenSuitPowerEmpty`
- `SimpleCrafter_OutputFull_DoesNotConsumeInputs`

The test name is the spec. A reviewer reading the method list sees the contract of the system under test without opening a body.

## The Test Runner window (for the human)

In a real editor: **Window → General → Test Runner**, select the **EditMode** tab, **Run All**. Results are green/red per test, and a failing assertion shows its message. This is the interactive equivalent of the headless run — and the interactive run is what finally turns CLAUDE.md §3's "green pending" into "green" (`guides/00-principles.md` Rule #7).

## Rules

- **No order dependence.** Each test arranges its own world; `[TearDown]` resets it. No test reads state another test left behind. (`SKILL.md` Hard Rule #10.)
- **One behavior per test.** `Oxygen_Refill_RestoresUpToMax` asserts only the refill/clamp contract; suffocation is a separate test.
- **The name is the spec.** If you can't name the test in `Subject_Behavior_Condition`, the test is doing too much.
