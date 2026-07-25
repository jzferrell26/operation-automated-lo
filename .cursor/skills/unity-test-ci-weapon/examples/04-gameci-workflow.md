# Example 04 — A GameCI Workflow for DRIFT's EditMode Suite

A complete, annotated GitHub Actions workflow that runs the Tier 0 EditMode suite on every push to `main` and every PR — the automated answer to CLAUDE.md §3's "green pending a real-editor run." See `guides/08-ci-with-gameci.md` for the wiring rationale and `templates/gameci-unity-test.yml` for the bare file.

## The file: `.github/workflows/unity-editmode-tests.yml`

```yaml
name: Unity EditMode Tests

on:
  push:
    branches: [main]
  pull_request:

# Cancel an in-flight run when a new commit lands on the same ref.
concurrency:
  group: editmode-${{ github.ref }}
  cancel-in-progress: true

jobs:
  editmode:
    name: EditMode (Tier 0 spine)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          lfs: true                     # DRIFT has no LFS assets today; harmless + future-proof

      # Mirror the local Library cache speedup (guides/07 Gotcha 3 — avoid paying
      # the full import pass every run).
      - name: Cache Library
        uses: actions/cache@v4
        with:
          path: Library
          key: Library-${{ hashFiles('Assets/**', 'Packages/**', 'ProjectSettings/**') }}
          restore-keys: |
            Library-

      - name: Run EditMode tests
        uses: game-ci/unity-test-runner@v4
        env:
          UNITY_LICENSE: ${{ secrets.UNITY_LICENSE }}
          # Pro/Plus seat alternative (more robust than a machine-bound Personal .ulf):
          # UNITY_SERIAL:   ${{ secrets.UNITY_SERIAL }}
          # UNITY_EMAIL:    ${{ secrets.UNITY_EMAIL }}
          # UNITY_PASSWORD: ${{ secrets.UNITY_PASSWORD }}
        with:
          projectPath: .
          unityVersion: 6000.0.23f1     # matches ProjectSettings/ProjectVersion.txt
          testMode: editmode            # Tier 0 has no PlayMode suite yet — don't add an empty job
          artifactsPath: artifacts
          githubToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload results
        uses: actions/upload-artifact@v4
        if: always()                    # keep results even when tests fail
        with:
          name: editmode-results
          path: artifacts
```

## Annotated decisions

| Decision | Why |
|---|---|
| `on: push(main) + pull_request` | gate merges to `main` and surface results on every PR — the merge gate the standing caveat asks for |
| `concurrency ... cancel-in-progress` | a force-push or rapid commits don't pile up redundant Unity runs (each spins a heavy editor image) |
| `cache Library` keyed on `Assets`/`Packages`/`ProjectSettings` | the import pass is expensive (`guides/07` Gotcha 3); cache it like tmpfs caches it locally. `restore-keys` reuses a near-match when the exact hash misses |
| `unityVersion: 6000.0.23f1` | pinned to `ProjectSettings/ProjectVersion.txt`; GameCI pulls the matching `unityci/editor` image. Patch drift within `6000.0` is fine per `TIER0.md` |
| `testMode: editmode` only | DRIFT has zero PlayMode tests today (`guides/09`). A `playmode` job would run nothing and give a false sense of coverage — add it only when PlayMode tests exist |
| `UNITY_LICENSE` from secret | never commit a license (`guides/08`). **Caveat below.** |
| `upload-artifact if: always()` | a red run must leave a downloadable `results.xml` to debug (`guides/06` Step 6) |

## The license caveat — call it out honestly

GameCI's classic Personal-license path requests a `.ulf` and stores it in `UNITY_LICENSE`. But `AGENTS.md` documents that Personal `.ulf` files are **machine-bound to `/etc/machine-id`** and Unity **discontinued manual Personal activation** — so a Personal `.ulf` can be rejected on GitHub's runners with `Machine bindings don't match`. The robust path is a **Pro/Plus serial** (`UNITY_SERIAL` + `UNITY_EMAIL` + `UNITY_PASSWORD`). Before promising this workflow works, resolve the license-acquisition question — it's the single gating prerequisite (`guides/08`). Surface it to the user; don't pretend it's solved.

## What GameCI handles that you handle locally

- **tmpfs/lmdb (Gotcha 1)** — not an issue; GameCI's Docker image isn't the overlayfs VM.
- **`-quit` + `-runTests` (Gotcha 4)** — the action invokes the runner correctly internally.
- **import pass (Gotcha 3)** — the `Library` cache absorbs most of it; first-ever run still pays once.
- **license (Gotcha 2)** — **your job**, via the secret. The one you must wire.

## Extending to a matrix later

When a PlayMode suite lands (`guides/09`):

```yaml
    strategy:
      fail-fast: false
      matrix:
        testMode: [editmode, playmode]
    # ... with: testMode: ${{ matrix.testMode }}
```

`fail-fast: false` so an EditMode failure doesn't cancel the PlayMode job — you want both results.

## The payoff

A green check on this workflow is the durable resolution of CLAUDE.md §3's caveat: every PR gets a *real-editor* EditMode run automatically, so the spine's green is continuously verified rather than perpetually "pending." Infra beyond this step (self-hosted runners, org secret policy) hands off to `devops-guardian` if present.
