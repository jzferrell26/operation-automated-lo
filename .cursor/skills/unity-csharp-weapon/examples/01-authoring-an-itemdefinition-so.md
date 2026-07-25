# Example 01 — Authoring a new item as a ScriptableObject

The data-driven way to add content (Hard Rule #3). Goal: add a new resource, "Circuitry", and a tool that consumes it, **without writing a new gameplay class**.

## The wrong way (what NOT to do)

```csharp
// DON'T — content hardcoded as a class. Must-fix (Hard Rule #3).
public class CircuitryResource { public int stackMax = 99; public float weight = 0.5f; }
public class SolderingIron : Tool { /* baked-in stats */ }
```

Every new item this way is a new class and a recompile, and the human can't tune it. The right move is **zero new classes** — just data.

## Step 1 — Author the ScriptableObject assets

`ItemDefinition` is already the data container (`Assets/Scripts/Drift/Data/Items/ItemDefinition.cs`). Create assets via **Create → Drift → Item Definition** (the `[CreateAssetMenu(menuName = "Drift/Item Definition")]` on the class). Two assets:

**`Item_Circuitry.asset`** (a resource):
```
id            = "circuitry"
displayName   = "Circuitry"
stackMax      = 99
weight        = 0.5
durabilityMax = 0          // resources don't degrade
category      = Resource
craftCost     = []          // gathered, not crafted
```

**`Item_SolderingIron.asset`** (a tool):
```
id            = "tool_soldering_iron"
displayName   = "Soldering Iron"
stackMax      = 1
durabilityMax = 50          // durability data field exists; the *economy* is Tier 1
category      = Tool
```

No code yet — and none needed for the items themselves. (Authoring the assets in-editor is `unity-mcp-guardian`'s lane; the *shape* of the SO is this Guardian's.)

## Step 2 — A recipe is also data

Create a `RecipeDefinition` via **Create → Drift → Recipe Definition** (`Assets/Scripts/Drift/Data/Crafting/RecipeDefinition.cs`):

**`Recipe_SolderingIron.asset`**:
```
id           = "recipe_soldering_iron"
output       = Item_SolderingIron      // SO reference, not a string copy
outputAmount = 1
ingredients  = [ { item: Item_Circuitry, quantity: 3 },
                 { item: Item_ScrapMetal, quantity: 2 } ]
```

Ingredients reference items by **SO reference** (refactor-safe), not by string id (`02-scriptableobject-data.md`).

## Step 3 — Register ids in `Tier0Balance`, not as string literals

Runtime lookups use the string `id`. Centralize it so gameplay never hardcodes `"circuitry"`:

```csharp
// Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs — add:
public const string CircuitryId        = "circuitry";
public const string SolderingIronId    = "tool_soldering_iron";
public const int    CircuitryNodeAmount = 6;     // yield VALUE → game-balance-guardian owns the number
```

Now `SalvageInventory.GetCount(Tier0Balance.CircuitryId)` reads cleanly and there's one place to change the id.

## Step 4 — It flows through the existing systems for free

Nothing else needs new code, because the spine operates on data:

- **Inventory:** `SalvageInventory.Add(circuitryDef, amount)` stacks it using `item.stackMax` — already generic (`SalvageInventory.cs:66`).
- **Lookup:** add both assets to the `ItemDatabase.items` array; `TryGetById("circuitry", out def)` resolves it (`ItemDatabase.cs:11`). The runtime spawner builds its database from `Tier0Balance`; the editor authors the same database as an asset (`ARCHITECTURE.md` §3).
- **Crafting:** `SimpleCrafter` reads the `RecipeDefinition.ingredients` and calls `SalvageInventory.HasIngredients`/`ConsumeIngredients` — already generic over any recipe.
- **Salvage:** a `SalvageNode` referencing `Item_Circuitry` grants it on pickup.

## The lesson

Adding content is **authoring assets + centralizing the id**, not writing classes. The C# spine stayed exactly the same size. This is why Hard Rule #3 exists: a 40-item Tier 1 inventory is 40 assets, not 40 classes — and the human owns the balance without touching code (`CLAUDE.md` §7).

**Durability note:** `durabilityMax = 50` is set as *data*, but do not build degradation logic now — the durability economy is Tier 1 (Hard Rule #1 + #2). The data field stays; the verb waits (`02-scriptableobject-data.md`).
