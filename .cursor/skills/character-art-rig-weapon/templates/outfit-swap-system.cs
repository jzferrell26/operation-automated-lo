// Template — Cosmetic Outfit/Skin swap system for PROJECT-DRIFT.
//
// ============================================================================
// COSMETIC ONLY — the protagonist IDENTITY is LOCKED (GDD §2 / Hard Rule #7).
// This system swaps MESH / MATERIAL / ATTACHMENTS ONLY. It must NEVER modify
// the protagonist's name, role, backstory, or imply a second playable hero.
// Customization is compatible with the locked identity because cosmetic != identity.
// PER HARD RULE #10: the GDD does not yet mention customization — FLAG that GDD §2
// needs a one-line "cosmetic customization allowed" note. Do NOT edit the GDD here
// or anywhere; that edit is the human's. (See guides/05-cosmetic-customization.md.)
// ============================================================================
//
// Data over code (Hard Rule #3): outfits are ScriptableObjects, not hardcoded.
// EditMode-safe (ARCHITECTURE.md §7 / Hard Rule #11): lazy-init + Configure + a
// deterministic ApplyOutfit so a test can apply an outfit and assert the swapped
// mesh/material without Play mode.
//
// DESIGN template — Tier 0 characters are gray-box capsules; do not author real
// cosmetics into the gray-box ahead of the "is it fun?" call (Hard Rule #1).

using System.Collections.Generic;
using UnityEngine;

namespace Drift.Gameplay.Characters
{
    /// <summary>
    /// A single cosmetic outfit, authored as a ScriptableObject (Hard Rule #3).
    /// References ONLY cosmetic data: the body mesh/material and any rigid
    /// attachment prefabs keyed by socket name. No stats, no identity.
    /// </summary>
    [CreateAssetMenu(menuName = "Drift/Cosmetics/Outfit Definition", fileName = "Outfit")]
    public class OutfitDefinition : ScriptableObject
    {
        public string id;
        public string displayName;

        [Header("Cosmetic body (skinned, shares the one skeleton — guides/04)")]
        public Mesh bodyMesh;
        public Material bodyMaterial;

        [System.Serializable]
        public struct Attachment
        {
            public string socketName;   // e.g. "Socket_Head"
            public GameObject prefab;   // rigid cosmetic prop
        }

        [Header("Rigid attachments (cosmetic props)")]
        public List<Attachment> attachments = new();
    }

    /// <summary>The available cosmetics catalog (mirrors ItemDatabase, ARCHITECTURE.md §3).</summary>
    [CreateAssetMenu(menuName = "Drift/Cosmetics/Outfit Catalog", fileName = "OutfitCatalog")]
    public class OutfitCatalog : ScriptableObject
    {
        public List<OutfitDefinition> outfits = new();

        public OutfitDefinition TryGetById(string id)
        {
            foreach (var o in outfits)
            {
                if (o != null && o.id == id) return o;
            }
            return null;
        }
    }

    /// <summary>
    /// Applies a cosmetic OutfitDefinition to a character: swaps the skinned body
    /// mesh/material (sharing the one skeleton) and rigid attachments via the socket
    /// system. COSMETIC ONLY — never touches identity or stats.
    /// </summary>
    public class OutfitSwapSystem : MonoBehaviour
    {
        OutfitCatalog _catalog;
        SkinnedMeshRenderer _bodyTarget;   // swappable body slot, bound to shared skeleton
        Transform[] _skeletonBones;        // the ONE skeleton (guides/01, Principle #3)
        Transform _rootBone;
        ModularEquipmentSocket _sockets;
        bool _initialized;

        public string CurrentOutfitId { get; private set; }

        void Awake() => EnsureInitialized();
        void EnsureInitialized() { if (_initialized) return; _initialized = true; }

        /// <summary>Inject deps explicitly (EditMode-safe wiring, ARCHITECTURE.md §7).</summary>
        public void Configure(OutfitCatalog catalog, SkinnedMeshRenderer bodyTarget,
                              Transform[] skeletonBones, Transform rootBone,
                              ModularEquipmentSocket sockets)
        {
            EnsureInitialized();
            _catalog = catalog;
            _bodyTarget = bodyTarget;
            _skeletonBones = skeletonBones;
            _rootBone = rootBone;
            _sockets = sockets;
        }

        /// <summary>
        /// Applies a cosmetic outfit by id. Deterministic — a test can call this and
        /// assert _bodyTarget.sharedMesh/sharedMaterial and the attached props.
        /// COSMETIC ONLY: swaps mesh/material/attachments; nothing else.
        /// </summary>
        public bool ApplyOutfit(string outfitId)
        {
            EnsureInitialized();
            if (_catalog == null) return false;

            var outfit = _catalog.TryGetById(outfitId);
            if (outfit == null) return false;

            // 1. Cosmetic body swap, sharing the one skeleton (Principle #3, guides/04).
            if (_bodyTarget != null)
            {
                if (outfit.bodyMesh != null) _bodyTarget.sharedMesh = outfit.bodyMesh;
                if (outfit.bodyMaterial != null) _bodyTarget.sharedMaterial = outfit.bodyMaterial;
                if (_skeletonBones != null) _bodyTarget.bones = _skeletonBones;
                if (_rootBone != null) _bodyTarget.rootBone = _rootBone;
            }

            // 2. Cosmetic rigid attachments via the socket system.
            if (_sockets != null)
            {
                foreach (var a in outfit.attachments)
                {
                    _sockets.Attach(a.prefab, a.socketName);
                }
            }

            CurrentOutfitId = outfit.id;
            return true;

            // NOTE: nothing here touches name, role, backstory, stats, or a second
            // hero. Any such request is REFUSED and routed to the human + GDD §2
            // (guides/05). Future store/ownership gating is payments-guardian scope
            // and is past Tier 0 (GDD §16) — flag, don't build.
        }
    }
}
