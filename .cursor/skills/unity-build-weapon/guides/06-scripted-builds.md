# 06 — Scripted Builds

A release build is **scripted, not click-built**. `BuildPipeline.BuildPlayer` + an editor menu +
a CLI `-executeMethod` entry point make the build deterministic, reproducible, and reviewable.

> **Tier note:** author the build script now as Tier-1 prep; **do not run it** to "verify" Tier 0
> — there is no scene to build (`AGENTS.md`), and the human runs device builds (`CLAUDE.md §7`).
> The script compiling cleanly is the Tier-0-appropriate check (it's editor C#, owned with
> `unity-csharp-guardian`).

## 1. `BuildPipeline.BuildPlayer`

The core API. It takes a `BuildPlayerOptions` and **returns a `BuildReport`** (read it — `guides/08`):

```csharp
var options = new BuildPlayerOptions
{
    scenes          = EditorBuildSettings.scenes
                        .Where(s => s.enabled).Select(s => s.path).ToArray(),
    locationPathName = outputPath,          // e.g. "Builds/Android/drift.aab"
    target           = BuildTarget.Android,
    options          = BuildOptions.None,   // | BuildOptions.Development for dev builds
};

BuildReport report = BuildPipeline.BuildPlayer(options);
if (report.summary.result != BuildResult.Succeeded)
    throw new Exception($"Build failed: {report.summary.totalErrors} errors");
```

**The scene list is the Tier-0 trap.** In Tier 0 `EditorBuildSettings.scenes` is empty (no scene —
`AGENTS.md`), so a build either errors or produces an empty player. That is *expected*; it's why the
build is Tier-1 work. Don't paper over it with a placeholder scene to make a green build.

## 2. The editor build menu

Expose builds as `[MenuItem]` entries so a human can trigger a known-good configuration without
re-deriving flags. See `templates/BuildScript.cs`:

```csharp
[MenuItem("DRIFT/Build/Android AAB (Release)")]
public static void BuildAndroidReleaseMenu() => BuildAndroid(development: false, appBundle: true);
```

The menu method and the CLI method call the **same** `BuildAndroid(...)` core, so the menu and CI
can never diverge.

## 3. CLI entry for CI: `-executeMethod`

CI runs the build headless by naming a static method:

```bash
Unity -batchmode -nographics -quit \
  -projectPath . \
  -executeMethod Drift.Build.BuildScript.BuildAndroidRelease \
  -logFile -
```

`game-ci/unity-builder` wraps exactly this (`guides/10`). Note `-quit` is fine for a build (unlike
`-runTests`, where `AGENTS.md` warns it suppresses results) — a build is a one-shot method, not a
runner that quits itself.

## 4. Determinism

- Read **all** signing/version values from environment variables (`guides/03`, `guides/09`), so
  the same script produces the same artifact given the same env — locally and in CI.
- Set Player Settings **in the script** (`guides/05`), not as editor state, so a build doesn't
  depend on which checkboxes the last person left.
- Fail loudly on `BuildResult.Failed` with a non-zero exit so CI catches it.

## 5. Headless-VM context

Per `AGENTS.md`, this VM redirects `Library/` to tmpfs (overlayfs breaks lmdb) and Personal-license
activation is interactive. Those constraints apply to **any** batchmode invocation, build included —
so even a "does the build script run" check inherits the same activation + tmpfs prerequisites the
test runs do. In practice, the build is exercised in CI / by the human on a Mac (iOS) or a
properly-licensed runner, not on the bare Tier-0 dev VM.

## Severity

- **Must-fix:** a click-built release (non-reproducible); not failing the process on
  `BuildResult.Failed` (a silent broken artifact); adding a placeholder scene just to force a green
  Tier-0 build (violates tier discipline / `AGENTS.md`).
- **Should-refactor:** menu and CI paths with divergent flags instead of a shared core method;
  signing/version values inlined instead of read from env.
- **Style:** menu path naming.

## Handoffs

- The full template → `templates/BuildScript.cs`.
- Editor C# correctness/architecture of the script → `unity-csharp-guardian` (co-owned).
- Running it in CI → `guides/10`.
- Reading the returned Build Report → `guides/08`.
