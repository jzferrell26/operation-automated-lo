# Example 03 — A Full Headless Batchmode Run, With `results.xml`

A complete session: from a cold checkout to a parsed `results.xml`, including the two traps that produce false greens. Every command is from `AGENTS.md`.

## 0. Where we start

A fresh VM session. `/workspace` is the DRIFT repo. We want the EditMode suite green for real.

## 1. Redirect `Library/` to tmpfs (once per session)

```bash
sudo mount -o remount,size=8G /dev/shm
mkdir -p /dev/shm/drift-library
rm -rf /workspace/Library
ln -s /dev/shm/drift-library /workspace/Library
```

**Why first:** skip it and the editor segfaults (exit 139) on import because overlayfs can't give lmdb its lock (`guides/07-the-vm-gotchas.md` Gotcha 1).

## 2. Confirm the editor exists

```bash
~/unity-setup/Editor/Unity -version
# → 6000.0.77f1   (the resolved patch of the pinned 6000.0.23f1)
```

If this errored, a cold VM shipped without the editor — run the cold-start recovery from `AGENTS.md` first. It didn't error, so continue.

## 3. Confirm the license

For Personal (this project), the license was bound once via the Desktop Hub sign-in and is cached. We confirm by just running — if it's missing we'll see exit `198` and `No valid Unity Editor license found`, and the fix is the Desktop sign-in (`guides/07-the-vm-gotchas.md` Gotcha 2). Assume it's bound.

## 4. First run — the import pass

```bash
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace \
  -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log
echo "exit: $?"
```

```
exit: 0
```

But `/tmp/results.xml` is **absent or empty** and `/tmp/test.log` ends after rebuilding `Library/` and resolving `Packages/manifest.json`. **This is the import pass** — it built the asset DB and quit before running tests (`guides/07-the-vm-gotchas.md` Gotcha 3). Do **not** report this as a pass. Run again.

## 5. Second run — the real one

```bash
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace \
  -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log
echo "exit: $?"
```

```
exit: 0
```

This time fast (~6s, Library cached) and `/tmp/results.xml` exists and is non-empty.

> ⚠️ Note we did **not** add `-quit`. Had we written `-runTests ... -quit`, the editor would have exited on load, given exit `0`, and left **no** `results.xml` — a false green (`guides/07-the-vm-gotchas.md` Gotcha 4).

## 6. Read `results.xml`

It's NUnit XML. The root `<test-run>` carries the totals:

```xml
<test-run id="2" testcasecount="38" result="Passed"
          total="38" passed="38" failed="0" inconclusive="0" skipped="0"
          asserts="..." engine-version="...">
  <test-suite type="Assembly" name="Drift.Tests.EditMode" ...>
    <test-suite type="TestFixture" name="RuntimeOxygenTests" ...>
      <test-case name="Oxygen_DrainsWhileEnabled_AndStopsWhenDisabled"
                 result="Passed" duration="0.0031" ... />
      ...
    </test-suite>
    ...
  </test-suite>
</test-run>
```

`result="Passed"`, `failed="0"` across all ten `Runtime*Tests` fixtures = the suite is green **in a real editor**. That turns CLAUDE.md §3's "green pending a real-editor run" into actual green.

## 7. What a failure looks like

If `RuntimeOxygenTests` had a regression, the case carries a `<failure>`:

```xml
<test-case name="Oxygen_DrainsWhileEnabled_AndStopsWhenDisabled" result="Failed">
  <failure>
    <message>Oxygen should drain while enabled.
      Expected: less than 100.0f
      But was:  100.0f</message>
    <stack-trace>at Drift.Tests.RuntimeOxygenTests...</stack-trace>
  </failure>
</test-case>
```

The `<message>` is exactly the assertion message from `guides/04-nunit-assertion-patterns.md` — write good messages and the XML reads like a bug report. `Expected: less than 100 / But was: 100` is the classic signature of the false-green failure mode: drain didn't happen, which usually means the system reverted to `Update`-only logic (`guides/03-editmode-safe-design.md`).

## 8. Run one suite while iterating

```bash
~/unity-setup/Editor/Unity -batchmode -nographics \
  -projectPath /workspace \
  -runTests -testPlatform EditMode \
  -testResults /tmp/results.xml -logFile /tmp/test.log \
  -testFilter "Drift.Tests.RuntimeEnemyTests"
```

Faster feedback loop when working on the FSM.

## 9. Report it

Write `library/qa/unity-tests/2026-06-22-editmode-suite-run.md`:

```markdown
# EditMode suite run — 2026-06-22

- Editor: ~/unity-setup/Editor/Unity 6000.0.77f1 (real editor run ✅)
- Library: tmpfs redirect applied
- Command: -batchmode -nographics -runTests -testPlatform EditMode (NO -quit)
- Pass: second run (first was the import pass)
- Exit: 0
- results.xml: total=38 passed=38 failed=0
- Verdict: Tier 0 EditMode suite GREEN in a real editor. Resolves CLAUDE.md §3
  "green pending a real-editor run" for the EditMode spine. The "is it fun?"
  play-test (CLAUDE.md §4) remains outstanding (out of scope for this Guardian).
```

The verdict line is the whole point: it states explicitly whether this was a *real* run, the standard CLAUDE.md §3 demands.
