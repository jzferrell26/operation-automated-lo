// ─────────────────────────────────────────────────────────────────────────────
// DRIFT — idempotent editor-menu setup skeleton (TEMPLATE)
//
// A deterministic `Drift → ...` MenuItem bring-up that the agent can extend for
// repeatable scene/prefab assembly the MCP-driven path shouldn't re-derive by hand.
//
// This MIRRORS the patterns in Assets/Scripts/Drift/Editor/Tier0GrayBoxSetup.cs:
//   • LoadOrCreatePrefabRoot — load-or-create so re-runs are safe (idempotency).
//   • EnsureComponent<T>     — get-or-add, never double-add.
//   • SavePrefab             — SaveAsPrefabAsset + UnloadPrefabContents.
//   • Configure(...) wiring  — preferred over poking serialized fields (EditMode-safe;
//                              Unity does not run Awake/Start on script-added comps in
//                              EditMode — CLAUDE.md Hard Rule #11, ARCHITECTURE.md §7).
//
// SCOPE GUARD (CLAUDE.md Hard Rule #1 / unity-mcp-weapon Hard Rule #6): extend this only
// for the Tier 0 gray-box. No station builder, enemy variety, crew, equipment, or save UI.
//
// OWNERSHIP: unity-mcp-guardian DESIGNS bring-up; the actual gameplay/editor C# belongs to
// unity-csharp-guardian. Treat this as a skeleton to hand off, not finished source to drop in
// without review. Replace the placeholder ops with the real layout from
// guides/04-scene-assembly.md (positions/components/Configure calls come from
// Tier0RuntimeSpawner.Build()).
// ─────────────────────────────────────────────────────────────────────────────
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Drift.Editor.Templates
{
    /// <summary>
    /// Skeleton for a deterministic, re-runnable Tier 0 bring-up menu command.
    /// Fill in the real layout (see guides/04-scene-assembly.md). Idempotent by design.
    /// </summary>
    public static class GrayBoxSetupSkeleton
    {
        const string PrefabFolder = "Assets/Prefabs/Tier0";
        const string ScenePath = "Assets/Scenes/Tier0_GrayBox.unity";

        [MenuItem("Drift/Templates/Setup Gray Box (skeleton)")]
        public static void Setup()
        {
            EnsureFolders();

            // 1) Author/refresh prefabs idempotently (one example shown).
            var examplePrefab = EnsureExamplePrefab();

            // 2) Build the scene from a known-empty starting point so re-runs match.
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // TODO: instantiate prefabs + wire Configure(...) per guides/04-scene-assembly.md:
            //   • player (capsule, 9 components, Configure build planner + crafter)
            //   • O2 deck root (trigger zone + LifeSupportZone + O2Generator + objective tracker + raid stub)
            //   • Tier0LoopController.Configure(player, stationSpawn, planetSpawn, objectives, assault)
            //   • two shuttle pads (Configure: descend=false, extract=true)
            //   • 3 salvage nodes + 3 tool caches (Configure: item, amount[, requiredToolId])
            //   • enemy (Configure target), camera rig, Tier0Hud
            var placeholder = (GameObject)PrefabUtility.InstantiatePrefab(examplePrefab);
            placeholder.transform.position = Vector3.zero;

            EditorSceneManager.SaveScene(scene, ScenePath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            EditorUtility.DisplayDialog(
                "Gray Box (skeleton) ready",
                "Replace the placeholder ops with the canonical Tier 0 layout, then commit\n" +
                "Assets/Scenes/Tier0_GrayBox.unity + its .meta (AGENTS.md).",
                "OK");
        }

        static void EnsureFolders()
        {
            System.IO.Directory.CreateDirectory(PrefabFolder);
            System.IO.Directory.CreateDirectory("Assets/Scenes");
        }

        // --- The idempotent prefab pattern, copied from Tier0GrayBoxSetup ---------

        static GameObject EnsureExamplePrefab()
        {
            var path = $"{PrefabFolder}/Example.prefab";
            var root = LoadOrCreatePrefabRoot(path, () =>
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
                go.name = "Example";
                go.GetComponent<Collider>().isTrigger = true;
                return go;
            });

            // EnsureComponent<YourComponent>(root);
            // var c = root.GetComponent<YourComponent>(); c.Configure(/* ... */);

            return SavePrefab(root, path);
        }

        static GameObject LoadOrCreatePrefabRoot(string path, System.Func<GameObject> create)
        {
            if (AssetDatabase.LoadAssetAtPath<GameObject>(path) != null)
            {
                return PrefabUtility.LoadPrefabContents(path);
            }

            return create();
        }

        static T EnsureComponent<T>(GameObject root) where T : Component
        {
            var component = root.GetComponent<T>();
            return component != null ? component : root.AddComponent<T>();
        }

        static GameObject SavePrefab(GameObject root, string path)
        {
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            PrefabUtility.UnloadPrefabContents(root);
            return prefab;
        }
    }
}
#endif
