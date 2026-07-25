// templates/stat-modifier-stack.cs
//
// Tier 1 PREP template — the deterministic stat-modifier AGGREGATOR for DRIFT.
// DESIGN artifact (guides/09): Tier 0 has no stat progression (GDD §13). Do not add mid-Tier-0
// (CLAUDE.md Hard Rule #1). Documents the SHAPE the Tier 1 stat system grows into.
//
// GROUNDED IN REAL CODE: this aggregator consumes the EXISTING Drift.Data.Items.StatModifier
// struct (statId + value) — Assets/Scripts/Drift/Data/Items/StatModifier.cs. It does NOT invent
// a parallel stat type (Principle #4). The serialized StatModifier is left UNTOUCHED; the
// flat-vs-percent "kind" is carried out-of-band at aggregation time so the real type stays stable.
//
// LANE: this Weapon owns the STACKING SHAPE (deterministic flat-then-percent order). game-balance
// owns the base values and the modifier magnitudes (guides/06).
//
// Rules this template encodes:
//   - DETERMINISTIC order: flat additive first, then percent (Principle #5, guides/04).
//   - PURE compute — Configure(...) + EffectiveStat(...), no Awake/Start/Update (Hard Rule #11, guides/08).
//   - Plain C# class (no MonoBehaviour) — trivially EditMode-testable.

using System.Collections.Generic;
using Drift.Data.Items;   // the REAL StatModifier

namespace Drift.Gameplay.Progression
{
    /// <summary>How a modifier combines. Carried OUT-OF-BAND so the serialized StatModifier
    /// struct (statId + value) is never altered (guides/04).</summary>
    public enum ModifierKind { Flat, Percent }

    /// <summary>
    /// Aggregates stat modifiers from all sources (level allocation, perks, equipment — guides/04/05)
    /// into an effective value per statId. Deterministic: flat first, then percent.
    /// </summary>
    public sealed class StatModifierStack
    {
        readonly Dictionary<string, float> _base = new();
        readonly Dictionary<string, float> _flat = new();
        readonly Dictionary<string, float> _percent = new();

        /// <summary>Explicit init (no Awake). base stat VALUES are game-balance's (guides/06).</summary>
        public void Configure(IReadOnlyDictionary<string, float> baseStats)
        {
            _base.Clear(); _flat.Clear(); _percent.Clear();
            foreach (var kv in baseStats) { _base[kv.Key] = kv.Value; }
        }

        /// <summary>Add one modifier. Sources funnel here: level points, perks, equipment.</summary>
        public void Add(StatModifier mod, ModifierKind kind)
        {
            var bucket = kind == ModifierKind.Flat ? _flat : _percent;
            bucket.TryGetValue(mod.statId, out float current);
            bucket[mod.statId] = current + mod.value;   // sum within a kind (commutative)
        }

        /// <summary>Clear accumulated modifiers (keep base) — call before a Recompute (equip/unequip, guides/05).</summary>
        public void ClearModifiers() { _flat.Clear(); _percent.Clear(); }

        /// <summary>
        /// Effective stat. DETERMINISTIC order (Principle #5):
        ///   effective = (base + Σflat) * (1 + Σpercent).
        /// Pure — same inputs always yield the same output (EditMode-testable, guides/08).
        /// </summary>
        public float EffectiveStat(string statId)
        {
            _base.TryGetValue(statId, out float b);
            _flat.TryGetValue(statId, out float f);
            _percent.TryGetValue(statId, out float p);
            return (b + f) * (1f + p);
        }
    }
}
