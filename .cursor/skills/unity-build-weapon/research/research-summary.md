# Research Summary — unity-build-weapon

> **RESEARCH MODE: DEGRADED — authored from model knowledge; Firecrawl/Exa unavailable in
> this environment; verify version-specific details against current Unity 6 docs before
> relying on them.** Where a number, default, or version tag matters (target API level,
> action version, Addressables presence), the guide marks it for in-editor / live-docs
> verification rather than asserting it. Internal repo facts (`AGENTS.md`, `CLAUDE.md`,
> `Packages/manifest.json`, the Unity pin) are authoritative and cited directly.

This synthesis answers the six backlog queries that scope `unity-build-weapon`.

---

## 1. Android: IL2CPP / Gradle / AAB

Unity 6 ships mobile players with the **IL2CPP** scripting backend (Mono is not a shipping
option for ARM64 stores). IL2CPP transpiles C# → C++ → native, then Unity hands a **Gradle**
project to the Android toolchain. Practical shape:

- **Backend:** `PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP)`.
- **Architecture:** ship **ARM64** (`AndroidArchitecture.ARM64`). Google Play requires 64-bit;
  including ARMv7 only bloats the binary unless you must support very old devices.
- **Gradle:** Unity generates a Gradle project. Custom `mainTemplate.gradle` /
  `gradleTemplate.properties` / `settingsTemplate.gradle` under `Assets/Plugins/Android/`
  let you inject dependencies, repositories, and AGP settings without losing them on
  regeneration. Custom Gradle templates are the supported override seam.
- **Output:** prefer **AAB** (`EditorUserBuildSettings.buildAppBundle = true`) for Play Store;
  **APK** for direct install / side-load / CI smoke. AAB defers per-device splitting to Play.
- **API levels:** set target and min via `PlayerSettings.Android.targetSdkVersion` /
  `minSdkVersion`. Google raises the **required target API level** annually — **verify the
  current floor on the Play Console before a release build.**

Detail lives in `guides/02-android-il2cpp-gradle.md`. **Tier note:** Tier 0 has no scene to
build (`AGENTS.md`); this is design + scripting, run by the human in Tier 1.

## 2. Android: signing / keystore / AAB / PAD

- **Keystore:** create with `keytool -genkeypair -v -keystore drift-upload.keystore
  -alias drift -keyalg RSA -keysize 2048 -validity 10000`. Store the keystore + passwords
  **out of git**, injected via env/CI secrets — never commit them.
- **Play App Signing:** the modern model is **Google manages the app signing key**; you hold
  an **upload key**. If you ever lose the upload key, Google can reset it. This decouples the
  irreplaceable signing key from your CI.
- **Unity fields:** `PlayerSettings.Android.keystoreName` / `keystorePass` / `keyaliasName` /
  `keyaliasPass` — feed these from environment variables in a scripted build; do not hardcode.
- **AAB vs APK:** AAB → Play (Google generates optimized per-device APKs). APK → testing.
- **Play Asset Delivery (PAD):** asset packs delivered install-time / fast-follow / on-demand,
  raising the effective size ceiling past the base AAB limit. Unity exposes PAD via asset-pack
  configuration; this is **Tier-1 forward guidance** — DRIFT has no shippable content yet.

Detail in `guides/03-android-signing-and-aab.md` + `templates/android-keystore-setup.md`.

## 3. iOS: Xcode / fastlane

Unity does **not** produce an `.ipa` directly — it generates an **Xcode project**, which Xcode
(macOS only) compiles and signs. This Linux VM cannot exercise the iOS path; treat it as
**design-level**.

- **Generation:** `BuildPipeline.BuildPlayer` with `BuildTarget.iOS` emits the Xcode project.
- **Post-process:** an `[OnPostprocessBuild]` callback using `UnityEditor.iOS.Xcode.PBXProject`
  patches entitlements, capabilities, Info.plist keys, and build settings deterministically
  in CI (rather than hand-editing the generated project).
- **fastlane:** `match` (shared signing certs/profiles in a git repo), `gym` (archive → `.ipa`),
  `pilot` (TestFlight upload), `deliver` (metadata). The build pipeline ends at the `.ipa`;
  `app-store-submission-guardian` owns everything past that.
- **Bitcode:** deprecated/removed by Apple in the modern Xcode era — disable it; don't design
  around it.

Detail in `guides/04-ios-xcode-and-fastlane.md` + `templates/fastlane-Fastfile`.

## 4. Addressables (forward / Tier-1)

**Addressables is NOT in `Packages/manifest.json` today** — confirmed against the live
manifest. So this is forward guidance, framed for Tier 1+ when DRIFT has real content.

- Addressables separates **content builds** from **player builds**: `addressables_content_state.bin`
  tracks the shipped catalog so you can ship content updates without a full player rebuild.
- Local vs remote groups; remote catalogs enable hot content updates (subject to store policy).
- On Android, Addressables can be delivered via **Play Asset Delivery** asset packs.
- **Do not add the package mid-Tier-0** (`CLAUDE.md §6` Rule #1 — one tier at a time). Adding
  it is a deliberate Tier-1 decision with an ADR.

Detail in `guides/07-addressables.md`.

## 5. Player Settings / build size

- **Managed stripping:** `PlayerSettings.SetManagedStrippingLevel` (Low/Medium/High). Higher =
  smaller, but can strip reflection-used types — guard with a `link.xml`.
- **IL2CPP code generation:** "Faster (smaller) builds" vs "Faster runtime" — a size/runtime
  trade. Co-own the runtime side with `mobile-game-perf-guardian`.
- **Build Report:** `UnityEditor.Build.Reporting.BuildReport` (returned by `BuildPipeline.BuildPlayer`)
  enumerates the largest asset contributors — the canonical teardown instrument. Build size
  budget & teardown are **co-owned with mobile-game-perf-guardian** (they own runtime cost).

Detail in `guides/05-player-settings.md` + `guides/08-build-size-budget.md`.

## 6. CI builds with GameCI

- **`game-ci/unity-builder`** is the build action; **`game-ci/unity-test-runner`** is the test
  action `unity-test-ci-guardian` owns. Both consume the same `UNITY_LICENSE` secret and the
  same Unity-version image, and live in the **same `.github/workflows/` tree** — co-own the
  workflow, don't duplicate license plumbing.
- **Licensing:** Personal license activation is interactive (matches the `AGENTS.md` VM note);
  CI typically uses a serialized `.ulf` injected as `UNITY_LICENSE` / `UNITY_EMAIL` /
  `UNITY_PASSWORD` secrets. **Verify the current activation flow on the GameCI docs.**
- **Cache `Library/`** between runs for speed (the same Library that `AGENTS.md` redirects to
  tmpfs locally).
- **Tier note:** a build job that has no scene to build will fail or no-op — gate the build
  workflow behind "a buildable scene exists" so it doesn't run red during Tier 0.

Detail in `guides/10-ci-builds-gameci.md` + `templates/gameci-unity-build.yml`.

---

## Five most load-bearing facts (repo-grounded)

1. **No buildable scene in Tier 0** — `AGENTS.md` ("the Tier 0 deliverable has no scene to
   build"). The whole Guardian is pipeline DESIGN + CI scaffolding, not a build-now directive.
2. **The human runs device builds** — `CLAUDE.md §7`. This Guardian scaffolds and automates.
3. **Unity pin `6000.0.23f1`** (`ProjectVersion.txt`; `6000.0.77f1` resolved on the VM).
4. **Addressables absent from `Packages/manifest.json`** — forward guidance only.
5. **CI build (`unity-builder`) co-lives with CI test (`unity-test-runner`)** — co-owned with
   `unity-test-ci-guardian`; finished signed binaries hand off to `app-store-submission-guardian`.

## Open questions for ongoing accuracy

- Current Google Play required **target API level** floor (raised annually).
- Exact `game-ci/unity-builder` version tag + Unity 6 image availability.
- Whether the team will adopt Addressables in Tier 1 (gates `guides/07`).
- iOS signing specifics (untestable on this Linux VM).
