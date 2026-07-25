# 04 — iOS: Xcode Project & fastlane

The iOS build chain. **Design-level only** — this Linux VM cannot compile or sign an iOS build
(that requires macOS + Xcode). Never claim a verified iOS build here.

> **Tier note:** Tier 0 has no scene to build (`AGENTS.md`); iOS shipping is Tier-1 / human
> (`CLAUDE.md §7`). Everything below is the design the human (on a Mac) executes.

## 1. Unity emits an Xcode project, not an .ipa

Unlike Android, Unity does **not** produce the final iOS artifact. `BuildPipeline.BuildPlayer`
with `BuildTarget.iOS` generates an **Xcode project**; Xcode (macOS) then compiles, signs, and
archives it into the `.ipa`. The two-stage shape:

```
Unity (any OS) → Xcode project  →  Xcode (macOS only) → .ipa
```

## 2. Post-process the generated project deterministically

The generated Xcode project is regenerated on each build, so **hand-editing it is lost**. Patch it
in code from an `[OnPostprocessBuild]` callback using `UnityEditor.iOS.Xcode.PBXProject` —
the iOS analogue of Android's custom Gradle templates (`guides/02 §3`):

```csharp
[PostProcessBuild]
public static void OnPostprocessBuild(BuildTarget target, string pathToBuiltProject)
{
    if (target != BuildTarget.iOS) return;
    var projPath = PBXProject.GetPBXProjectPath(pathToBuiltProject);
    var proj = new PBXProject();
    proj.ReadFromFile(projPath);
    // e.g. add a capability, set a build setting, patch Info.plist keys
    proj.WriteToFile(projPath);
}
```

Use this for: capabilities/entitlements, Info.plist usage-description keys, build settings
(disable bitcode), and embedding frameworks. Hand-editing the project is a **should-refactor**.

## 3. Signing & provisioning

Two paths:

- **Automatic signing** — Xcode manages certs/profiles via your Apple Developer account. Simplest
  for a solo dev building locally.
- **`fastlane match`** — stores signing certs + provisioning profiles encrypted in a git repo, so
  every machine/CI runner reproduces the exact identity. The correct choice once builds move off
  one laptop. This is the canonical CI iOS signing model.

## 4. fastlane lanes

`fastlane` automates the macOS side. Canonical lanes (see `templates/fastlane-Fastfile`):

- **`match`** — sync signing identity.
- **`gym`** — build/archive → `.ipa` (`build_app`).
- **`pilot`** — upload to **TestFlight** (`upload_to_testflight`).
- **`deliver`** — push metadata/screenshots (**this crosses into `app-store-submission-guardian`'s
  lane** — the build pipeline ends at `gym`/`pilot`; metadata is submission's).

## 5. Bitcode

Bitcode is **deprecated/removed** in the modern Xcode era. **Disable it**; do not design around it.
(`ENABLE_BITCODE = NO` — patch via `PBXProject` in §2.)

## 6. The boundary with App Store submission

This Guardian's iOS lane ends at the **signed `.ipa` / the TestFlight upload**. App Store Connect
metadata, ASO, privacy nutrition labels, review, and IAP belong to `app-store-submission-guardian`.
Hand the binary over; don't author the listing.

## Severity

- **Must-fix:** claiming a verified iOS build from this Linux VM (impossible — `AGENTS.md`).
- **Should-refactor:** hand-edited Xcode project instead of a `PBXProject` post-process; per-machine
  manual signing where `match` belongs (multi-machine/CI).
- **Style:** lane naming.

## Handoffs

- TestFlight beta config, metadata, review → `app-store-submission-guardian`.
- The fastlane lane template → `templates/fastlane-Fastfile`.
- Versioning (`CFBundleVersion`) → `guides/09`.
