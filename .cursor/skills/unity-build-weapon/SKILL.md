---
name: unity-build-weapon
description: Designs the Unity 6 → device build pipeline and CI build scaffolding for PROJECT-DRIFT — Android (IL2CPP, Gradle, AAB vs APK, keystore/signing, Play Asset Delivery, ARM64, target API levels), iOS (Xcode project generation, fastlane, signing/provisioning — design-level), Unity 6 Build Profiles & Player Settings, scripted builds via BuildPipeline.BuildPlayer + an editor build menu, Addressables (forward/Tier-1), build-size budget & teardown via the Build Report, build determinism/versioning, and CI builds via GameCI game-ci/unity-builder. Use when the user says "set up the Android build", "scripted build / editor build menu", "create a keystore", "AAB vs APK", "Play Asset Delivery", "iOS Xcode build / fastlane", "Build Profiles", "managed stripping / build size", "version code / bundle version", "GameCI build workflow", or when unity-build-guardian is invoked. Do NOT use for store listing / submission / ASO / IAP (app-store-submission-guardian), runtime performance (mobile-game-perf-guardian), the test side of CI / EditMode wiring (unity-test-ci-guardian), or general gameplay C# architecture (unity-csharp-guardian). TIER NOTE: AGENTS.md says Tier 0 has no scene to build and CLAUDE.md §7 says the human runs device builds — this Weapon is pipeline DESIGN + CI scaffolding, NOT a build-now directive.
license: MIT
---

# unity-build-weapon

You are equipping **unity-build-guardian** — DRIFT's authority on the Unity 6 → device build
pipeline. This Weapon encodes the Android and iOS build chains, Build Profiles & Player
Settings, scripted builds, Addressables (forward), build-size teardown, versioning, and GameCI
build automation into opinionated, repo-grounded guides.

**Tier discipline is the first move, every time.** `AGENTS.md` states the Tier 0 deliverable has
**no scene to build** ("Do not run the production `-buildTarget`/player build to verify; the Tier
0 deliverable has no scene to build"). `CLAUDE.md §7` states the **human runs device builds**. So
this Weapon designs the pipeline and authors the CI scaffolding — it does **not** tell anyone to
go produce APKs mid-Tier-0.

---

## First move on every invocation

1. **Confirm the tier and the "no scene" reality.** Read `CLAUDE.md §3` (mid-Tier-0), `§6` Rule #1
   (one tier at a time) and `§7` (human runs device builds), and the `AGENTS.md` line that the
   Tier 0 deliverable has no scene to build. Lead the response from there. See
   `guides/00-principles.md` Rule #1 and `guides/11-tier-and-human-handoff.md`.
2. **Read the build surface.** `ProjectSettings/ProjectVersion.txt` (Unity pin `6000.0.23f1`),
   `Packages/manifest.json` (note: **no** `com.unity.addressables` today), `AGENTS.md` (headless
   VM constraints, license activation).
3. **Classify the invocation** and route to the guide(s) below.
4. **Read `guides/00-principles.md`** before writing any finding — severity rubric and cross-Guardian
   handoffs live there.

---

## Routing table

| Invocation | Primary guide(s) | Output |
|---|---|---|
| Build targets / Unity 6 Build Profiles setup | `01-build-targets-and-profiles.md` | Profile/target plan |
| Android IL2CPP + Gradle build | `02-android-il2cpp-gradle.md` | Backend + Gradle template plan |
| Android signing / keystore / AAB / PAD | `03-android-signing-and-aab.md`, `templates/android-keystore-setup.md` | Keystore + signing setup |
| iOS Xcode generation + fastlane (design-level) | `04-ios-xcode-and-fastlane.md`, `templates/fastlane-Fastfile` | Xcode post-process + fastlane lanes |
| Player Settings (stripping, IL2CPP codegen) | `05-player-settings.md` | Settings audit |
| Scripted build + editor build menu | `06-scripted-builds.md`, `templates/BuildScript.cs` | `BuildScript.cs` + menu items |
| Addressables (forward / Tier 1) | `07-addressables.md` | Forward design + ADR pointer |
| Build-size budget & teardown | `08-build-size-budget.md`, `examples/03-build-size-teardown.md` | Build Report teardown (co-own perf) |
| Versioning / determinism | `09-versioning-and-determinism.md` | versionCode/bundleVersion scheme |
| CI build with GameCI | `10-ci-builds-gameci.md`, `templates/gameci-unity-build.yml` | `unity-builder` workflow (co-own test-ci) |
| Tier discipline / human handoff | `11-tier-and-human-handoff.md` | Scope guard + handoff note |
| ADR (e.g. adopt Addressables, AAB-only) | Relevant topic guide | `library/architecture/ADR-<n>-<topic>.md` |

---

## Hard rules

| # | Rule | Guide |
|---|---|---|
| 1 | **Tier discipline first.** Tier 0 has no scene to build (`AGENTS.md`); lead every answer from "pipeline DESIGN + CI scaffolding, not build-now." | `00`, `11` |
| 2 | **The human flashes devices (`CLAUDE.md §7`).** Author the script + CI; do not run device builds. | `11` |
| 3 | **Hand finished signed binaries to `app-store-submission-guardian`.** Build ends at the `.aab`/`.ipa`; submission begins there. | `11` |
| 4 | **Ship IL2CPP + ARM64 AAB on Android.** Mono/ARMv7-only is not a shipping target for the Play Store. | `02`, `03` |
| 5 | **Keystore + passwords never enter git.** Inject via env/CI secrets; use Play App Signing (Google holds the signing key, you hold the upload key). | `03` |
| 6 | **Builds are scripted, not click-built.** `BuildPipeline.BuildPlayer` + an editor menu + CI — deterministic, reproducible, reviewable. | `06` |
| 7 | **Read the Build Report; budget the size.** Build size & teardown are **co-owned with `mobile-game-perf-guardian`** (they own runtime cost). | `08` |
| 8 | **Version deterministically.** `bundleVersion` / `versionCode` (Android) and `CFBundleVersion` (iOS) derive from a single source (git/CI), never hand-bumped ad hoc. | `09` |
| 9 | **CI build = `game-ci/unity-builder`, co-located with `unity-test-runner`.** Co-own the workflow with `unity-test-ci-guardian`; don't duplicate `UNITY_LICENSE` plumbing. | `10` |
| 10 | **Addressables is Tier-1 forward guidance** — it is NOT in `Packages/manifest.json`; adding it is a deliberate Tier-1 ADR. | `07` |
| 11 | **iOS is design-level here.** This Linux VM cannot build iOS; never claim a verified iOS build. | `04` |

---

## Severity rubric

- **Must-fix** — keystore/passwords committed to git; building with Mono backend for a store
  release; telling the team to build device binaries mid-Tier-0 (violates `AGENTS.md` / tier
  discipline); a CI build job that runs red because there is no scene; non-deterministic
  versioning that collides `versionCode`s; click-built (un-scripted) release build.
- **Should-refactor** — APK where AAB is correct for the store; no custom Gradle template seam;
  no Build Report teardown step; managed stripping at default with no `link.xml`; duplicated
  license plumbing across the build and test workflows; iOS post-process hand-edited instead of
  scripted via `PBXProject`.
- **Style** — menu item naming, lane naming, comment phrasing. Never block on style alone.

Severity is credibility. Calling a style nit "must-fix" destroys trust for the next finding.

---

## Cross-Guardian handoffs

| Concern | Owner | unity-build-weapon's role |
|---|---|---|
| Store listing, ASO, submission, review, IAP/billing | `app-store-submission-guardian` | Produce + hand over the signed `.aab`/`.ipa` |
| Runtime performance (frame budget, GC, draw calls) | `mobile-game-perf-guardian` | **Co-own** build size & teardown (Build Report) |
| CI for **tests** (`unity-test-runner`), EditMode/PlayMode wiring | `unity-test-ci-guardian` | **Co-own** the workflow; own the `unity-builder` build job |
| Gameplay C# architecture, asmdef/namespaces | `unity-csharp-guardian` | Own build-related editor C# (`BuildScript.cs`, post-process callbacks) |
| Flashing devices, device-farm runs | the **human** (`CLAUDE.md §7`) | Scaffold + automate the path; never flash |
| PRD authoring for a Tier-1 build subsystem | `library-guardian` | Provide architectural rationale + phased plan |

---

## Output paths

Reports land in the **host repo's `library/` tree**, never inside this Weapon.

- **Standalone build-pipeline reviews / audits** → `library/qa/unity-build/<date>-<topic>.md`
- **ADRs** (adopt Addressables, AAB-only, CI provider choice) → `library/architecture/ADR-<n>-<topic>.md`

---

## Guides

Read `00-principles.md` on every invocation; then the topic guide(s) the invocation demands.

- `guides/00-principles.md` — tier-discipline-first, the no-scene fact, human-flashes-devices, severity rubric, cross-Guardian boundaries, citation discipline.
- `guides/01-build-targets-and-profiles.md` — `BuildTarget`/`NamedBuildTarget`, Unity 6 Build Profiles, active-target switching, the DRIFT target set.
- `guides/02-android-il2cpp-gradle.md` — IL2CPP backend, ARM64, Gradle project + custom templates, AAB vs APK output, target/min SDK.
- `guides/03-android-signing-and-aab.md` — `keytool` keystore, upload key vs Play App Signing, Unity keystore fields from env, AAB output, Play Asset Delivery (forward).
- `guides/04-ios-xcode-and-fastlane.md` — Xcode project generation, `PBXProject` post-process, fastlane `match`/`gym`/`pilot`, signing, bitcode-era notes (design-level only).
- `guides/05-player-settings.md` — scripting backend, managed stripping + `link.xml`, IL2CPP code-gen size/runtime trade, per-platform overrides.
- `guides/06-scripted-builds.md` — `BuildPipeline.BuildPlayer` + `BuildPlayerOptions`, the editor build menu, reading the returned `BuildReport`, CLI `-executeMethod`.
- `guides/07-addressables.md` — content vs player build, `addressables_content_state.bin`, remote catalogs, PAD integration; **forward / Tier-1, not in the manifest**.
- `guides/08-build-size-budget.md` — `BuildReport` teardown, largest-asset triage, stripping levels, size budget; **co-owned with `mobile-game-perf-guardian`**.
- `guides/09-versioning-and-determinism.md` — `bundleVersion` / `versionCode` / `CFBundleVersion`, single-source derivation from git/CI, reproducible builds.
- `guides/10-ci-builds-gameci.md` — `game-ci/unity-builder`, `UNITY_LICENSE`, Library cache, build matrix; **co-owned workflow with `unity-test-ci-guardian`**.
- `guides/11-tier-and-human-handoff.md` — no Tier-0 scene (`AGENTS.md`), human runs device builds (`CLAUDE.md §7`), handoff to `app-store-submission-guardian`.

## Examples

- `examples/01-scripted-android-aab-build.md` — a `BuildScript.cs` editor menu + `BuildPipeline.BuildPlayer` producing an Android AAB, env-fed keystore, reading the Build Report.
- `examples/02-gameci-android-build-workflow.md` — a `game-ci/unity-builder` Android workflow that complements `unity-test-ci-guardian`'s test workflow (shared license, gated on a buildable scene).
- `examples/03-build-size-teardown.md` — a Build Report teardown pass: largest contributors, stripping, the size budget, co-owned with `mobile-game-perf-guardian`.

## Templates

- `templates/BuildScript.cs` — editor build menu + `BuildPipeline.BuildPlayer` (Android AAB + iOS), env-fed signing, Build Report logging, `-executeMethod` entry points.
- `templates/gameci-unity-build.yml` — the `game-ci/unity-builder` GitHub Actions workflow (Android), co-located with the test workflow.
- `templates/fastlane-Fastfile` — iOS fastlane lanes (`match` / `gym` / `pilot`) — design-level.
- `templates/android-keystore-setup.md` — `keytool` keystore creation + Play App Signing + secret-injection runbook.

## Research

`research/research-plan.md` + `research/research-summary.md`. **Authored in DEGRADED mode** (no
web tooling); version-specific facts are flagged for verification. Internal repo sources
(`AGENTS.md`, `CLAUDE.md`, `Packages/manifest.json`, the Unity pin) are authoritative.

---

## Output conventions

- **All file paths in findings are absolute** when referencing project files. Relative when
  referencing guides in this Weapon.
- **Every claim is sourced** — a guide section, an internal repo file (`AGENTS.md` line), or a
  named external doc. Do not fabricate URLs.
- **Do not invent versions or store policy floors.** Read the Unity pin from `ProjectVersion.txt`;
  flag target-API-level / action-version facts for live verification.
- **Lead every response from tier discipline.** This is design + scaffolding, not a build-now order.

## When in doubt

- Asked to "just build the APK now" mid-Tier-0? Stop, restate the no-scene reality (`AGENTS.md`),
  and reframe as pipeline design / CI scaffolding.
- iOS specifics you can't verify on this Linux VM? Say "design-level; verify on macOS."
- A question crosses into store submission, runtime perf, the test side of CI, or gameplay C#?
  Hand off at the boundary per the cross-Guardian table.
