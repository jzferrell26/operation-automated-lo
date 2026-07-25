// Template: a tuning-ScriptableObject "balance profile" for DRIFT.
//
// WHEN TO USE THIS over the flat `Tier0Balance` static-const class:
//   - The human wants multiple authored profiles (e.g. green/yellow/red zone
//     difficulty tiers — GDD §7), selectable in the Inspector.
//   - The tunable set has grown past a comfortable wall of consts.
//   - A non-coder needs to edit values without touching .cs / recompiling.
//
// This is the Tier 1 graduation of `Tier0Balance` (see guides/01-balance-as-data.md).
// For the Tier 0 gray-box, the flat static class is the right call — do NOT
// build profiles ahead of need (tier discipline, CLAUDE.md Hard Rule #1).
//
// Hard Rule #3: balance is DATA. Every number here is a serialized field a
// designer can tune; none of it is logic. The systems code (unity-csharp-guardian)
// READS this profile; it does not embed the numbers.

using UnityEngine;

namespace Drift.Data.Balance
{
    /// <summary>
    /// Authored balance profile. One asset per difficulty tier / zone tier.
    /// Tier0RuntimeSpawner (or the Tier 1 zone loader) reads the active profile
    /// instead of bare Tier0Balance consts.
    /// </summary>
    [CreateAssetMenu(fileName = "BalanceProfile_", menuName = "Drift/Balance Profile")]
    public class BalanceProfile : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Stable id, e.g. 'tier0_default', 'zone_green', 'zone_red'.")]
        public string profileId = "tier0_default";

        // --- SURVIVAL METERS (the signature oxygen lever — GDD §3, guides/03) ---
        [Header("Oxygen (signature meter)")]
        [Min(1f)] public float oxygenMax = 100f;
        [Tooltip("Primary surface-tension knob. Budget = oxygenMax / oxygenDrainPerSecond.")]
        [Min(0f)] public float oxygenDrainPerSecond = 1.25f;
        [Tooltip("Health bleed once O2 hits zero. Keep > 0 to preserve the recovery beat.")]
        [Min(0f)] public float suffocationDamagePerSecond = 8f;

        [Header("Suit power (sprint pacing)")]
        [Min(1f)] public float suitMaxPower = 100f;
        [Min(0f)] public float suitSprintDrainPerSecond = 18f;
        [Min(0f)] public float suitRechargePerSecond = 20f;

        // --- ECONOMY: FAUCETS (yields — guides/02, guides/04) ---
        [Header("Salvage yields (faucets)")]
        [Min(0)] public int scrapNodeAmount = 14;
        [Min(0)] public int polymerNodeAmount = 4;   // the intended constraining resource
        [Min(0)] public int rawOreNodeAmount = 3;
        [Min(0)] public int cutterCacheScrapAmount = 3;
        [Min(0)] public int welderCachePolymerAmount = 2;
        [Min(0)] public int drillCacheRawOreAmount = 2;

        // --- ECONOMY: SINKS (recipe + build costs — guides/02, guides/08) ---
        [Header("Crafting costs (sinks)")]
        [Min(0)] public int cutterScrapCost = 4;
        [Min(0)] public int welderScrapCost = 3;
        [Min(0)] public int welderPolymerCost = 2;
        [Min(0)] public int drillScrapCost = 5;
        [Min(0)] public int drillRawOreCost = 2;
        [Min(0)] public int drillPolymerCost = 1;

        [Header("Build costs (sinks)")]
        [Min(0)] public int deckPlateScrapCost = 2;
        [Min(0)] public int deckPlatePolymerCost = 1;

        // --- COMBAT / ENEMY DIFFICULTY (numbers only — guides/05; behavior = fsm-ai) ---
        [Header("Enemy difficulty numbers")]
        [Min(0f)] public float enemyDetectRadius = 10f;
        [Min(0f)] public float enemyLeashRadius = 16f;
        [Min(0f)] public float enemyMoveSpeed = 3.5f;     // keep below player sprint or escape is impossible
        [Min(0f)] public float enemyAttackRange = 1.4f;
        [Min(0f)] public float enemyAttackDamage = 12f;   // dps = attackDamage / attackCooldown
        [Min(0.01f)] public float enemyAttackCooldown = 1.2f;

        // --- DURABILITY (TIER 1 — spec-only; guides/06). Tools AND weapons, guns included. ---
        // Tiered scarce ammo is a SECOND sink ON TOP of this, never a replacement (GDD §8).
        [Header("Durability (Tier 1 — not active in Tier 0)")]
        [Tooltip("Per-action condition loss. uses = durabilityMax / durabilityPerUse.")]
        [Min(0f)] public float defaultDurabilityPerUse = 1f;
        [Tooltip("Full repair cost as a fraction of recraft cost. Cheaper than recraft, never free.")]
        [Range(0f, 1f)] public float repairToRecraftRatio = 0.4f;

        // --- RAID CADENCE (Tier 0 = single trigger; Tier 1 = 24h cadence — guides/07) ---
        [Header("Raid pacing")]
        public Vector3 raiderSpawnPosition = new(4f, 1f, 8f);
        // Tier 1: assaultIntervalSeconds, waveSizeCurve, difficultyScalePerCycle — add when built.

        // Validation: catch economy breaks at author-time (a faucet that can't pay a sink).
        void OnValidate()
        {
            int availableScrap = scrapNodeAmount + cutterCacheScrapAmount;
            int demandScrap = cutterScrapCost + welderScrapCost + drillScrapCost + deckPlateScrapCost;
            if (availableScrap < demandScrap)
            {
                Debug.LogWarning(
                    $"[Drift][Balance] Profile '{profileId}': scrap faucet ({availableScrap}) " +
                    $"< scrap sink ({demandScrap}). Economy break — see guides/02.", this);
            }
        }
    }
}
