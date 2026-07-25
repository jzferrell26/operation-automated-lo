# Example 02 — A Skill-Tree Data Model

Designing the GDD §6 "light perk tree" as a node graph. **Design artifact — Tier 1** (`guides/09`). **Costs and magnitudes are `game-balance-guardian`'s** (`guides/06`).

## The ask

> "Design the perk tree. Players spend skill points to unlock perks that boost their stats. Some perks need others first."

## The tier opener

> The perk tree is Tier 1+ — Tier 0 has none (GDD §13, Hard Rule #1). Here's the **data model** for when scope elevates. The point **costs** and perk **power** are `game-balance-guardian`'s numbers; I design the graph shape.

## The model: an acyclic prerequisite graph of SO nodes

Each perk is a `SkillNodeDefinition` (`templates/skill-node.cs`). Four nodes, mirroring the XP sources (a "light" tree, GDD §6):

```
[Salvager I] --prereq--> [Salvager II]
[Tough I]    --prereq--> [Tough II]
```

```csharp
// Salvager I (root — no prerequisites)
id = "salvager_1";
prerequisiteNodeIds = new string[0];
maxRank = 1;
pointCostPerRank = new[] { 1 };                       // PLACEHOLDER (game-balance)
grantsPerRank = new[] { new RankGrant {                // built on the REAL StatModifier
    modifiers = new[] { new StatModifier { statId = "salvageYield", value = 0f } } // 0 = placeholder, game-balance fills
}};

// Salvager II (requires Salvager I)
id = "salvager_2";
prerequisiteNodeIds = new[] { "salvager_1" };          // reference BY ID, never SO ref
```

## The invariants I enforce (shape — `guides/03`)

1. **Acyclic** — `IsCycleFree(nodes)` must hold; a cycle makes the tree unreachable (must-fix).
2. **Reachable** — every node reaches a root via prerequisites (orphan = should-refactor).
3. **Rank arrays line up** — `pointCostPerRank.Length == grantsPerRank.Length == maxRank` (`HasConsistentRankArrays`).
4. **Effects are `StatModifier[]`** — never `if (perkId == "salvager_1") yield += ...` (Hard Rule #3).

## Runtime state (durable — handed to save-load)

```csharp
// save-load-guardian serializes this (guides/07): string ids only, versioned.
//   List<PerkRank> { string nodeId; int rank; }
//   int unspentSkillPoints
```

I define the shape; `save-load-guardian` owns the DTO, format, and migration.

## What I designed vs. handed off

| I designed (shape) | game-balance fills | save-load owns |
|---|---|---|
| Node graph, prereqs-by-id | `pointCostPerRank` values | the perk-rank save model |
| Ranks, acyclicity, reachability | `maxRank` count, modifier magnitudes | versioning / migration |
| `grants` = `StatModifier[]` | the actual `salvageYield` value | — |

## The EditMode test (`guides/08`)

```csharp
[Test] public void Tree_IsAcyclic() { Assert.IsTrue(SkillTree.IsCycleFree(allNodes)); }
[Test] public void RankArrays_Consistent() { Assert.IsTrue(node.HasConsistentRankArrays()); }
```

## Sources
- GDD §6 ("light perk tree"). `templates/skill-node.cs`. `guides/03`, `04`, `06`, `07`, `09`.
- `Assets/Scripts/Drift/Data/Items/StatModifier.cs` (the granted-effect type).
