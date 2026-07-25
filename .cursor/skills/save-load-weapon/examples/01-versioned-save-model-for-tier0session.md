# Example 01 — A versioned save model for the Tier 0 spine

> **Tier discipline:** this is *Tier 1 PREP design*, not a directive to add these files mid-Tier-0. Per `guides/09-tier-discipline-note.md`, the gray-box ships with no save (GDD §3). This shows the shape the Tier 1 save grows into, grounded in the real spine.

## Goal

Model a save that captures the durable state of the DRIFT loop — inventory (by id), the loop phase, completed objectives, and the survival meters — as a versioned `[Serializable]` model that round-trips through `JsonUtility` (`guides/02`) and references content only by id (`guides/03`).

## The model

```csharp
using System;
using System.Collections.Generic;

namespace Drift.Persistence
{
    [Serializable]
    public class SaveGameV2
    {
        public int schemaVersion = 2;                 // FIRST field — read before anything (guides/04)
        public SaveMetadata metadata = new();
        public List<InventorySlotSave> inventorySlots = new();
        public int loopPhase;                          // (int)Drift.Gameplay.Bootstrap.Tier0LoopPhase
        public List<string> completedObjectives = new();
        public List<MeterSave> meters = new();
    }

    [Serializable]
    public class SaveMetadata
    {
        public string savedAtIso;     // DateTime.UtcNow.ToString("o")
        public int inGameDay;         // GDD: raiders assault every 24h
        public float playtimeSeconds;
        public int loopPhase;         // duplicated in the header so the load screen needs no body (guides/06)
        public string appVersion;     // Application.version
    }

    [Serializable]
    public class InventorySlotSave
    {
        public string itemId;         // ItemDefinition.id — e.g. "scrap_metal" (Tier0Balance) — NOT a reference
        public int count;
        public int durability;        // Tier 1 durability economy (CLAUDE.md Hard Rule #2)
    }

    [Serializable]
    public class MeterSave
    {
        public string meterId;        // "oxygen" | "suit_power"
        public float current;
        public float max;
    }
}
```

## How capture maps from the real spine

| Save field | Captured from | Note |
|---|---|---|
| `inventorySlots[i].itemId` | `SalvageInventory.Slots[i].Item.id` (`SalvageInventory.cs:298`, `:316`) | store the **id**, not the `ItemDefinition` |
| `inventorySlots[i].count` | `SalvageInventory.Slots[i].Count` (`:299`) | |
| `inventorySlots[i].durability` | `SalvageInventory.Slots[i].Durability` (`:300`) | already tracked per slot |
| `loopPhase` | `(int)Tier0LoopController.Phase` (`Tier0LoopController.cs:20`) | enum → int, values pinned (`guides/02`) |
| `completedObjectives` | the per-objective flags in `Tier0ObjectiveTracker` | store stable objective string keys |
| `meters` | `OxygenSystem` / `SuitPowerSystem` current+max | run-state, not config |

Note what's **excluded**: `SalvageInventory._counts` (derived — rebuilt by `RebuildCounts()`, `SalvageInventory.cs:257`), `Tier0Session.ItemDatabase` (content — loaded, referenced by id, never serialized), and everything in `Tier0Balance` (config constants).

## The key line

The whole id-not-reference rule (`guides/03`) is this one substitution at capture time:

```csharp
// RIGHT — store the stable id:
slotSave.itemId = slot.Item.id;

// WRONG (must-fix) — store the ScriptableObject reference / instance id / index:
// slotSave.item = slot.Item;                 // SO ref: not stable across sessions/reimport
// slotSave.instanceId = slot.Item.GetInstanceID();   // per-session, meaningless next run
// slotSave.dbIndex = database.IndexOf(slot.Item);     // drifts when the array reorders
```

On load, `Apply` rehydrates: `Tier0Session.Instance.ItemDatabase.TryGetById(slotSave.itemId, out var item)` (`Tier0Session.cs:10`), skipping any id the current build no longer has (`guides/03`, unknown-id tolerance).

See `templates/save-model.cs` for the reusable skeleton and `templates/save-service.cs` for the `Capture`/`Apply` service.
