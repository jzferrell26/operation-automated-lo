# unity-build-weapon

The procedural arsenal for `unity-build-guardian`, DRIFT's Unity 6 → device build pipeline
specialist.

## What this weapon covers

- **Build targets & profiles** — `BuildTarget` / `NamedBuildTarget`, Unity 6 Build Profiles, the DRIFT target set
- **Android build chain** — IL2CPP backend, ARM64, Gradle + custom templates, AAB vs APK, target/min SDK
- **Android signing** — `keytool` keystore, upload key vs Play App Signing, Play Asset Delivery (forward)
- **iOS build chain** — Xcode project generation, `PBXProject` post-process, fastlane (`match`/`gym`/`pilot`) — design-level
- **Player Settings** — scripting backend, managed stripping + `link.xml`, IL2CPP code-gen trade
- **Scripted builds** — `BuildPipeline.BuildPlayer` + an editor build menu + `-executeMethod` CLI entry
- **Addressables** — content vs player build, remote catalogs, PAD — **forward / Tier-1, not in the manifest**
- **Build-size budget** — `BuildReport` teardown, stripping, the size budget (co-owned with mobile-game-perf)
- **Versioning** — `bundleVersion` / `versionCode` / `CFBundleVersion`, single-source derivation
- **CI builds** — `game-ci/unity-builder`, co-located with `unity-test-runner` (co-owned with unity-test-ci)

## Reading order

1. Read `SKILL.md` — master index, hard rules, routing table, severity rubric, cross-Guardian handoffs
2. Read `guides/00-principles.md` — tier-discipline-first and the non-negotiables
3. Open the guide matching your task (see the routing table in `SKILL.md`)
4. Reference `research/research-summary.md` for the source synthesis (authored in DEGRADED mode)

## The first rule, and the load-bearing one

**Lead with tier discipline.** `AGENTS.md` states the Tier 0 deliverable has **no scene to build**,
and `CLAUDE.md §7` states the **human runs device builds**. This Weapon is the build pipeline
**DESIGN + CI scaffolding** — it is never a directive to go produce APKs mid-Tier-0. The build
ends at the signed `.aab`/`.ipa`; from there, `app-store-submission-guardian` takes over.
