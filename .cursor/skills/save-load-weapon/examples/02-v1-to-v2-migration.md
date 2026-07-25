# Example 02 — A v1 → v2 migration

> **Tier discipline:** design illustration for Tier 1 (`guides/09-tier-discipline-note.md`). Shows the migration mechanic the format must carry *before* the first save ships, so v1 is forgiving.

## The scenario

`SaveGameV1` shipped with inventory tracked as a parallel list of ids and counts, no per-slot durability, and a renamed content id. v2 (the model in `examples/01`) introduces:

1. **Reshape** — flat `itemIds[]` + `counts[]` → a list of `InventorySlotSave { itemId, count, durability }`.
2. **New field** — per-slot `durability` (the Tier 1 durability economy, CLAUDE.md Hard Rule #2). Backfill from the item's `durabilityMax` where known, else `0`.
3. **Content-id rename** — `tool_cutter` was shortened to `cutter`. Possible *only because* saves store ids, not references (`guides/03`).

## The v1 model (kept for migration)

```csharp
[Serializable]
public class SaveGameV1
{
    public int schemaVersion = 1;
    public string[] itemIds;      // parallel arrays
    public int[] counts;
    public int loopPhase;
}
```

## The migration step

```csharp
using System.Collections.Generic;

namespace Drift.Persistence.Migrations
{
    // Implements the ISaveMigration contract in templates/save-migration.cs
    public sealed class Migration_1_to_2 : ISaveMigration
    {
        public int FromVersion => 1;
        public int ToVersion => 2;

        public SaveGameV2 Apply(SaveGameV1 v1)
        {
            var v2 = new SaveGameV2 { schemaVersion = 2, loopPhase = v1.loopPhase };

            int n = v1.itemIds?.Length ?? 0;
            v2.inventorySlots = new List<InventorySlotSave>(n);
            for (int i = 0; i < n; i++)
            {
                string id = RemapId(v1.itemIds[i]);     // content-id rename (step 3)
                v2.inventorySlots.Add(new InventorySlotSave
                {
                    itemId = id,
                    count = (v1.counts != null && i < v1.counts.Length) ? v1.counts[i] : 0,
                    durability = 0,                      // new field default (step 2); a smarter
                                                         // backfill can look up ItemDefinition.durabilityMax
                });
            }
            return v2;
        }

        static string RemapId(string oldId) => oldId switch
        {
            "tool_cutter" => "cutter",                   // the rename
            _ => oldId,
        };
    }
}
```

## The runner (ordered, no skipping)

The runner reads `schemaVersion` first (a tiny envelope probe, `guides/04`), then steps version-by-version until it reaches the current schema:

```csharp
int version = ReadSchemaVersion(json);     // envelope probe
switch (version)
{
    case 1:
        var v1 = JsonUtility.FromJson<SaveGameV1>(json);
        var v2 = new Migration_1_to_2().Apply(v1);
        return v2;                          // next step (2_to_3) would chain here when it exists
    case 2:
        return JsonUtility.FromJson<SaveGameV2>(json);
    default:
        // unknown/newer version: load fresh, never crash (guides/05)
        return FreshSave();
}
```

## What this proves about the discipline

- **`schemaVersion` read first** — the runner never guesses the shape (`guides/04`).
- **Additive-first** — `durability` is a new field with a default; nothing destructive (`guides/04` evolution table).
- **Content rename via id remap** — survivable precisely because v1 stored `"tool_cutter"` (a string id), not an `ItemDefinition` reference (`guides/03`). Had it stored a reference or index, the rename would have orphaned every saved cutter.
- **Testable** — `Migration_1_to_2.Apply` is a pure function; assert it in EditMode (`examples/03`).

See `templates/save-migration.cs` for the `ISaveMigration` interface and the full ordered runner.
