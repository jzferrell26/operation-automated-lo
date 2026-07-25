# Example 01 — Scripted Android AAB Build + Editor Menu

A worked walkthrough of a reproducible Android AAB build via `BuildScript.cs` — the editor menu, the
`BuildPipeline.BuildPlayer` core, env-fed signing, and reading the Build Report.

> **Tier framing (read first):** this is **Tier-1 prep**. Tier 0 has no scene to build (`AGENTS.md`),
> and the human runs the device build (`CLAUDE.md §7`). The deliverable here is the *script*, which
> should compile cleanly (editor C#, co-owned with `unity-csharp-guardian`) — not a built APK.

## The shape

`templates/BuildScript.cs` is the full file; this example narrates the key moves.

### 1. One core method, two entry points

```csharp
[MenuItem("DRIFT/Build/Android AAB (Release)")]
public static void BuildAndroidReleaseMenu() => BuildAndroid(development: false, appBundle: true);

// CI calls this via -executeMethod / game-ci/unity-builder buildMethod
public static void BuildAndroidRelease() => BuildAndroid(development: false, appBundle: true);
```

The menu (human) and the CLI method (CI) call the **same** `BuildAndroid(...)`. They cannot diverge —
which is the whole point (`guides/06 §2`).

### 2. Settings in code, not editor state

```csharp
PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64;
PlayerSettings.SetManagedStrippingLevel(NamedBuildTarget.Android, ManagedStrippingLevel.High);
EditorUserBuildSettings.buildAppBundle = appBundle;   // true => .aab
```

Set explicitly so the build doesn't depend on the last person's checkboxes (`guides/05`, `guides/02`).

### 3. Signing from environment variables — never hardcoded

```csharp
PlayerSettings.Android.useCustomKeystore = true;
PlayerSettings.Android.keystoreName = Env("DRIFT_KEYSTORE_PATH");
PlayerSettings.Android.keystorePass = Env("DRIFT_KEYSTORE_PASS");
PlayerSettings.Android.keyaliasName = Env("DRIFT_KEY_ALIAS");
PlayerSettings.Android.keyaliasPass = Env("DRIFT_KEY_ALIAS_PASS");
```

The keystore + passwords come from env/CI secrets (`guides/03 §2`). A committed keystore or hardcoded
password is a **must-fix**.

### 4. Versioning from a single source

```csharp
PlayerSettings.bundleVersion             = Env("DRIFT_VERSION", "0.0.0");
PlayerSettings.Android.bundleVersionCode = int.Parse(Env("DRIFT_BUILD_NUMBER", "0"));
```

CI populates these from `git describe` + the run number (`guides/09`).

### 5. Build, then read the Report

```csharp
var report = BuildPipeline.BuildPlayer(options);
if (report.summary.result != BuildResult.Succeeded)
    throw new BuildFailedException($"{report.summary.totalErrors} errors");

LogLargestAssets(report);   // build-size teardown, guides/08 — co-owned with mobile-game-perf
```

Failing loudly on `BuildResult.Failed` is what makes CI catch a broken artifact.

### 6. The Tier-0 reality check

If you run this in Tier 0, `EditorBuildSettings.scenes` is empty (no scene — `AGENTS.md`), so the
build errors or produces an empty player. **That's expected.** Do not add a placeholder scene to make
it pass — that violates tier discipline (`guides/11`). The Tier-0-appropriate verification is that
the *script compiles*.

## What this example does NOT do

- It does not run a device build (that's the human, `CLAUDE.md §7`).
- It does not sign for the Play Store from committed secrets (env only).
- It does not handle store upload (that's `app-store-submission-guardian`).

## Handoffs

- Full file → `templates/BuildScript.cs`.
- Run it in CI → `examples/02-gameci-android-build-workflow.md`.
- The Build Report teardown → `examples/03-build-size-teardown.md`.
