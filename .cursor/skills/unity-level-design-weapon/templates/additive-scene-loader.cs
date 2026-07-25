// additive-scene-loader.cs — DESIGN SKELETON, not production code.
//
// A persistent-scene additive loader for DRIFT's station <-> surface zones. This is the
// LOADING DESIGN this Weapon owns; the production MonoBehaviour shape, asmdef placement and
// EditMode-test seam are co-owned with unity-csharp-guardian (see CLAUDE.md Hard Rule #11:
// new MonoBehaviours that need coverage use lazy-init + explicit Configure(...) + an extracted
// Tick/Step). Wire it in-editor / Build Settings via unity-mcp-guardian.
//
// Pattern: a persistent "Systems" scene holds player/camera/session/HUD; zone scenes
// (Station, Surface) load additively around it and are set active for correct lighting +
// instantiation. Avoid hard cross-scene references — route through Tier0Session.Instance.

using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
// Tier-1+: using UnityEngine.AddressableAssets; using UnityEngine.ResourceManagement.ResourceProviders;

namespace Drift.Gameplay.Bootstrap
{
    /// <summary>
    /// Swaps the active zone scene additively while the persistent Systems scene (player,
    /// camera, Tier0Session, HUD) stays loaded. Replaces Tier0LoopController's in-scene
    /// teleport with a scene swap, preserving the gameplay coordinates.
    /// </summary>
    public class AdditiveZoneLoader : MonoBehaviour
    {
        [SerializeField] string stationSceneName = "Station";
        [SerializeField] string surfaceSceneName = "Surface";

        string _currentZone;

        // Configure-style entry so this is drivable from tests / the loop controller without
        // relying on Awake/Start (Hard Rule #11).
        public void Configure(string startingZone)
        {
            _currentZone = startingZone;
        }

        /// <summary>Descend: load Surface, move player to PlanetDropPoint, unload Station.</summary>
        public IEnumerator SwapTo(string nextZone, Transform player, Vector3 spawnInNextZone)
        {
            // 1. Load the next zone additively.
            var load = SceneManager.LoadSceneAsync(nextZone, LoadSceneMode.Additive);
            while (!load.isDone)
            {
                yield return null;
            }

            // 2. Make it active so new instantiations + lighting follow it.
            var loaded = SceneManager.GetSceneByName(nextZone);
            SceneManager.SetActiveScene(loaded);

            // 3. Move the persistent player into the new zone at the preserved coordinate.
            player.position = spawnInNextZone;

            // 4. Unload the old zone (if any).
            if (!string.IsNullOrEmpty(_currentZone) && _currentZone != nextZone)
            {
                var unload = SceneManager.UnloadSceneAsync(_currentZone);
                while (unload != null && !unload.isDone)
                {
                    yield return null;
                }
            }

            _currentZone = nextZone;
        }

        // Tier-1+ (Rule #10, ADR-gated): replace LoadSceneAsync with
        // Addressables.LoadSceneAsync(key, LoadSceneMode.Additive) to stream zones from a
        // content catalog and keep the mobile base build small. Not in Packages/manifest.json
        // today — forward design only. Build-size/packaging -> unity-build-guardian.
    }
}
