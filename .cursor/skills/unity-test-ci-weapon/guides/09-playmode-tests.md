# 09 — PlayMode Tests

DRIFT has **no** PlayMode tests today, and that's correct for Tier 0 — the spine is EditMode-testable by design (`guides/02-editmode-vs-playmode.md`). This guide is for the day a behavior genuinely needs frames or physics, so you add PlayMode tests without over-reaching.

## The mechanics

A PlayMode test is `[UnityTest]` returning `IEnumerator`, so it can `yield` to advance frames:

```csharp
using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;   // [UnityTest], yield helpers

public class PlayModeOxygenIntegration
{
    [UnityTest]
    public IEnumerator Oxygen_DrainsOverRealFrames_OutsideLifeSupport()
    {
        var go = new GameObject("Player");
        var oxygen = go.AddComponent<OxygenSystem>();   // here Awake/Update DO run
        var start = oxygen.Meter.Current;

        yield return null;                 // advance one frame — Update fires
        yield return new WaitForSeconds(1f); // advance ~1s of real frames

        Assert.Less(oxygen.Meter.Current, start, "Oxygen should drain across real frames.");

        Object.Destroy(go);                // Destroy is legal in PlayMode (not DestroyImmediate)
    }
}
```

Two differences from EditMode jump out:

1. **Lifecycle methods run.** `Awake`/`Start`/`Update` fire normally — so `OxygenSystem.Update` calls `Tick(Time.deltaTime)` each frame on its own. You don't call `Tick` yourself.
2. **`Object.Destroy`, not `DestroyImmediate`.** PlayMode is a running session; the deferred `Destroy` is correct (the reverse of EditMode's `DestroyImmediate` — `guides/00-principles.md` Rule #8).

## Yield helpers

| Yield | Effect |
|---|---|
| `yield return null` | advance one frame |
| `yield return new WaitForSeconds(t)` | advance ~`t` seconds of frames (scaled time) |
| `yield return new WaitForFixedUpdate()` | advance to the next physics step |
| `yield return new WaitForEndOfFrame()` | after rendering this frame |

## When a PlayMode test is justified (and when it isn't)

**Justified** — the behavior is inherently frame/physics/timing-coupled:
- the full assembled gray-box loop running in a real scene (descend → salvage → craft → fight → extract → survive) as an integration smoke test;
- a `CharacterController.Move` actually resolving against collider geometry over frames;
- `OnTriggerEnter`/`OnTriggerExit` firing from real overlap (e.g. stepping onto a `Tier0ShuttlePad`'s trigger);
- a coroutine that genuinely spans frames.

**Not justified** — you only wanted `Update` to run. The EditMode answer is to drive the extracted `Tick`/`Step` directly (`guides/03-editmode-safe-design.md`). `RuntimeOxygenTests` proves drain *and* suffocation without a single frame, by calling `oxygen.Tick(...)`. A PlayMode test that does the same thing with `yield return new WaitForSeconds` is slower and flakier for no gain — a **should-refactor** (`SKILL.md` Hard Rule #13).

## The asmdef

PlayMode tests live in a **separate** assembly with no editor-only platform restriction (`guides/05-test-asmdefs.md`):

```json
{
    "name": "Drift.Tests.PlayMode",
    "rootNamespace": "Drift.Tests",
    "references": ["UnityEngine.TestRunner", "Drift.Runtime"],
    "includePlatforms": [],
    "overrideReferences": true,
    "precompiledReferences": ["nunit.framework.dll"],
    "autoReferenced": false,
    "defineConstraints": ["UNITY_INCLUDE_TESTS"]
}
```

Put it under a sibling `Assets/Tests/PlayMode/`. Don't mix EditMode and PlayMode tests in one assembly — the platform restriction differs.

## Running PlayMode headless

Same batchmode command (`guides/06-headless-batchmode-runs.md`) with `-testPlatform PlayMode`:

```bash
~/unity-setup/Editor/Unity -batchmode \
  -projectPath /workspace \
  -runTests -testPlatform PlayMode \
  -testResults /tmp/results-playmode.xml -logFile /tmp/test-playmode.log
```

Note: PlayMode generally needs graphics more than EditMode — you may need `xvfb` here even though EditMode doesn't (`AGENTS.md` says `-nographics` with no `xvfb` is fine *for the test runs*, which to date means EditMode). Test the specific behavior; some headless PlayMode tests run fine with `-nographics`, others need a virtual display.

## Scene-backed PlayMode tests are co-owned

A PlayMode integration test that loads the authored Tier 0 `.unity` scene depends on that scene existing — which is `unity-mcp-guardian`'s deliverable (the gray-box is built by `Tier0RuntimeSpawner` in code today; the committed scene is theirs). Coordinate: this Guardian writes the test and the assertions; mcp-guardian provides the scene to load.
