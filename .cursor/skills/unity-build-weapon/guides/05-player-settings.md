# 05 — Player Settings

The settings that shape the binary: scripting backend, code stripping, IL2CPP code generation.
Set these in a **scripted build** (`templates/BuildScript.cs`) so they're reproducible, not
editor-checkbox state that drifts.

> **Tier note:** design + scripting; the human runs the build (`CLAUDE.md §7`), Tier 0 has no
> scene (`AGENTS.md`). Build size is **co-owned with `mobile-game-perf-guardian`** — see `guides/08`.

## 1. Scripting backend & API compatibility

```csharp
PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.Android, ApiCompatibilityLevel.NET_Standard_2_1);
```

IL2CPP for both Android and iOS (Mono is not a shipping mobile backend). `.NET Standard 2.1` is the
smaller, more portable profile; use the full `.NET Framework` profile only if a dependency requires
it (it bloats the build).

## 2. Managed code stripping

```csharp
PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.High);
```

Stripping removes unused managed code from the IL2CPP build — a primary build-size lever. Levels:
`Disabled` → `Low` → `Medium` → `High` (and `Minimal`). Higher = smaller, but the linker can strip
types only reached via **reflection** or **serialization**, causing runtime `MissingMethod` /
`TypeLoad` errors.

**Guard with a `link.xml`** under `Assets/` to preserve types the linker can't see:

```xml
<linker>
  <assembly fullname="Drift.Runtime" preserve="all"/>
</linker>
```

DRIFT is data-driven via ScriptableObjects (`CLAUDE.md §6` Rule #3); SO types resolved by name and
any reflection-touched code are the classic stripping casualties — verify on-device after raising
the level. Raising stripping with no `link.xml` and no on-device verification is a **should-refactor**.

## 3. IL2CPP code generation

```csharp
PlayerSettings.SetIl2CppCodeGeneration(NamedBuildTarget.Android, Il2CppCodeGeneration.OptimizeSize);
// vs Il2CppCodeGeneration.OptimizeSpeed
```

- **OptimizeSize** ("Faster (smaller) builds") — smaller binary, can be marginally slower at runtime.
- **OptimizeSpeed** ("Faster runtime") — larger binary, faster generic-heavy code.

This is a **size ↔ runtime trade** — co-own the runtime side with `mobile-game-perf-guardian`.
For a mid-tier-targeted top-down mobile game, size usually wins; verify with the Build Report
(`guides/08`) and on-device profiling (perf-guardian).

## 4. Other size/correctness-relevant settings

- **Splash screen** — Unity 6 Personal can disable the Unity splash (verify your license tier).
- **Graphics APIs** — Android: Vulkan + GLES3 fallback is the common mobile pair (perf-guardian
  co-owns the runtime choice).
- **Strip Engine Code** (engine-module stripping) — part of the size budget (`guides/08`).
- **Per-platform overrides** — Player Settings APIs take a `NamedBuildTarget`, so Android and iOS
  carry independent values. Set both explicitly in the scripted build.

## Severity

- **Must-fix:** none here are inherently must-fix (these are tuning) — except shipping with the
  wrong backend (`guides/02`).
- **Should-refactor:** stripping raised with no `link.xml` and no on-device verification; settings
  left as editor-checkbox state instead of set in the scripted build; full `.NET Framework` profile
  with no dependency requiring it.
- **Style:** ordering of settings in the script.

## Handoffs

- Build-size teardown / the Build Report → `guides/08` (co-owned with `mobile-game-perf-guardian`).
- Runtime cost of codegen/graphics-API choices → `mobile-game-perf-guardian`.
- The scripted build that applies these → `guides/06`, `templates/BuildScript.cs`.
