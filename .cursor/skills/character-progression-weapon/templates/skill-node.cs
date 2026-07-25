// templates/skill-node.cs
//
// Tier 1 PREP template — a skill/perk tree NODE ScriptableObject for DRIFT.
// DESIGN artifact (guides/09): Tier 0 has NO perk tree (GDD §13). Do not add mid-Tier-0
// (CLAUDE.md Hard Rule #1). Documents the SHAPE the Tier 1 "light perk tree" (GDD §6) grows into.
//
// LANE: this Weapon owns the SHAPE (node graph: ranks, prerequisites-by-id, granted modifiers).
// game-balance-guardian owns the NUMBERS (point costs, rank count, modifier magnitudes). The
// numeric fields are PLACEHOLDERS for game-balance — see guides/06.
//
// Rules this template encodes:
//   - Perks are DATA, [CreateAssetMenu] SOs (Hard Rule #3, guides/01).
//   - Prerequisites are referenced BY STRING ID, never by SO reference (save-friendly; guides/03, guides/07).
//   - Effects are StatModifier[] — the REAL Drift.Data.Items.StatModifier (guides/04), not bespoke code.
//   - The tree is an ACYCLIC prerequisite graph; cycle/reachability are EditMode-validated (guides/08).

using UnityEngine;
using Drift.Data.Items;   // StatModifier — the REAL existing type (Assets/Scripts/Drift/Data/Items/StatModifier.cs)

namespace Drift.Data.Progression
{
    [CreateAssetMenu(fileName = "Skill_", menuName = "Drift/Skill Node")]
    public class SkillNodeDefinition : ScriptableObject
    {
        [Header("Identity")]
        public string id;                        // stable key (save/lookup), mirrors ItemDefinition.id
        public string displayName;

        // ---- SHAPE: prerequisite graph, referenced by ID (not SO ref). ------------------
        [Header("Graph")]
        [Tooltip("Node ids that must be unlocked first. Reference BY ID — keeps the graph save-friendly.")]
        public string[] prerequisiteNodeIds;

        // ---- SHAPE: ranks. game-balance owns how MANY. ----------------------------------
        [Header("Ranks (COUNT owned by game-balance — placeholder)")]
        [Tooltip("1 = binary perk; N = ranked. Array lengths below must equal this.")]
        public int maxRank = 1;                  // PLACEHOLDER

        // ---- NUMBERS owned by game-balance (placeholders). ------------------------------
        [Header("Cost per rank (VALUES owned by game-balance — placeholders)")]
        [Tooltip("Skill-point cost to buy each rank. Length == maxRank. game-balance tunes.")]
        public int[] pointCostPerRank = { 1 };   // PLACEHOLDER

        // ---- SHAPE: the effect is StatModifier[] per rank. magnitudes are game-balance's. ----
        [Header("Granted modifiers per rank (MAGNITUDES owned by game-balance)")]
        [Tooltip("Modifiers granted at each rank, built on the REAL StatModifier struct. " +
                 "Aggregated by the stat stack (guides/04). game-balance tunes the values.")]
        public RankGrant[] grantsPerRank = { new RankGrant() };  // PLACEHOLDER magnitudes

        /// <summary>Shape invariant: array lengths line up with maxRank (guides/03).</summary>
        public bool HasConsistentRankArrays()
        {
            return pointCostPerRank != null
                && grantsPerRank != null
                && pointCostPerRank.Length == maxRank
                && grantsPerRank.Length == maxRank;
        }
    }

    // JsonUtility/Unity serialize nested [Serializable]; StatModifier already is [Serializable].
    [System.Serializable]
    public class RankGrant
    {
        // The REAL StatModifier type (statId + value). value magnitudes = game-balance.
        public StatModifier[] modifiers;
    }
}
