# 02 — Economy Sinks and Faucets

> GDD §6: *"Resource sinks — weapon/tool durability + upgrades + tiered ammo + O2 fuel keep raw-material demand infinite (what makes survival games last)."*

## The model

Every survival economy is a set of **faucets** (sources that add resources) and **sinks** (drains that consume them). Balance is the relationship between them over time:

- **Demand > supply** → tension, scarcity, hard inventory choices (the LDoE feeling).
- **Supply > demand** → the loop goes slack; the player "solves" the economy and puts the game down.

The Tier 0 economy is **closed and computable** — only three faucets and three sinks. Always compute the ledger; never eyeball it.

## The Tier 0 ledger (read from `Tier0Balance.cs`)

### Faucets (resources available per surface run)

| Resource | Source | Amount |
|---|---|---|
| Scrap metal | `ScrapMetalNodeAmount` | 14 |
| Polymer | `PolymerNodeAmount` | 4 |
| Raw ore | `RawOreNodeAmount` | 3 |
| Scrap (cutter cache) | `CutterCacheScrapAmount` | 3 |
| Polymer (welder cache) | `WelderCachePolymerAmount` | 2 |
| Raw ore (drill cache) | `DrillCacheRawOreAmount` | 2 |

**Total available per run:** scrap **17**, polymer **6**, raw ore **5**.

> Note: the tool-gated caches (GDD §8) require the matching tool to already be crafted before they open (`SalvageNode.HasRequiredTool`). So cache resources are a *second wave* of faucet — you can't bank them up front. The base nodes must cover the first tool.

### Sinks (resources consumed in a full run)

| Sink | Cost | Source |
|---|---|---|
| Craft Cutter | 4 scrap | `CutterScrapCost` |
| Craft Welder | 3 scrap + 2 polymer | `WelderScrapCost` + `WelderPolymerCost` |
| Craft Plasma Drill | 5 scrap + 2 raw ore + 1 polymer | `DrillScrapCost` + `DrillRawOreCost` + `DrillPolymerCost` |
| Place 1 deck plate | 2 scrap + 1 polymer | `DeckPlateScrapCost` + `DeckPlatePolymerCost` |

**Total to craft all three tools:** scrap **12**, polymer **3**, raw ore **2**.
**Plus one deck plate:** scrap **14**, polymer **4**, raw ore **2**.

## The verdict (the math that matters)

| Resource | Available | Spent (3 tools + 1 plate) | Surplus |
|---|---|---|---|
| Scrap | 17 | 14 | **+3** |
| Polymer | 6 | 4 | **+2** |
| Raw ore | 5 | 2 | **+3** |

**Reading:** The Tier 0 economy is **deliberately tight on polymer** (+2 buffer — the smallest surplus) and comfortable on scrap/raw-ore. Polymer is the constraining resource — it gates the Welder and the deck plate. That is *good design for a gray-box*: it forces a real inventory decision (a *second* deck plate would eat the surplus to +1) without being unwinnable.

**A faucet that can't pay its sink is a must-fix.** If someone drops `PolymerNodeAmount` to 2, available polymer falls to 4 against a demand of 4 — surplus 0, and any extra craft or a second deck plate goes negative. Flag it with the ledger.

## How to use the ledger when tuning

1. Read all six faucet consts and all four sink groups from `Tier0Balance.cs`.
2. Build the available-vs-spent table above.
3. Account for **gating**: cache faucets need their tool first. Verify the base nodes alone cover the *first* tool in the craft order.
4. Report the per-resource surplus/deficit. A negative surplus on any path = must-fix economy break.
5. If the human wants "tighter," reduce the surplus toward (but not below) zero on the *intended* constraining resource — keep it as the tension lever, don't make it unwinnable.

## Tier 1 sinks (spec-only now)

When Tier 1 lands, the durable sinks arrive and the economy stops being a one-shot:

- **Durability** — tools/weapons degrade per use, repaired or recrafted (the infinite sink — `guides/06`).
- **Tiered ammo** — a *second* sink on top (GDD §8).
- **O2 fuel** — the oxygen meter becomes a consumable demand, not just a timer.
- **Station upgrades** — hull tiers L1→L4 (GDD §5).

These convert the closed one-run ledger into an open, ongoing demand. Spec them; don't build them mid-Tier-0 (tier discipline).
