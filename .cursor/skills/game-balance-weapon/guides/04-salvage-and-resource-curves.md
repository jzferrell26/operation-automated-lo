# 04 — Salvage and Resource Curves

> GDD §3: salvage is the new "gather wood/stone/fiber" — *"Same dopamine, new nouns."* The yield curve is the supply side of the economy ledger (`guides/02`).

## What a salvage node is

`SalvageNode` (`Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs`) is a walk-in trigger pickup: on `OnTriggerEnter`, if the player's `SalvageInventory` has room (and the required tool, for caches), it adds `amount` of `item` and (optionally) destroys itself. Two kinds:

1. **Resource nodes** — ungated, give a base resource. `Configure(definition, pickupAmount)`.
2. **Tool-gated caches** — require a crafted tool first (`requiredToolItemId`); opening one also fires `Tier0ObjectiveTracker.RecordToolCacheOpened`. `Configure(definition, pickupAmount, requiredToolId)`.

The yields come from `Tier0Balance` and are placed by `Tier0RuntimeSpawner` (3 resource nodes + 3 caches — ARCHITECTURE.md §4).

## The Tier 0 yield table

| Node | Item | Yield const | Amount | Gated by |
|---|---|---|---|---|
| Scrap node | scrap_metal | `ScrapMetalNodeAmount` | 14 | — |
| Polymer node | polymer | `PolymerNodeAmount` | 4 | — |
| Raw-ore node | raw_ore | `RawOreNodeAmount` | 3 | — |
| Cutter cache | scrap_metal | `CutterCacheScrapAmount` | 3 | needs Cutter |
| Welder cache | polymer | `WelderCachePolymerAmount` | 2 | needs Welder |
| Drill cache | raw_ore | `DrillCacheRawOreAmount` | 2 | needs Plasma Drill |

## The curve principles

### 1. Base nodes must cover the first tool unaided

Caches are gated behind their *own* tool, so they can't pay for the tool that unlocks them. The base nodes alone must afford the first craft in the order. Tier 0 craft order is Cutter (4 scrap) → Welder (3 scrap + 2 polymer) → Drill (5 scrap + 2 ore + 1 polymer). The base scrap node (14) covers Cutter and Welder scrap with room; the base polymer node (4) covers the Welder's 2 polymer. **Verify this whenever yields change** — a base node too small to afford the first tool is a must-fix dead-end.

### 2. Scarcity is tension; abundance is boredom

Match the per-resource yield to its demand so the constraining resource stays slightly scarce (see the `guides/02` ledger: polymer is +2, the smallest surplus and the intended pinch point). The yield curve's *job* is to make one resource feel precious. A node that hands out 3× what its sinks need has killed the tension for that resource. **Tune yields toward the surplus you want, not toward "feels generous."**

### 3. Gating creates a progression staircase

The cache → tool → cache loop is a deliberate gate: you craft a tool, which unlocks a cache, which feeds the next tool. This is the Tier 0 version of GDD §6's recipe tree. The yields should make each step *just* affordable from what came before — a staircase, not a cliff (unwinnable) and not a ramp (trivial).

## Tier 1 forward look: yield curves proper

Tier 0 has flat single-pickup yields. Tier 1 (GDD §7) introduces the real curve dimensions — spec, don't build:

- **Danger-tier scaling** — green/yellow/red zones yield more and rarer salvage at higher risk. This is where a *yield curve* (yield as a function of zone tier) replaces flat consts → a ScriptableObject per zone tier (`guides/01`).
- **Blueprint drops** — rare schematics gate higher recipes (GDD §6); their drop *rate* is a balance value (loot-table tuning, human-owned per CLAUDE.md §7).
- **Diminishing returns / node respawn** — whether nodes respawn and how fast becomes the long-run faucet rate.
- **Two-register depth** — other worlds (GDD §7 Register 2) yield the rarest tiers, gated behind ship upgrades.

## When tuning salvage, produce

A **yield-vs-cost table** (see `examples/02-salvage-yield-table.md`): each resource's total available, total demanded by the full craft+build path, and the resulting surplus — the same ledger as `guides/02` but presented from the salvage POV. Land any changed yields as a `Tier0Balance` diff and flag the human's feel pass for the "does collecting it feel good?" call.
