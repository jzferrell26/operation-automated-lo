# Research Plan — unity-build-weapon

**Depth tier:** deep
**Mode:** DEGRADED — authored from model knowledge. Firecrawl/Exa web-research tooling
was unavailable in this environment. Sources below are named by reference, not fetched;
verify version-specific details against the live docs before relying on them.

## Backlog queries

1. **Android IL2CPP / Gradle / AAB** — Unity 6 Android build pipeline: IL2CPP scripting
   backend, Gradle project export, custom Gradle templates, AAB output, ARM64-only
   shipping, target/min SDK levels.
2. **iOS Xcode / fastlane** — Unity 6 iOS build: Xcode project generation, `PBXProject`
   post-process, fastlane `gym`/`match`/`pilot`, signing & provisioning, post-bitcode era.
3. **Addressables** — content build vs player build separation, `addressables_content_state.bin`,
   remote catalogs, Play Asset Delivery integration; framed as forward / Tier-1 (not yet
   in `Packages/manifest.json`).
4. **Player Settings / build-size** — `PlayerSettings` scripting backend, managed code
   stripping, IL2CPP code generation, Build Report (`UnityEditor.Build.Reporting`),
   build-size budgets and teardown.
5. **GameCI build** — `game-ci/unity-builder` GitHub Action, `UNITY_LICENSE` secret,
   activation, Library cache, build matrix, relationship to `game-ci/unity-test-runner`.
6. **Android signing / keystore / PAD** — keystore creation (`keytool`), upload key vs app
   signing key, Play App Signing, `PlayerSettings.Android` keystore fields, Play Asset
   Delivery asset packs.

## Sources by name (named, not fetched in this degraded run)

- Unity 6 Manual — Android: "Building for Android", "Gradle for Android", "Android Player
  settings", "Optimize for mobile", "Play Asset Delivery for Unity".
- Unity 6 Manual — iOS: "Building for iOS", "Structure of a Unity Xcode project",
  "iOS Player settings", `OnPostprocessBuild` / `PBXProject` API.
- Unity 6 Manual — "Build Profiles", `BuildPipeline.BuildPlayer`, `BuildPlayerOptions`,
  `UnityEditor.Build.Reporting.BuildReport`.
- Unity Addressables package docs — "Build scripts", "Content update workflow",
  "Addressables & Asset Bundles", "Play Asset Delivery".
- GameCI docs — `game-ci/unity-builder`, `game-ci/unity-activate`, the builder/test-runner
  action pair, licensing matrix (Personal vs Pro).
- Google Play docs — "App signing by Google Play", "About Android App Bundles",
  "Play Asset Delivery", target API level requirements.
- Apple docs — "Distributing your app for beta testing and releases", App Store Connect API.
- fastlane docs — `gym`, `match`, `pilot`, `deliver`.
- **Internal primary sources (authoritative for this repo):** `AGENTS.md`,
  `CLAUDE.md`, `ARCHITECTURE.md`, `TIER0.md`, `ProjectSettings/ProjectVersion.txt`,
  `Packages/manifest.json`.

## Verification flags

- Exact Unity 6 default target API level and ARM64-only defaults: **verify in-editor.**
- Whether Addressables ships any modules by default: **verify against the live manifest** —
  it is NOT in `Packages/manifest.json` today.
- `game-ci/unity-builder` action version tags and Unity 6 image availability: **verify on
  the GameCI release page.**
- iOS specifics cannot be exercised on this Linux VM: **design-level only.**
