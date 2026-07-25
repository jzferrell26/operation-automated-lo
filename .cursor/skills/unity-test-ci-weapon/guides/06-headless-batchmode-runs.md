# 06 — Headless Batchmode Runs

The commands and flags here are lifted verbatim from `AGENTS.md`. **`AGENTS.md` is canon** — do not invent alternatives. This guide explains each step so you can run, debug, and report a headless suite run.

## The sequence (every session)

```
1. tmpfs Library redirect   (once per session — overlayfs/lmdb fix)
2. confirm the editor exists (cold VMs can lack it)
3. confirm the license       (exit 198 if missing)
4. import pass               (first run rebuilds Library, runs no tests)
5. real run                  (second run executes the suite)
6. read results.xml
```

## Step 1 — Redirect `Library/` to tmpfs (once per session)

From `AGENTS.md` (PREREQUISITE). The VM tree is overlayfs; lmdb can't lock there and segfaults (exit 139). Put `Library/` on tmpfs:

```bash
sudo mount -o remount,size=8G /dev/shm   # default /dev/shm is 64M, too small
mkdir -p /dev/shm/drift-library
rm -rf /workspace/Library
ln -s /dev/shm/drift-library /workspace/Library
```

`Library/` is regenerated/ephemeral, so the symlink is safe. tmpfs is RAM-backed (~15G); the Tier 0 Library stays well under 8G. Full reasoning: `guides/07-the-vm-gotchas.md`.

## Step 2 — Confirm the editor exists

```bash
~/unity-setup/Editor/Unity -version
```

`AGENTS.md` warns a cold VM can boot **without** the editor, Unity Hub, or runtime libs. If this fails, run the cold-start recovery from `AGENTS.md` (re-download the editor tarball + `apt-get install` the runtime libs). Do not promise a run you can't make.

## Step 3 — License (or exit 198)

Unity refuses everything without a license. For **Personal** (this project): a one-time interactive Hub sign-in via the VM Desktop binds the seat (`guides/07-the-vm-gotchas.md`). For **Pro/Plus**:

```bash
~/unity-setup/Editor/Unity -batchmode -nographics -quit \
  -serial "$UNITY_SERIAL" -username "$UNITY_EMAIL" -password "$UNITY_PASSWORD" \
  -logFile /tmp/activate.log
```

Note `-quit` is fine *here* (activation is not a test run) — see Step 5 for why it's banned during tests.

## Step 4 & 5 — The test command (run it twice)

The canonical command from `AGENTS.md`:

```bash
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace \
  -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log
```

**Run it once for the import pass** (rebuilds `Library/`, resolves `Packages/manifest.json`, exits without running tests). **Run it a second time** — now `Library/` is cached — to actually execute. Later runs are fast (~6s).

### Flag breakdown

| Flag | Meaning |
|---|---|
| `-batchmode` | no editor GUI; headless |
| `-nographics` | no graphics device; required headless. No `xvfb` wrapper needed for tests. |
| `-projectPath /workspace` | the repo root |
| `-runTests` | invoke the test runner (quits on its own when done — do **not** add `-quit`) |
| `-testPlatform EditMode` | run the EditMode suite (the headless smoke test) |
| `-testResults /tmp/results.xml` | write NUnit XML here |
| `-logFile /tmp/test.log` | editor log (ALSA/FMOD/Gtk warnings here are harmless) |

### Running a single suite

Add a `-testFilter` matching the full namespaced class name:

```bash
  -testFilter "Drift.Tests.RuntimeOxygenTests"
```

(The namespace is `Drift.Tests` per the asmdef `rootNamespace`.) Useful when iterating on one system — e.g. `Drift.Tests.RuntimeEnemyTests` for the FSM.

## Step 6 — Read the result

- **Exit code `0`** = all tests passed.
- **Exit code non-zero** = failures (or a setup error — check `/tmp/test.log`).
- **`/tmp/results.xml`** = NUnit XML: a `<test-run>` root with `total`/`passed`/`failed`/`skipped` attributes and a `<test-case>` per test with `result="Passed"`/`"Failed"`. A failed case carries a `<failure><message>` with the NUnit assertion text — that's your assertion message from `guides/04-nunit-assertion-patterns.md`.

If `results.xml` is **missing** after a run that exited `0`, you almost certainly combined `-quit` with `-runTests` (the editor quit before the runner ran) — see `guides/07-the-vm-gotchas.md`. Missing-but-green is a **must-fix** false positive, not a pass.

## Reporting the run

Write the outcome to `library/qa/unity-tests/<date>-<topic>.md`: which command, which pass (import vs real), exit code, the `results.xml` totals, and — critically — whether this was a **real-editor run** (turning CLAUDE.md §3's "green pending" into "green") or still pending. See `examples/03-headless-batchmode-run-walkthrough.md` for a full walkthrough.
