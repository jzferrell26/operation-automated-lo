# 05 — Atomic writes and corruption handling

On mobile, the OS kills your process whenever it likes — the player backgrounds the app, the device runs low on memory, the battery dies. If that happens mid-write, a naive single-stream save leaves a **truncated, unloadable file** and the player loses their run. The fix is to make every write atomic and to treat a corrupt file on load as normal, not exceptional.

## Atomic write: temp + rename

Never write directly over the live save. Write to a temp file, flush it fully to disk, then **atomically rename** it over the target. A rename is a single filesystem operation — it either fully happens or doesn't; there is no half-renamed state.

```
1. Serialize model → string/bytes
2. Write to  save.tmp
3. Flush + close the stream (force bytes to disk)
4. If  save.json  exists, copy it to  save.bak   (keep one backup)
5. Atomically replace  save.json  with  save.tmp
```

In C#:

```csharp
File.WriteAllText(tmpPath, json);                 // step 2-3 (WriteAllText flushes+closes)
if (File.Exists(savePath)) File.Copy(savePath, bakPath, overwrite: true);  // step 4
File.Delete(savePath);                             // some platforms: rename won't overwrite
File.Move(tmpPath, savePath);                      // step 5 — atomic rename
```

> Note: `File.Move` over an existing file throws on some platforms; the safest cross-platform shape is delete-then-move (with the `.bak` already in hand so a crash between delete and move still has a recoverable copy), or `File.Replace` where supported. Pick one and document it in the ADR.

A single-stream `File.WriteAllText(savePath, json)` straight over the live save is a **must-fix** — a crash mid-write destroys the only copy.

## Backups: keep one `.bak`

Before overwriting, copy the current good save to `save.bak`. One generation is enough for Tier 0–1. The backup is the second link in the load fallback chain.

## Load is a fallback chain, never a crash

Loading must assume the file might be missing, truncated, or garbage. Try each source in order and degrade gracefully:

```
1. Read save.json → deserialize → validate (schemaVersion present, parses) → use it.
2. On failure, read save.bak → deserialize → validate → use it (and re-promote it to save.json).
3. On failure, start a fresh save. Log loudly. Never throw to the player.
```

A load path that throws an unhandled exception on a bad file is a **must-fix**. Wrap deserialize in try/catch; a `JsonUtility.FromJson` on garbage can throw or return a degenerate object — check `schemaVersion != 0` and required fields as a parse sanity gate.

## Integrity check (optional, recommended)

Storing a small checksum lets load *detect* a truncated/edited file instead of silently applying half of it:

- Write the JSON, compute a hash (e.g. SHA-256 or a CRC) of the payload, and store both — either as a sidecar `save.json.sum` or a `checksum` field over the rest of the model.
- On load, recompute and compare; mismatch → treat as corrupt → fall to `.bak`.

This is also the lightest "did a player hand-edit the file" signal — but real anti-tamper is a server concern (`db-guardian`), not a reason to go binary (`guides/02`).

## The write trigger matters on mobile

When you save is a design choice, but the failure mode this guide protects against (process death) means: save at safe checkpoints (extraction, raid survived, returning to the station hub — the `Tier0LoopController` phase transitions are natural points), and consider saving on `OnApplicationPause(true)` / `OnApplicationQuit`, which fire when the OS is about to background you. The *cost* of that write (don't stall the main thread) is a `mobile-game-perf` concern — coordinate, don't ignore.

## Checklist

- [ ] Writes go to `save.tmp`, flush, then atomic rename over `save.json`. Never a direct overwrite.
- [ ] One `.bak` kept from the previous good save before overwriting.
- [ ] Load tries primary → backup → fresh, in that order.
- [ ] Deserialize wrapped in try/catch with a parse sanity gate (`schemaVersion`, required fields).
- [ ] Load never throws to the player on a corrupt file.
- [ ] (Recommended) checksum/integrity check to detect truncation.
- [ ] Save triggers at safe checkpoints + on app-pause/quit; write cost coordinated with `mobile-game-perf`.
