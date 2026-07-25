// weighted-loot-table.cs — TEMPLATE (procedural-generation-weapon)
//
// A weighted drop-table that selects an (itemId, amount) by CUMULATIVE WEIGHT from data-defined
// entries (data over code — Hard Rule #3). The ALGORITHM is this Guardian's; the WEIGHTS, AMOUNTS,
// and ROLL COUNTS are game-balance-guardian's (left as serialized fields/data for them to tune).
//
// Consumes ids in the style of Tier0Balance (e.g. "scrap_metal", "polymer", "raw_ore").
// A roll lands on SalvageNode.Configure(item, amount[, requiredToolId]) — the real repo contract
// (Assets/Scripts/Drift/Gameplay/Salvage/SalvageNode.cs:20,26).
//
// Pure + seedable + EditMode-testable: Roll(prng, db) mutates nothing global; same seed -> same roll.

using System;
using UnityEngine;
// using Drift.Data.Items; // ItemDefinition / ItemDatabase per the repo

namespace Drift.Gameplay.ProcGen
{
    /// <summary>One row of a drop table. WEIGHT/AMOUNT/TOOL are content — game-balance owns the values.</summary>
    [Serializable]
    public struct DropEntry
    {
        public string itemId;          // references a Tier0Balance id / ItemDatabase entry
        public int weight;             // VALUE -> game-balance-guardian
        public int minAmount;          // VALUE -> game-balance-guardian
        public int maxAmount;          // VALUE -> game-balance-guardian
        public string requiredToolId;  // optional gate (e.g. tool_cutter); "" for none
    }

    /// <summary>
    /// A drop table as DATA (Hard Rule #3). game-balance authors the entries; this Guardian owns the
    /// selection algorithm below. Create assets, don't hardcode if-ladders.
    /// </summary>
    [CreateAssetMenu(menuName = "Drift/ProcGen/Drop Table", fileName = "DropTable")]
    public sealed class DropTableDefinition : ScriptableObject
    {
        [Tooltip("Entries' weights/amounts are tuned by game-balance-guardian.")]
        public DropEntry[] entries = Array.Empty<DropEntry>();

        [Tooltip("Independent picks per open. VALUE -> game-balance-guardian.")]
        public int rolls = 1;
    }

    /// <summary>The selection result — plain data so it's EditMode-pure (instantiate separately).</summary>
    public readonly struct DropResult
    {
        public readonly string ItemId;
        public readonly int Amount;
        public readonly string RequiredToolId;

        public DropResult(string itemId, int amount, string requiredToolId)
        {
            ItemId = itemId;
            Amount = amount;
            RequiredToolId = requiredToolId;
        }
    }

    /// <summary>The cumulative-weight selection ALGORITHM (this Guardian's lane).</summary>
    public static class WeightedLootSelector
    {
        /// <summary>
        /// One weighted pick + amount roll. Deterministic for a given prng stream + table.
        /// Iterates entries in DECLARED ORDER so the walk is stable (guide 05).
        /// </summary>
        public static bool TryRoll(DropTableDefinition table, DeterministicPrng prng, out DropResult result)
        {
            result = default;
            if (table == null || table.entries == null || table.entries.Length == 0)
            {
                return false;
            }

            var total = 0;
            for (var i = 0; i < table.entries.Length; i++)
            {
                if (table.entries[i].weight > 0)
                {
                    total += table.entries[i].weight;
                }
            }

            if (total <= 0)
            {
                return false;
            }

            var r = prng.NextInt(0, total);   // [0,total)
            var running = 0;
            for (var i = 0; i < table.entries.Length; i++)
            {
                var entry = table.entries[i];
                if (entry.weight <= 0)
                {
                    continue;
                }

                running += entry.weight;
                if (r < running)
                {
                    var amount = prng.NextInt(entry.minAmount, entry.maxAmount + 1);
                    result = new DropResult(entry.itemId, amount, entry.requiredToolId);
                    return true;
                }
            }

            // Unreachable if total computed correctly; defensive fallback to the last positive entry.
            return false;
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Landing a roll on the real SalvageNode contract (Tier 1 wiring — NOT to be added mid-Tier-0):
//
//   if (WeightedLootSelector.TryRoll(table, prng.Derive("loot"), out var drop))
//   {
//       database.TryGetById(drop.ItemId, out var item);          // ItemDatabase per repo
//       if (string.IsNullOrEmpty(drop.RequiredToolId))
//           salvageNode.Configure(item, drop.Amount);            // SalvageNode.cs:20
//       else
//           salvageNode.Configure(item, drop.Amount, drop.RequiredToolId); // SalvageNode.cs:26
//   }
//
// EditMode test (guide 07): TryRoll twice with the same-seeded prng -> identical DropResult;
// over many seeds, the empirical distribution matches the weights within tolerance.
// ---------------------------------------------------------------------------------------------
