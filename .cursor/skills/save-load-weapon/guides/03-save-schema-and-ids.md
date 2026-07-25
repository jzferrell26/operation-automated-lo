# 03 — Save schema and stable IDs

This is the load-bearing guide of the Weapon. The one rule that keeps a save file loadable across every future rebuild, asset reimport, and content edit is: **serialize stable string content IDs, never object/ScriptableObject references.**

## The rule

A save stores **`ItemDefinition.id`** — the plain string. It never stores:

- a reference to the `ItemDefinition` `ScriptableObject` instance,
- `ScriptableObject.GetInstanceID()`,
- an array index into `ItemDatabase`,
- the asset's GUID or file path.

On load, the save rehydrates each id back to the live `ItemDefinition` by **looking it up**, through the database `Tier0Session` holds:

```csharp
// Tier0Session exposes the active database (Tier0Session.cs:10)
ItemDatabase db = Tier0Session.Instance.ItemDatabase;
if (db.TryGetById(slotSave.itemId, out ItemDefinition item)) { /* apply */ }
```

### Why ids and nothing else

- **SO references / InstanceIDs are not stable.** `GetInstanceID()` is assigned per session and changes across runs, rebuilds, and reimport. A reference serialized by Unity into a save points at *nothing* the next time the project loads.
- **Array indices drift.** The moment `ItemDatabase`'s array is reordered or an item is inserted, every saved index now means a different item — silent, undetectable corruption.
- **Asset GUIDs are an editor concept**, not a content-design handle; coupling saves to them couples player state to asset-file identity.
- **The id is the only durable handle the design already trusts.** `Tier0Balance` defines the ids as the single source (`Tier0Balance.cs:5-10`: `ScrapMetalId = "scrap_metal"`, …). `SalvageInventory` already keys its counts and matches slots on `item.id` (`SalvageInventory.cs:273`, `:316`). The save format mirrors the system that already exists.

This is also CLAUDE.md Hard Rule #3 (data over code for content) made concrete: items are ScriptableObjects; the save references them by id and never becomes a second copy of the content.

## Schema shape

A flat, `JsonUtility`-friendly model (`guides/02-json-vs-unity-serialization.md`), versioned (`guides/04-versioning-and-migration.md`):

```csharp
[Serializable]
public class SaveGameV2
{
    public int schemaVersion = 2;          // ALWAYS first; read before anything else
    public SaveMetadata metadata;          // slot header (guides/06)
    public List<InventorySlotSave> inventorySlots;
    public int loopPhase;                  // (int)Tier0LoopPhase, pinned values
    public List<string> completedObjectives;
    public List<MeterSave> meters;
}

[Serializable]
public class InventorySlotSave
{
    public string itemId;                  // ItemDefinition.id — NOT a reference
    public int count;
    public int durability;                 // Tier 1: the durability economy (Hard Rule #2)
}

[Serializable]
public class MeterSave
{
    public string meterId;                 // "oxygen", "suit_power"
    public float current;
    public float max;
}
```

Note the inventory schema is a **list of `{ itemId, count, durability }`**, mirroring `SalvageInventorySlot` (`SalvageInventory.cs:284-296`, which already serializes `item`, `count`, `durability`) — but storing `itemId` (string) in place of the `ItemDefinition item` (reference). That single substitution is the whole rule.

## Rehydration is fallible — handle the miss

`TryGetById` can fail: an id in an old save no longer exists in the database (content was removed). The apply path must tolerate this without crashing:

- **Unknown item id** → skip that slot, log a warning, keep loading. Never throw.
- **Unknown objective / meter id** → skip and continue.

A save that references content the build no longer has is normal across versions; dropping the unknown entry is correct (and a migration may explicitly handle the rename — `guides/04-versioning-and-migration.md`).

## The never-list (must-fix findings)

| In a save you find… | Why it's a must-fix | Fix |
|---|---|---|
| `[SerializeField] ItemDefinition item` written into the save model | SO reference not stable across sessions/reimport | Store `string itemId = item.id` |
| `item.GetInstanceID()` | per-session, meaningless next run | Store `item.id` |
| `databaseIndex` / array index | drifts when the array reorders | Store `item.id` |
| asset GUID / path | couples state to asset identity | Store `item.id` |
| the whole `ScriptableObject` inlined | second content store; breaks Hard Rule #3 | Reference by `item.id` |

## Checklist

- [ ] Every content reference in the save is a `string` id, sourced from `ItemDefinition.id` / `Tier0Balance` constants.
- [ ] No `ScriptableObject`/`MonoBehaviour` references, `GetInstanceID()`, array indices, GUIDs, or paths in the model.
- [ ] Apply rehydrates via `ItemDatabase.TryGetById` and tolerates a miss (skip + warn, never throw).
- [ ] `schemaVersion` is the first field and is read before any other field.
- [ ] Enums (`Tier0LoopPhase`) stored with pinned integer values.
