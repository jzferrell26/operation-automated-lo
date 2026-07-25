# Example 03 — asmdef and namespace setup

Goal: show the canonical two-assembly setup (runtime + test), how a new file picks its namespace, and the dependency direction — using Drift's real structure.

## The runtime assembly

There is exactly one gameplay assembly, `Assets/Scripts/Drift.Runtime.asmdef`:

```json
{
    "name": "Drift.Runtime",
    "rootNamespace": "Drift",
    "references": ["Unity.InputSystem"],
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "autoReferenced": true,
    "noEngineReferences": false
}
```

Everything under `Assets/Scripts/Drift/` compiles here. The `"Unity.InputSystem"` reference is load-bearing: without it `TopDownPlayerController`'s `using UnityEngine.InputSystem` fails to compile (`CS0234`) — this exact omission once broke `main` (`AGENTS.md` build history). Any new package dependency used in code (e.g. `com.unity.ai.navigation` in Tier 1) must be added to this `references` array.

## The test assembly

EditMode tests live in a separate, Editor-only assembly, `Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef`:

```json
{
    "name": "Drift.Tests.EditMode",
    "rootNamespace": "Drift.Tests",
    "references": ["Drift.Runtime"],
    "includePlatforms": ["Editor"],
    "precompiledReferences": ["nunit.framework.dll"],
    "overrideReferences": true,
    "defineConstraints": ["UNITY_INCLUDE_TESTS"]
}
```

(It also pulls `UnityEngine.TestRunner` / `UnityEditor.TestRunner` via the Test Framework package — `ARCHITECTURE.md` §1.) The direction is one-way: **tests reference runtime, never the reverse.** `includePlatforms: ["Editor"]` means test code never ships in a player build. Authoring this assembly and its tests is `unity-test-ci-guardian`'s lane; this Guardian ensures the runtime code it targets is shaped to be testable.

## Picking a namespace for a new file

A new file's namespace = `Drift.<Layer>.<Area>`, and it must match the folder it lives in (`03-asmdef-and-namespaces.md`, `09-the-drift-spine.md`):

| New file | Folder | Namespace |
|---|---|---|
| A reusable HP-like primitive | `Drift/Core/Combat/` | `Drift.Core.Combat` |
| A new survival meter | `Drift/Core/Survival/` | `Drift.Core.Survival` |
| A new content data SO | `Drift/Data/Items/` | `Drift.Data.Items` |
| A scene-facing player behaviour | `Drift/Gameplay/Player/` | `Drift.Gameplay.Player` |
| Editor menu tooling | `Drift/Editor/` | `Drift.Editor` (Editor assembly) |

```csharp
// Assets/Scripts/Drift/Core/Survival/HungerSystem.cs
using Drift.Core.Combat;          // same layer — fine
using UnityEngine;

namespace Drift.Core.Survival     // matches the folder
{
    public class HungerSystem : MonoBehaviour { /* ... */ }
}
```

## Dependency direction

Dependencies flow inward — `Gameplay → Data → Core` — and never back out:

```
Drift.Gameplay.Player.TopDownPlayerController
    └─ using Drift.Core.Survival;            ✅ Gameplay → Core

Drift.Data.Crafting.RecipeDefinition
    └─ using Drift.Data.Items;               ✅ Data → Data

Drift.Core.Survival.OxygenSystem
    └─ using Drift.Core.Combat;              ✅ Core → Core (same layer)
    └─ using Drift.Gameplay...;              ❌ Core → Gameplay (inverted — should-refactor)
```

A `using Drift.Gameplay...` inside a `Core` or `Data` file inverts the dependency and is the first crack that later forces a painful assembly split. Catch it in review.

## Why NOT split the runtime assembly now

It's tempting to give `Core`, `Data`, `Gameplay` separate asmdefs. **Don't, in Tier 0** (`03-asmdef-and-namespaces.md`):

- The two-spine consolidation exists *because* duplicated/split assemblies caused drift (`ARCHITECTURE.md` §2).
- More asmdefs = more compile boundaries = more `CS0234` foot-guns (the exact class of bug that broke `main`).
- Assembly splits earn their keep when compile times hurt or you need platform exclusion — Tier 0 has neither.

A new `*.asmdef` under `Assets/Scripts/Drift/` is a **must-fix** unless it's a deliberate, ADR-backed decision (and it shouldn't be in Tier 0). The canonical runtime shape is in `templates/drift-runtime.asmdef.json`.

## Findings this example anchors

- **Must-fix:** a second runtime asmdef; a package dependency used without adding its reference to `Drift.Runtime.asmdef`.
- **Should-refactor:** namespace ≠ folder; a `Core`/`Data` file `using` a `Gameplay` namespace.
