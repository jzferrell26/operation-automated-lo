# Example 02 — GameCI Android Build Workflow (complements the test workflow)

A `game-ci/unity-builder` Android workflow that **complements** the `game-ci/unity-test-runner`
workflow `unity-test-ci-guardian` owns. The two share the Unity image and `UNITY_LICENSE`; the build
job is **gated** so it never runs red during Tier 0.

> **Tier framing (read first):** Tier 0 has no scene to build (`AGENTS.md`). This workflow is
> **dispatch-only / scene-gated** until Tier 1, so the *test* workflow stays the Tier-0 CI gate. The
> human still runs store builds (`CLAUDE.md §7`); CI produces a verification artifact.

## Co-ownership with `unity-test-ci-guardian`

| Concern | Owner |
|---|---|
| `game-ci/unity-test-runner` job, EditMode/PlayMode matrix | `unity-test-ci-guardian` |
| `UNITY_LICENSE` / `UNITY_EMAIL` / `UNITY_PASSWORD` secrets | **shared — defined once** |
| `game-ci/unity-builder` job, `buildMethod`, artifact | **this Guardian** |
| `Library/` cache key | shared (both jobs cache it) |

The license secrets are configured **once** for the repo and reused by both jobs. This Guardian does not
re-document license setup — it points at the test-ci guide and adds the build job.

## The workflow (gated)

`templates/gameci-unity-build.yml` is the full file. The gating is the load-bearing part:

```yaml
name: Android Build
on:
  workflow_dispatch: {}          # manual until Tier 1 has a buildable scene (AGENTS.md)
  # push:                        # ENABLE in Tier 1, scene-gated:
  #   paths: [ "Assets/Scenes/**" ]
```

Why dispatch-only: a `unity-builder` job with no scene to build fails. Running it red in Tier 0 would
**mis-signal that the pipeline is broken** when it's simply not Tier-0 work (a **must-fix** per
`guides/10`). The comment documents *why*, so a future contributor doesn't "fix" it by adding a
placeholder scene.

## The build job

```yaml
jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { lfs: true }
      - uses: actions/cache@v4
        with:
          path: Library
          key: Library-Android-${{ hashFiles('Packages/manifest.json') }}
      - name: Decode keystore
        run: echo "${{ secrets.DRIFT_KEYSTORE_B64 }}" | base64 -d > "${{ runner.temp }}/drift.keystore"
      - uses: game-ci/unity-builder@v4         # verify the current tag on the GameCI releases page
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}      # shared with the test workflow
          DRIFT_KEYSTORE_PATH: ${{ runner.temp }}/drift.keystore
          DRIFT_KEYSTORE_PASS: ${{ secrets.DRIFT_KEYSTORE_PASS }}
          DRIFT_KEY_ALIAS:     ${{ secrets.DRIFT_KEY_ALIAS }}
          DRIFT_KEY_ALIAS_PASS: ${{ secrets.DRIFT_KEY_ALIAS_PASS }}
          DRIFT_VERSION:      ${{ github.ref_name }}
          DRIFT_BUILD_NUMBER: ${{ github.run_number }}
        with:
          targetPlatform: Android
          buildMethod: Drift.Build.BuildScript.BuildAndroidRelease   # same method as guides/06
      - uses: actions/upload-artifact@v4
        with: { name: drift-android-aab, path: build/Android }
```

Key points:

- **`buildMethod`** is the **same** `BuildScript` method a developer runs from the editor menu
  (`guides/06`, `examples/01`) — CI and local never diverge.
- **Keystore** is base64-decoded from a secret into `runner.temp`, never committed (`guides/03`).
- **Version** derives from the git ref + run number (`guides/09`).
- **`UNITY_LICENSE`** is the same secret the test workflow uses — not redefined.

## Verification notes (DEGRADED-mode caveats)

- The `game-ci/unity-builder` **version tag** (`@v4`) and Unity 6 image availability — **verify on
  the GameCI releases page** before relying on it.
- The Personal-license activation flow for CI has changed across GameCI versions (mirrors the
  `AGENTS.md` interactive-Personal note) — **verify the current flow.**

## Handoffs

- The test workflow + shared license setup → `unity-test-ci-guardian`.
- The build method → `guides/06`, `templates/BuildScript.cs`.
- Uploading the artifact to the store → `app-store-submission-guardian`.
