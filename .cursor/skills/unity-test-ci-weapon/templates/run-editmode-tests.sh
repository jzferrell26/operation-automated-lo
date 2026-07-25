#!/usr/bin/env bash
# Run DRIFT's EditMode suite headless on this VM.
# Commands are lifted from AGENTS.md — the single source of truth. Do not improvise flags.
# See guides/06-headless-batchmode-runs.md and guides/07-the-vm-gotchas.md.
#
# Usage:
#   ./run-editmode-tests.sh                       # whole suite
#   ./run-editmode-tests.sh Drift.Tests.RuntimeOxygenTests   # one suite via -testFilter

set -euo pipefail

EDITOR="${UNITY_EDITOR:-$HOME/unity-setup/Editor/Unity}"
PROJECT="${UNITY_PROJECT:-/workspace}"
RESULTS="${UNITY_RESULTS:-/tmp/results.xml}"
LOG="${UNITY_LOG:-/tmp/test.log}"
FILTER="${1:-}"

# --- Step 1: tmpfs Library redirect (once per session) ---------------------
# Overlayfs breaks lmdb -> the editor segfaults (exit 139) on import. Put
# Library/ on tmpfs, the only non-overlay writable FS here. Library/ is
# ephemeral, so the symlink is safe. (AGENTS.md PREREQUISITE)
if [ ! -L "$PROJECT/Library" ]; then
  echo "==> Redirecting $PROJECT/Library to tmpfs"
  sudo mount -o remount,size=8G /dev/shm   # default 64M is too small
  mkdir -p /dev/shm/drift-library
  rm -rf "$PROJECT/Library"
  ln -s /dev/shm/drift-library "$PROJECT/Library"
fi

# --- Step 2: confirm the editor exists -------------------------------------
# A cold VM can boot without the editor; do not promise a run we can't make.
if [ ! -x "$EDITOR" ]; then
  echo "ERROR: Unity editor not found at $EDITOR." >&2
  echo "Run the cold-start recovery from AGENTS.md (re-download editor + apt libs)." >&2
  exit 1
fi
"$EDITOR" -version || true

# --- Build the test command ------------------------------------------------
# NEVER pass -quit with -runTests: -quit exits before the runner, giving exit 0
# and no results.xml (a false green). -runTests quits on its own. (AGENTS.md Gotchas)
run_tests() {
  local args=(
    -batchmode -nographics
    -projectPath "$PROJECT"
    -runTests -testPlatform EditMode
    -testResults "$RESULTS" -logFile "$LOG"
  )
  if [ -n "$FILTER" ]; then
    args+=(-testFilter "$FILTER")
  fi
  "$EDITOR" "${args[@]}"
}

# --- Step 3: import pass (first run rebuilds Library, runs no tests) --------
echo "==> Import pass (first run rebuilds Library and exits before tests)"
run_tests || true   # this pass is expected to not produce results.xml

# --- Step 4: real run (second run executes the suite) ----------------------
echo "==> Real run (Library cached; tests execute, ~6s)"
set +e
run_tests
CODE=$?
set -e

echo "==> Exit code: $CODE"
if [ -s "$RESULTS" ]; then
  echo "==> results.xml written to $RESULTS"
else
  echo "ERROR: results.xml missing/empty after a completed run." >&2
  echo "Most likely cause: -quit combined with -runTests, or the import pass." >&2
  echo "If exit was 198: license not activated (AGENTS.md). If 139: tmpfs redirect." >&2
  exit 1
fi

# Exit 0 + a non-empty results.xml from a REAL editor run = green that resolves
# CLAUDE.md §3 "green pending a real-editor run". Report it as such.
exit $CODE
