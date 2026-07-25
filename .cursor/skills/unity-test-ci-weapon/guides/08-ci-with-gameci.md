# 08 — CI with GameCI

GameCI (`game-ci/unity-test-runner`) is the GitHub Actions path to running DRIFT's EditMode suite on every push/PR — turning "green pending a real-editor run" into an automated, repeatable green check. This guide is the wiring; `examples/04-gameci-workflow.md` is the full file; `templates/gameci-unity-test.yml` is the copy-paste.

## What GameCI gives you

`game-ci/unity-test-runner` runs the Unity editor headless inside a Docker image that already has the editor + Linux runtime libs baked in (`unityci/editor`). It runs the same EditMode suite the AGENTS.md command runs locally — but on GitHub's runners, so the human doesn't have to remember the tmpfs dance. It emits NUnit `results.xml` as an artifact and a test summary.

## The license — the one hard prerequisite

CI needs a license, exactly like the local VM (`guides/07-the-vm-gotchas.md` Gotcha 2). GameCI reads it from a repository secret:

- **`UNITY_LICENSE`** — the contents of a `.ulf` activation file (for Personal/free), **or**
- **`UNITY_SERIAL` + `UNITY_EMAIL` + `UNITY_PASSWORD`** — for a Pro/Plus seat.

⚠️ **The DRIFT reality:** `AGENTS.md` documents that Personal-license `.ulf` files are **machine-bound to `/etc/machine-id`** and that Unity discontinued manual Personal activation. A `.ulf` generated for one machine is rejected elsewhere (`Machine bindings don't match`). This makes the classic "`UNITY_LICENSE` = your `.ulf`" recipe fragile for a *free Personal* seat. Surface this honestly: GameCI's Personal flow uses the `game-ci/unity-request-activation-file` → manual portal → `.ulf` route, which Unity's Personal changes have made unreliable. A **Pro/Plus seat (serial-based)** is the robust CI path. Flag the license-acquisition step as the gating decision before promising a working CI pipeline.

Never commit a license or credentials. Always a secret. (Secrets/runner infra beyond the test step → `devops-guardian` if present.)

## The workflow skeleton

```yaml
name: Unity EditMode Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  editmode-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          lfs: true

      - uses: actions/cache@v4              # cache Library/ across runs (mirrors the local speedup)
        with:
          path: Library
          key: Library-${{ hashFiles('Assets/**', 'Packages/**', 'ProjectSettings/**') }}
          restore-keys: Library-

      - uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          # or, for a Pro/Plus seat:
          # UNITY_SERIAL: ${{ secrets.UNITY_SERIAL }}
          # UNITY_EMAIL:  ${{ secrets.UNITY_EMAIL }}
          # UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: .
          testMode: editmode               # the Tier 0 smoke test
          unityVersion: 6000.0.23f1         # pinned in ProjectSettings/ProjectVersion.txt
          artifactsPath: artifacts

      - uses: actions/upload-artifact@v4
        if: always()                        # upload results even on failure
        with:
          name: editmode-results
          path: artifacts
```

## Field notes

- **`testMode: editmode`** — runs only the EditMode suite. This is the Tier 0 gate. A second job with `testMode: playmode` is added only when PlayMode tests exist (`guides/09-playmode-tests.md`); right now DRIFT has none, so don't add an empty PlayMode job.
- **`unityVersion`** — pin to the version in `ProjectSettings/ProjectVersion.txt` (`6000.0.23f1`; the VM resolves a patch like `6000.0.77f1`, fine per `TIER0.md`). GameCI's image must match a published `unityci/editor` tag.
- **`Library/` cache** — the same import-pass cost as locally (`guides/07-the-vm-gotchas.md` Gotcha 3). Caching `Library/` keyed on `Assets`/`Packages`/`ProjectSettings` hashes means CI doesn't pay the full import every run. The `restore-keys` fallback reuses a stale cache when the exact key misses.
- **`upload-artifact ... if: always()`** — `results.xml` must be uploaded even (especially) on failure, so a red run is debuggable from the artifact.
- **GameCI does the tmpfs concern for you** — its Docker image isn't the overlayfs+lmdb VM, so Gotcha 1 doesn't apply in CI. Gotcha 4 (`-quit` + `-runTests`) is handled internally by the action. The *license* (Gotcha 2) is the only one you must wire.

## The matrix, when PlayMode lands

```yaml
strategy:
  matrix:
    testMode: [editmode, playmode]
```

Run both modes as parallel jobs. Until DRIFT has a PlayMode suite, this is `[editmode]` only — don't gate merges on a job that runs zero tests.

## Reporting

GameCI surfaces a check on the PR. For a richer summary, add `game-ci/unity-test-runner`'s built-in summary or a separate NUnit reporter. The artifact's `results.xml` is the same NUnit XML described in `guides/06-headless-batchmode-runs.md` Step 6.

## What this buys the project

A passing GameCI check is the *durable* answer to CLAUDE.md §3's standing caveat: instead of "green pending a real-editor run," every PR gets a real-editor run automatically. That is the closest this project gets to a permanent green guarantee — gated only on solving the Personal-license-in-CI problem above.
