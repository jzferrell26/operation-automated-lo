// templates/progression-profile.cs
//
// Tier 1 PREP template — the XP-curve + level-up ScriptableObject for DRIFT.
// This is a DESIGN artifact (see guides/09-tier-discipline-note.md): the Tier 0 gray-box
// deliberately ships with NO leveling (GDD §13). Do not drop this into the project
// mid-Tier-0 (CLAUDE.md Hard Rule #1); it documents the SHAPE the Tier 1 curve grows into.
//
// LANE: this Weapon owns the SHAPE (curve-as-data, sampled by level). game-balance-guardian
// owns the NUMBERS (the array values, the level cap, the per-level point payouts). All numeric
// fields below are PLACEHOLDERS for game-balance to fill — see guides/06.
//
// Rules this template encodes:
//   - Progression is DATA, a [CreateAssetMenu] SO (CLAUDE.md Hard Rule #3, guides/01).
//   - The curve is SAMPLED, never branched in code (guides/02, Principle #9).
//   - Lookups are PURE — EditMode-testable with no Awake/Start (Hard Rule #11, guides/08).
//   - Mirrors the existing ItemDefinition SO pattern (id + [CreateAssetMenu] + data arrays).

using UnityEngine;

namespace Drift.Data.Progression
{
    [CreateAssetMenu(fileName = "Progression_", menuName = "Drift/Progression Profile")]
    public class ProgressionProfile : ScriptableObject
    {
        [Header("Identity")]
        public string id;                       // stable key (save/lookup), mirrors ItemDefinition.id

        // ---- SHAPE: the curve is data, sampled by level. -------------------------------
        // game-balance-guardian fills these values. Index i = cumulative XP required to REACH
        // level (i + 1). xpToReach[0] is typically 0 (start at level 1). MUST be monotonic
        // non-decreasing (a shape invariant this Weapon enforces; guides/08).
        [Header("XP curve (VALUES owned by game-balance — placeholders)")]
        [Tooltip("Cumulative XP to reach each level. Monotonic non-decreasing. game-balance tunes.")]
        public int[] xpToReach = { 0, 100, 250, 450 };  // PLACEHOLDER values

        // ---- SHAPE: level-up grants points. game-balance fills the counts. --------------
        [Header("Level-up rewards (COUNTS owned by game-balance — placeholders)")]
        public int statPointsPerLevel = 1;      // PLACEHOLDER
        public int skillPointsPerLevel = 1;     // PLACEHOLDER

        public int MaxLevel => xpToReach.Length; // closed cap = array length (one valid shape)

        // ---- PURE lookups (EditMode-safe; no Unity lifecycle). --------------------------

        /// <summary>Level for a given cumulative XP. Pure; deterministic. (guides/02, guides/08)</summary>
        public int LevelForXp(int totalXp)
        {
            int level = 1;
            for (int i = 1; i < xpToReach.Length; i++)
            {
                if (totalXp >= xpToReach[i]) { level = i + 1; }
                else { break; }
            }
            return level;
        }

        /// <summary>Cumulative XP required to reach a level (1-based). Pure.</summary>
        public int XpToReach(int level)
        {
            int idx = Mathf.Clamp(level - 1, 0, xpToReach.Length - 1);
            return xpToReach[idx];
        }

        /// <summary>XP earned into the current level — for a UI progress bar (UI Guardian reads this).</summary>
        public int XpIntoLevel(int totalXp)
        {
            int level = LevelForXp(totalXp);
            return totalXp - XpToReach(level);
        }

        /// <summary>Shape invariant: the curve must never decrease. Asserted in an EditMode test.</summary>
        public bool IsMonotonic()
        {
            for (int i = 1; i < xpToReach.Length; i++)
            {
                if (xpToReach[i] < xpToReach[i - 1]) { return false; }
            }
            return true;
        }

#if UNITY_INCLUDE_TESTS
        /// <summary>Test seam — set the curve without an .asset (guides/08).</summary>
        public void ConfigureForTest(int[] xp, int statPts = 1, int skillPts = 1)
        {
            xpToReach = xp;
            statPointsPerLevel = statPts;
            skillPointsPerLevel = skillPts;
        }
#endif
    }
}
