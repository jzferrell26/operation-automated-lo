# 02 — Android: IL2CPP & Gradle

The Android build chain. Unity 6 → IL2CPP (C# → C++ → native) → Gradle → AAB/APK.

> **Tier note:** design + scripting only; Tier 0 has no scene to build (`AGENTS.md`), and the
> human runs the device build (`CLAUDE.md §7`). Some defaults below should be **verified in-editor**
> against the resolved Unity version (`6000.0.77f1` on this VM; pin `6000.0.23f1`).

## 1. Scripting backend: IL2CPP

Mono is not a shipping option for ARM64 Play Store releases. Set IL2CPP explicitly in a scripted
build so the config is reproducible, not a leftover editor checkbox:

```csharp
PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
```

IL2CPP transpiles managed code to C++, then compiles it natively. This is what makes managed code
**stripping** matter for build size (`guides/05`, `guides/08`).

## 2. Architecture: ARM64

```csharp
PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
```

Google Play requires 64-bit. Include `ARMv7` **only** if you must support very old devices — it
roughly doubles the native payload. For DRIFT (mid-tier modern Android target,
`mobile-game-perf-guardian`'s reference class), ship **ARM64-only**.

## 3. Gradle

Unity generates a Gradle project for the Android build. The supported override seam is **custom
Gradle templates** under `Assets/Plugins/Android/`:

- `mainTemplate.gradle` — app-module Gradle (dependencies, AGP config).
- `gradleTemplate.properties` — `gradle.properties` (e.g. `android.useAndroidX=true`, JVM args).
- `settingsTemplate.gradle` — repositories / included modules.
- `launcherTemplate.gradle` — the launcher module.

Enable these from **Project Settings → Player → Publishing Settings → Build** (the "Custom *
Gradle Template" checkboxes). Editing the generated project directly is lost on regeneration —
**templates are the durable seam**, the same way iOS uses `PBXProject` post-process (`guides/04`).

**Gradle is the most common Android build-break source:** AGP/Gradle/JDK version mismatches, a
plugin needing a repository the template doesn't declare, or an `android:exported` manifest issue
on newer target SDKs. When a CI Android build fails, read the **Gradle** log, not just Unity's.

## 4. Output: AAB vs APK

```csharp
EditorUserBuildSettings.buildAppBundle = true;   // .aab for the Play Store
// false -> .apk for direct install / side-load / CI smoke
```

- **AAB** (Android App Bundle) — the Play Store format. Google generates optimized per-device APKs
  from it, shrinking what each user downloads. Required for new Play apps.
- **APK** — a single installable. Use for QA side-load, device testing, and CI smoke builds.

Detail on signing the AAB → `guides/03`. Detail on Play Asset Delivery (raising the size ceiling)
→ `guides/03 §4`.

## 5. API levels

```csharp
PlayerSettings.Android.minSdkVersion    = AndroidSdkVersions.AndroidApiLevel24; // example
PlayerSettings.Android.targetSdkVersion = AndroidSdkVersions.AndroidApiLevelAuto; // tracks installed SDK
```

Google raises the **required target API level** for new uploads annually. **Do not hardcode a
floor from memory** — verify the current requirement on the Play Console before a release build
(`research/research-summary.md` open questions). `minSdkVersion` is a product decision (how old a
device you support) co-owned with the human/product owner.

## Severity

- **Must-fix:** Mono backend for a store release; ARMv7-only (no 64-bit) shipping.
- **Should-refactor:** no custom Gradle template seam (so injected deps/config get lost on
  regeneration); APK where AAB is correct for the store.
- **Style:** template formatting.

## Handoffs

- Signing the AAB / keystore → `guides/03`.
- Build size of the IL2CPP payload → `guides/08` (co-owned with `mobile-game-perf-guardian`).
- Running the build in CI → `guides/10`.
