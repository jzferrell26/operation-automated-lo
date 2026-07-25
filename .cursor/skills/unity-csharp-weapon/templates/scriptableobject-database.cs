// Template: ScriptableObject content + database for PROJECT-DRIFT (Hard Rule #3 — content is
// data, not code). Mirrors the real Drift pattern: ItemDefinition + ItemDatabase
// (Assets/Scripts/Drift/Data/Items/). Use this shape for any new CONTENT type — structures,
// crew, station modules — so the human can author/balance it as .asset files without recompiles.
//
// Rules baked in:
//   - The data SO is a NOUN: pure fields, zero gameplay logic (guide 02). Behaviour lives in the
//     MonoBehaviours that operate on this data.
//   - [CreateAssetMenu] so it's authorable via Create -> Drift -> ... in the editor.
//   - The database is the lookup; TryGetById mirrors ItemDatabase.
//   - Place under Assets/Scripts/Drift/Data/<Area>/ with a Drift.Data.<Area> namespace (guide 03).
//   - Do NOT store mutable runtime/session state on a SO asset (guide 05) — that's a save-load
//     concern; SOs hold authored, read-only content.

using System.Collections.Generic;
using UnityEngine;

namespace Drift.Data.Example   // <-- match the folder
{
    [CreateAssetMenu(fileName = "Example_", menuName = "Drift/Example Definition")]
    public class ExampleDefinition : ScriptableObject
    {
        [Header("Identity")]
        public string id;                // stable content id; centralize the literal in Tier0Balance
        public string displayName;

        [Header("Data")]
        public int someValue = 1;        // tuning VALUES are game-balance-guardian's call
        public float someWeight = 1f;

        // No Use()/OnEquip()/coroutines here. Data only. (guide 02)
    }

    [CreateAssetMenu(fileName = "ExampleDatabase", menuName = "Drift/Example Database")]
    public class ExampleDatabase : ScriptableObject
    {
        public ExampleDefinition[] entries;

        public bool TryGetById(string entryId, out ExampleDefinition definition)
        {
            if (entries != null)
            {
                for (var i = 0; i < entries.Length; i++)
                {
                    if (entries[i] != null && entries[i].id == entryId)
                    {
                        definition = entries[i];
                        return true;
                    }
                }
            }

            definition = null;
            return false;
        }

        public IReadOnlyList<ExampleDefinition> All =>
            entries ?? System.Array.Empty<ExampleDefinition>();
    }
}
