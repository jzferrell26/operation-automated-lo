# 07 — The VM Gotchas

Four traps stand between you and a green check on this VM. Each is documented in `AGENTS.md`; this guide is the diagnostic field manual keyed to the symptom you'll actually see.

## Gotcha 1 — overlayfs breaks lmdb (segfault, exit 139)

**Symptom:** the editor prints `Cannot open lmdb database ... because another process has a lock on it` (no other process is actually running), then **segfaults (exit 139)** during import.

**Cause:** the whole VM tree (`/`, `/workspace`, `/home`, `/tmp`) is a single **overlayfs** over a squashfs lower layer. Unity's asset DB (`Library/SourceAssetDB`) is **lmdb**, which needs an `mmap`/file-lock overlayfs can't grant.

**Fix (once per session, before the first editor call):** put `Library/` on tmpfs — the only non-overlay writable FS here.

```bash
sudo mount -o remount,size=8G /dev/shm   # default 64M is too small
mkdir -p /dev/shm/drift-library
rm -rf /workspace/Library
ln -s /dev/shm/drift-library /workspace/Library
```

`Library/` is ephemeral (Unity regenerates it), so the symlink is safe. tmpfs is RAM-backed (~15G total); Tier 0's Library stays under the 8G cap. **If you skip this, no test ever runs** — it's the first thing to check when the editor dies on import.

## Gotcha 2 — license missing (exit 198)

**Symptom:** exit code `198`, log line `No valid Unity Editor license found`. Compile, test, and build all refuse.

**Cause:** Unity won't do anything without an activated license, and the license binds to this VM's `/etc/machine-id`.

**Fix depends on license type:**

- **Personal (this project):** Unity **discontinued manual `.alf`→`.ulf` activation for Personal** — the portal only accepts a Plus/Pro *serial* and returns `serial is invalid - unknown version number` for Personal. A `.ulf` copied from another machine is rejected (`Machine bindings don't match`). The only working path is a **one-time interactive sign-in via the VM Desktop**:
  ```bash
  DISPLAY=:1 BROWSER=google-chrome unityhub --no-sandbox
  ```
  (`BROWSER=google-chrome` is required — the Hub's embedded login webview renders blank here, so it must hand OAuth to Chrome.) A human signs in (Google SSO works) and clicks **Get a free personal license**. The binding is to `/etc/machine-id` (persistent) and the entitlement is cached, so it should survive snapshots; repeat the sign-in if a session ever reports the license missing.
- **Pro/Plus seat:** fully headless via `-serial`/`-username`/`-password` (see `guides/06-headless-batchmode-runs.md` Step 3). Plain email+password without a serial does **not** work for Personal — and is impossible anyway when the account uses Google SSO with no password.

This is the one step a fully autonomous agent **cannot** self-serve for Personal — it needs the human-in-the-loop Desktop sign-in. Flag it explicitly when it's the blocker.

## Gotcha 3 — the first run is an import pass (false green)

**Symptom:** first run on a clean checkout exits `0` but produces no test execution (and `results.xml` may be absent or empty).

**Cause:** the first editor run rebuilds `Library/` and resolves `Packages/manifest.json` from scratch, then exits **without** running the runner.

**Fix:** run the exact same command a **second** time. `Library/` is now cached, so the second run executes the tests (~6s). **Treating the import-pass exit as "tests passed" is a false green** — a must-fix reporting error.

## Gotcha 4 — `-quit` + `-runTests` (empty results.xml, false green)

**Symptom:** exit `0`, but **no** `results.xml` (or an empty one), and the log shows the editor quit on load.

**Cause:** `-quit` makes the editor exit *before* the test runner executes. `-runTests` already quits on its own when finished — adding `-quit` short-circuits it.

**Fix:** never pass `-quit` together with `-runTests`. `-quit` is fine for non-test commands (activation, etc.) but banned during a test run. If you see green-with-no-xml, this is almost always the cause.

## Quick diagnostic table

| Symptom | Exit | Cause | Fix |
|---|---|---|---|
| `Cannot open lmdb ... lock` then crash | 139 | overlayfs vs lmdb | tmpfs `Library/` redirect (Gotcha 1) |
| `No valid Unity Editor license found` | 198 | unactivated license | Personal: Desktop Hub sign-in; Pro: serial (Gotcha 2) |
| exit 0, no tests ran, no/empty xml, first run | 0 | import pass | run the command again (Gotcha 3) |
| exit 0, no xml, log shows quit-on-load | 0 | `-quit` + `-runTests` | drop `-quit` (Gotcha 4) |
| ALSA/FMOD "no sound device", `Gtk-CRITICAL` | — | headless, harmless | ignore (`AGENTS.md`) |

## The meta-rule

Three of these four gotchas (3, 4, and a misread of 1) produce a **green-looking** result that is actually a non-run. This is exactly why CLAUDE.md §3 marks every `[DONE]` as "green pending a real-editor run" and why `guides/00-principles.md` Rule #7 insists `green` means `green in a real editor` — with `results.xml` present, non-empty, and parsed.
