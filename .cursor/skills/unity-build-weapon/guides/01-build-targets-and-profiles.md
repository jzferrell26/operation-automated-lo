# 01 — Build Targets & Build Profiles

How DRIFT selects what to build. Unity 6 introduced **Build Profiles** as the modern replacement
for the legacy Build Settings scene-list + per-platform-settings model.

> **Tier note:** DRIFT has no buildable scene in Tier 0 (`AGENTS.md`). Author the profiles and
> the target plan now as Tier-1 prep; the human runs the actual build (`CLAUDE.md §7`).

## Targets

Unity has two related concepts:

- **`BuildTarget`** — the platform enum passed to `BuildPipeline.BuildPlayer`
  (`BuildTarget.Android`, `BuildTarget.iOS`).
- **`NamedBuildTarget`** — the settings scope for Player Settings APIs
  (`NamedBuildTarget.Android`, `NamedBuildTarget.iOS`). Use this for
  `PlayerSettings.SetScriptingBackend(...)` etc., not the deprecated `BuildTargetGroup` overloads.

The DRIFT target set (mobile, portrait):

| Target | `BuildTarget` | `NamedBuildTarget` | Output |
|---|---|---|---|
| Android | `BuildTarget.Android` | `NamedBuildTarget.Android` | `.aab` (store) / `.apk` (test) |
| iOS | `BuildTarget.iOS` | `NamedBuildTarget.iOS` | Xcode project → `.ipa` (macOS) |

No standalone/desktop target ships — DRIFT is a mobile portrait game (`CLAUDE.md §1`).

## Switching the active target

`BuildPipeline.BuildPlayer` builds for the **active** build target. Switching is expensive
(reimports platform assets). In a scripted build, switch explicitly and deterministically:

```csharp
EditorUserBuildSettings.SwitchActiveBuildTarget(BuildTargetGroup.Android, BuildTarget.Android);
```

In CI, the GameCI image is usually started already pinned to the target, avoiding a mid-job switch.

## Build Profiles (Unity 6)

Build Profiles let you save a named, per-platform build configuration (scene list, scripting
defines, Player Settings overrides) as an asset under `Assets/Settings/Build Profiles/`. Benefits
for DRIFT:

- **Per-target overrides** without a monolithic Player Settings blob (e.g. an `Android-Dev` profile
  with `Development Build` on and a faster stripping level, vs an `Android-Release` profile).
- **A reviewable asset.** The profile is committed and diffable — better than tribal knowledge of
  which checkboxes to tick.
- **Scene-list per profile** — relevant once Tier 1 authors real scenes; in Tier 0 there is no
  scene to list (`AGENTS.md`).

**Forward-guidance:** create `Android-Release`, `Android-Dev`, and `iOS-Release` profiles in Tier 1
when a buildable scene exists. Do not stand them up to "build" an empty Tier-0 project.

## What this guide does NOT cover

- The contents of Player Settings (stripping, backend) → `guides/05-player-settings.md`.
- The Android Gradle/IL2CPP specifics → `guides/02`.
- The scripted invocation → `guides/06`.

## Severity

- **Must-fix:** building the wrong active target silently (e.g. an iOS profile producing an Android
  artifact because the active target wasn't switched).
- **Should-refactor:** a single profile doing dev and release duty with manual checkbox flipping
  between builds — split into `-Dev` / `-Release` profiles.
