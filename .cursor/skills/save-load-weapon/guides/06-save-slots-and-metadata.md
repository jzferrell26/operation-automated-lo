# 06 — Save slots and metadata

A save *slot* is one independent save file; *metadata* is a small header that lets a "load game" screen describe each slot without deserializing the whole save. Both are Tier 1+ features you design now so the file layout and model don't have to be rewritten when they land.

## Slots

A slot is just a named file under `persistentDataPath` (`guides/07`):

```
<persistentDataPath>/
  saves/
    slot0/save.json   slot0/save.bak
    slot1/save.json   slot1/save.bak
    autosave/save.json autosave/save.bak
```

Design notes:

- **One folder per slot** keeps the save + its `.bak` (+ any sidecar checksum) together and makes "delete this slot" a single directory delete.
- **An `autosave` slot** is a normal slot the loop writes at checkpoints (`Tier0LoopController` phase transitions — `guides/05`), distinct from manual slots.
- **Tier 0 reality:** the gray-box has no save at all (`guides/09`), so it has no slots. Tier 1's first save can ship as a *single implicit slot* (`saves/slot0/`) and grow to multiple slots later — the path scheme above is forward-compatible with both, so you don't rewrite the file layout when multi-slot arrives.

## Metadata: a header you can read cheaply

The "continue / load game" UI needs to show, per slot, things like: timestamp, in-game day, playtime, current loop phase, maybe the protagonist's state — **without** loading and rehydrating the entire save. Two ways to get that:

### Option A — metadata as the first object in the save (read, don't fully apply)

`SaveMetadata` lives at the top of the model (`guides/03`). To list slots, deserialize the file but only *read* the metadata; don't run `Apply`. Cheap enough for a handful of slots.

```csharp
[Serializable]
public class SaveMetadata
{
    public string savedAtIso;     // DateTime.UtcNow.ToString("o")
    public int inGameDay;         // GDD: raiders assault every 24h
    public float playtimeSeconds;
    public int loopPhase;         // (int)Tier0LoopPhase — show "On planet" / "Station"
    public string appVersion;     // Application.version, for support/repro
}
```

### Option B — a sidecar metadata file (read without touching the save)

Write a tiny `slot0/meta.json` alongside `save.json` containing only `SaveMetadata`. The load screen reads the sidecars only — fastest, and robust even if the main save is corrupt (you can show "slot 0, day 4, corrupt" instead of a blank). The cost is keeping the sidecar in sync (write it inside the same atomic save sequence, `guides/05`).

**Recommendation:** start with Option A (metadata as the save header) for simplicity; move to Option B sidecars if the load screen ever feels slow or you want to surface metadata for corrupt slots. Either way, **metadata that requires fully loading + applying the save to display is a should-refactor** finding.

## What to put in metadata (and what not)

- **Yes:** timestamp, in-game day, playtime, loop phase, app version, a human label. All cheap scalars.
- **No:** anything that requires rehydrating content by id (item names, full inventory) — that's the body of the save, not the header. Keep the header self-describing with primitives only so it never depends on `ItemDatabase` being loaded.

## Checklist

- [ ] One folder per slot under `persistentDataPath/saves/`; save + `.bak` (+ sidecar) co-located.
- [ ] Path scheme works for a single Tier 1 slot and scales to multi-slot without a rewrite.
- [ ] Metadata header is primitives only — readable without rehydrating content by id.
- [ ] Slot listing reads metadata without running `Apply` (Option A) or reads sidecars (Option B).
- [ ] Autosave is a distinct slot written at loop checkpoints.
- [ ] (Tier discipline) none of this is built mid-Tier-0 — it's the layout the Tier 1 save grows into (`guides/09`).
