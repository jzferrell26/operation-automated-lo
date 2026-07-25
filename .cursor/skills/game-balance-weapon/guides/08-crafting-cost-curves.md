# 08 — Crafting Cost Curves

> GDD §6: the recipe tree. Tier 0 has the three-starter-tool gate (`Cutter / Welder / Plasma Drill`); workstation + blueprint gating is Tier 1.

## What a recipe is

`RecipeDefinition` (`Assets/Scripts/Drift/Data/Crafting/RecipeDefinition.cs`) is a ScriptableObject:

```csharp
public string id;
public ItemDefinition output;
public int outputAmount = 1;
public CraftCostEntry[] ingredients;   // { ItemDefinition item; int quantity; }
```

`CraftCostEntry` (`Data/Items/CraftCostEntry.cs`) is the cost line. `SimpleCrafter` does the `1`/`2`/`3` quick-craft over `SalvageInventory`. The Tier 0 cost numbers live in `Tier0Balance` (so recipes and tests share one source).

## The Tier 0 cost curve

| Tool | Scrap | Polymer | Raw ore | Total raw units | Cost consts |
|---|---|---|---|---|---|
| Cutter | 4 | 0 | 0 | 4 | `CutterScrapCost` |
| Welder | 3 | 2 | 0 | 5 | `WelderScrapCost` + `WelderPolymerCost` |
| Plasma Drill | 5 | 1 | 2 | 8 | `DrillScrapCost` + `DrillPolymerCost` + `DrillRawOreCost` |

This is a **deliberate ascending curve**: 4 → 5 → 8 raw units, and an *increasing diversity* (1 → 2 → 3 resource types). The Cutter is the cheap entry tool (scrap only); the Welder adds polymer; the Drill is the capstone needing all three including the scarce raw ore. That's a clean gating staircase — each tool costs more and demands more variety than the last.

## Cost-curve principles

### 1. Cost should rise with capability

A more powerful / later tool costs more, in both total units and resource diversity. The Tier 0 curve does this (4→5→8). When adding a recipe, place its cost on the curve relative to its power — a tool that's strictly better than the Drill must cost more than 8 units / demand a rarer input.

### 2. Diversity gates progression harder than raw cost

Requiring a *new resource type* is a stronger gate than requiring more of an existing one, because it forces the player to find/unlock that resource first. The Drill needing raw ore (the scarcest node, 3 base + 2 cache) is the real gate, not its scrap cost. Use resource *diversity* as the primary difficulty knob for recipe gating.

### 3. The curve must stay inside the faucet ledger

Every recipe cost is a sink in the `guides/02` economy ledger. The full tool craft path (12 scrap / 3 polymer / 2 ore — add 2 scrap + 1 polymer for one deck plate → 14 / 4 / 2) must fit inside available yields (17 / 6 / 5) with the intended surplus. **Whenever you change a recipe cost, re-run the ledger** — a cost bump that pushes a resource negative is a must-fix economy break.

### 4. Match cost to the survival-time budget

Crafting happens on the surface, under the oxygen clock (`guides/03`). A recipe so expensive the player can't gather its inputs inside the O2 budget is effectively unwinnable. Cost curve and survival budget are coupled — check both.

## Tier 1 forward look (spec-only)

GDD §6 introduces the real recipe tree depth — spec, don't build mid-Tier-0:

- **Workstation tiers** — a recipe requires a placed workstation of tier N (fabricator → chem station → ammo press, GDD §5). The workstation becomes a *prerequisite gate* on top of material cost.
- **Blueprint discovery** — military/alien recipes require a learned blueprint, looted from dangerous zones (GDD §6). Blueprint *drop rate* is loot-table tuning (human-owned, CLAUDE.md §7); the recipe *cost* is yours.
- **Upgrade recipes** — hull tiers L1→L4 (GDD §5) are a cost curve of their own (salvage → alloy → reinforced → shielded), each tier a steeper sink.
- **Tiered ammo recipes** — basic ammo cheap/craftable; specialized cells expensive/rare (GDD §8, the second durability sink — `guides/06`).
- **Perk/XP gating** — light perk tree, XP by activity (GDD §6) gates *access* to recipes, separate from their cost.

As the tree deepens, the cost curve becomes multi-dimensional (materials × workstation tier × blueprint × perk). Express each axis as data; the curve's job stays the same — capability up, cost up, always inside the faucet ledger.

## When tuning crafting, produce

A recipe cost table (the curve above), the ledger re-check (`guides/02`), and any changed costs as a `Tier0Balance` diff + `RecipeDefinition` asset edits. Flag the human's feel pass for "does the gating feel rewarding or grindy?"
