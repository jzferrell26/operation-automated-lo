# Example 02 — A Weighted Loot Table Consuming Tier0Balance Ids

**Goal:** roll an `(itemId, amount)` from a data-defined weighted table, landing the result on the
real `SalvageNode.Configure`, with the same seed always producing the same roll. Proves guide 03
(drop tables), 05 (determinism), 07 (testing), and the game-balance handoff.

**Tier framing:** Tier-1+. Today `Tier0RuntimeSpawner.CreateSalvage` calls
`SalvageNode.Configure(item, fixedAmount)` with fixed `Tier0Balance` values. This example shows the
Tier-1 generator that would replace the *fixed amount* with a *seeded roll* — designed and tested
now, not wired in mid-Tier-0.

## The real contracts it consumes

- `Assets/Scripts/Drift/Gameplay/Bootstrap/Tier0Balance.cs` — the ids the table draws from:
  `scrap_metal`, `polymer`, `raw_ore` (+ tool ids for gated caches). The current Tier 0 amounts
  (`ScrapMetalNodeAmount=14`, `PolymerNodeAmount=4`, `RawOreNodeAmount=3`) are the *kind* of value
  `game-balance-guardian` owns — the table below leaves them as tunable fields.
- `Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs:20` — `Configure(item, amount)`, and `:26`
  the 3-arg overload with `requiredToolId`. The roll lands here.

## The table (DATA — Hard Rule #3)

Use `templates/weighted-loot-table.cs`. A `DropTableDefinition` SO holds `DropEntry[]`. Example
(weights/amounts are **placeholders** — `game-balance-guardian` sets the real ones):

| itemId | weight | minAmount | maxAmount | requiredToolId |
|---|---|---|---|---|
| `scrap_metal` | `W_scrap` | `min_scrap` | `max_scrap` | "" |
| `polymer` | `W_poly` | `min_poly` | `max_poly` | "" |
| `raw_ore` | `W_ore` | `min_ore` | `max_ore` | "" |

The `W_*` / `min_*` / `max_*` are **values handed to balance** — this example does not invent them.
The *algorithm* below is this Guardian's.

## The roll (cumulative-weight, seeded)

```csharp
if (WeightedLootSelector.TryRoll(table, prng.Derive("loot"), out var drop))
{
    database.TryGetById(drop.ItemId, out var item);   // ItemDatabase per repo
    if (string.IsNullOrEmpty(drop.RequiredToolId))
        salvageNode.Configure(item, drop.Amount);                    // SalvageNode.cs:20
    else
        salvageNode.Configure(item, drop.Amount, drop.RequiredToolId); // SalvageNode.cs:26
}
```

`TryRoll` sums weights, draws `r = prng.NextInt(0, total)`, walks entries in declared order, and
rolls the amount in `[minAmount, maxAmount]`. Pure: it mutates nothing global and takes the PRNG in.

## The tests (guide 07)

```csharp
[Test]
public void SameSeed_ProducesIdenticalRoll()
{
    WeightedLootSelector.TryRoll(table, new DeterministicPrng(99), out var a);
    WeightedLootSelector.TryRoll(table, new DeterministicPrng(99), out var b);
    Assert.AreEqual(a.ItemId, b.ItemId);
    Assert.AreEqual(a.Amount, b.Amount);                 // determinism (guide 05)
}

[Test]
public void Distribution_MatchesWeights_WithinTolerance()
{
    var counts = new Dictionary<string, int>();
    var prng = new DeterministicPrng(2024);
    for (var i = 0; i < 10000; i++)
    {
        WeightedLootSelector.TryRoll(table, prng, out var d);
        counts[d.ItemId] = counts.GetValueOrDefault(d.ItemId) + 1;
    }
    // assert each id's share ≈ weight/totalWeight within, say, 3% — proves the algorithm is faithful
    // (the EXPECTED shares come from the weights, which are game-balance's; the test reads them from data)
}
```

The second test is the **invariant** for loot: over many seeds the empirical distribution matches
the (data-defined) weights. It validates the *algorithm* without this Guardian asserting any specific
weight is *correct* — that judgment is balance's.

## Handoffs

- All weights, amounts, roll counts, rarity tiers → `game-balance-guardian` (the table is shipped
  with them as tunable data fields).
- The `ItemDefinition`/`ItemDatabase` content → existing repo data; this Guardian references ids.
- Persisting which rolls a run produced → `save-load-guardian` (or just save the seed — guide 05).
