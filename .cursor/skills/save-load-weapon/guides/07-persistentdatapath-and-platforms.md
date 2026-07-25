# 07 — persistentDataPath and platform paths

DRIFT is a mobile game (CLAUDE.md §1). There is exactly one correct place to write save files: `Application.persistentDataPath`. This guide says why, and what's different on iOS vs Android.

## The one rule: `Application.persistentDataPath`

```csharp
string saveDir = Path.Combine(Application.persistentDataPath, "saves");
```

- It is **writable** on every platform (unlike `Application.dataPath`, which is read-only on device).
- It is **per-app, persistent across app updates**, and **platform-correct** — Unity resolves it to the right OS location for you.
- Writing anywhere else is a **must-fix** (`guides/00-principles.md` Rule #6). Never `Application.dataPath`, never `Application.streamingAssetsPath` (read-only, packaged), never a hardcoded absolute path.

## What it resolves to (for debugging, not for hardcoding)

You never write these paths literally — `persistentDataPath` gives them to you. Knowing them helps when you're inspecting a device save:

| Platform | `persistentDataPath` resolves to (roughly) |
|---|---|
| iOS | `…/Application/<GUID>/Documents/` (the app sandbox's Documents dir) |
| Android | `…/Android/data/<bundleId>/files/` (internal app storage) |
| Editor (Win/Mac/Linux) | a per-project user-data folder (e.g. `~/.config/unity3d/<Company>/<Product>` on Linux) — this is what an EditMode test hits |

## iOS specifics: iCloud backup flag

On iOS, files in `Documents/` are **backed up to iCloud by default**. For a save that's pure local game state, that's usually fine — but large or frequently-rewritten files in iCloud backup can get your app flagged by Apple's storage guidelines. If saves grow:

- Either keep them small (the flat id-keyed model helps — `guides/03`),
- or mark the save directory "do not back up" via the iOS `NSURLIsExcludedFromBackupKey` resource value (needs a small native plugin / `Application` API consideration).

For Tier 1's modest save, the default (backed up) is acceptable; revisit if save size grows or the rewrite cadence is high.

## Android specifics

- `persistentDataPath` maps to **internal** app storage by default — private to the app, removed on uninstall, no runtime storage permission needed. Correct for saves.
- Do **not** route saves to external/shared storage; it brings scoped-storage permission complexity and exposes the file to other apps for no benefit.

## Editor / headless reality (this matters for testing)

In the Unity Editor and in batchmode (the only way this VM runs anything — `AGENTS.md`), `persistentDataPath` is a real on-disk folder. That means:

- An EditMode test (`guides/08`) **can** exercise the real file path — but prefer writing to a **unique temp subfolder** (e.g. `Path.Combine(Application.persistentDataPath, "test-" + Guid.NewGuid())`) and deleting it in teardown, so tests don't collide or leave state.
- Better still, the save service takes the **root directory as an injected parameter** (`Configure(rootDir)`), so a test can point it at `Path.GetTempPath()` or an in-memory shim and never touch the real save location. This is the same `Configure(...)` discipline as the rest of the spine (`ARCHITECTURE.md` §7).

## Checklist

- [ ] All save I/O is under `Application.persistentDataPath`. No `dataPath`, no hardcoded paths.
- [ ] Android: internal storage (the default) — not external/shared.
- [ ] iOS: default backup acceptable for small saves; plan the no-backup flag if saves grow.
- [ ] The save service accepts an injectable root directory so tests can redirect it (`guides/08`).
- [ ] Paths built with `Path.Combine`, never string concatenation with `/`.
