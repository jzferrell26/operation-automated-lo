# 03 — Loot and Drop Tables

How a salvage node decides *what* and *how much* it yields. This Guardian owns the **weighted-selection
ALGORITHM** and the **table-as-data shape**; the **weights and amounts are
`game-balance-guardian`'s** (co-owned seam). The drop lands on the real `SalvageNode.Configure`.

## The contracts this consumes (read the repo first)

- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` — the canonical resource/tool ids and
  the current Tier 0 amounts:
  - Resources: `ScrapMetalId="scrap_metal"`, `PolymerId="polymer"`, `RawOreId="raw_ore"`.
  - Tools: `CutterId`, `WelderId`, `PlasmaDrillId`.
  - Amounts: `ScrapMetalNodeAmount=14`, `PolymerNodeAmount=4`, `RawOreNodeAmount=3`, etc.
  These are the ids a Tier-1 drop table draws from. The *numbers* are balance's; this guide shows
  the *algorithm* that selects among ids.
- `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs:20` — `Configure(ItemDefinition, int amount)`
  and `:26` `Configure(ItemDefinition, int amount, string requiredToolId)`. **This is where a roll
  lands.** A drop-table roll produces an `(ItemDefinition, amount)` and calls `Configure`. Today
  `Tier0RuntimeSpawner` calls `Configure` with fixed `Tier0Balance` values; a Tier-1 table replaces
  the fixed value with a seeded roll.

## The data model (data over code — Hard Rule #3)

A drop table is a ScriptableObject, never an `if`-ladder:

```
DropTableDefinition (SO)
  entries: DropEntry[]
    DropEntry { itemId : string; weight : int; minAmount : int; maxAmount : int }
  rolls : int            // how many independent picks per open (a VALUE → balance)
```

- `itemId` references a `Tier0Balance` id (or its `ItemDefinition` in the `ItemDatabase`).
- `weight`, `minAmount`, `maxAmount`, `rolls` are **VALUES owned by `game-balance-guardian`.** The
  fields live in data; this Guardian reads them; balance tunes them. A drop table that hardcodes
  `if (roll < 0.6) scrap` in C# is a **must-fix** (Hard Rule #3).

## The selection algorithm (this Guardian's lane)

### Cumulative-weight selection (default — simple, correct, fast enough)

1. Sum all entry weights → `total`.
2. Draw `r = prng.NextInt(0, total)` from the **seeded** stream (guide 05).
3. Walk entries accumulating weight; the first entry whose running sum exceeds `r` is the pick.
4. Roll the amount: `prng.NextInt(minAmount, maxAmount + 1)`.

O(n) per pick over the entry count — trivial at DRIFT's table sizes. **Deterministic**: same seed +
same table → same pick + same amount. Iterate entries in **declared order** so the walk is stable.

### Vose's alias method (only when tables grow large)

For very large tables where per-pick O(n) matters, Vose's Alias Method `[memory]` gives O(1) picks
after an O(n) build. **Do not reach for it by default** — cumulative-weight is simpler and fast for
DRIFT. Promote only with a measured reason (and it's still this Guardian's algorithm, balance's
weights).

## Rolling against the SalvageNode contract

A Tier-1 salvage node, instead of a fixed `Configure(item, fixedAmount)`, holds a
`DropTableDefinition` + a seed and rolls:

```
var (itemDef, amount) = table.Roll(prng, itemDatabase);
salvageNode.Configure(itemDef, amount);                 // or the 3-arg overload for tool gates
```

The roll is the algorithm; the table is data; `Configure` is the unchanged repo contract. **Keep
`Roll` pure** — it takes the PRNG and the database, returns a value, mutates nothing global — so it's
EditMode-testable.

## Tool-gated caches stay expressible

`SalvageNode`'s 3-arg `Configure(item, amount, requiredToolId)` (`:26`) supports tool-gated caches
(the cutter/welder/drill caches in `Tier0Balance`). A drop table can carry a `requiredToolId` per
entry so a generated cache keeps the gate. The gate string is content (data); the decision to gate
is balance/design.

## Lane handoffs

- **Weights, amounts, roll counts, rarity tiers** → `game-balance-guardian`. This Guardian ships the
  table *shape* + selection algorithm with the VALUES as tunable data fields; balance fills + tunes
  them. Co-owned seam.
- **The `ItemDefinition` / `ItemDatabase` content** → existing data (per repo); this Guardian
  references ids, doesn't author items.
- **Persisting which rolls a run produced** → `save-load-guardian` (or just save the seed — guide 05).

## Output

A drop-table invocation produces a **weighted-selection algorithm over a data-defined table**
(cumulative-weight by default), a pure `Roll(prng, db)` that lands on `SalvageNode.Configure`, an
EditMode test asserting same-seed-same-roll, and the weights/amounts explicitly handed to
`game-balance-guardian`. See `examples/02-weighted-loot-table.md` and
`templates/weighted-loot-table.cs`.
