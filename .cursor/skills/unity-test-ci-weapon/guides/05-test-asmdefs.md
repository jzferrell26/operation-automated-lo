# 05 — Test Assembly Definitions

A Unity test assembly is an `.asmdef` that pulls in the TestRunner + NUnit references and (for EditMode) restricts itself to the Editor platform. DRIFT's is `Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef`. This guide walks it field-by-field, because a wrong field here means the suite doesn't compile or doesn't run.

## The DRIFT test asmdef

```json
{
    "name": "Drift.Tests.EditMode",
    "rootNamespace": "Drift.Tests",
    "references": [
        "UnityEngine.TestRunner",
        "UnityEditor.TestRunner",
        "Drift.Runtime"
    ],
    "includePlatforms": ["Editor"],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": true,
    "precompiledReferences": ["nunit.framework.dll"],
    "autoReferenced": false,
    "defineConstraints": ["UNITY_INCLUDE_TESTS"],
    "versionDefines": [],
    "noEngineReferences": false
}
```

## Field-by-field

| Field | Value | Why |
|---|---|---|
| `name` | `Drift.Tests.EditMode` | the assembly name; `-testFilter "Drift.Tests.RuntimeOxygenTests"` matches the namespace, which is `rootNamespace` |
| `rootNamespace` | `Drift.Tests` | every suite is `namespace Drift.Tests` — keeps test classes out of the runtime namespace |
| `references[0..1]` | `UnityEngine.TestRunner`, `UnityEditor.TestRunner` | the UTF runtime + editor runner; without these `[Test]`/`[TearDown]` won't resolve |
| `references[2]` | `Drift.Runtime` | the system-under-test assembly — this is how tests `using Drift.Core.Survival` etc. |
| `includePlatforms` | `["Editor"]` | **EditMode tests compile only for the Editor.** This is what makes it an *EditMode* assembly. A PlayMode assembly leaves this empty. |
| `overrideReferences` | `true` | required so `precompiledReferences` is honored — lets the assembly explicitly pull in `nunit.framework.dll` |
| `precompiledReferences` | `["nunit.framework.dll"]` | the NUnit assertion library; `Assert`, `CollectionAssert`, `[Test]` live here |
| `autoReferenced` | `false` | the test assembly is not auto-referenced by other assemblies — nothing should depend *on* the tests |
| `defineConstraints` | `["UNITY_INCLUDE_TESTS"]` | the assembly only compiles when test support is enabled. In a player build (`UNITY_INCLUDE_TESTS` undefined) the tests are excluded — they never ship in the game. |
| `noEngineReferences` | `false` | tests need `UnityEngine` (`GameObject`, `Vector3`, `ScriptableObject.CreateInstance`) |

## The two fields that make it "EditMode"

1. **`includePlatforms: ["Editor"]`** — restricts compilation to the editor.
2. **`defineConstraints: ["UNITY_INCLUDE_TESTS"]`** — gates the whole assembly on test support being on.

Together they guarantee the test code never leaks into a player build and runs under `-testPlatform EditMode`.

## The runtime side

`Drift.Runtime.asmdef` (`Assets/Scripts/`) is the assembly under test. Per `ARCHITECTURE.md §1` it references `Unity.InputSystem` (this was one of the two `CS0234`/`CS0246` compile blockers fixed on the feature branch — see `AGENTS.md` build history). The test asmdef references `Drift.Runtime` so all gameplay types are visible.

`overrideReferences: true` + `autoReferenced: false` is the standard test-assembly pairing: the test assembly explicitly declares everything it needs and exposes nothing back.

## A PlayMode asmdef, when you add one

If a PlayMode suite is ever needed (`guides/09-playmode-tests.md`), it's a *separate* asmdef — you don't mix EditMode and PlayMode tests in one assembly, because the platform restriction differs:

```json
{
    "name": "Drift.Tests.PlayMode",
    "rootNamespace": "Drift.Tests",
    "references": ["UnityEngine.TestRunner", "Drift.Runtime"],
    "includePlatforms": [],
    "excludePlatforms": [],
    "overrideReferences": true,
    "precompiledReferences": ["nunit.framework.dll"],
    "autoReferenced": false,
    "defineConstraints": ["UNITY_INCLUDE_TESTS"]
}
```

Differences from EditMode: `includePlatforms` is empty (PlayMode tests run in a play session, not editor-only), and `UnityEditor.TestRunner` is dropped (no editor-only API). Put it under a sibling `Assets/Tests/PlayMode/` folder.

## How to review an asmdef change

- [ ] `includePlatforms: ["Editor"]` present for EditMode — if missing, the suite tries to compile into the player.
- [ ] `UNITY_INCLUDE_TESTS` constraint present — keeps tests out of builds.
- [ ] `Drift.Runtime` referenced — else the systems under test won't resolve.
- [ ] `nunit.framework.dll` in `precompiledReferences` with `overrideReferences: true` — else `Assert` won't resolve.
- [ ] `.meta` file handled per the repo's convention. Note this repo deliberately commits **no** `.meta` files today — `AGENTS.md` states "There is no Scene, no `.meta` files… Unity regenerates these on first open." Unity generates an asmdef's `.meta` (carrying its GUID) on import; if/when the project starts committing `.meta` files, the asmdef's must be committed alongside it so references resolve by GUID. Until then, don't expect one in the tree.
