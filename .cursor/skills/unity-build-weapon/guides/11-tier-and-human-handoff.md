# 11 — Tier Discipline & Human Handoff

The guide that governs all the others. Read it before promising any build.

## 1. There is no Tier-0 scene to build

`AGENTS.md` is explicit:

> *"Do not run the production `-buildTarget`/player build to verify changes; the Tier 0 deliverable
> has no scene to build. Use the EditMode tests instead."*

And:

> *"the playable gray-box loop must be assembled by hand in the Editor ... the runnable verification
> in a headless VM is the EditMode test suite, not a built app."*

So the entire device-build pipeline this Weapon designs is **Tier-1 work**. In Tier 0:

- **Do** author the `BuildScript.cs`, the CI workflow, the keystore runbook, the versioning scheme,
  the Player Settings design — all as Tier-1 prep that compiles/reviews cleanly.
- **Do NOT** run a player build to "verify," add a placeholder scene to force a green build, or tell
  anyone to produce an APK now.

This mirrors how `save-load-guardian` treats persistence: the GDD gray-box has "no save system
even," so save/load is designed-not-built in Tier 0. Build is the same — designed-not-run.

## 2. The human runs device builds (`CLAUDE.md §7`)

`CLAUDE.md §7` assigns "device builds" to the **human**:

> *Human handles: game feel, art, balance, touch-control tuning, playtesting, **device builds**.*

This Guardian's job is to make that human's path **scripted, reproducible, and CI-backed** — so when
the human (or a properly-licensed CI runner / a Mac for iOS) runs the build, it Just Works. This
Guardian does **not** flash a device, claim a verified device build, or substitute itself for the human
in `§7`.

## 3. The build ends at the signed artifact — then submission takes over

The hard boundary with `app-store-submission-guardian`:

```
[unity-build-guardian]                              [app-store-submission-guardian]
 design pipeline → scripted build → signed .aab/.ipa  ─►  store listing, ASO, privacy,
 (Android keystore/Play App Signing; iOS match/gym)        review, IAP, submission, release
```

This Guardian **produces and signs** the binary. `app-store-submission-guardian` **publishes** it.
Don't author store listings, ASO, privacy nutrition labels, or IAP config here — name the sibling
and hand the artifact over. Conversely, when the user asks "how do I get my signed AAB," that's
this Guardian up to the artifact, then a handoff.

## 4. The Tier-1 readiness gate (when build work actually starts)

Build work moves from "design" to "do" when **all** of these are true:

- [ ] A buildable scene exists (Tier 1 has authored the gray-box / first real scene).
- [ ] `CLAUDE.md §3` Status Map shows Tier 0 done and Tier 1 in focus (`§4` objective updated).
- [ ] A licensed build environment exists (CI runner with `UNITY_LICENSE`, or the human's machine /
      a Mac for iOS).

Until then, every build deliverable is **prep**, and every response leads with that framing.

## 5. The handoff table

| Boundary | This Guardian | The other side |
|---|---|---|
| Device flashing / device farm | Scaffold + automate the scripted build & CI | the **human** (`CLAUDE.md §7`) |
| Store listing / submission / ASO / review / IAP | Produce + hand over the signed `.aab`/`.ipa` | `app-store-submission-guardian` |
| Runtime perf (frame/GC/draw calls) | Build **size** & teardown (co-owned) | `mobile-game-perf-guardian` |
| CI for tests / EditMode wiring | CI for **builds** (`unity-builder`); co-own the workflow | `unity-test-ci-guardian` |
| Gameplay C# architecture | Build-related editor C# (`BuildScript.cs`) | `unity-csharp-guardian` |

## Severity

- **Must-fix:** any instruction to build device binaries mid-Tier-0; adding a placeholder scene to
  force a green build; claiming a verified device/iOS build this Guardian can't actually run; doing
  `app-store-submission-guardian`'s store work.
- **Should-refactor:** build deliverables not framed as Tier-1 prep; missing handoff to the
  submission Guardian at the artifact boundary.
- **Style:** phrasing of the tier caveat.
