# 10 — CI Builds with GameCI

The build half of CI, via **`game-ci/unity-builder`**. This guide's defining constraint: the build
workflow is **co-owned with `unity-test-ci-guardian`**, who owns the *test* half
(`game-ci/unity-test-runner`). They share the Unity version, the `UNITY_LICENSE` secret, and the
`.github/workflows/` tree. **Name the overlap; don't duplicate the license plumbing.**

> **Tier note:** Tier 0 has no scene to build (`AGENTS.md`). A `unity-builder` job in Tier 0 will
> fail/no-op (nothing to build). **Gate the build workflow** so it doesn't run red during Tier 0;
> the *test* workflow (`unity-test-runner`, owned by `unity-test-ci-guardian`) is the Tier-0 CI
> gate. The human still runs device builds (`CLAUDE.md §7`); CI produces an unsigned/CI artifact for
> verification, not a store release from this Guardian's hand.

## 1. The action pair

| Action | Owner | Purpose |
|---|---|---|
| `game-ci/unity-test-runner` | `unity-test-ci-guardian` | Run EditMode/PlayMode tests (the Tier-0 gate) |
| `game-ci/unity-builder` | **this Guardian** | Produce the player build (`.aab`/`.apk`/Xcode project) |
| `game-ci/unity-activate` | shared | License activation (Personal flows) |

Both run on the same Unity image (matching `ProjectVersion.txt`) and consume the same secrets. In a
real repo they sit in adjacent jobs of one workflow (or two workflows sharing a composite), so
**license setup is written once**.

## 2. Licensing

- **Personal** activation is interactive locally (the `AGENTS.md` VM note: Hub sign-in via the
  Desktop). For CI, the standard GameCI Personal flow injects a serialized `.ulf` as the
  `UNITY_LICENSE` secret, plus `UNITY_EMAIL` / `UNITY_PASSWORD`. **Verify the current GameCI
  activation flow** — it has changed across versions (`research/research-summary.md` open question).
- **Pro/Plus** activates headless via serial (mirrors the `AGENTS.md` Pro path).
- The `UNITY_LICENSE` secret is shared with the test workflow — **do not define it twice.**

## 3. Caching `Library/`

Cache `Library/` between runs (keyed on the Unity version + a hash of `Packages/manifest.json`) so
the import pass isn't repeated every build — the same `Library/` the `AGENTS.md` setup redirects to
tmpfs locally. This is the single biggest CI-build speedup.

## 4. The Android build job (sketch)

See `templates/gameci-unity-build.yml` and `examples/02-gameci-android-build-workflow.md` for the
full file. Shape:

```yaml
- uses: actions/checkout@v4
  with: { lfs: true }
- uses: actions/cache@v4
  with:
    path: Library
    key: Library-Android-${{ hashFiles('Packages/manifest.json') }}
- uses: game-ci/unity-builder@v4        # verify the current tag
  env:
    UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}   # shared with the test workflow
  with:
    targetPlatform: Android
    buildMethod: Drift.Build.BuildScript.BuildAndroidRelease   # the same method as guides/06
- uses: actions/upload-artifact@v4
  with: { name: drift-android, path: build/Android }
```

`buildMethod` points at the **same** `BuildScript` method a developer runs locally (`guides/06`) —
CI and local never diverge. Keystore secrets are injected as env vars (`guides/03 §2`), the keystore
file base64-decoded from a secret at job start.

## 5. Gating for tier discipline

Because there's no Tier-0 scene, guard the build job so it doesn't run red:

- Run it only when a buildable scene exists (e.g. a path filter on `Assets/Scenes/**` or a manual
  `workflow_dispatch`), or
- Keep the build workflow **disabled / dispatch-only** until Tier 1, and let the test workflow be
  the Tier-0 CI gate.

Either way, **document why** (the `AGENTS.md` no-scene fact) so a future contributor doesn't "fix"
the disabled build by adding a placeholder scene.

## Severity

- **Must-fix:** a build job that runs red in Tier 0 because there's no scene (mis-signals the
  pipeline is broken); duplicating `UNITY_LICENSE` plumbing across the build and test workflows;
  committing the keystore into the workflow instead of injecting from secrets.
- **Should-refactor:** no `Library/` cache (slow builds); `buildMethod` diverging from the local
  build menu; no artifact upload.
- **Style:** job/step naming.

## Handoffs

- The test workflow + EditMode/PlayMode + the shared license setup → `unity-test-ci-guardian`
  (**co-owned workflow**).
- The keystore secret injection → `guides/03`, `templates/android-keystore-setup.md`.
- The build method CI calls → `guides/06`, `templates/BuildScript.cs`.
- CI runner infra beyond the Unity steps (self-hosted runners, Docker host) → `devops-guardian` if
  present.
