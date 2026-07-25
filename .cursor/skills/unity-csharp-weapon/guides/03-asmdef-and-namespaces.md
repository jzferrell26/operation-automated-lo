# 03 — asmdef and Namespaces

Drift compiles into a single runtime assembly with a deliberate namespace split. The two-spine duplication is resolved; reintroducing a second assembly or spine is a finding.

## The single runtime assembly

`Assets/Scripts/Drift.Runtime.asmdef` defines the one gameplay assembly (`Assets/Scripts/Drift.Runtime.asmdef`):

```json
{
    "name": "Drift.Runtime",
    "rootNamespace": "Drift",
    "references": ["Unity.InputSystem"],
    "autoReferenced": true,
    "allowUnsafeCode": false,
    "noEngineReferences": false
}
```

Everything under `Assets/Scripts/Drift/` compiles here. Key facts:

- **`rootNamespace: "Drift"`** — new files Unity creates here default to a `Drift.*` namespace.
- **`references: ["Unity.InputSystem"]`** — this is load-bearing. The committed `main` once failed to compile (`CS0234`) because `Drift.Runtime` did **not** reference `Unity.InputSystem` while `TopDownPlayerController` used `UnityEngine.InputSystem` (`AGENTS.md` build history, 2026-06-15). Any new dependency on a package assembly (e.g. `com.unity.ai.navigation` in Tier 1) must be added here, or it won't compile.
- **`allowUnsafeCode: false`** — keep it false unless there's a real reason (there isn't, in Tier 0).

## The namespace split

The assembly is one compilation unit; the namespaces give it structure. Three branches under `Drift`, matching the folder layout (`ARCHITECTURE.md` §2):

| Namespace | Owns | Examples |
|---|---|---|
| `Drift.Core.*` | Engine-agnostic-ish primitives the whole game leans on | `Drift.Core.Combat.Health`, `Drift.Core.Survival.OxygenSystem`, `SurvivalMeter`, `SuitPowerSystem`, `LifeSupportZone` |
| `Drift.Data.*` | ScriptableObject content + data structs | `Drift.Data.Items.ItemDefinition`, `ItemDatabase`, `Drift.Data.Crafting.RecipeDefinition` |
| `Drift.Gameplay.*` | Scene-facing behaviours that compose the above | `Drift.Gameplay.Player.TopDownPlayerController`, `Drift.Gameplay.AI.MutatedCrewEnemy`, `Drift.Gameplay.Inventory.SalvageInventory`, `Drift.Gameplay.Bootstrap.Tier0RuntimeSpawner` |

The namespace declares which layer the file belongs to. A file's `namespace` and its folder must agree. `Drift.Gameplay.Combat.PlayerMeleeAttack` sitting in `Core/` (or vice versa) is a finding.

## Dependency direction

Dependencies flow **inward**: `Gameplay` → `Data` → `Core`. Concretely:

- `Core` knows nothing about `Gameplay` or `Data`. `Health`, `SurvivalMeter` are self-contained. (`OxygenSystem` lives in `Core.Survival` and depends on `Core.Combat.Health` — same layer, fine.)
- `Data` may reference `Data` (`RecipeDefinition` → `ItemDefinition`) but not `Gameplay`.
- `Gameplay` composes everything: `TopDownPlayerController` uses `Drift.Core.Survival.SuitPowerSystem`; `SalvageInventory` uses `Drift.Data.Items.ItemDefinition`.

A `using Drift.Gameplay...` inside a `Core` file inverts the dependency and is a **should-refactor** — it's the first crack that later forces an assembly split or a circular reference.

## The test assembly

EditMode tests live in their own Editor-only assembly: `Assets/Tests/EditMode/Drift.Tests.EditMode.asmdef`, which references `Drift.Runtime` + `UnityEngine.TestRunner`/`UnityEditor.TestRunner` + `nunit.framework` (`ARCHITECTURE.md` §1). This is correct asmdef discipline:

- Tests reference runtime, never the reverse. Runtime code has no test dependency.
- The test assembly is Editor-platform-only, so test code never ships in a build.

Authoring those tests is `unity-test-ci-guardian`'s job — this Guardian only ensures the runtime code they target is shaped to be testable (see `10-editmode-safe-patterns.md`).

## Why NOT split the runtime assembly further (yet)

It's tempting to give `Core`, `Data`, `Gameplay` each their own asmdef. **Don't, in Tier 0.** Reasons:

- The two-spine consolidation (`ARCHITECTURE.md` §2) exists precisely because duplicated/split assemblies caused drift. Adding splits now re-opens that wound.
- More asmdefs = more compile boundaries to wire and more `CS0234` foot-guns (exactly the bug that broke `main`).
- Assembly splits earn their keep when compile times hurt or you need platform-specific exclusion. Tier 0 has neither problem.

A new `*.asmdef` appearing under `Assets/Scripts/Drift/` is a **must-fix** unless it's a deliberate, flagged, ADR-backed decision (and it shouldn't be in Tier 0). See `templates/drift-runtime.asmdef.json` for the canonical shape.

## Findings to raise

- **Must-fix:** a second runtime asmdef or a reintroduced parallel spine; a new package dependency used in code without adding the reference to `Drift.Runtime.asmdef` (compile break).
- **Should-refactor:** namespace not matching folder/layer; a `Core`/`Data` file `using` a `Gameplay` namespace (inverted dependency).
- **Style:** a missing/imprecise namespace on a new file (should be `Drift.<Layer>.<Area>`).
