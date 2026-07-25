# 02 — ScriptableObject as Data (Hard Rule #3)

Content is data, not code. Items, recipes, structures, and crew are ScriptableObjects authored as assets — never hardcoded C# classes. This is `CLAUDE.md` §6 Hard Rule #3, and violating it is a **must-fix**.

## Why this is a hard rule

A ScriptableObject is a serializable data container that lives as an `.asset` file in the project, edited in the inspector, not recompiled. The payoff in Drift (GDD §4):

- The human (who owns balance, content, and feel per `CLAUDE.md` §7) authors and tunes items/recipes without touching code or triggering a recompile.
- The C# spine stays small — it operates on data, it doesn't *contain* the content.
- New content is a new asset, not a new class. A 30-item Tier 1 inventory is 30 assets, not 30 classes.

Adding a `class CutterTool : Tool` with hardcoded stats is the anti-pattern. The right move is a new `ItemDefinition` asset.

## The canonical pattern: ItemDefinition + ItemDatabase

`ItemDefinition` is a `[CreateAssetMenu]` ScriptableObject — pure data, zero logic (`Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`):

```csharp
[CreateAssetMenu(fileName = "Item_", menuName = "Drift/Item Definition")]
public class ItemDefinition : ScriptableObject
{
    [Header("Identity")]   public string id;
                           public string displayName;
    [Header("Inventory")]  public int stackMax = 99;
                           public float weight = 1f;
                           public int durabilityMax;
    [Header("Classification")] public ItemCategory category;
    [Header("Crafting")]   public CraftCostEntry[] craftCost;
    [Header("Stats")]      public StatModifier[] statModifiers;
}
```

`ItemDatabase` is the lookup — also a SO, holding the array and a `TryGetById` (`Assets/Scripts/Drift/Data/Items/ItemDatabase.cs:11`):

```csharp
public bool TryGetById(string itemId, out ItemDefinition definition) { /* linear scan */ }
public IReadOnlyList<ItemDefinition> All => items ?? System.Array.Empty<ItemDefinition>();
```

`RecipeDefinition` follows the same shape — `output`, `outputAmount`, `ingredients[]` (`CraftCostEntry`) — under `Drift.Data.Crafting`. Recipes reference items by SO reference, not by string copy.

When the runtime spawner needs a database in code, it builds one with `ScriptableObject.CreateInstance` and populates it from `Tier0Balance`; the editor path authors the same database as an asset (`ARCHITECTURE.md` §3). Both produce the same `ItemDatabase` — that's the point.

## Data vs logic: keep behaviour OUT of the data SO

`ItemDefinition` has no `Use()` method, no `OnEquip()`. Behaviour lives in the MonoBehaviours that *operate on* the data:

- `SalvageInventory` reads `item.stackMax`, `item.durabilityMax` to stack and store.
- `SimpleCrafter` reads a `RecipeDefinition`'s `ingredients` to gate crafting.
- `SalvageNode` references an item to grant on pickup.

Logic creeping into a data SO (a method that mutates game state, a coroutine, a frame update) is a **should-refactor** — pull it into the consuming component. The SO is a noun; the verb is elsewhere.

## ScriptableObject-as-data vs ScriptableObject-as-singleton

Two legitimate SO roles; don't confuse them:

- **Data asset** (Drift's dominant use) — many instances, each a content row. `ItemDefinition`, `RecipeDefinition`.
- **Config/registry singleton** — one instance, a lookup or shared config. `ItemDatabase`, `RecipeDatabase`.

Both are fine. What's *not* fine is a SO that holds **mutable runtime state** shared across a session — that's a hidden global and a save/load nightmare. Runtime state lives on MonoBehaviours or plain `[Serializable]` classes (`SurvivalMeter`), not in `.asset` files. If you need shared runtime state, that's a `save-load-guardian` conversation about session objects, not a SO field.

## The `id` string vs SO reference

`ItemDefinition` carries a string `id` (`scrap_metal`, `tool_welder`) *and* is referenced directly as a SO. Use the right one:

- **SO reference** for compile-time wiring (a recipe's `output`, a node's grant). Refactor-safe, no typos.
- **String `id`** for runtime counting/lookup where you don't hold the reference (`SalvageInventory.GetCount(string itemId)`, `Tier0Balance.ScrapMetalId`). The ids are centralized in `Tier0Balance` (`Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs`) so they're defined once.

A raw string literal `"tool_welder"` sprinkled through gameplay code instead of `Tier0Balance.WelderId` is a **should-refactor**.

## Durability is data — and it's coming back in Tier 1

`ItemDefinition.durabilityMax` and `SalvageInventorySlot.durability` already exist in the data shape. The durability *economy* (degradation on use, the late-game grind driver) was removed with the legacy spine and is deferred to Tier 1 (`ARCHITECTURE.md` §8). Hard Rule #2 (`CLAUDE.md` §6) is explicit: **durability stays** — do not "fix" or design it away. When Tier 1 rebuilds inventory/crafting, durability degradation rebuilds cleanly on this same `ItemDefinition`/`SalvageInventory` data shape. Until then, do not build the degradation logic (tier discipline, Hard Rule #1).

## Findings to raise

- **Must-fix:** new content (item/recipe/structure/crew) added as a hardcoded C# class instead of a ScriptableObject (Hard Rule #3).
- **Should-refactor:** game-state logic living inside a data SO; raw `id` string literals instead of `Tier0Balance` constants; mutable runtime state stored on a SO asset.
- **Flag (do not build):** any durability *degradation* logic — it's Tier 1 (Hard Rule #1 + #2). Note it for `game-balance-guardian`/Tier 1 and stop.
