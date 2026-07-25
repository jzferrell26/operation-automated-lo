# 01 — What to persist: save model vs runtime objects

The first design decision is *what* a save is — and it is **not** a snapshot of your live objects. It is a small, deliberate, versioned data model that you fill from runtime on save and pour back into runtime on load.

## The two-object rule

There are always two shapes:

1. **Runtime objects** — `MonoBehaviour`s and `ScriptableObject`s carrying Unity engine state, events, transforms, references. In DRIFT: `SalvageInventory`, `Tier0LoopController`, `Tier0ObjectiveTracker`, `OxygenSystem`/`SuitPowerSystem`, `Tier0Session`.
2. **The save model** — plain `[Serializable]` C# DTOs that exist only to be written and read: `SaveGameV2`, `InventorySlotSave`, `MeterSave`, etc.

You **never serialize the runtime object directly.** You convert:

- **Save = `Capture`**: walk runtime → fill the model.
- **Load = `Apply`**: read the model → set runtime state.

```
Runtime  --Capture-->  SaveGameV2 (DTO)  --Serialize-->  bytes on disk
bytes on disk  --Deserialize-->  SaveGameV2 (DTO)  --Apply-->  Runtime
```

### Why not serialize the runtime objects?

- A `MonoBehaviour`/`ScriptableObject` carries engine state, `event Action` delegates, and object references that have no meaning in a file and break across versions. (`SalvageInventory` has `event Action Changed` at `:15` — that is not save data.)
- Unity's own serializer would chase SO references and either inline a copy (a second content store — violates Hard Rule #3) or write an unstable handle (violates the IDs-not-references rule).
- A dedicated model is a schema you fully own and can version (`guides/04-versioning-and-migration.md`).

## What in the DRIFT spine is durable state?

Survey the spine and classify each field as **state** (save it), **content** (it's a ScriptableObject, reference by id), or **derived** (recompute, don't save).

| Source | Field | Class |
|---|---|---|
| `Gameplay/Inventory/SalvageInventory.cs` | per-slot `{ item.id, count, durability }` | **state** — store id, not the `ItemDefinition` ref |
| `SalvageInventory.cs:13` | `_counts` dictionary | **derived** — rebuilt by `RebuildCounts()`; don't save |
| `Gameplay/Bootstrap/Tier0LoopController.cs:16` | `Tier0LoopPhase phase` | **state** — enum, serialize as int or name |
| `Gameplay/Objectives/Tier0ObjectiveTracker.cs` | per-objective completion flags | **state** |
| `Core/Survival/OxygenSystem.cs`, `SuitPowerSystem.cs` | `SurvivalMeter { max, current }` | **state** (Tier 1+) — `current` is the run-state |
| `Gameplay/Bootstrap/Tier0Session.cs:10` | `ItemDatabase` | **content** — never saved; rebuilt/loaded, items referenced by id |
| `Gameplay/Bootstrap/Tier0Balance.cs` | yields, costs, ids | **content/config** — constants, never in a save |

> **Tier 0 reality check.** Per `guides/09-tier-discipline-note.md`, the Tier 0 gray-box has *nothing worth keeping across sessions yet* — the loop runs in one sitting and the GDD §3 deliberately ships no save. The table above is the **Tier 1 capture surface** you design toward, not a Tier 0 build order. The point of cataloguing it now is so that when Tier 1 introduces persistent progression, the save model already knows what's state vs. content vs. derived.

## The capture/apply seam (and why it's separate)

Put `Capture` and `Apply` in a service with a pure, testable seam — not inlined in `Awake`. This satisfies Hard Rule #11 (`guides/08-testing-save-load.md`): an EditMode test can `Capture` a configured inventory, serialize, deserialize, `Apply` to a fresh inventory, and assert equality, all without Play mode.

```csharp
SaveGameV2 model = saveService.Capture(world);   // runtime -> model
saveService.Apply(model, world);                 // model -> runtime
```

Each runtime system exposes the minimum read/write surface the service needs. If a system is hard to capture cleanly (state buried in private fields with no read path), that is a finding for `unity-csharp-guardian`, not a reason to reach into internals from the save layer.

## Derived state: recompute, don't store

Anything that can be recomputed from saved state is **derived** and stays out of the file. `SalvageInventory._counts` is the canonical example — it is rebuilt by `RebuildCounts()` (`SalvageInventory.cs:257`) from the slots on every access. Save the slots; let the counts regenerate. Storing derived state means two sources of truth that can disagree across a migration.

## Checklist

- [ ] The save is a `[Serializable]` model, not a live object.
- [ ] `Capture` (runtime→model) and `Apply` (model→runtime) are explicit, testable methods — not `Awake` side-effects.
- [ ] Every field classified state / content / derived; only **state** is in the model.
- [ ] Content (`ItemDefinition`, recipes) referenced by id; never copied into the save (`guides/03-save-schema-and-ids.md`).
- [ ] Derived fields (`_counts`) excluded; recomputed on apply.
