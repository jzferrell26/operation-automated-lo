# 09 — Versioning & Determinism

Two version numbers, one source of truth, no hand-bumping. A build that can't be reproduced from a
git SHA is a build you can't debug.

> **Tier note:** design the scheme now; the human runs the versioned device build (`CLAUDE.md §7`),
> Tier 0 has no scene to build (`AGENTS.md`).

## 1. The two-number model (per platform)

Every mobile platform separates a **human-readable marketing version** from a **machine-monotonic
build number**:

| | Android | iOS |
|---|---|---|
| Human-readable | `bundleVersion` → `versionName` (e.g. `0.3.1`) | `bundleVersion` → `CFBundleShortVersionString` |
| Monotonic int | `versionCode` (e.g. `412`) | `buildNumber` → `CFBundleVersion` |

In Unity:

```csharp
PlayerSettings.bundleVersion = "0.3.1";              // both platforms read this
PlayerSettings.Android.bundleVersionCode = 412;      // Android monotonic int
PlayerSettings.iOS.buildNumber = "412";              // iOS build number (string)
```

The **monotonic int is the store's identity for the upload**. Google Play rejects an AAB whose
`versionCode` is ≤ a previously uploaded one. A colliding or non-monotonic `versionCode` is a
**must-fix** — it's a hard upload rejection.

## 2. Single-source derivation

Never hand-bump per build. Derive both numbers from one source so every build is traceable:

- **Marketing version** — from a tag or a `VERSION` file (e.g. `git describe --tags`).
- **`versionCode` / build number** — from the **CI run number** or a monotonic git count
  (`git rev-list --count HEAD`). Both are strictly increasing.

In the scripted build (`templates/BuildScript.cs`), read these from environment variables that CI
populates:

```csharp
PlayerSettings.bundleVersion          = Environment.GetEnvironmentVariable("DRIFT_VERSION") ?? "0.0.0";
PlayerSettings.Android.bundleVersionCode = int.Parse(
    Environment.GetEnvironmentVariable("DRIFT_BUILD_NUMBER") ?? "0");
```

So the same script + same env → the same versioned artifact, locally and in CI.

## 3. Reproducibility / determinism

A "deterministic build" means: same source + same Unity version + same settings → equivalent
artifact. Levers:

- **Pin the Unity version** — already done (`ProjectVersion.txt` → `6000.0.23f1`; `6000.0.77f1`
  resolved on the VM). Patch upgrades within `6000.0` LTS are permitted (`TIER0.md`).
- **Pin the toolchain** — Android SDK/NDK/JDK and Gradle/AGP versions (via the CI image and Gradle
  templates, `guides/02`).
- **Settings in code** — Player Settings set by the script, not editor state (`guides/05`, `guides/06`).
- **Embed the SHA** — stamp the build with the git SHA (a build-info SO or a define) so a crash
  report maps back to exact source.

Full byte-for-byte reproducibility is hard in Unity (timestamps, IL2CPP); aim for **equivalent +
traceable**, not bit-identical.

## Severity

- **Must-fix:** non-monotonic / colliding `versionCode` (store rejection); hand-bumped version with
  no single source (untraceable builds).
- **Should-refactor:** version values inlined in the script instead of read from env/CI; no SHA
  stamped into the build.
- **Style:** version-string formatting.

## Handoffs

- CI populating the version env vars → `guides/10`, `templates/gameci-unity-build.yml`.
- The store-side meaning of the version (what users see) → `app-store-submission-guardian`.
- Addressables content-state versioning (forward) → `guides/07`.
