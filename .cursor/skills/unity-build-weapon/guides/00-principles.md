# 00 — Principles

The non-negotiables. Read on every invocation.

## The principles

### 1. Tier discipline first — read the no-scene fact before anything else

`AGENTS.md` is explicit: *"Do not run the production `-buildTarget`/player build to verify; the
Tier 0 deliverable has no scene to build. Use the EditMode tests instead."* DRIFT is mid-Tier-0
(`CLAUDE.md §3`), and `CLAUDE.md §6` Rule #1 is "build top-down, one tier at a time." Therefore
**every response from this Weapon leads with**: *this is build-pipeline DESIGN + CI scaffolding;
device builds are Tier-1 / human, not a mid-Tier-0 directive.* Never tell anyone to go produce an
APK now. Source: `AGENTS.md`, `CLAUDE.md §3`/`§6`, `guides/11-tier-and-human-handoff.md`.

### 2. The human runs device builds

`CLAUDE.md §7` assigns "device builds" to the **human**. This Guardian **designs the pipeline,
authors the scripted build, and scaffolds CI** — it does not flash devices or claim a verified
device build. Source: `CLAUDE.md §7`.

### 3. The build ends at the signed artifact; submission begins there

The boundary with `app-store-submission-guardian` is the artifact. This Guardian produces the signed
`.aab` / `.ipa`; submission, ASO, review, and IAP are theirs. Hand over the binary cleanly; don't
freelance into store listing. Source: `guides/11`, the sibling Guardian `app-store-submission-guardian`.

### 4. IL2CPP + ARM64 AAB is the Android shipping target

Unity 6 ships mobile with IL2CPP (Mono is not a store option for ARM64). Ship an AAB targeting
ARM64 for the Play Store; APK is for testing/side-load/CI smoke. Source: `guides/02`, `guides/03`.

### 5. Secrets never enter git

Keystore files and passwords are injected via environment variables / CI secrets, never committed.
Use Play App Signing — Google holds the irreplaceable signing key; you hold a resettable upload
key. Source: `guides/03`, `templates/android-keystore-setup.md`.

### 6. Builds are scripted, not click-built

`BuildPipeline.BuildPlayer` + an editor build menu + a CLI `-executeMethod` entry point. A
release build a human clicks together in the Build Settings dialog is non-reproducible and a
**should-refactor** (must-fix for a release). Source: `guides/06`, `templates/BuildScript.cs`.

### 7. Read the Build Report; budget the size — co-owned with perf

`BuildPipeline.BuildPlayer` returns a `BuildReport`; `UnityEditor.Build.Reporting` enumerates the
largest contributors. Build **size** and teardown are **co-owned with `mobile-game-perf-guardian`**
— this Guardian owns the build-time size pass; perf owns runtime cost. Source: `guides/08`.

### 8. Version deterministically

`bundleVersion` / `versionCode` (Android), `CFBundleVersion` (iOS) derive from a single source
(git describe / CI run number), never hand-bumped per build. Colliding `versionCode`s are a Play
upload rejection. Source: `guides/09`.

### 9. CI build is `game-ci/unity-builder`, co-located with the test runner

The build action (`unity-builder`) lives in the same `.github/workflows/` tree as
`unity-test-ci-guardian`'s test action (`unity-test-runner`), sharing `UNITY_LICENSE` plumbing.
**Co-own the workflow**; don't duplicate license setup. Source: `guides/10`.

### 10. Addressables is forward / Tier-1

Addressables is **not** in `Packages/manifest.json` today. Treat it as design for Tier 1+; adding
the package is a deliberate ADR, not a Tier-0 move. Source: `guides/07`, `Packages/manifest.json`.

### 11. iOS is design-level on this VM

This Linux VM cannot compile or sign an iOS build (that needs macOS + Xcode). Never claim a
verified iOS build; mark iOS guidance "design-level; verify on macOS." Source: `guides/04`, `AGENTS.md`.

---

## First-move checklist

- [ ] Tier confirmed; response framed as "pipeline design + CI scaffolding," not build-now.
- [ ] `ProjectVersion.txt` Unity pin read (`6000.0.23f1`); `Packages/manifest.json` checked (no Addressables).
- [ ] Invocation classified per the routing table in `SKILL.md`.
- [ ] Severity rubric in mind (must-fix / should-refactor / style).
- [ ] Cross-Guardian handoff lines clear — escalate at the boundary.

## Cross-Guardian boundaries

The full table lives in `SKILL.md`. Short version: surface at the boundary; don't author the other
Guardian's work.

| Question | Owner |
|---|---|
| Store listing, ASO, submission, review, IAP | `app-store-submission-guardian` |
| Runtime perf (frame budget, GC, draw calls) | `mobile-game-perf-guardian` (build size **co-owned**) |
| CI for tests (`unity-test-runner`), EditMode wiring | `unity-test-ci-guardian` (workflow **co-owned**) |
| Gameplay C# architecture, asmdef/namespaces | `unity-csharp-guardian` |
| Flashing devices / device farm | the **human** (`CLAUDE.md §7`) |
| PRD authoring for a Tier-1 build subsystem | `library-guardian` |

## Severity rubric

| Severity | Examples | Blocks merge? |
|---|---|---|
| **Must-fix** | Keystore/passwords in git; Mono backend for a store release; "build device binaries now" mid-Tier-0; CI build job red because no scene; colliding `versionCode`; click-built release | Yes |
| **Should-refactor** | APK where AAB is correct; no Gradle template seam; no Build Report teardown; stripping at default with no `link.xml`; duplicated license plumbing; hand-edited iOS post-process | No — opens follow-up |
| **Style** | Menu/lane naming, comment phrasing | Never |

Calling a style nit "must-fix" destroys credibility for the next finding.

## Citation discipline

Every finding cites (1) **where** — an absolute repo path (`Assets/.../BuildScript.cs:LN`) or the
governing repo file (`AGENTS.md`, `CLAUDE.md §7`), and (2) **why** — a guide section
(`guides/03 §2`) or a named external doc. Never fabricate a URL. Do not invent store policy floors
or action version tags — flag them for live verification.
