# Unity Build Guardian — Dungeon Master's Guide

The Dungeon Master routing skill's record of when to invoke `unity-build-guardian`. Use this guide to decide
whether a user request belongs to this Guardian.

**Guardian:** [`agents/unity-build-guardian.md`](../../../../agents/unity-build-guardian.md)
**Weapon:** [`.claude/skills/unity-build-weapon/`](../../unity-build-weapon/)
**Command Brief:** [`ai-tools/command-briefs/unity-build-guardian-command-brief.md`](../../../../ai-tools/command-briefs/unity-build-guardian-command-brief.md)
**Trigger policy:** on-demand (not proactive)

---

## Domain

`unity-build-guardian` is PROJECT-DRIFT's Unity 6 → device build pipeline specialist. Its remit is
*how a Unity 6 (`6000.0.23f1` pinned) top-down portrait mobile space-survival game becomes a
reproducible, signed Android `.aab`/`.apk` and iOS `.ipa*, from a scripted build and from CI*: the
Android chain (IL2CPP backend, Gradle + custom templates, ARM64, AAB vs APK, target/min API levels,
keystore creation + Play App Signing, Play Asset Delivery), the iOS chain (Xcode project generation,
`PBXProject` post-process, fastlane `match`/`gym`/`pilot` — design-level on this Linux VM), Unity 6
Build Profiles & Player Settings (managed stripping + `link.xml`, IL2CPP code-gen), scripted builds
(`BuildPipeline.BuildPlayer` + an editor build menu + CLI `-executeMethod`), Addressables as Tier-1
forward guidance (it is **not** in `Packages/manifest.json`), build-size budget & teardown via the
`BuildReport`, deterministic versioning, and CI builds via GameCI `game-ci/unity-builder`.

**Tier discipline is central** — exactly as `save-load-guardian` treats persistence. `AGENTS.md`
states the Tier 0 deliverable has **no scene to build**, and `CLAUDE.md §7` assigns **device builds
to the human**. This Guardian does **pipeline DESIGN + CI scaffolding** — it never issues a build-now
directive mid-Tier-0 and never flashes a device. The build ends at the signed artifact; from there
`app-store-submission-guardian` takes over.

## Trigger phrases

Route to `unity-build-guardian` when the user says any of:

- "Set up the Android build" / "build an AAB" / "AAB vs APK for DRIFT"
- "Write a scripted build" / "add an editor build menu" / "`BuildPipeline.BuildPlayer`"
- "Create a keystore" / "Android signing" / "Play App Signing" / "Play Asset Delivery"
- "iOS Xcode build" / "set up fastlane" / "`match`/`gym`/`pilot`" / "generate the Xcode project"
- "Set up Build Profiles" / "Player Settings for the build" / "IL2CPP backend"
- "Reduce build size" / "managed stripping" / "`link.xml`" / "why is the build so big" (build-side)
- "Version code / bundle version" / "deterministic builds" / "stamp the git SHA"
- "GameCI build workflow" / "`game-ci/unity-builder`" / "CI build for DRIFT"
- "Add Addressables" (route here, but the Guardian will frame it as Tier-1 forward guidance + an ADR)

Or when the request implicitly involves the Unity → device build pipeline, build automation, signing,
or build-size from the build side.

## Do NOT route when

- The user wants **store listing, ASO, app submission, review/rejection handling, privacy nutrition
  labels, or IAP/billing config** — that is `app-store-submission-guardian`. (unity-build-guardian
  produces and signs the binary; submission publishes it. The boundary is the artifact.)
- The user wants **runtime performance** — frame budget, GC allocations, draw calls, texture/audio
  *import settings*, ASTC, sprite atlasing — that is `mobile-game-perf-guardian`. (Build **size** &
  teardown are **co-owned**: this Guardian owns the `BuildReport` pass, stripping, and the engine-module
  prune; perf owns the import-setting fixes and all runtime cost.)
- The user wants the **test side of CI** — `game-ci/unity-test-runner`, EditMode/PlayMode wiring, the
  headless batchmode run, the lmdb/license VM gotchas — that is `unity-test-ci-guardian`. (The CI
  **workflow** is **co-owned**: unity-build-guardian owns the `unity-builder` build job; test-ci owns
  the test job; `UNITY_LICENSE` plumbing is shared and defined once.)
- The user wants **general gameplay C# architecture** — MonoBehaviour shape, ScriptableObject data,
  asmdef/namespaces, the production spine — that is `unity-csharp-guardian`. (Build-related editor C#
  like `BuildScript.cs` and `[PostProcessBuild]` callbacks is **co-owned**: this Guardian owns the build
  logic; csharp-guardian owns the C# shape.)
- The user wants to **actually flash a device, run a device-farm pass, or produce the store build** —
  that is the **human** (`CLAUDE.md §7`). This Guardian scaffolds + automates the path.

If the request straddles boundaries (e.g. "ship DRIFT to the Play Store"), route to
`unity-build-guardian` first for the signed-AAB pipeline, then chain to `app-store-submission-guardian`
for the listing + submission. If it's "make the build smaller," co-route with `mobile-game-perf-guardian`.

## Inputs the Guardian needs

Before invoking, ensure the user has provided (or you can infer):

- The repo (`ProjectSettings/ProjectVersion.txt` for the Unity pin, `Packages/manifest.json` for the
  package/module set, `AGENTS.md` for the headless VM + no-scene constraints, `CLAUDE.md` §3/§6/§7).
- The target platform(s): Android, iOS, or both.
- The stage: pipeline design / scripted-build authoring / signing setup / CI wiring / build-size pass /
  versioning.
- Optional: whether a buildable scene exists yet (it does **not** in Tier 0 — `AGENTS.md`), which
  gates whether build work is "design" or "do."

If the request is "build the APK now" and DRIFT is still mid-Tier-0, the Guardian will not run a build —
it restates the no-scene reality (`AGENTS.md`) and reframes as pipeline design / CI scaffolding.

## Outputs the Guardian produces

- **Build-pipeline audits / designs** → `library/qa/unity-build/<date>-<topic>.md`.
- **Structural decisions** (adopt Addressables, AAB-only, prune unused engine modules, CI provider) →
  `library/architecture/ADR-<n>-<topic>.md`.
- **The scripted build / CI workflow / keystore runbook** → authored from the Weapon's templates,
  framed as Tier-1 prep (the human runs the device build, `CLAUDE.md §7`).
- **Code review** of build-related editor C# → file:line classified per the severity rubric.

Every finding cites (a) the repo path or governing file (`AGENTS.md`, `CLAUDE.md §7`) and (b) the
relevant guide in `unity-build-weapon/guides/`, plus the named external doc where applicable. Version-
specific facts (target API floor, GameCI action tag) are flagged for live verification (the Weapon's
research was authored in DEGRADED mode).

## Multi-Guardian sequences this Guardian participates in

- **Ship DRIFT to the stores (Tier 1+)** — `unity-build-guardian` designs + scaffolds the signed
  `.aab`/`.ipa` pipeline (keystore, Play App Signing, scripted build, CI); the **human** runs the
  device build (`CLAUDE.md §7`); `app-store-submission-guardian` takes the binary into store listing,
  privacy, review, and IAP. The build Guardian stops at the artifact.
- **Shrink the build** — `unity-build-guardian` runs the `BuildReport` teardown, raises managed
  stripping, and prunes unused engine modules; `mobile-game-perf-guardian` fixes texture/audio import
  settings (ASTC, atlasing) and confirms the runtime cost. Build size is co-owned.
- **CI for DRIFT** — `unity-test-ci-guardian` owns the `unity-test-runner` test gate (the Tier-0 CI
  gate); `unity-build-guardian` adds the `unity-builder` build job (gated until a buildable scene
  exists) in the same workflow, sharing the `UNITY_LICENSE` plumbing.
- **Adopt Addressables (Tier 1)** — `unity-build-guardian` writes the ADR + the content-build wiring;
  `library-guardian` writes the PRD if it's a feature; `mobile-game-perf-guardian` confirms the size
  impact.

## Critical directives the orchestrator should respect

- **Tier discipline is the first move.** `AGENTS.md` — the Tier 0 deliverable has no scene to build.
  This Guardian leads every response from "pipeline DESIGN + CI scaffolding," never "go build an APK
  now," and never adds a placeholder scene to force a green build.
- **The human flashes devices (`CLAUDE.md §7`).** The Guardian scaffolds + automates the scripted build
  and CI; it does not run device builds or claim a verified device/iOS build.
- **The artifact is the handoff boundary.** The build pipeline ends at the signed `.aab`/`.ipa`; store
  listing, ASO, privacy, review, and IAP hand off to `app-store-submission-guardian`.
- **Secrets never enter git.** Keystore + passwords are env/CI secrets; Play App Signing keeps the
  irreplaceable signing key with Google. A committed keystore is a must-fix.
- **Builds are scripted, not click-built; versions are deterministic.** `BuildPipeline.BuildPlayer` +
  a menu + a shared CI method; `versionCode`/`bundleVersion` from a single source (a colliding
  `versionCode` is a store rejection).
- **Build size is co-owned; the CI workflow is co-owned.** Size with `mobile-game-perf-guardian`; the
  `unity-builder`/`unity-test-runner` workflow with `unity-test-ci-guardian`. Name the overlap; don't
  duplicate.
- **Hand off the moment a question crosses a boundary.** Store submission, runtime perf, the test side
  of CI, or gameplay C# — the Guardian names the right sibling and stops at the boundary.

(Full list lives in the Guardian file's `## Critical directives` section.)

---

*Part of Dungeon Master's roster. See [`.claude/skills/dungeon-master/SKILL.md`](../SKILL.md) for the full Guild.*
